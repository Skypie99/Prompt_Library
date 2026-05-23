import type { Prompt, PromptVariable } from "./types";

// Matches {{ name }} tokens, tolerating surrounding whitespace. The capture
// group is the variable name. Defined as a string so each helper can build its
// own RegExp with a fresh lastIndex (a shared /g regex is stateful).
const TOKEN_SOURCE = "\\{\\{\\s*([^}]+?)\\s*\\}\\}";

export interface ResolvedVariable extends PromptVariable {
  /** Render a multi-line textarea instead of a single-line input. */
  multiline: boolean;
}

// A prompt body broken into plain text and variable tokens, in order.
export type BodySegment =
  | { type: "text"; value: string }
  | { type: "var"; name: string; raw: string };

// Turn "camelCase_or-snake" into "Camel Case Or Snake" for tokens that have no
// declared label.
function humanize(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

// Heuristic so long-form fields (code, transcripts, notes) get a textarea.
function isLikelyMultiline(name: string, placeholder?: string): boolean {
  if (placeholder && /paste|paragraph|multiple lines/i.test(placeholder)) return true;
  return /code|snippet|content|body|text|notes|paragraph|essay|transcript|message/i.test(name);
}

// Detect variables actually present in the body (first-appearance order,
// de-duplicated) and enrich them with any declared metadata. This means the UI
// always matches the body — even for prompts whose {{tokens}} were never
// formally declared (e.g. user-added prompts later).
export function extractVariables(prompt: Prompt): ResolvedVariable[] {
  const declared = new Map<string, PromptVariable>(
    prompt.variables.map((variable) => [variable.name, variable]),
  );
  const seen = new Set<string>();
  const result: ResolvedVariable[] = [];

  const regex = new RegExp(TOKEN_SOURCE, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(prompt.body)) !== null) {
    const name = match[1].trim();
    if (seen.has(name)) continue;
    seen.add(name);

    const meta = declared.get(name);
    result.push({
      name,
      label: meta?.label ?? humanize(name),
      placeholder: meta?.placeholder,
      multiline: isLikelyMultiline(name, meta?.placeholder),
    });
  }

  return result;
}

// Split the body into text/variable segments for live-preview rendering.
export function parseBody(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  const regex = new RegExp(TOKEN_SOURCE, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, match.index) });
    }
    segments.push({ type: "var", name: match[1].trim(), raw: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }

  return segments;
}

// Final prompt text for Copy / Run: filled tokens replaced by their value,
// unfilled tokens left as {{name}} so it's obvious what's still missing.
export function substituteBody(body: string, values: Record<string, string>): string {
  const regex = new RegExp(TOKEN_SOURCE, "g");
  return body.replace(regex, (whole, rawName: string) => {
    const value = values[rawName.trim()];
    return value && value.trim() !== "" ? value : whole;
  });
}

// How many of the detected variables currently have a non-empty value.
export function countFilled(
  variables: ResolvedVariable[],
  values: Record<string, string>,
): number {
  return variables.filter((variable) => (values[variable.name] ?? "").trim() !== "").length;
}
