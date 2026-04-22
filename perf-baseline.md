# "My Creations" Gallery — Performance Baseline

**Route:** `/projects` (labeled "My Creations" in UI)
**Baseline captured:** 2026-04-21
**Env:** Cloud Run us-central1 (backend + frontend), Supabase (US region), users in India.

---

## 1. Architecture today

```
Client (India) ──► soraipixel.com/projects (Next.js CSR, us-central1)
                     │
                     │ 1) auth check (client-side Supabase session)
                     │ 2) useEffect on mount
                     ▼
             Promise.all([
               GET /api/v1/sessions?limit=50   (~14 KB JSON)
               GET /api/v1/projects?limit=50   (~23 KB JSON)
             ])
                     │
                     ▼
             FastAPI (us-central1)
                     │
                     │  1× indexed Postgres query (fast, <50 ms)
                     │  50× sequential HTTPS POST to Supabase
                     │     Storage `/object/sign/...` for signed URLs
                     ▼
             Response
                     │
                     ▼
             React renders grid → browser fetches 100× full-size PNGs
             (no lazy loading, no thumbnails, no <Image> optimization)
```

## 2. Bottlenecks with numbers

Ranked by impact. All file refs are absolute unless noted.

### B1. Signed-URL generation is serial, one HTTPS call per row **[HIGH]**

Confirmed in `storage3/_sync/file_api.py` line 210–241: `create_signed_url()` issues an HTTP POST per call. The SDK *does* expose `create_signed_urls()` (plural, batch) — the code does not use it.

- `backend/app/routers/projects.py:71-72` — loops `_enrich_project_thumbnail()` over 50 projects, each calling `_signed_url()`.
- `backend/app/services/session_service.py:121-123` — loops `_signed_url()` over 50 sessions.

Estimated cost from Cloud Run us-central1 ↔ Supabase (`ynxppssttkicwglxiraw.supabase.co`):
- Per call: ~60–120 ms RTT incl. TLS + API.
- 50 calls sequential: **3–6 seconds** per endpoint.
- Two endpoints run in parallel on the frontend, so effective add: ~3–6 s.

This single issue likely dominates TTFB from the user's perspective once they are past the auth step.

### B2. No image thumbnails; full-size PNGs rendered at ~300 px **[HIGH]**

`frontend/src/app/projects/page.tsx:241,319` — native `<img src={thumbnail_url}>`, no `<Image>`, no `srcset`, no `loading="lazy"`, no `decoding="async"`, no blur placeholder.

Image characteristics:
- Format: **PNG only** (`session_service.py:20`, `project_service.py:41` hardcode `image/png`).
- Source: original-resolution uploads or generated outputs. Jewelry AI outputs are frequently 1536×1536 or larger.
- A typical 1536×1536 PNG is **1.5–3 MB**. Rendered at 300 px square.
- 100 tiles at even 1 MB avg = **~100 MB** over the wire just for the gallery. Most of it is below the fold.

### B3. No skeleton / progressive rendering **[MEDIUM, big perceived-speed win]**

`projects/page.tsx:187-190` shows only a full-page spinner until both API calls resolve. LCP candidate is the first image tile, which cannot paint until:
1. Auth provider resolves
2. Both API calls return (serial signed URLs above)
3. Browser downloads at least one full-size PNG

### B4. Client-Side-Rendered, no prefetch / no cache **[MEDIUM]**

- `"use client"` page, no RSC, no `fetch(..., { next: { revalidate } })`, no SWR / React Query.
- Every navigation back to `/projects` repeats the full fetch. No `stale-while-revalidate`.
- No HTTP cache headers on the API responses.

### B5. Over-fetching in `/projects` response **[LOW-MEDIUM]**

`backend/app/routers/projects.py:59` uses `.select("*")`, so the full `metadata` JSONB ships back — including the complete `images` array (all storage paths + sizes of every generated image for that project), even though the list view only shows one thumbnail.

For a project with 8 images, this adds ~400–600 bytes per row that the gallery never uses. Payload is still small (~23 KB), but this becomes material once pagination is lifted.

### B6. No pagination or virtualization on the UI **[LOW today, HIGH later]**

- Frontend hardcodes `limit=50` per endpoint; users with >50 creations of one type silently lose the rest.
- All items are in the DOM at once — fine for 100, bad beyond ~300.

### B7. Indexes look OK; `projects` table has no migration on disk **[HOUSEKEEPING]**

- `sessions`: composite index `(client_id, created_at DESC)` exists — good.
- `projects`: table used but not in `supabase/migrations/`. Index presence is unverified. Need to confirm `(client_id, created_at DESC)` exists in prod.
- N+1 is **not** present in the list queries — `list_sessions` already uses `in_()` batch for action counts.

## 3. What I could measure directly

| Metric | Value | Method |
|---|---|---|
| `/projects` payload (50 items, 1 thumbnail each) | ~23 KB JSON, ~9 KB gzip | Static analysis from response shape + field sizing |
| `/sessions` payload (50 items) | ~14 KB JSON, ~6 KB gzip | Same |
| Cold-start p95 | ~0 s (min-instances=1 set today) | Current Cloud Run config |
| Warm API TTFB (health, from macOS in India) | ~430 ms | `curl -w` from earlier in session |
| Signed-URL generation overhead (estimated) | 3–6 s on `/projects?limit=50` | SDK source + typical Supabase RTT |

## 4. What I could NOT measure without browser access

These need a Chrome run against a logged-in account, either via Lighthouse or DevTools Performance panel. I have **not** measured them yet:

- **FCP, LCP, TTI, CLS, INP**
- Number of image requests actually made (lazy vs eager)
- Image request waterfall and total transfer size
- Per-request TTFB for `/sessions` and `/projects` from a real browser
- Render time spent in React on the grid

**To close this gap I need one of:**
(a) You run Lighthouse on https://soraipixel.com/projects while logged in and paste the report, or
(b) You approve me to drive a headless Chrome via the Claude-in-Chrome MCP against a test account.

## 5. Top bottlenecks, ranked

1. **Serial signed-URL generation on the backend** (B1) — ~3–6 s user-visible.
2. **Full-size PNGs rendered as tiny thumbnails, no lazy-load** (B2) — tens of MB over wire, LCP blocker.
3. **No skeleton, full-page spinner** (B3) — perceived slowness.
4. **CSR + no cache / no prefetch** (B4) — every visit pays full cost.
5. **`select("*")` over-fetch** (B5) — small today, matters when pagination lands.

Items B6/B7 are important for scaling past "a few hundred creations per user" but are not what the user is feeling *today*.
