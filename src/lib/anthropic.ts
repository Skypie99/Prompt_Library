// A tiny, dependency-free client for the Anthropic Messages API that streams
// the response token-by-token. Called directly from the browser with the user's
// own key — that's why the request includes the explicit
// "anthropic-dangerous-direct-browser-access" opt-in header.

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export type ClaudeErrorKind =
  | "auth" // 401 / 403 — bad or unauthorized key
  | "rate-limit" // 429
  | "overloaded" // 503 / 529
  | "network" // fetch failed / connection dropped
  | "bad-request" // other 4xx
  | "unknown"; // anything else

// One error type with a machine-readable `kind` so the UI can react (e.g. show
// an "Open Settings" button for auth errors) and a friendly, human message.
// For `rate-limit` errors, `retryAfterSeconds` is set when the Anthropic API
// returns a `retry-after` header on the 429 response; otherwise undefined.
export class ClaudeError extends Error {
  kind: ClaudeErrorKind;
  /** Populated from the `retry-after` response header on 429 errors. */
  retryAfterSeconds?: number;
  constructor(kind: ClaudeErrorKind, message: string) {
    super(message);
    this.name = "ClaudeError";
    this.kind = kind;
  }
}

export interface StreamClaudeParams {
  apiKey: string;
  model: string;
  maxTokens: number;
  prompt: string;
  signal?: AbortSignal;
  /** Called with each chunk of text as it streams in. */
  onText: (chunk: string) => void;
}

/**
 * Parse the `retry-after` response header into seconds.
 * Handles both integer-seconds form ("60") and HTTP-date form
 * ("Wed, 28 May 2026 23:00:00 GMT"). Returns undefined if the header is
 * absent or unparseable.
 */
export function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const trimmed = headerValue.trim();
  // Integer seconds form.
  const asInt = parseInt(trimmed, 10);
  if (!isNaN(asInt) && String(asInt) === trimmed) {
    return asInt > 0 ? asInt : undefined;
  }
  // HTTP-date form.
  const asDate = new Date(trimmed).getTime();
  if (!isNaN(asDate)) {
    const delta = Math.ceil((asDate - Date.now()) / 1000);
    return delta > 0 ? delta : undefined;
  }
  return undefined;
}

function mapHttpError(
  status: number,
  detail: string,
  retryAfterHeader?: string | null,
): ClaudeError {
  const suffix = detail ? ` (${detail})` : "";
  switch (true) {
    case status === 401 || status === 403:
      return new ClaudeError(
        "auth",
        "That API key was rejected. Double-check it in Settings and re-paste it.",
      );
    case status === 429: {
      const err = new ClaudeError(
        "rate-limit",
        "Rate limit reached. Wait a moment, or switch to a faster model in Settings.",
      );
      const seconds = parseRetryAfter(retryAfterHeader ?? null);
      if (seconds !== undefined) err.retryAfterSeconds = seconds;
      return err;
    }
    case status === 503 || status === 529:
      return new ClaudeError(
        "overloaded",
        "Claude is overloaded right now. Give it a few seconds and try again.",
      );
    case status >= 400 && status < 500:
      return new ClaudeError("bad-request", `Claude rejected the request${suffix}.`);
    default:
      return new ClaudeError("unknown", `Something went wrong on Claude's side${suffix}.`);
  }
}

// Parse one SSE event block and forward any text delta. Throws a ClaudeError if
// the stream itself reports an error event.
function handleEvent(rawEvent: string, onText: (chunk: string) => void): void {
  let data = "";
  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data || data === "[DONE]") return;

  let payload: {
    type?: string;
    delta?: { type?: string; text?: string };
    error?: { message?: string };
  };
  try {
    payload = JSON.parse(data);
  } catch {
    return; // ignore keep-alives / unparseable lines
  }

  if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
    onText(payload.delta.text ?? "");
  } else if (payload.type === "error") {
    throw new ClaudeError("unknown", payload.error?.message ?? "Claude returned an error.");
  }
}

export async function streamClaude({
  apiKey,
  model,
  maxTokens,
  prompt,
  signal,
  onText,
}: StreamClaudeParams): Promise<void> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ClaudeError(
      "network",
      "Couldn't reach Claude — check your connection and try again.",
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error?.message ?? "";
    } catch {
      /* no JSON body — leave detail empty */
    }
    // Pass the `retry-after` header so 429 errors can surface a countdown.
    const retryAfterHeader = response.headers.get("retry-after");
    throw mapHttpError(response.status, detail, retryAfterHeader);
  }

  if (!response.body) {
    throw new ClaudeError("unknown", "No response stream was received from Claude.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line.
      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        handleEvent(rawEvent, onText);
      }
    }
  } catch (error) {
    if (error instanceof ClaudeError) throw error;
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ClaudeError("network", "The connection to Claude was interrupted.");
  }
}
