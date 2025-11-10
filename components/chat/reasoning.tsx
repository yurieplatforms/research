"use client";

import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import { Streamdown } from "streamdown";
import { cn } from "../../lib/utils";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  duration?: number;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

function useReasoningContext(): ReasoningContextValue {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
}

export type ReasoningProps = PropsWithChildren<{
  className?: string;
  isStreaming?: boolean;
  defaultOpen?: boolean;
  duration?: number;
}>;

const AUTO_CLOSE_DELAY = 1000;

export function Reasoning({
  className,
  children,
  isStreaming = false,
  defaultOpen = true,
  duration,
}: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasAutoClosed, setHasAutoClosed] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [internalDuration, setInternalDuration] = useState<number | undefined>(
    duration,
  );

  useEffect(() => {
    setInternalDuration(duration);
  }, [duration]);

  useEffect(() => {
    if (isStreaming) {
      setStartTime((previous) => previous ?? Date.now());
      setHasAutoClosed(false);
      setIsOpen(true);
      if (typeof duration !== "number") {
        setInternalDuration(undefined);
      }
    }
  }, [isStreaming, duration]);

  useEffect(() => {
    if (!isStreaming && startTime !== null) {
      const elapsedMs = Date.now() - startTime;
      const seconds = Math.max(1, Math.round(elapsedMs / 1000));
      if (typeof duration !== "number") {
        setInternalDuration(seconds);
      }
      setStartTime(null);
    }
  }, [isStreaming, startTime, duration]);

  useEffect(() => {
    if (isStreaming || !isOpen || hasAutoClosed) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(false);
      setHasAutoClosed(true);
    }, AUTO_CLOSE_DELAY);

    return () => window.clearTimeout(timer);
  }, [isStreaming, isOpen, hasAutoClosed]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setIsOpen(next);
      if (!next) {
        setHasAutoClosed(true);
      } else if (isStreaming) {
        setHasAutoClosed(false);
      }
    },
    [isStreaming],
  );

  const value = useMemo<ReasoningContextValue>(
    () => ({
      isStreaming,
      isOpen,
      setOpen: handleOpenChange,
      toggle: () => handleOpenChange(!isOpen),
      duration: typeof duration === "number" ? duration : internalDuration,
    }),
    [handleOpenChange, internalDuration, isOpen, isStreaming, duration],
  );

  return (
    <ReasoningContext.Provider value={value}>
      <div
        className={cn(
          "group flex w-full flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-3 py-2 text-[var(--text-primary)] shadow-[0_18px_48px_-34px_rgba(0,0,0,0.35)] transition-shadow",
          isStreaming && "shadow-[0_22px_60px_-32px_rgba(0,0,0,0.45)]",
          className,
        )}
        data-state={isOpen ? "open" : "closed"}
        data-streaming={isStreaming ? "true" : "false"}
      >
        {children}
      </div>
    </ReasoningContext.Provider>
  );
}

export type ReasoningTriggerProps = {
  className?: string;
  children?: ReactNode;
};

function formatDuration(duration?: number): string {
  if (duration === undefined) {
    return "Thought for a few seconds";
  }
  if (duration <= 1) {
    return "Thought for 1 second";
  }
  return `Thought for ${duration} seconds`;
}

export function ReasoningTrigger({
  className,
  children,
}: ReasoningTriggerProps) {
  const { isStreaming, isOpen, toggle, duration } = useReasoningContext();

  const label = isStreaming ? (
    <span className="text-sm font-medium thinking-shimmer">Thinking…</span>
  ) : (
    <span className="text-sm font-medium">{formatDuration(duration)}</span>
  );

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "group/reasoning-trigger flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gradient-blue)]",
        className,
      )}
      aria-expanded={isOpen}
    >
      {children ?? (
        <>
          <span className="relative flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center text-[var(--text-secondary)] transition-colors duration-300 group-hover/reasoning-trigger:text-[var(--text-secondary)] group-hover/reasoning-trigger:[&_svg]:fill-[#facc15]",
                isOpen && "[&_svg]:fill-[#facc15]",
              )}
            >
              <Lightbulb
                className={cn("h-4 w-4", isStreaming && "animate-pulse")}
                fill={isStreaming || isOpen ? "#facc15" : "none"}
              />
            </span>
            {label}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              isOpen ? "rotate-180" : "rotate-0",
            )}
            aria-hidden="true"
          />
        </>
      )}
    </button>
  );
}

export type ReasoningContentProps = {
  className?: string;
  children: string;
};

export function ReasoningContent({
  className,
  children,
}: ReasoningContentProps) {
  const { isOpen, isStreaming } = useReasoningContext();
  const normalized = typeof children === "string" ? children : "";
  const hasContent = normalized.trim().length > 0;

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
        isOpen ? "grid-rows-[1fr] opacity-100 mt-2.5" : "grid-rows-[0fr] opacity-0 mt-0",
        className,
      )}
      data-state={isOpen ? "open" : "closed"}
      aria-hidden={!isOpen}
    >
      <div className="overflow-hidden">
        {hasContent ? (
          <Streamdown
            className={cn(
              "prose prose-slate max-w-none text-[14px] leading-relaxed",
              "prose-sm dark:prose-invert",
              "prose-p:my-2 prose-p:text-[var(--text-secondary)]",
              "prose-ul:my-2 prose-li:my-1.5 prose-li:text-[var(--text-secondary)]",
              "prose-ol:my-2",
              "prose-strong:text-[var(--text-primary)] prose-strong:font-semibold",
              "prose-code:text-[var(--text-primary)] prose-code:bg-[var(--bg-secondary)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md",
            )}
          >
            {normalized}
          </Streamdown>
        ) : !isStreaming ? (
          <p className="text-sm italic text-[var(--text-secondary)]/80">
            No reasoning provided.
          </p>
        ) : null}
      </div>
    </div>
  );
}

