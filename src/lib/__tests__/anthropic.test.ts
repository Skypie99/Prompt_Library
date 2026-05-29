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
