# My Creations — Manual QA Checklist

Covers the fixes for BUG-1 through BUG-9 in [BUGS_FOUND.md](../../BUGS_FOUND.md). No automated test harness exists in `frontend/` or `backend/`, so this is a manual checklist. Run through it after any change to:

- `frontend/src/app/projects/page.tsx`
- `frontend/src/app/jewelry/page.tsx`
- `backend/app/routers/sessions.py`, `projects.py`
- `backend/app/services/session_service.py`, `project_service.py`

## Setup

- Log in as a user with: (a) at least one **completed** jewelry session with generated images, (b) at least one **abandoned** jewelry session (uploaded + picked type but never generated), (c) at least one studio project, (d) one **deleted** session (flip `status` to `deleted` in DB by hand).

## Click-through

- [ ] `/projects` loads without spinner getting stuck
- [ ] Tabs "All" / "Jewelry" / "Product Studio" filter correctly
- [ ] Tab counts match actually-visible card counts (no double-counting — BUG-4)
- [ ] No duplicate cards on Jewelry tab for sessions (BUG-4)

## Jewelry card — completed session

- [ ] Click "Open" on a jewelry session with completed images → lands on `/jewelry?session=<id>` at step `done` with generated images visible
- [ ] Original image thumbnail shows
- [ ] Regenerating a shot uses the restored base64 (no "Upload an image first" error — BUG-8). If re-generate still fails, the base64 hydration fetch failed — check browser console.

## Jewelry card — abandoned session (BUG-2 jewelry half)

- [ ] Upload image → select type → pick theme → **close tab before generating** → return via My Creations → lands on `theme_browse` with the same theme selected (hydrated from `pending_inputs.selected_theme_id`)
- [ ] If you'd edited shot configs before closing, they hydrate too
- [ ] If you'd typed special instructions, they hydrate
- [ ] Jewelry type / background / aspect ratio / quality preselected from `sessions` row
- [ ] Backend: `sessions.current_step` and `sessions.pending_inputs` update as user moves between steps (check DB after each transition)

## Jewelry "Preview" modal

- [ ] Preview modal opens for a jewelry session
- [ ] "Open in Jewelry Studio" button still navigates and restores

## Jewelry session-to-session navigation (BUG-6)

- [ ] From `/jewelry?session=A` (restored), in the same tab navigate to `/jewelry?session=B` (e.g. via a link) → session B hydrates. Previously this was blocked by the `sessionLoaded` latch.

## Deleted / inaccessible session (BUG-5)

- [ ] Open `/jewelry?session=<deleted-or-nonexistent-id>` → toast "Couldn't load that creation. It may have been deleted." + redirect back to `/projects`
- [ ] Open a session id belonging to another user (or just a random UUID) → same behavior

## Studio card (BUG-1 + BUG-2 studio half)

- [ ] New studio work creates a `studio_sessions` row (check DB) on upload
- [ ] My Creations lists the studio session as its own card with an "In progress" badge if not generated, or "Open" if generated
- [ ] Clicking a studio-session card routes to `/studio?studio_session=<id>` and hydrates background, quality, aspect ratio, special instructions, original image, and any generated results
- [ ] Legacy orphan studio projects (no linked session) still show as preview-modal cards — nothing disappears for existing users
- [ ] Generate on a restored studio session links the new project back to the session (`result_project_id` populated) and flips `current_step` to `done`
- [ ] Changing a field (background / quality / instructions) in studio PATCHes `/studio-sessions/:id` within ~600ms

## Auth race (BUG-7)

- [ ] Open `/jewelry?session=<id>` while **signed out** → page shows upload step (no restore). Sign in → restore fires and hydrates. (Previously: restore could fail silently during the auth race.)

## Back button (BUG-10 — known brittle area)

- [ ] On a restored session, press Back in the browser → goes back to `/projects`
- [ ] After generating from a restored session (which calls `history.replaceState`), Back → still lands somewhere sensible (`/projects` or prior page). **Known: the replaceState pattern can eat the session id in history; flag if this regresses.**

## Regression: fresh flow

- [ ] Go to `/jewelry` directly (no `?session=`) → upload step, no spinner stuck, no toast
- [ ] Upload → select type → pick theme → generate → results show → URL now has `?session=<id>`
- [ ] "Start Over" button clears state and URL

## Regression: credits and generation

- [ ] Token deduction still works on generate from a restored session
- [ ] UGC / branding / recolor / listing actions on a restored `done` session all still work

## Migration / backward compatibility

- [ ] Run migration `013_flow_resume.sql` — no errors on existing data
- [ ] Existing sessions (pre-migration) still open via My Creations → jewelry page restores fine (falls back to inferring step from completed actions because `current_step` is NULL for old rows)
- [ ] Existing studio projects still show as orphan cards in My Creations with preview modal — no regression for historical data

## Backend smoke

- [ ] `GET /sessions/<id>` for another user's session returns non-200 (check `session_service.get_session` — it already filters by `client_id`)
- [ ] `GET /sessions/<deleted-id>` returns non-200
- [ ] `PATCH /sessions/<other-user's-id>/progress` returns success=false (RLS + `client_id` filter in `update_session_progress`) and does not mutate the row
- [ ] `GET /studio-sessions/<other-user's-id>` returns 404
