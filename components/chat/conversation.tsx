"use client";

import { ArrowDownIcon } from "lucide-react";
import type {
  ComponentProps,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";
import {
  StickToBottom,
  useStickToBottomContext,
} from "use-stick-to-bottom";
import { cn } from "../../lib/utils";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export function Conversation({
  className,
  ...props
}: ConversationProps) {
  return (
    <StickToBottom
      className={cn(
        "relative flex flex-1 overflow-y-auto",
        className,
      )}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    />
  );
}

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export function ConversationContent({
  className,
  ...props
}: ConversationContentProps) {
  return (
    <StickToBottom.Content
      className={cn(
        "mx-auto flex w-full max-w-4xl flex-col px-4 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}

export type ConversationEmptyStateProps = PropsWithChildren<{
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}>;

export function ConversationEmptyState({
  title = "Start a conversation",
  description = "Type a message below to begin chatting.",
  icon,
  children,
  className,
}: ConversationEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl bg-transparent px-6 py-16 text-center text-slate-400",
        className,
      )}
    >
      {children ?? (
        <>
          {icon}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export type ConversationScrollButtonProps = HTMLAttributes<HTMLButtonElement>;

export function ConversationScrollButton({
  className,
  children,
  ...props
}: ConversationScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() =>
        scrollToBottom({
          animation: "smooth",
          ignoreEscapes: true,
        })
      }
      className={cn(
        "absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)]/95 px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] shadow-xl backdrop-blur-xl transition-all hover:bg-[var(--bg-hover)] hover:shadow-2xl hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gradient-blue)]",
        className,
      )}
      {...props}
    >
      <ArrowDownIcon className="h-3.5 w-3.5" />
      {children ?? "Scroll to latest"}
    </button>
  );
}

