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

## Notes

- Data is local-first and stored in IndexedDB (`ai-novel-architect-v2`), with hard-reset policy (legacy data is not migrated).
- No direct third-party publishing platform integrations are included.
