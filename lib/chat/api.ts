import type { ChatMessage, ChatRequestContentPart } from "./types";

export const ATTACHMENT_ONLY_FALLBACK_TEXT =
  "Please analyze the attached image(s) and describe what you see.";

export function mapMessageToApiContent(
  message: ChatMessage,
): string | ChatRequestContentPart[] {
  const parts: ChatRequestContentPart[] = [];
  const text = message.content;
  const trimmedText = text.trim();

  if (trimmedText.length > 0) {
    parts.push({
      type: "text",
      text,
    });
  } else if (message.attachments?.length) {
    parts.push({
      type: "text",
      text: ATTACHMENT_ONLY_FALLBACK_TEXT,
    });
  }

  if (message.attachments?.length) {
    for (const attachment of message.attachments) {
      parts.push({
        type: "image_url",
        image_url: {
          url: attachment.dataUrl,
        },
      });
    }
  }

  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1 && parts[0]?.type === "text") {
    return (parts[0] as Extract<
      ChatRequestContentPart,
      { type: "text" }
    >).text;
  }

  return parts;
}

