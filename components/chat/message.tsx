"use client";

import { Children, useEffect, useMemo, useRef } from "react";
import type {
  ComponentProps,
  HTMLAttributes,
  ReactNode,
} from "react";
import { SparklesIcon, UserIcon } from "lucide-react";
import dynamic from "next/dynamic";
import type { StreamdownProps } from "streamdown";
import { cn } from "../../lib/utils";

export type MessageRole = "user" | "assistant" | "system";

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {
  from: MessageRole;
  avatar?: ReactNode;
  header?: ReactNode;
}

export function Message({
  from,
  avatar,
  header,
  className,
  children,
  ...props
}: MessageProps) {
  const isAssistant = from === "assistant";
  const isUser = from === "user";

  const displayHeader = header ?? (isUser ? null : "Yurie");

  return (
    <article
      className={cn(
        "group flex w-full animate-slide-up",
        isUser && "justify-end",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex items-start",
          isAssistant
            ? "w-full gap-2 sm:gap-3.5 md:gap-4"
            : "ml-auto w-auto flex-row-reverse gap-0",
        )}
      >
        {!isUser && <MessageAvatar from={from}>{avatar}</MessageAvatar>}
        <div
          className={cn(
            "flex min-w-0 flex-col gap-1.5",
            isAssistant ? "flex-1" : "items-end",
          )}
        >
          {displayHeader && (
            <header className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <span>{displayHeader}</span>
            </header>
          )}
          <MessageSurface from={from}>{children}</MessageSurface>
        </div>
      </div>
    </article>
  );
}

interface MessageSurfaceProps {
  from: MessageRole;
  children: ReactNode;
}

function MessageSurface({ from, children }: MessageSurfaceProps) {
  const isAssistant = from === "assistant";
  const isUser = from === "user";

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="inline-flex max-w-[min(75%,32rem)] flex-col items-end gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 py-3 text-left text-[15px] leading-relaxed text-[var(--text-primary)] shadow-[0_18px_48px_-28px_rgba(59,130,246,0.55)] backdrop-blur-sm">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full text-[15px] leading-relaxed",
        isAssistant
          ? "text-[var(--text-primary)]"
          : isUser
            ? "text-[var(--text-primary)] text-right"
            : "text-[var(--text-secondary)]",
      )}
    >
      {children}
    </div>
  );
}

export interface MessageContentProps
  extends HTMLAttributes<HTMLDivElement> {}

