"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import {
  Mic,
  Globe,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react";
import Image from "next/image";
import { formatFileSize } from "../../lib/utils";
import type { ChatAttachment } from "../../lib/chat/types";

type AIChatInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  canSend?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  deepSearchEnabled?: boolean;
  onDeepSearchToggle?: (value: boolean) => void;
  attachments?: ChatAttachment[];
  onAttachmentsSelect?: (files: FileList | null) => void;
  onAttachmentRemove?: (id: string) => void;
  attachmentError?: string | null;
  className?: string;
};

const containerVariants = {
  collapsed: {
    height: 68,
    minHeight: 68,
    boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
    transition: { type: "spring" as const, stiffness: 120, damping: 18 },
  },
  expanded: {
    height: "auto",
    minHeight: 168,
    boxShadow: "0 8px 32px 0 rgba(0,0,0,0.16)",
    transition: { type: "spring" as const, stiffness: 120, damping: 18 },
  },
  withAttachments: {
    height: "auto",
    minHeight: 280,
    boxShadow: "0 12px 40px 0 rgba(0,0,0,0.2)",
    transition: { type: "spring" as const, stiffness: 120, damping: 18 },
  },
} satisfies Variants;

const defaultDeepSearchState = (value?: boolean) => value ?? false;

const AIChatInput = ({
  value,
  onValueChange,
  onSubmit,
  canSend = true,
  isStreaming = false,
  onStop,
  deepSearchEnabled,
  onDeepSearchToggle,
  attachments = [],
  onAttachmentsSelect,
  onAttachmentRemove,
  attachmentError,
  className,
}: AIChatInputProps) => {
  const [isActive, setIsActive] = useState(false);
  const [deepSearchActive, setDeepSearchActive] = useState(
    defaultDeepSearchState(deepSearchEnabled),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentCount = attachments.length;

  useEffect(() => {
    setDeepSearchActive(defaultDeepSearchState(deepSearchEnabled));
  }, [deepSearchEnabled]);

  // Close input when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        if (!value && attachmentCount === 0) setIsActive(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, attachmentCount]);

  useEffect(() => {
    if (attachmentCount > 0) {
      setIsActive(true);
    }
  }, [attachmentCount]);

  const handleActivate = () => {
    setIsActive(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(event.target.value);
  };

  const handleSubmit = () => {
    if (!canSend) return;
    onSubmit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const toggleDeepSearch = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const next = !deepSearchActive;
    setDeepSearchActive(next);
    onDeepSearchToggle?.(next);
  };

  const handleAttachmentButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    handleActivate();
    fileInputRef.current?.click();
  };

  const handleAttachmentInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onAttachmentsSelect?.(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    event.stopPropagation();
    onAttachmentRemove?.(id);
  };

  const hasAttachments = attachmentCount > 0;
  const showPlaceholder = !value && !hasAttachments;

  return (
    <div
      className={`w-full flex justify-center items-center text-[var(--text-primary)] ${className ?? ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        className="hidden"
        onChange={handleAttachmentInputChange}
        aria-hidden="true"
      />
      <motion.div
        ref={wrapperRef}
        className="w-full max-w-4xl bg-[var(--bg-secondary)] dark:bg-[#222222]"
        variants={containerVariants}
        animate={
          hasAttachments
            ? "withAttachments"
            : isActive || value
              ? "expanded"
              : "collapsed"
        }
        initial="collapsed"
        style={{ overflow: "hidden", borderRadius: 32 }}
        onClick={handleActivate}
      >
        <div className="flex flex-col items-stretch w-full h-full">
          <AnimatePresence initial={false}>
            {hasAttachments && (
              <motion.div
                key="attachment-preview"
                className="w-full px-4 pt-4 pb-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex flex-wrap gap-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="group relative flex w-[108px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90"
                    >
                      <div className="relative h-[86px] w-full overflow-hidden">
                        <Image
                          src={attachment.dataUrl}
                          alt={attachment.name}
                          fill
                          unoptimized
                          sizes="96px"
                          className="object-cover"
                          draggable={false}
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`Remove attachment ${attachment.name}`}
                          onClick={(event) =>
                            handleRemoveAttachment(event, attachment.id)
                          }
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex min-h-[44px] flex-col gap-0.5 px-2 pb-2 pt-1">
                        <span className="truncate text-[11px] font-medium text-[var(--text-primary)]">
                          {attachment.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {formatFileSize(attachment.size)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {attachmentError && (
                  <p className="mt-2 text-xs text-red-400">{attachmentError}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Row */}
          <div className="flex items-center gap-2 px-3 py-3.5 rounded-full bg-[var(--bg-surface)] dark:bg-[#222222] max-w-4xl w-full">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title="Attach file"
              type="button"
              tabIndex={-1}
              onClick={handleAttachmentButtonClick}
            >
              <Paperclip size={20} />
            </button>

            {/* Text Input & Placeholder */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="flex-1 border-0 outline-0 rounded-md py-2 text-base bg-transparent w-full font-normal text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                onFocus={handleActivate}
                placeholder={showPlaceholder ? "Message Yurie" : ""}
                disabled={isStreaming && !onStop}
              />
            </div>

            <motion.button
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${deepSearchActive ? "bg-blue-600/20 text-blue-950 dark:text-blue-100" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"}`}
              title="Search"
              type="button"
              tabIndex={-1}
              onClick={toggleDeepSearch}
              layout
            >
              <Globe size={20} />
            </motion.button>
            {isStreaming ? (
              <button
                className="inline-flex h-10 w-10 items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition"
                title="Stop"
                type="button"
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation();
                  onStop?.();
                }}
                disabled={!onStop}
              >
                <Square size={18} />
              </button>
            ) : (
              <button
                className="inline-flex h-10 w-10 items-center justify-center bg-gradient-to-r from-[var(--gradient-blue)] to-[var(--gradient-purple)] hover:from-[var(--gradient-purple)] hover:to-[var(--gradient-pink)] text-white rounded-full font-medium transition disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
                title="Send"
                type="button"
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation();
                  handleSubmit();
                }}
                disabled={!canSend}
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export { AIChatInput };
