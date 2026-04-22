# My Creations — Bug Audit

Scope: `frontend/src/app/projects/page.tsx` ("My Creations"), plus the two downstream flows it opens: `frontend/src/app/jewelry/page.tsx` and `frontend/src/app/studio/page.tsx`, and the backend `backend/app/routers/sessions.py` / `projects.py` / `studio.py`.

## How the page works today

"My Creations" shows two unrelated record types from two unrelated tables:

- **Jewelry sessions** (table `sessions` + `session_actions`) — `GET /sessions`
- **Studio projects** (table `projects`) — `GET /projects`

Jewelry sessions have a concept of "resume" (session id in `?session=` query param, restored by a useEffect on the jewelry page). Studio projects do **not** — the studio page has zero logic for session/project query params (confirmed by grep).

---

## Bugs

### BUG-1 — Clicking a Studio creation card does nothing useful (reported: "clicking a creation doesn't behave correctly")

**Symptom.** In `projects/page.tsx:237`, clicking a studio project card opens a **preview modal**, not a detail page. The modal's primary CTA "Open Product Studio" routes to `/studio` with **no project id** (`projects/page.tsx:565`). For users that is indistinguishable from no-op — they land on a blank studio.

**Root cause.** Routing + missing feature. `/studio` never accepts a project/session param and has no restore code path.

**Fix direction.** Either (a) pass `?project=<id>` and add restore logic in `studio/page.tsx`, or (b) keep preview modal but make the CTA meaningful ("Download images", "Duplicate shot"). Option (a) requires schema changes (see schema flag below) to support mid-flow resume; option (b) works today.

---

### BUG-2 — "Continue journey" starts from scratch (reported)

**Symptom.** Opening a creation lands on `/jewelry` (or `/studio`) but the flow is fresh — prior selections gone.

**Root cause — jewelry path.** The restore code at `jewelry/page.tsx:521-607` only hydrates **completed output images**. It sets `step = "done"` **only if** `restoredImages.length > 0` (line 592). If the session was created but the user left before the main generation completed, nothing is restored and the page falls through to `step = "upload"` with empty selections — even though `jewelry_type`, `background`, and `aspect_ratio_id` were saved.

Concretely: a user uploads → picks jewelry type → picks theme → bails → returns: they see the upload screen, not the theme step they were on.

**Root cause — studio path.** No restore code at all. Every "Open Product Studio" is a fresh flow.

**Root cause — schema.** The `sessions` table has no column for "current step" or pending-but-not-generated inputs. The `projects` table only persists **finished** outputs — there is no row until generation succeeds (`studio.py:122-131`). So there is nothing to resume *to* for in-progress studio work.

---

### BUG-3 — Studio "jewelry-flavored" project cards navigate to fresh jewelry flow when `metadata.session_id` is missing

**Location.** `projects/page.tsx:237` and `:287` — the ternary `p.metadata?.session_id ? ...session=${p.metadata.session_id}... : "/jewelry"`.

**Symptom.** If a project was stored with `project_type` starting with `"jewelry"` but no `session_id` in its metadata (old rows, failed sessions), clicking it drops the user into an empty jewelry flow with no feedback.

**Root cause.** Silent fallback. Also, the data model has two overlapping representations of jewelry creations (a row in `sessions` *and* a row in `projects` with `project_type='jewelry*'`) and the page doesn't reconcile them — jewelry sessions and jewelry-typed projects can both show up as cards (see `showProjects && showSessions` logic at `:124-125` — when `activeTab === "jewelry"`, **both** render, producing duplicates for sessions that also have a mirrored project row).

---

### BUG-4 — Duplicate cards on the Jewelry tab

**Location.** `projects/page.tsx:124-127`.

```
const showSessions = activeTab === "all" || activeTab === "jewelry";
const showProjects = activeTab === "all" || activeTab === "studio" || activeTab === "jewelry";
```

A jewelry session whose generation also wrote a mirror row to `projects` (common pattern if both code paths ran) appears **twice** — once as a "session" card, once as a "jewelry-typed project" card. The `all` tab also shows this duplication.

**Root cause.** Two sources of truth for jewelry creations, no dedup. Count badges at `:118-122` also double-count (`sessions.length + jewelryProjects.length`).

---

### BUG-5 — Deleted / inaccessible creation fails silently

**Location.** `jewelry/page.tsx:600-605` (catch block) and `projects/page.tsx:99-101` (session preview catch).

**Symptom.** If a session id in the URL is deleted / owned by another user / nonexistent, the fetch errors are swallowed. The user sees a spinner that disappears and then a blank jewelry "upload" page with no explanation.

**Root cause.** `catch {}` empty handler + no toast/404 redirect. The backend correctly returns a 4xx (`session_service.py:94`), but the frontend never surfaces it.

---

### BUG-6 — `sessionLoaded` gate blocks legitimate re-restore

**Location.** `jewelry/page.tsx:521-607`.

