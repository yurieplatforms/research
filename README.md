# Yurie AI Chat

Next.js 14 chatbot starter that streams answers from OpenRouter using the `@preset/yurie-ai` model. The UI is TypeScript-first, dark-mode by default, and supports optional OpenRouter web search (via the `web` plugin) so the assistant can ground responses in live data.

## Features

- 🔌 **OpenRouter streaming** — serverless route proxies the `chat/completions` endpoint with Server-Sent Events.
- ⚙️ **Preset ready** — always calls the `@preset/yurie-ai` model and sends a warm system prompt.
- 🌐 **Web search toggle** — enable or disable OpenRouter’s web plugin per conversation.
- 🖥️ **Modern UX** — Tailwind-powered layout with sticky composer, stop/abort control, and smooth auto-scroll.
- 🔒 **Typed from end to end** — strict TypeScript in both the API route and client components.
- 🖼️ **Image inputs** — attach photos and they’re encoded as OpenRouter `image_url` parts for vision-capable models.

## Prerequisites

- Node.js 18.17+ ([Next.js requirement](https://nextjs.org/docs/getting-started/installation#system-requirements))
- An [OpenRouter API key](https://openrouter.ai/keys)

## Quickstart

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with your credentials:

   ```bash
   cat <<'EOF' > .env.local
   OPENROUTER_API_KEY=sk-or-...
   # Optional overrides:
   # OPENROUTER_MODEL=@preset/yurie-ai
   # OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
   # OPENROUTER_SITE_URL=http://localhost:3000
   # OPENROUTER_WEB_PLUGIN_ENGINE=exa           # defaults to "native"
   # OPENROUTER_WEB_PLUGIN_MAX_RESULTS=5        # positive integer
   # OPENROUTER_WEB_PLUGIN_SEARCH_PROMPT=Some relevant web results for {originHost}:
   # OPENROUTER_WEB_SEARCH_CONTEXT_SIZE=medium  # low | medium | high
   EOF
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:3000](http://localhost:3000) and start chatting with Yurie ✨

## Project Structure

- `app/page.tsx` renders the client-side chat experience.
- `components/chat/chat-panel.tsx` handles conversation state, streaming, abort/stop, and the UI.
- `app/api/chat/route.ts` proxies OpenRouter with streaming support and optional web search.
- `tailwind.config.ts` + `app/globals.css` configure the design system.

## Web Search Configuration

- The API route turns web search on by attaching the [`web` plugin](https://openrouter.ai/docs/features/web-search) to the OpenRouter payload.
- Optional environment variables let you pick the search engine (defaults to OpenRouter’s `native`; set `OPENROUTER_WEB_PLUGIN_ENGINE=exa` to opt into Exa), limit results, and customise the plugin prompt (supports `{originHost}` templating).
- `OPENROUTER_WEB_SEARCH_CONTEXT_SIZE` controls the provider’s context tier (`low`, `medium`, or `high`) when web search is active.
- Leave the variables unset to rely on OpenRouter’s defaults.

## Implementation Notes

- The API route runs in the Edge runtime and simply forwards the OpenRouter event stream, preserving the SSE protocol.
- Client-side streaming is handled with the Web Streams API; partial SSE frames are buffered to avoid JSON parse errors.
- Web search is opt-in per request (the payload only includes the `web` plugin when the toggle is enabled).
- All environment variables live in `.env.local`. Never commit your API keys.

## Production Checklist

- Swap `OPENROUTER_SITE_URL` to your deployed domain for more accurate telemetry.
- Add authentication or rate limiting if you expose the endpoint publicly.
- Consider persisting chat history (e.g. database, KV store) if you need long-lived conversations.
- Review OpenRouter pricing and preset limits before shipping to production.

---

Enjoy building with Yurie! Feedback and contributions are welcome.

