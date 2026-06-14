# AI Novel Architect

Local-first solo book assistant/editor with full workflow coverage:

- Multi-mode project creation (idea, outline, template, import)
- Story bible (premise, themes, stakes, world rules, characters, timeline)
- Rich-text drafting workspace (TipTap) with chapter/scene structure
- AI actions with preview-before-apply diff flow
- Revision issue tracking, rubric scoring, grammar suggestions, checklists
- Publishing artifact generation (metadata, synopsis variants, chapter manifest)
- Marketing toolkit (blurb, tagline, pitch variants, social snippets, email, cover brief)
- Scoped settings precedence (run > feature > project > global > defaults)
- Import/Export (`Markdown`, `TXT`, `JSON`) + backup zip restore
- PWA install and offline-aware UI state

## Stack

- Next.js 16 (App Router)
- Dexie (IndexedDB repository layer)
- Zustand (domain stores)
- TipTap (rich text editor)
- Vitest + RTL + MSW + fake-indexeddb (unit tests)

## Dev

```bash
npm install
npm run dev
```

## Quality Gates

```bash
npm run lint
npm run build
npm test
```

Coverage gate is enforced in `vitest.config.ts`.

## API Endpoints

- `GET /api/ai/health`
- `GET /api/ai/models`
- `POST /api/ai/run`

## Ollama

The default provider is the LAN Ollama instance at
`http://192.168.0.37:11434` with model `gpt-oss:20b`.

- Enter the Ollama server root URL only; `/v1` and `/api` suffixes are normalized.
- The app uses OpenAI-compatible chat completions and falls back to native `/api/chat`.
- Structured generators use JSON schema output; prose generators remain plain text.
- Ollama normally serves HTTP on port `11434`. Use HTTPS only behind a configured TLS proxy.

Legacy endpoints are still mapped for compatibility:

- `/api/gemini-status`
- `/api/llm-models`
- `/api/plan-audit`
- `/api/plan-rewrite`

## Notes

- Data is local-first and stored in IndexedDB (`ai-novel-architect-v3`).
- No direct third-party publishing platform integrations are included.
