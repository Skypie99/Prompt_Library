import Fuse, { type FuseResultMatch } from "fuse.js";
import type { Prompt } from "./types";

// A single search result: the matched prompt plus (when there was a query) the
// Fuse match data we use to highlight which characters matched.
export interface PromptSearchResult {
  prompt: Prompt;
  matches?: readonly FuseResultMatch[];
}

// Build the Fuse index once per prompt list. Weights bias results toward the
// most meaningful fields (title first), but body text is still searchable.
export function createPromptFuse(prompts: Prompt[]): Fuse<Prompt> {
  return new Fuse(prompts, {
    keys: [
      { name: "title", weight: 0.4 },
      { name: "description", weight: 0.25 },
      { name: "tags", weight: 0.2 },
      { name: "body", weight: 0.15 },
    ],
    includeMatches: true, // needed to highlight matched characters
    includeScore: true,
    threshold: 0.4, // 0 = exact, 1 = match anything; 0.4 is forgiving but focused
    ignoreLocation: true, // match anywhere in the field (important for long bodies)
    minMatchCharLength: 2,
  });
}

// Empty query → return everything in original order. Otherwise → ranked matches.
export function searchPrompts(
  fuse: Fuse<Prompt>,
  prompts: Prompt[],
  query: string,
): PromptSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return prompts.map((prompt) => ({ prompt }));
  return fuse.search(trimmed).map((result) => ({
    prompt: result.item,
    matches: result.matches,
  }));
}

// One slice of a field, flagged as matched or not, for rendering highlights.
export interface HighlightSegment {
  text: string;
  highlight: boolean;
}

// Turn a field value + Fuse matches into segments so the UI can wrap matched
// runs in <mark>. Robust against adjacent/overlapping match ranges.
export function getHighlightSegments(
  value: string,
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
): HighlightSegment[] {
  const plain: HighlightSegment[] = [{ text: value, highlight: false }];
  if (!matches) return plain;

  const match = matches.find((m) => m.key === key);
  if (!match || match.indices.length === 0) return plain;

  const ranges = [...match.indices].sort((a, b) => a[0] - b[0]);
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const [rawStart, rawEnd] of ranges) {
    const start = Math.max(rawStart, cursor);
    const end = rawEnd + 1; // Fuse end indices are inclusive
    if (end <= cursor) continue; // fully behind cursor — skip
    if (start > cursor) {
      segments.push({ text: value.slice(cursor, start), highlight: false });
    }
    segments.push({ text: value.slice(start, end), highlight: true });
    cursor = end;
  }

  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor), highlight: false });
  }

  return segments;
}
