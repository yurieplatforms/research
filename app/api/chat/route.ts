import type { NextRequest } from "next/server";

export const runtime = "nodejs";

type ChatRequestContentPart =
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

type ChatRequestMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ChatRequestContentPart[];
};

type IncomingPayload = {
  messages?: ChatRequestMessage[];
  webSearch?: boolean;
};

type WebPluginEngine = "native" | "exa";
type WebSearchContextSize = "low" | "medium" | "high";

type WebPluginPayload = {
  id: "web";
  engine?: WebPluginEngine;
  max_results?: number;
  search_prompt?: string;
};

type ReasoningEffort = "low" | "medium" | "high";

type ReasoningPayload = {
  effort?: ReasoningEffort;
  max_tokens?: number;
  exclude?: boolean;
  enabled?: boolean;
};

type OpenRouterPayload = {
  model: string;
  stream: boolean;
  messages: ChatRequestMessage[];
  plugins?: WebPluginPayload[];
  web_search_options?: {
    search_context_size?: WebSearchContextSize;
  };
  reasoning?: ReasoningPayload;
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ??
  "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "@preset/yurie-ai";
const WEB_PLUGIN_ENGINE = process.env.OPENROUTER_WEB_PLUGIN_ENGINE;
const WEB_PLUGIN_MAX_RESULTS = process.env.OPENROUTER_WEB_PLUGIN_MAX_RESULTS;
const WEB_PLUGIN_SEARCH_PROMPT =
  process.env.OPENROUTER_WEB_PLUGIN_SEARCH_PROMPT;
const WEB_SEARCH_CONTEXT_SIZE = process.env.OPENROUTER_WEB_SEARCH_CONTEXT_SIZE;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name} environment variable. Set it in your .env.local file.`,
    );
  }

  return value;
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseWebPluginEngine(
  value: string | undefined,
): WebPluginEngine | undefined {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return undefined;

  const engine = normalized.toLowerCase();
  if (engine !== "native" && engine !== "exa") {
    throw new Error(
      "OPENROUTER_WEB_PLUGIN_ENGINE must be either \"native\" or \"exa\".",
    );
  }

  return engine as WebPluginEngine;
}

function parsePositiveIntegerEnv(
  name: string,
  value: string | undefined,
): number | undefined {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return undefined;

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${name} must contain only digits (0-9).`);
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parseSearchContextSize(
  value: string | undefined,
): WebSearchContextSize | undefined {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return undefined;

  const contextSize = normalized.toLowerCase();
  if (contextSize !== "low" && contextSize !== "medium" && contextSize !== "high") {
    throw new Error(
      "OPENROUTER_WEB_SEARCH_CONTEXT_SIZE must be one of: low, medium, high.",
    );
  }

  return contextSize as WebSearchContextSize;
}

function getOriginHostname(origin: string | null): string | null {
  if (!origin) return null;

  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

function applyOriginTemplate(template: string, origin: string | null): string {
  if (!template.includes("{originHost}")) {
    return template;
  }

  const hostname = getOriginHostname(origin) ?? "";
  return template.replaceAll("{originHost}", hostname);
}

function buildWebPlugin(origin: string | null): WebPluginPayload {
  const plugin: WebPluginPayload = { id: "web" };

  const engine = parseWebPluginEngine(WEB_PLUGIN_ENGINE);
  if (engine) {
    plugin.engine = engine;
  }

  const maxResults = parsePositiveIntegerEnv(
    "OPENROUTER_WEB_PLUGIN_MAX_RESULTS",
    WEB_PLUGIN_MAX_RESULTS,
  );
  if (typeof maxResults === "number") {
    plugin.max_results = maxResults;
  }

  const searchPromptTemplate = normalizeEnvValue(WEB_PLUGIN_SEARCH_PROMPT);
  if (searchPromptTemplate) {
    plugin.search_prompt = applyOriginTemplate(searchPromptTemplate, origin);
  }

  return plugin;
}

function buildPayload(
  messages: ChatRequestMessage[],
  webSearch: boolean,
  origin: string | null,
): OpenRouterPayload {
  const payload: OpenRouterPayload = {
    model: OPENROUTER_MODEL,
    stream: true,
    messages,
    reasoning: {
      effort: "high",
    },
  };

  if (webSearch) {
    const plugin = buildWebPlugin(origin);
    payload.plugins = [plugin];

    const searchContextSize = parseSearchContextSize(WEB_SEARCH_CONTEXT_SIZE);
    if (searchContextSize) {
      payload.web_search_options = {
        search_context_size: searchContextSize,
      };
    }
  }

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = requireEnv("OPENROUTER_API_KEY", OPENROUTER_API_KEY);

    const { messages, webSearch = false } =
      ((await request.json()) as IncomingPayload) ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Request must include at least one chat message.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const origin =
      request.headers.get("origin") ??
      process.env.OPENROUTER_SITE_URL ??
      "http://localhost:3000";

    let payload: OpenRouterPayload;

    try {
      payload = buildPayload(messages, webSearch, origin);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "Unable to prepare OpenRouter request.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const upstreamResponse = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": origin,
        "X-Title": "Yurie AI Chat",
      },
      body: JSON.stringify(payload),
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorText = await upstreamResponse.text();

      if (upstreamResponse.status === 413) {
        let providerMessage: string | undefined;
        try {
          const parsed = JSON.parse(errorText);
          providerMessage =
            parsed?.error?.metadata?.raw ??
            parsed?.error?.message ??
            parsed?.message;
        } catch {
          providerMessage = errorText;
        }

        return new Response(
          JSON.stringify({
            error:
              "The upstream model rejected the request because it was too large. Try sending fewer images or smaller files (under 1.5 MB each).",
            providerMessage,
          }),
          {
            status: 413,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          error:
            errorText ||
            `OpenRouter responded with status ${upstreamResponse.status}`,
        }),
        {
          status: upstreamResponse.status,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const headers = new Headers(upstreamResponse.headers);
    headers.set("Content-Type", "text/event-stream; charset=utf-8");
    headers.set("Cache-Control", "no-cache, no-transform");
    headers.set("X-Accel-Buffering", "no");

    return new Response(upstreamResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unhandled server error.";
    const isPayloadTooLarge =
      typeof message === "string" &&
      (message.includes("length limit exceeded") ||
        message.includes("Exceeded the response size limit"));

    return new Response(
      JSON.stringify({
        error: isPayloadTooLarge
          ? "The request is too large. Please try again with smaller images (up to 5 MB each)."
          : message,
      }),
      {
        status: isPayloadTooLarge ? 413 : 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

