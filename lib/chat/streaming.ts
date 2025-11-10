import type { StreamEvent } from "./types";

function extractTextFromContent(source: unknown): string {
  if (typeof source === "string") {
    return source;
  }

  if (Array.isArray(source)) {
    return source.map((entry) => extractTextFromContent(entry)).join("");
  }

  if (source && typeof source === "object") {
    const record = source as Record<string, unknown>;

    if (typeof record.text === "string") {
      return record.text;
    }

    if (record.content !== undefined) {
      return extractTextFromContent(record.content);
    }
  }

  return "";
}

function extractReasoningText(source: unknown): string {
  if (typeof source === "string") {
    return source;
  }

  if (Array.isArray(source)) {
    return source.map((entry) => extractReasoningText(entry)).join("");
  }

  if (source && typeof source === "object") {
    const record = source as Record<string, unknown>;

    if (typeof record.text === "string") {
      return record.text;
    }

    if (typeof record.summary === "string") {
      return `${record.summary}\n\n`;
    }

    if (typeof record.data === "string") {
      return record.data;
    }

    if (record.content !== undefined) {
      return extractReasoningText(record.content);
    }
  }

  return "";
}

export function extractEventsFromBuffer(buffer: string): {
  events: StreamEvent[];
  remainder: string;
} {
  const events: StreamEvent[] = [];
  const segments = buffer.split("\n\n");
  const isTerminated = buffer.endsWith("\n\n");
  const remainder = isTerminated ? "" : segments.pop() ?? "";

  for (const segment of segments) {
    const dataLine = segment
      .split("\n")
      .find((entry) => entry.startsWith("data:"));

    if (!dataLine) continue;

    const payload = dataLine.slice("data:".length).trim();
    if (!payload) continue;

    if (payload === "[DONE]") {
      events.push({ type: "done" });
      continue;
    }

    try {
      const parsed = JSON.parse(payload);
      const choice = parsed?.choices?.[0];
      const deltaRoot =
        choice?.delta ??
        choice?.message ??
        parsed?.delta ??
        parsed?.message ??
        {};

      const contentDelta = extractTextFromContent(
        (deltaRoot as Record<string, unknown>)?.content ??
          choice?.message?.content,
      );

      const reasoningChunks = [
        extractReasoningText(
          (deltaRoot as Record<string, unknown>)?.reasoning ??
            choice?.message?.reasoning,
        ),
        extractReasoningText(
          (deltaRoot as Record<string, unknown>)?.reasoning_details ??
            choice?.message?.reasoning_details,
        ),
      ].filter((chunk) => chunk.length > 0);

      const reasoningDelta =
        reasoningChunks.length > 0
          ? reasoningChunks
              .filter((chunk, index, array) => array.indexOf(chunk) === index)
              .join("")
          : "";

      if (contentDelta.length > 0 || reasoningDelta.length > 0) {
        events.push({
          type: "delta",
          content: contentDelta.length > 0 ? contentDelta : undefined,
          reasoning: reasoningDelta.length > 0 ? reasoningDelta : undefined,
        });
      }
    } catch {
      events.push({
        type: "error",
        error: "Failed to parse streaming chunk.",
      });
    }
  }

  return { events, remainder };
}