export function MessageContent({
  className,
  children,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 text-base leading-7 text-slate-200",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface MessageResponseProps extends StreamdownProps {}

const Streamdown = dynamic(
  () => import("streamdown").then((mod) => mod.Streamdown),
  {
    ssr: false,
    loading: () => null,
  },
);

export function MessageResponse({
  className,
  children,
  parseIncompleteMarkdown = true,
  ...props
}: MessageResponseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markdownSource = useMemo(() => {
    if (typeof children === "string") {
      return children;
    }
    return Children.toArray(children)
      .map((child) => (typeof child === "string" ? child : ""))
      .join("");
  }, [children]);

  const codeBlockMeta = useMemo(
    () => extractCodeBlockMetadata(markdownSource),
    [markdownSource],
  );

  useEffect(() => {
    const root = containerRef.current;
    if (!root || codeBlockMeta.length === 0) {
      return;
    }

    const containers = Array.from(
      root.querySelectorAll<HTMLDivElement>('[data-code-block-container]'),
    );

    containers.forEach((element, index) => {
      const meta = codeBlockMeta[index];
      const header = element.querySelector<HTMLDivElement>(
        '[data-code-block-header]',
      );
      if (!header) {
        return;
      }

      const languageLabel = header.querySelector<HTMLSpanElement>("span");
      const formattedLanguage = meta?.language?.toUpperCase();

      if (formattedLanguage) {
        header.dataset.language = formattedLanguage;
        if (languageLabel && languageLabel.textContent !== formattedLanguage) {
          languageLabel.textContent = formattedLanguage;
        }
      } else {
        delete header.dataset.language;
      }

      if (languageLabel) {
        languageLabel.classList.add("code-block-language");
        languageLabel.classList.remove("lowercase");
      }

      const existingFilename = header.querySelector<HTMLSpanElement>(
        "[data-code-block-filename]",
      );

      if (meta?.filename) {
        header.dataset.filename = meta.filename;
        if (existingFilename) {
          if (existingFilename.textContent !== meta.filename) {
            existingFilename.textContent = meta.filename;
          }
        } else {
          const filenameTag = document.createElement("span");
          filenameTag.dataset.codeBlockFilename = "true";
          filenameTag.className = "code-block-filename";
          filenameTag.textContent = meta.filename;
          if (languageLabel && languageLabel.parentElement === header) {
            header.insertBefore(filenameTag, languageLabel);
          } else {
            header.insertBefore(filenameTag, header.firstChild);
          }
        }
      } else {
        delete header.dataset.filename;
        existingFilename?.remove();
      }

      const divider =
        header.querySelector<HTMLDivElement>("[data-code-block-divider]");
      if (divider) {
        divider.className = "code-block-divider";
      } else {
        const dividerElement = document.createElement("div");
        dividerElement.dataset.codeBlockDivider = "true";
        dividerElement.className = "code-block-divider";
        header.appendChild(dividerElement);
      }
    });
  }, [codeBlockMeta]);

  return (
    <div ref={containerRef}>
      <Streamdown
        className={cn(
          "prose prose-slate dark:prose-invert max-w-none space-y-5",
          "prose-p:text-[var(--text-primary)] prose-p:leading-[1.7] prose-p:text-[15px]",
          "prose-headings:text-[var(--text-primary)] prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
          "prose-strong:text-[var(--text-primary)] prose-strong:font-semibold",
          "prose-a:text-sky-400 hover:prose-a:text-sky-300 prose-a:no-underline hover:prose-a:underline prose-a:transition-colors",
          "prose-code:text-[var(--text-primary)] prose-code:bg-[var(--bg-secondary)] prose-code:rounded-lg prose-code:px-2 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-code:font-normal",
          "[&_pre]:rounded-xl [&_pre]:bg-[var(--bg-secondary)] [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-5 [&_pre]:!border-0 [&_pre]:!outline-none [&_pre]:!ring-0 [&_pre]:!shadow-none",
          "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px] [&_pre_code]:leading-relaxed",
          "prose-ul:text-[var(--text-primary)] prose-ul:my-4 prose-ol:text-[var(--text-primary)] prose-ol:my-4",
          "prose-li:text-[var(--text-primary)] prose-li:text-[15px] prose-li:leading-relaxed prose-li:my-1.5 prose-li:marker:text-[var(--text-secondary)]",
          "prose-blockquote:border-l-4 prose-blockquote:border-l-slate-600 prose-blockquote:text-[var(--text-secondary)] prose-blockquote:italic prose-blockquote:pl-4 prose-blockquote:my-6",
          "prose-hr:border-[var(--border-color)] prose-hr:my-6",
          "prose-table:text-[15px] prose-th:text-[var(--text-primary)] prose-td:text-[var(--text-primary)]",
          className,
        )}
        parseIncompleteMarkdown={parseIncompleteMarkdown}
        {...props}
      >
        {children}
      </Streamdown>
    </div>
  );
}

interface MessageAvatarProps {
  from: MessageRole;
  children?: ReactNode;
}

export function MessageAvatar({ from, children }: MessageAvatarProps) {
  const isAssistant = from === "assistant";
  const Icon = isAssistant ? SparklesIcon : UserIcon;
  return (
    <span
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
        isAssistant
          ? "bg-gradient-to-br from-[var(--gradient-blue)] via-[var(--gradient-purple)] to-[var(--gradient-pink)] text-white shadow-md group-hover:shadow-lg group-hover:shadow-[var(--gradient-blue)]/30"
          : "bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] group-hover:border-[var(--text-primary)] group-hover:text-[var(--text-primary)]",
      )}
    >
      {children ?? (
        <Icon className={cn("h-4 w-4", isAssistant && "animate-sparkle")} />
      )}
    </span>
  );
}

interface CodeBlockMetadata {
  language?: string;
  filename?: string;
}

function extractCodeBlockMetadata(source: string): CodeBlockMetadata[] {
  if (!source) {
    return [];
  }

  const metadata: CodeBlockMetadata[] = [];
  const fenceInfoPattern = /```([^\n\r]*)[\r\n]/g;
  let match: RegExpExecArray | null;

  while ((match = fenceInfoPattern.exec(source)) !== null) {
    const info = match[1]?.trim() ?? "";
    metadata.push(parseInfoString(info));
  }

  return metadata;
}

function parseInfoString(info: string): CodeBlockMetadata {
  if (!info) {
    return {};
  }

  const attributes: Record<string, string> = {};
  const attributePattern = /(\w+)=(?:"([^"]+)"|'([^']+)')/g;
  let attrMatch: RegExpExecArray | null;

  while ((attrMatch = attributePattern.exec(info)) !== null) {
    const key = attrMatch[1].toLowerCase();
    const value = attrMatch[2] ?? attrMatch[3] ?? "";
    attributes[key] = value;
  }

  let remaining = info.replace(attributePattern, " ").trim();
  const tokens = remaining.split(/\s+/).filter(Boolean);

  let language = tokens.shift();
  if (language?.includes("{")) {
    language = language.split("{")[0];
  }
  if (language?.includes(":")) {
    language = language.split(":")[0];
  }

  let filename =
    attributes.filename ??
    attributes.file ??
    attributes.title ??
    attributes.path;

  if (!filename && tokens.length > 0) {
    const candidate = tokens.find((token) =>
      /[./\\]/.test(token) || token.includes("index"),
    );
    filename = candidate ?? tokens.join(" ");
  }

  return {
    language: language?.trim(),
    filename: filename?.trim(),
  };
}

