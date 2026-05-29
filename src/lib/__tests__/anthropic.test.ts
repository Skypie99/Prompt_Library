/**
 * Tests for src/lib/anthropic.ts — F-r2 rate-limit retry.
 *
 * Tests the exported `parseRetryAfter` helper and verifies that `ClaudeError`
 * carries an optional `retryAfterSeconds` field. Full integration (the
 * `streamClaude` path that reads response headers) is covered by the manual
 * header-parse tests below; a network-level integration test would require
 * a fetch mock and is deferred.
 *
 * Note: component-level retry button tests (visibility, click → re-invoke,
 * interval cleanup) require @testing-library/react + jsdom, which are not
 * currently wired into the vitest config. See qa-report for the gap.
 */

import { parseRetryAfter, ClaudeError } from "../anthropic";

// ---- parseRetryAfter --------------------------------------------------------

describe("parseRetryAfter", () => {
  it("returns undefined for null / absent header", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter("")).toBeUndefined();
  });

  it("parses an integer-seconds value", () => {
    expect(parseRetryAfter("60")).toBe(60);
    expect(parseRetryAfter("1")).toBe(1);
    expect(parseRetryAfter("3600")).toBe(3600);
  });

  it("returns undefined for zero or negative integer", () => {
    expect(parseRetryAfter("0")).toBeUndefined();
    expect(parseRetryAfter("-5")).toBeUndefined();
  });

  it("returns undefined for non-numeric, non-date strings", () => {
    expect(parseRetryAfter("soon")).toBeUndefined();
    expect(parseRetryAfter("abc")).toBeUndefined();
  });

  it("parses a future HTTP-date string into a positive seconds value", () => {
    // Build a date 120 seconds in the future.
    const future = new Date(Date.now() + 120_000).toUTCString();
    const result = parseRetryAfter(future);
    // Allow ±2 s of clock drift during test execution.
    expect(result).toBeGreaterThanOrEqual(118);
    expect(result).toBeLessThanOrEqual(122);
  });

  it("returns undefined for a past HTTP-date string", () => {
    const past = new Date(Date.now() - 5_000).toUTCString();
    expect(parseRetryAfter(past)).toBeUndefined();
  });
});

// ---- ClaudeError.retryAfterSeconds ------------------------------------------

describe("ClaudeError retryAfterSeconds field", () => {
  it("defaults to undefined when not set", () => {
    const err = new ClaudeError("rate-limit", "Rate limit reached.");
    expect(err.retryAfterSeconds).toBeUndefined();
  });

  it("can be assigned and read back", () => {
    const err = new ClaudeError("rate-limit", "Rate limit reached.");
    err.retryAfterSeconds = 45;
    expect(err.retryAfterSeconds).toBe(45);
  });

  it("retryAfterSeconds is absent on non-rate-limit errors", () => {
    const auth = new ClaudeError("auth", "Bad key.");
    expect(auth.retryAfterSeconds).toBeUndefined();
    const network = new ClaudeError("network", "Connection dropped.");
    expect(network.retryAfterSeconds).toBeUndefined();
  });
});

// ---- F-usage: onUsage callback via streamClaude ----------------------------

// Helper: create a ReadableStream from a sequence of SSE event strings.
// Each event string should be a complete SSE data block (data: {...}\n\n).
function makeStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = events.map((e) => encoder.encode(e));
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i++]);
      } else {
        controller.close();
      }
    },
  });
}

// Minimal SSE events that the Anthropic streaming API emits.
const SSE_MESSAGE_START = (inputTokens: number) =>
  `data: ${JSON.stringify({
    type: "message_start",
    message: { usage: { input_tokens: inputTokens } },
  })}

`;

const SSE_CONTENT_BLOCK_START =
  `data: ${JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })}

`;

const SSE_TEXT_DELTA = (text: string) =>
  `data: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } })}

`;

const SSE_CONTENT_BLOCK_STOP =
  `data: ${JSON.stringify({ type: "content_block_stop", index: 0 })}

`;

const SSE_MESSAGE_DELTA = (outputTokens: number) =>
  `data: ${JSON.stringify({
    type: "message_delta",
    delta: { stop_reason: "end_turn" },
    usage: { output_tokens: outputTokens },
  })}

`;

const SSE_MESSAGE_STOP =
  `data: ${JSON.stringify({ type: "message_stop" })}

`;

