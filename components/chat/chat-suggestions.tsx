import type { LucideIcon } from "lucide-react";

export type SuggestionPrompt = {
  icon: LucideIcon;
  label: string;
  prompt: string;
  accent: string;
};

type ChatSuggestionsProps = {
  prompts: SuggestionPrompt[];
  onSelect: (prompt: string) => void;
};

export function ChatSuggestions({
  prompts,
  onSelect,
}: ChatSuggestionsProps) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
      {prompts.map((suggestion, index) => {
        const Icon = suggestion.icon;
        return (
          <button
            key={`${suggestion.label}-${index}`}
            type="button"
            aria-label={`Ask: ${suggestion.prompt}`}
            onClick={() => onSelect(suggestion.prompt)}
            className="group flex h-full items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-transparent p-4 text-left transition-colors duration-150 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gradient-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${suggestion.accent}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {suggestion.label}
              </p>
              <p className="text-sm leading-snug text-[var(--text-secondary)]">
                {suggestion.prompt}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

