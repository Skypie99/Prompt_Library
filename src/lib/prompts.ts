import seedData from "@/data/prompts.json";
import type { Prompt } from "./types";

// Seed prompts shipped with the app (read-only). To add your own permanent
// prompts, edit src/data/prompts.json directly. User-added prompts saved to
// localStorage will be merged in here in a later phase.
export const seedPrompts: Prompt[] = seedData as Prompt[];

/** Unique category names derived from the prompts themselves, alphabetised. */
export function getCategories(prompts: Prompt[]): string[] {
  return Array.from(new Set(prompts.map((p) => p.category))).sort();
}

/**
 * Tags derived from the prompts, ordered by frequency (most-used first),
 * tie-broken alphabetically so the order is stable between renders. Empty
 * tags are dropped — they're a data hygiene problem, not a filter option.
 */
export function getTags(prompts: Prompt[]): string[] {
  const counts = new Map<string, number>();
  for (const p of prompts) {
    for (const tag of p.tags) {
      const t = tag.trim();
      if (!t) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // higher count first
      return a[0].localeCompare(b[0]); // alphabetical tie-break
    })
    .map(([tag]) => tag);
}