**Symptom.** If a user navigates from `/jewelry?session=A` to `/jewelry?session=B` within the same SPA session, `sessionLoaded` stays `true` from the first load, so the effect bails at line 523 and the second session never hydrates.

**Root cause.** The `sessionLoaded` flag is keyed to component lifetime, not to the session id.

**Fix direction.** Replace `sessionLoaded` with `loadedSessionId` and compare against the current `sid`.

---

### BUG-7 — Auth race at restore

**Location.** `jewelry/page.tsx:527-530`.

**Symptom.** On first paint `user` may be null while `authLoading` is still true. The effect bails (`if (!user) return`) and — because the effect's deps include `user` but it has already set `sessionRestoring = false` — by the time auth resolves, `sessionLoaded` has *not* yet been set, so the effect re-runs… but only because `user` changed. This mostly works, but the control flow is brittle: if `authLoading` is considered, restore should wait, not bail.

**Minor** — combine with BUG-6 by gating on `!authLoading && user` and keying on `sid`.

---

### BUG-8 — Image hydration uses signed URL as `preview` but no `base64`

**Location.** `jewelry/page.tsx:559-561`.

```
setMainImage({ base64: "", preview: session.original_image_url });
```

**Symptom.** Any downstream step that reads `mainImage.base64` (e.g. a second generation) sees an empty string and either no-ops or errors. `resolveBase64()` at the first generation call will need to re-fetch/re-encode — confirm it does. If it doesn't, "Generate again from a restored session" fails.

**Fix direction.** Either re-fetch and b64-encode the image on restore, or make all generation call sites fall back to downloading from `preview` when `base64` is empty.

---

### BUG-9 — `searchParams` in deps causes extra restore attempts

**Location.** `jewelry/page.tsx:607` — deps `[searchParams, sessionLoaded, user]`.

**Symptom.** `searchParams` from `next/navigation` is a new object reference on each render. The effect relies on the `sessionLoaded` latch to not re-fetch, but once BUG-6 is fixed naively the effect could fire every render. Must key on the sid string, not the searchParams object.

---

### BUG-10 — Back button after resume is broken

**Symptom.** Open creation → jewelry page → press Back. Browser goes to `/projects` but React state from the jewelry page may still be mounted depending on Next's caching. More importantly: after a fresh generate from a restored session (`window.history.replaceState` at `jewelry/page.tsx:444`-ish overwrites the session id), Back goes to `/projects` but the session id in history is now lost.

**Minor** — needs manual QA confirmation, but the `replaceState` pattern mixed with resume is risky.

---

## Resolution — Option 2 shipped (full resume)

All 10 bugs above are fixed end-to-end with a backward-compatible schema migration. Summary of what landed:

- `supabase/migrations/013_flow_resume.sql` — adds `current_step`, `pending_inputs JSONB`, `flow_schema_version` to `sessions`; creates new `studio_sessions` table with same progress fields + `result_project_id` link to `projects`. Additive; existing rows keep working (new columns default safely).
- Backend: `PATCH /sessions/:id/progress`, new `/studio-sessions` CRUD, studio generate links the completed project back to the session.
- Frontend jewelry: session created eagerly on upload, progress PATCHed on every step change and debounced on input edits, restore hydrates `current_step` + `pending_inputs` (theme, shot configs, special instructions).
- Frontend studio: session created on upload, progress debounced on config changes, restore hydrates inputs + any finished images.
- My Creations: studio sessions surfaced as canonical studio cards with "Continue" / "Open" labels (per `current_step`); legacy orphan projects still show so nothing disappears.

## Legacy schema notes

**A full "resume at the exact step" fix requires schema changes.** The current `sessions` table has no `current_step`, `pending_inputs`, or `schema_version` columns. The `projects` table is write-once-on-success.

Options:

1. **Minimal (no schema change).** Resume only to what's already persisted: jewelry sessions with completed generations → `"done"` step (works today, BUG-6/8 aside). Sessions with no generations yet → land on upload with jewelry_type/background preselected (small JS change, no schema). Studio projects → treat as read-only artifacts; add a proper detail page; remove "Continue journey" wording for studio entirely.

2. **Full (schema change).** Add to `sessions`:
   - `current_step TEXT` (enum-ish)
   - `pending_inputs JSONB` (theme selection, shot config, special instructions, alt images pointers)
   - `flow_schema_version INT` (for migrations)
   Add a matching `studio_sessions` table (studio has no session concept today). New endpoint `PATCH /sessions/:id/progress` called from each step transition.

Option 2 is a meaningful amount of work: new migration, backend endpoint, frontend step-transition writes on every step change on both pages, plus hydration. Several hundred lines across backend + frontend.

**Before I touch any code I need you to pick:** option 1, option 2, or a narrower subset (e.g. "option 1 everywhere + just fix BUGs 5/6/8/9 + dedup on BUG-4").

---

## Tests / QA

No test framework exists in either `frontend/` or `backend/` (no `tests/` dir, no test scripts in package.json confirmed). I'll deliver a manual QA checklist as part of the fix PR.
