import { OrbitIcon, SparkleIcon } from "lucide-react";

export function ChatHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 shadow-[0_12px_30px_-20px_rgba(147,197,253,0.45)]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--gradient-blue)]/30 via-[var(--gradient-purple)]/20 to-[var(--gradient-pink)]/25 blur-lg" />
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--bg-primary)]">
              <OrbitIcon className="h-5 w-5 text-[var(--gradient-blue)]" strokeWidth={1.6} />
            </div>
            <SparkleIcon className="absolute -top-1 -right-1 h-3.5 w-3.5 text-[var(--gradient-pink)]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">
              Yurie
            </span>
            <span className="text-base font-semibold text-[var(--text-primary)]">
              AI Research Lab
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

