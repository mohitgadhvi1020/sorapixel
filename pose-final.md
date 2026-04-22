# UGC Poses — Final Curated Set

Status: **prompts rewritten, code shipped, validation pending.** Phase 3 match-rate numbers are not filled in — run the validation plan below and write them into this file.

## The curated list (10 poses, 3 shown per jewelry type)

| ID | UI label | Category | Recommended for |
|---|---|---|---|
| `close_up` | Beauty Portrait | body pose | necklace, pendant, chain, earring, brooch |
| `standing` | Three-Quarter | body pose | most jewelry types |
| `sitting` | Seated | body pose | anklet |
| `walking` | Walking (Full Body) | body pose | anklet, default |
| `neck_macro` | Necklace Macro | macro | necklace, pendant, chain, mangalsutra |
| `ear_macro` | Earring Macro | macro | earring |
| `finger_macro` | Ring Macro | macro | ring (only pose offered) |
| `wrist_macro` | Wrist Macro | macro | bracelet, bangle, watch |
| `ankle_macro` | Anklet Macro | macro | anklet |
| `lapel_macro` | Brooch Macro | macro | brooch |

## What changed in the prompts

### The core fix
[prompt_service.py:399](backend/app/services/prompt_service.py:399) now has a `POSE_FRAMING` dict. Each pose gets its own framing directive injected at the top of the prompt. The old one-size-fits-all "head in upper 25% + complete face visible" block — which was silently overriding walking/sitting/side_view — is gone.

### `walking` — the problem child, rewritten
- **Framing directive**: "camera at waist height, not face height. The stride MUST be visible. If the head occupies more than 1/5 of the image height, the shot is WRONG."
- **Pose description**: explicit 50mm lens, body filling vertical frame, one heel lifting, arms swinging.
- **Composition guide** (pose-specific branch added at [prompt_service.py:806](backend/app/services/prompt_service.py:806)): "Do NOT anchor composition to the face. If you produce a portrait or chest-up shot the output is REJECTED."
- **Negatives**: "NOT a portrait, NOT a chest-up shot, NOT a face close-up."

### `sitting`
- Framing rule now REQUIRES the seat and bent knees to be visible.
- Explicit props: wooden stool or upholstered chair, hands placed, knees together or crossed.
- Negative: "DO NOT show the model standing. If the seat and bent knees are not visible, the shot is WRONG."

### `standing`
- Clarified as a three-quarter shot (head to mid-thigh), not full-length to feet.
- Added contrapposto stance, explicit hand placement.
- Negative: not a chest-up close-up.

### `close_up`
- Now explicitly the face-forward beauty shot (cinematographer language: 85mm, f/2.8, eyes on upper-third line).
- Kept short because it wasn't broken — just sharpened.

### `side_view` & `back_view`
- Rewritten as 3/4 profile (not full profile — pure profile is unrealistic and the model would distort).
- Not in the UGC UI but kept in the backend because `flow_presets.py` uses them.

### Macros (neck, ear, finger, wrist, ankle, lapel)
- Unchanged — these were already working (clean macro branch, no conflicting framing rule).

## What was dropped from the UGC UI

| Dropped | Reason |
|---|---|
| `side_view` | Overlaps `close_up` for face-adjacent jewelry; now a flow_video-only pose. |
| `back_view` | Rarely useful for jewelry UGC; kept for flow_video only. |
| `hand_closeup` | Redundant with `finger_macro` / `wrist_macro`. |
| `feet_closeup` | Redundant with `ankle_macro`. |
| `mirror_selfie` | No backend prompt existed — silently fell back to `best_match`. |
| `over_shoulder` | No backend prompt existed — silently fell back to `best_match`. |

## Files changed

- [backend/app/services/prompt_service.py](backend/app/services/prompt_service.py) — new `POSE_FRAMING` dict, rewritten `POSE_DESCRIPTIONS`, pose-aware composition guide in `build_catalogue_prompt`.
- [frontend/src/app/ugc/page.tsx](frontend/src/app/ugc/page.tsx) — trimmed `UGC_ALL_POSES` from 15 → 10, rewrote `JEWELRY_POSE_MAP` per type.

## Phase 3 validation plan (run this next)

**Target: ≥9/10 match rate per pose** before calling it done.

For each of the 10 kept poses:

1. Pick a representative jewelry piece the pose is intended for (e.g., `walking` → an anklet; `close_up` → a pendant).
2. Generate 10 UGC images with fixed model config (same nationality, skin tone, background).
3. Score each image 1/0:
   - Body-pose shots: does framing match the directive? (`walking` = full body + stride visible; `sitting` = seat + bent knees visible; `standing` = head-to-mid-thigh; `close_up` = chest-up face-forward.)
   - Macro shots: does the jewelry fill ≥30% of the frame and is it tack-sharp?
4. Fill the row in the table below.

| Pose | Match (/10) | Typical failure |
|---|---|---|
| close_up | _tbd_ | _tbd_ |
| standing | _tbd_ | _tbd_ |
| sitting | _tbd_ | _tbd_ |
| walking | _tbd_ | _tbd_ |
| neck_macro | _tbd_ | _tbd_ |
| ear_macro | _tbd_ | _tbd_ |
| finger_macro | _tbd_ | _tbd_ |
| wrist_macro | _tbd_ | _tbd_ |
| ankle_macro | _tbd_ | _tbd_ |
| lapel_macro | _tbd_ | _tbd_ |

**If a pose scores below 9/10:**
- < 9/10 on first try → rewrite the prompt once (tighten the framing directive, add a sharper negative, name the failure mode).
- Still < 9/10 after one rewrite → drop it. Don't keep a broken pose in the UI.

## Open compat notes

- `CATALOGUE_POSES` in prompt_service.py still lists `side_view`, `back_view`, `hand_closeup`, `feet_closeup` for the separate Catalogue flow — left untouched.
- `image_service.py:226` (jewelry_zoom_crop coordinates) still has entries for the dropped IDs. They're dead paths for UGC now but harmless; kept for Catalogue.
- `flow_presets.py` references `hand_closeup`, `side_view`, `back_view` as video-flow last-frame poses — untouched. Those prompts got improved along with everything else in `POSE_DESCRIPTIONS`.
