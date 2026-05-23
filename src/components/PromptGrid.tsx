"use client";

import type { Prompt } from "@/lib/types";
import { PromptCard } from "./PromptCard";
import type { Density } from "@/lib/density";

interface PromptGridProps {
  prompts: Prompt[];
  onOpen: (prompt: Prompt) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  /** Optional: clicking a tag chip on a card sets it as the active filter. */
  onSelectTag?: (tag: string) => void;
  /** Optional map of promptId → run count for the F-fast-2 usage badge.
   *  Omit to hide all badges. */
  runCounts?: Map<string, number>;
  /** F-fast-5 — grid density. Compact gets an extra column at md+
   *  and tighter spacing; comfortable is the original layout. */
  density?: Density;
}

export function PromptGrid({
  prompts,
  onOpen,
  isFavorite,
  onToggleFavorite,
  onSelectTag,
  runCounts,
  density = "comfortable",
}: PromptGridProps) {
  const gridClass =
    density === "compact"
      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={gridClass}>
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onOpen={() => onOpen(prompt)}
          isFavorite={isFavorite(prompt.id)}
          onToggleFavorite={() => onToggleFavorite(prompt.id)}
          onSelectTag={onSelectTag}
          runCount={runCounts?.get(prompt.id)}
          density={density}
        />
      ))}
    </div>
  );
}
