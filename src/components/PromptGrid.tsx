"use client";

import type { Prompt } from "@/lib/types";
import { PromptCard } from "./PromptCard";

interface PromptGridProps {
  prompts: Prompt[];
  onOpen: (prompt: Prompt) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

export function PromptGrid({ prompts, onOpen, isFavorite, onToggleFavorite }: PromptGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onOpen={() => onOpen(prompt)}
          isFavorite={isFavorite(prompt.id)}
          onToggleFavorite={() => onToggleFavorite(prompt.id)}
        />
      ))}
    </div>
  );
}
