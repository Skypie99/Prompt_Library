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
