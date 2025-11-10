import type { ChatMessage } from "./types";

export function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
}

export function createPlaceholderMessage(): ChatMessage {
  return {
    id: createId(),
    role: "assistant",
    content: "",
    reasoning: "",
    isReasoningStreaming: false,
  };
}

export function updateMessageById(
  messages: ChatMessage[],
  id: string,
  updater: (message: ChatMessage) => ChatMessage,
): ChatMessage[] {
  const index = messages.findIndex((message) => message.id === id);
  if (index === -1) {
    return messages;
  }

  const next = messages.slice();
  next[index] = updater(next[index]);
  return next;
}

export function formatAssistantMessage(content: string): string {
  return content.replace(/\s+$/g, "");
}

