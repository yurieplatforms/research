"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SearchIcon,
  ScrollIcon,
  FlaskConicalIcon,
  ClapperboardIcon,
} from "lucide-react";
import Image from "next/image";
import type { StickToBottomContext } from "use-stick-to-bottom";

import { formatFileSize } from "../../lib/utils";
import {
  ChatAttachment,
  ChatMessage,
  ApiChatMessage,
} from "../../lib/chat/types";
import {
  createId,
  createPlaceholderMessage,
  updateMessageById,
  formatAssistantMessage,
} from "../../lib/chat/messages";
import { extractEventsFromBuffer } from "../../lib/chat/streaming";
import { mapMessageToApiContent } from "../../lib/chat/api";
import {
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  prepareImageAttachment,
} from "../../lib/chat/attachments";
import { AIChatInput } from "../ui/ai-chat-input";
import { ChatHeader } from "./chat-header";
import { ChatSuggestions, type SuggestionPrompt } from "./chat-suggestions";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "./conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "./message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./reasoning";

const SUGGESTION_PROMPTS: SuggestionPrompt[] = [
  {
    icon: SearchIcon,
    label: "Research",
    prompt: "Craft a whimsical yet rigorous research proposal exploring how gamification in education could revolutionize learning outcomes while addressing cognitive biases in AI-driven personalized curricula.",
    accent: "bg-sky-500/10 text-sky-200 border border-sky-500/20",
  },
  {
    icon: ScrollIcon,
    label: "History",
    prompt: "Dive into an alternate history scenario where the Library of Alexandria never burned, speculating on its profound effects on scientific progress, cultural exchanges, and the trajectory of human innovation across centuries.",
    accent: "bg-amber-500/10 text-amber-200 border border-amber-500/20",
  },
  {
    icon: FlaskConicalIcon,
    label: "Science",
    prompt: "Unravel the enigmatic world of fractal geometry in nature, investigating how self-similar patterns in snowflakes and coastlines could inspire breakthroughs in chaos theory and predictive modeling for climate phenomena.",
    accent: "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20",
  },
  {
    icon: ClapperboardIcon,
    label: "Entertainment",
    prompt: "Invent an elaborate escape room adventure that fuses elements of steampunk aesthetics, quantum puzzle mechanics, and interactive storytelling, complete with branching narratives and hidden Easter eggs for repeat players.",
    accent: "bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-500/20",
  },
];

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationContextRef = useRef<StickToBottomContext | null>(null);
  const messagesRef = useRef(messages);

  const canSend = useMemo(
    () =>
      !isStreaming &&
      (input.trim().length > 0 || attachments.length > 0),
    [input, isStreaming, attachments.length],
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      conversationContextRef.current?.scrollToBottom({
        animation: behavior,
        ignoreEscapes: true,
      });
    },
    [],
  );

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const handleAttachmentsSelect = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) {
        return;
      }

      const files = Array.from(fileList);
      const errorMessages = new Set<string>();
      const validFiles: File[] = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          errorMessages.add("Only image files are supported.");
          continue;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          errorMessages.add(
            `Images must be ${MAX_FILE_SIZE_MB} MB or smaller.`,
          );
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        setAttachmentError(
          errorMessages.size > 0 ? Array.from(errorMessages).join(" ") : null,
        );
        return;
      }

      try {
        const attachmentsToAdd: ChatAttachment[] = [];
        for (const file of validFiles) {
          try {
            const optimized = await prepareImageAttachment(file);
            attachmentsToAdd.push({
              id: createId(),
              name: optimized.name,
              size: optimized.size,
              type: optimized.type,
              dataUrl: optimized.dataUrl,
            });
          } catch (error) {
            console.error("Failed to process attachment", file.name, error);
            errorMessages.add(
              error instanceof Error
                ? error.message
                : "We couldn't process one of the images. Please try another file.",
            );
          }
        }

        let addedCount = 0;
        setAttachments((prev) => {
          const remainingSlots = Math.max(MAX_ATTACHMENTS - prev.length, 0);
          if (remainingSlots <= 0) {
            return prev;
          }

          const allowed = attachmentsToAdd.slice(0, remainingSlots);
          addedCount = allowed.length;

          if (allowed.length === 0) {
            return prev;
          }

          return [...prev, ...allowed];
        });

        if (attachmentsToAdd.length > addedCount) {
          errorMessages.add(
            `You can attach up to ${MAX_ATTACHMENTS} images per message.`,
          );
        }

        setAttachmentError(
          errorMessages.size > 0 ? Array.from(errorMessages).join(" ") : null,
        );
      } catch (error) {
        console.error("Failed to process attachment", error);
        setAttachmentError(
          "We couldn't process one of the images. Please try another file.",
        );
      }
    },
    [],
  );

  const handleAttachmentRemove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    setAttachmentError(null);
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      attachments:
        attachments.length > 0
          ? attachments.map((attachment) => ({ ...attachment }))
          : undefined,
    };
    const placeholder = createPlaceholderMessage();

    setMessages((prev) => [...prev, userMessage, placeholder]);
    setInput("");
    setAttachments([]);
    setAttachmentError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const conversationHistory = [...messagesRef.current, userMessage];
      const payloadMessages: ApiChatMessage[] = conversationHistory.map(
        (message) => ({
          role: message.role,
          content: mapMessageToApiContent(message),
        }),
      );

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: payloadMessages,
          webSearch: webSearchEnabled,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(
          errorText || "The assistant was unable to respond. Please retry.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setMessages((prev) =>
            updateMessageById(prev, placeholder.id, (message) => {
              const trimmedContent = formatAssistantMessage(message.content);
              const cleanedReasoning =
                typeof message.reasoning === "string"
                  ? message.reasoning.trim()
                  : undefined;

              const reasoningStartedAt = message.reasoningStartedAt;
              let reasoningStoppedAt =
                typeof message.reasoningStoppedAt === "number"
                  ? message.reasoningStoppedAt
                  : undefined;

              if (
                typeof reasoningStoppedAt !== "number" &&
                typeof reasoningStartedAt === "number" &&
                message.isReasoningStreaming
              ) {
                reasoningStoppedAt = Date.now();
              }

              let reasoningDuration = message.reasoningDurationSeconds;
              if (
                typeof reasoningDuration !== "number" &&
                typeof reasoningStartedAt === "number" &&
                typeof reasoningStoppedAt === "number" &&
                reasoningStoppedAt >= reasoningStartedAt
              ) {
                reasoningDuration = Math.max(
                  1,
                  Math.round(
                    (reasoningStoppedAt - reasoningStartedAt) / 1000,
                  ),
                );
              }

              return {
                ...message,
                content: trimmedContent,
                reasoning:
                  cleanedReasoning && cleanedReasoning.length > 0
                    ? cleanedReasoning
                    : undefined,
                reasoningDurationSeconds: reasoningDuration,
                reasoningStartedAt: undefined,
                reasoningStoppedAt: undefined,
                isReasoningStreaming: false,
              };
            }),
          );
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = extractEventsFromBuffer(buffer);
        buffer = remainder;

        for (const event of events) {
          if (event.type === "delta") {
            const { content, reasoning } = event;
            if (!content && !reasoning) {
              continue;
            }

            setMessages((prev) =>
              updateMessageById(prev, placeholder.id, (message) => {
                const now = Date.now();
                const hasContent =
                  typeof content === "string" && content.length > 0;
                const hasReasoning =
                  typeof reasoning === "string" && reasoning.length > 0;
                const next: ChatMessage = {
                  ...message,
                  content: hasContent
                    ? message.content + (content as string)
                    : message.content,
                };

                if (hasReasoning) {
                  const previousReasoning = message.reasoning ?? "";
                  next.reasoning = `${previousReasoning}${reasoning}`;
                  next.reasoningStartedAt =
                    typeof message.reasoningStartedAt === "number"
                      ? message.reasoningStartedAt
                      : now;
                  next.reasoningStoppedAt = now;
                  next.isReasoningStreaming = true;
                } else if (hasContent && message.isReasoningStreaming) {
                  next.isReasoningStreaming = false;

                  if (
                    typeof next.reasoningDurationSeconds !== "number" &&
                    typeof message.reasoningStartedAt === "number"
                  ) {
                    const stoppedAt =
                      message.reasoningStoppedAt ?? message.reasoningStartedAt;
                    if (typeof stoppedAt === "number") {
                      const elapsedSeconds = Math.max(
                        1,
                        Math.round(
                          (stoppedAt - message.reasoningStartedAt) / 1000,
                        ),
                      );
                      next.reasoningDurationSeconds = elapsedSeconds;
                    }
                  }
                }

                return next;
              }),
            );
          } else if (event.type === "error") {
            throw new Error(event.error);
          } else if (event.type === "done") {
            buffer = "";
          }
        }

        scrollToBottom();
      }
    } catch (error) {
      const fallback =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      setMessages((prev) =>
        updateMessageById(prev, placeholder.id, (message) => ({
          ...message,
          content: `⚠️ ${fallback}`,
          reasoning: undefined,
          reasoningDurationSeconds: undefined,
          reasoningStartedAt: undefined,
          reasoningStoppedAt: undefined,
          isReasoningStreaming: false,
        })),
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      scrollToBottom();
    }
  }, [attachments, input, scrollToBottom, webSearchEnabled]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSend) return;
      void sendMessage();
    },
    [canSend, sendMessage],
  );

  const handleSuggestionClick = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] transition-colors duration-300">
      <ChatHeader />

      <main className="mx-auto flex w-full max-w-full md:max-w-4xl flex-1 flex-col px-2 sm:px-4 pb-24 pt-6 sm:pt-8">
        <Conversation
          contextRef={conversationContextRef}
          className="flex flex-1 flex-col"
        >
          <ConversationContent className="pb-12 sm:pb-20">
            {messages.length === 0 ? (
              <ConversationEmptyState className="items-center justify-start pt-24 text-left sm:pt-32">
                <ChatSuggestions
                  prompts={SUGGESTION_PROMPTS}
                  onSelect={handleSuggestionClick}
                />
              </ConversationEmptyState>
            ) : (
              <div className="space-y-10 py-6 sm:py-8">
                {messages.map((message) => {
                  const reasoningIsStreaming = message.isReasoningStreaming ?? false;
                  const reasoningText = message.reasoning ?? "";
                  const hasReasoningText = reasoningText.trim().length > 0;
                  const shouldRenderReasoning =
                    reasoningIsStreaming || hasReasoningText;

                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent>
                        {message.role === "assistant" ? (
                          <>
                            {shouldRenderReasoning ? (
                              <Reasoning
                                className="w-full"
                                isStreaming={reasoningIsStreaming}
                                duration={message.reasoningDurationSeconds}
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>
                                  {reasoningText}
                                </ReasoningContent>
                              </Reasoning>
                            ) : null}
                            <MessageResponse>{message.content}</MessageResponse>
                          </>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {message.content.trim().length > 0 && (
                              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text-primary)]">
                                {message.content}
                              </div>
                            )}
                            {message.attachments?.length ? (
                              <div className="flex flex-wrap gap-3">
                                {message.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 shadow-sm"
                                  >
                                    <a
                                      href={attachment.dataUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <div className="relative h-28 w-32">
                                        <Image
                                          src={attachment.dataUrl}
                                          alt={attachment.name}
                                          fill
                                          unoptimized
                                          sizes="128px"
                                          className="object-cover"
                                          draggable={false}
                                        />
                                      </div>
                                    </a>
                                    <div className="flex flex-col gap-0.5 px-3 py-2">
                                      <span className="truncate text-[12px] font-medium text-[var(--text-primary)]">
                                        {attachment.name}
                                      </span>
                                      <span className="text-[11px] text-[var(--text-secondary)]">
                                        {formatFileSize(attachment.size)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </MessageContent>
                    </Message>
                  );
                })}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[var(--bg-primary)] to-[var(--bg-primary)]/95 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-full md:max-w-4xl px-2 sm:px-4 pb-5 pt-4 sm:pb-6 sm:pt-5">
          <form onSubmit={handleSubmit} className="relative space-y-2.5">
            <AIChatInput
              className="w-full"
              value={input}
              onValueChange={setInput}
              onSubmit={() => void sendMessage()}
              canSend={canSend}
              isStreaming={isStreaming}
              onStop={handleStop}
              deepSearchEnabled={webSearchEnabled}
              onDeepSearchToggle={(next) => setWebSearchEnabled(next)}
              attachments={attachments}
              onAttachmentsSelect={handleAttachmentsSelect}
              onAttachmentRemove={handleAttachmentRemove}
              attachmentError={attachmentError}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