// Mock global fetch for streamClaude tests.
function mockFetchOk(stream: ReadableStream<Uint8Array>) {
  const original = globalThis.fetch;
  // @ts-expect-error — test mock, not a full Response
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    body: stream,
  });
  return () => {
    globalThis.fetch = original;
  };
}

import { streamClaude } from "../anthropic";

describe("streamClaude onUsage callback (F-usage-a)", () => {
  it("calls onUsage with correct input and output token counts when stream completes", async () => {
    const events = [
      SSE_MESSAGE_START(312),
      SSE_CONTENT_BLOCK_START,
      SSE_TEXT_DELTA("Hello"),
      SSE_CONTENT_BLOCK_STOP,
      SSE_MESSAGE_DELTA(1204),
      SSE_MESSAGE_STOP,
    ];
    const restore = mockFetchOk(makeStream(events));
    try {
      const received: { inputTokens: number; outputTokens: number }[] = [];
      await streamClaude({
        apiKey: "test-key",
        model: "claude-3-5-haiku-20241022",
        maxTokens: 1024,
        prompt: "Hello",
        onText: () => {},
        onUsage: (u) => received.push(u),
      });
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ inputTokens: 312, outputTokens: 1204 });
    } finally {
      restore();
    }
  });

  it("does NOT call onUsage when the stream is aborted before message_delta", async () => {
    const controller = new AbortController();
    // Stream that only sends message_start then stops (simulating early abort).
    const events = [
      SSE_MESSAGE_START(100),
      SSE_CONTENT_BLOCK_START,
      // No message_delta — stream ends early.
    ];
    const restore = mockFetchOk(makeStream(events));
    try {
      const received: unknown[] = [];
      await streamClaude({
        apiKey: "test-key",
        model: "claude-3-5-haiku-20241022",
        maxTokens: 1024,
        prompt: "Hello",
        signal: controller.signal,
        onText: () => {},
        onUsage: (u) => received.push(u),
      });
      // onUsage must NOT be called — only input_tokens arrived, not output_tokens.
      expect(received).toHaveLength(0);
    } finally {
      restore();
    }
  });

  it("is a no-op when onUsage is not provided (existing callers unaffected)", async () => {
    const events = [
      SSE_MESSAGE_START(10),
      SSE_TEXT_DELTA("Hi"),
      SSE_MESSAGE_DELTA(5),
      SSE_MESSAGE_STOP,
    ];
    const restore = mockFetchOk(makeStream(events));
    try {
      // Must not throw when onUsage is absent.
      await expect(
        streamClaude({
          apiKey: "test-key",
          model: "claude-3-5-haiku-20241022",
          maxTokens: 1024,
          prompt: "Hello",
          onText: () => {},
          // onUsage deliberately omitted
        })
      ).resolves.toBeUndefined();
    } finally {
      restore();
    }
  });

  it("does NOT call onUsage when an AbortError is thrown (user hits Stop)", async () => {
    // Simulate the fetch itself being aborted: the error propagates as an
    // AbortError before any SSE events are read, so onUsage must not fire.
    const abortError = new DOMException("The user aborted a request.", "AbortError");
    const original = globalThis.fetch;
    // @ts-expect-error — test mock
    globalThis.fetch = async () => { throw abortError; };
    try {
      const received: unknown[] = [];
      await expect(
        streamClaude({
          apiKey: "test-key",
          model: "claude-3-5-haiku-20241022",
          maxTokens: 1024,
          prompt: "Hello",
          onText: () => {},
          onUsage: (u) => received.push(u),
        })
      ).rejects.toThrow();
      expect(received).toHaveLength(0);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("does NOT call onUsage when an error SSE event arrives in the stream", async () => {
    // An 'error' type SSE event causes streamClaude to throw a ClaudeError,
    // aborting the stream before the normal message_delta/message_stop.
    const SSE_ERROR_EVENT =
      `data: ${JSON.stringify({ type: "error", error: { message: "internal error" } })}\n\n`;
    const events = [
      SSE_MESSAGE_START(50),
      SSE_CONTENT_BLOCK_START,
      SSE_TEXT_DELTA("partial"),
      SSE_ERROR_EVENT,
    ];
    const restore = mockFetchOk(makeStream(events));
    try {
      const received: unknown[] = [];
      await expect(
        streamClaude({
          apiKey: "test-key",
          model: "claude-3-5-haiku-20241022",
          maxTokens: 1024,
          prompt: "Hello",
          onText: () => {},
          onUsage: (u) => received.push(u),
        })
      ).rejects.toThrow();
      expect(received).toHaveLength(0);
    } finally {
      restore();
    }
  });
});
