// The shape of every prompt in the app — both the seed prompts shipped in
// prompts.json and the ones a user adds in-app (added in a later phase).

export interface PromptVariable {
  /** Matches a {{token}} inside the prompt body. */
  name: string;
  /** Human-friendly label shown above the input field. */
  label: string;
  /** Optional example text shown inside the empty input. */
  placeholder?: string;
}

export interface Prompt {
  /** Stable slug or uuid. */
  id: string;
  title: string;
  /** One-line summary shown on cards and in search results. */
  description: string;
  /** The actual prompt text. May contain {{variables}}. */
  body: string;
  variables: PromptVariable[];
  category: string;
  tags: string[];
  /** ISO date string. */
  createdAt: string;
  /** true for built-ins from prompts.json; false for user-added prompts. */
  isSeed: boolean;
}
