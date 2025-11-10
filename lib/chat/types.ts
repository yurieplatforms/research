export type ChatRole = "user" | "assistant";

export type ChatAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  attachments?: ChatAttachment[];
  reasoning?: string;
  reasoningDurationSeconds?: number;
  reasoningStartedAt?: number;
  reasoningStoppedAt?: number;
  isReasoningStreaming?: boolean;
};

export type ChatRequestContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

export type ApiChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string | ChatRequestContentPart[];
};

export type StreamDeltaEvent = {
  type: "delta";
  content?: string;
  reasoning?: string;
};

export type StreamDoneEvent = {
  type: "done";
};

export type StreamErrorEvent = {
  type: "error";
  error: string;
};

export type StreamEvent = StreamDeltaEvent | StreamDoneEvent | StreamErrorEvent;

