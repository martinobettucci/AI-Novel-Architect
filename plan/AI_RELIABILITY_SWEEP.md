# AI layer sweep — remaining items

The 2026-07-27 audit is closed out: the security, reliability, and tooling
findings have been fixed and are covered by unit and end-to-end tests. What
follows is only what is *still* open, plus the gateway facts worth keeping.

## Gateway behaviour (`ornith:9b` via the LeLabs endpoint)

- Chain-of-thought is disabled with `reasoning_effort: "none"`, applied centrally
  in `postCompletion`. Measured effect: reasoning eliminated, completion tokens
  down ~62% (584 → 222) with the answer unchanged. `think: false` and
  `chat_template_kwargs` are accepted but silently ignored by the compat layer —
  only `reasoning_effort` works.
- The gateway **serializes** generations: three concurrent requests took
  21 s / 55 s / 73 s. Agent-pool concurrency is therefore 1.
- API keys are scoped per API. A key without the `openai` scope is rejected on
  `/v1/*` (`"API non autorisée pour cette clé: openai"`) while `/api/*` works.

## Open

1. **Model output is persisted as chapter HTML without sanitization.**
   `useWorkspaceController.ts` stores `result.text` and writes it verbatim to
   `chapter.content`; `repository.ts`'s `importProjectBackup` trusts
   `chapters[].content` from an imported zip the same way. No rendering sink
   injects raw HTML any more (the snapshot diff renders text nodes, and TipTap
   filters through its schema), so this is defence-in-depth rather than a live
   hole — but the stored data is still untrusted markup. A sanitizer at the
   persistence boundary is the real fix.

2. **Scene-level snapshots cannot be restored.** The concurrent scene drafter now
   snapshots prose before overwriting it, but `restoreSnapshot` writes its
   payload into `chapter.content`, so a scene snapshot is archival only and does
   not appear in the compare panel. Needs a scene-aware snapshot in
   `repository.ts`.

3. **Dropped-proposal counts are not surfaced to the user.** The canon-delta
   mapper now rejects proposals whose `entityType`/`layer` cannot be resolved and
   reports `droppedCount`; the orchestrator step detail shows it, but
   `persistDeltaProposals` still reports only created/skipped. Likewise,
   entity-history lines referencing unknown entities are now dropped silently
   rather than persisted with a dangling id — worth counting in the success
   message.

4. **New user-facing strings are hard-coded English.** The truncation and
   scene-failure messages added to `useWorkspaceController.ts` use literals,
   because `MessageKey` is derived from the French dictionary. Keys worth adding
   to `app/i18n/messages.ts` (fr + en): `trackers.historyKeptTruncated`,
   `trackers.historyKeptEmpty`, `draft.concurrentFailed`,
   `draft.concurrentTruncated`, `draft.sceneNotGenerated`, `draft.sceneIncomplete`,
   `scenes.cardsApplied`, `scenes.cardsKeptDrafts`.

5. **`/api/ai/*` has rate limiting but no authentication.** A token bucket now
   caps abuse and the endpoint is no longer caller-controlled, so the open-proxy
   and key-exfiltration risks are gone. If this is ever served beyond localhost,
   it still needs real auth in a `middleware.ts`. The rate limiter is in-process
   only — a multi-instance deployment needs a shared store.

6. **Stale API keys may linger in IndexedDB.** The settings store now strips
   `llm.apiKey` on load, so it is written out of existence on the next save of a
   given scope, but a project- or feature-scoped profile that is never saved
   again keeps its old value in `db.settingsProfiles`.

7. **`.next/dev/**` is root-owned** on this machine (from an earlier root Docker
   run) and makes `next dev` fail for the host user. Operator cleanup:
   `sudo rm -rf .next`.
