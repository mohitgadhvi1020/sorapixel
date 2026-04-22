# UGC Pose Audit — Before

**Method**: Static prompt-engineering audit of [POSE_DESCRIPTIONS](backend/app/services/prompt_service.py:342) and [build_catalogue_prompt](backend/app/services/prompt_service.py:436). No sample images were generated — the failure modes below are predicted from reading the prompt code, not measured. Phase 3 validation will produce the real numbers.

## The root cause of "walking = face close-up"

[prompt_service.py:498](backend/app/services/prompt_service.py:498) unconditionally prepends this to every **non-macro** pose:

> ⚠️ MANDATORY FRAMING RULE — READ FIRST:
> This image MUST include the model's COMPLETE HEAD AND FACE. The top of the head, forehead, eyes, nose, mouth, and chin must ALL be visible. Compose the shot so the head is in the upper 25% of the canvas with at least 8-10% empty space above the crown.

Then the pose line arrives:

> Pose: in a natural walking pose, full-body mid-stride.

When the model sees two conflicting directives, it weights the one labeled "MANDATORY" and "READ FIRST" — it picks face framing and drops the stride. The same rule silently kills `sitting`, `side_view`, `back_view`, and `standing`'s distinctiveness from `close_up`.

## Pose-by-pose prediction

| Pose | Likely match | Predicted failure mode |
|---|---|---|
| `standing` | medium | Often OK, but framing rule forces face-prominent waist-up shot instead of full-length. Blurs into `close_up`. |
| `sitting` | low | Framing rule wants head in upper 25%; "sitting on a stool" rarely survives. Collapses to portrait. |
| `close_up` | high | Aligns with the mandatory rule — this is the one pose that works reliably. |
| `side_view` | low-medium | Non-macro rule wants face fully visible, which a profile shot *cannot* satisfy. Either the profile weakens or face is forced forward. |
| `walking` | **very low** | Full-stride body framing is incompatible with "head upper 25% + face fully visible". Observed symptom: face-only output. |
| `neck_macro` | high | Macro branch is clean and well-specified. |
| `ear_macro` | high | Macro branch is clean. |
| `finger_macro` | high | Macro branch is clean. |
| `wrist_macro` | high | Macro branch is clean. |
| `ankle_macro` | medium | Macro rule is fine, but anklets are inherently hard to render — model has to remember it's a thin chain. |
| `lapel_macro` | medium | Macro rule is fine; brooch placement on fabric is sometimes misread as a pendant. |
| `hand_closeup` | medium | Overlaps heavily with `finger_macro` and `wrist_macro`. Redundant. |
| `feet_closeup` | medium | Overlaps with `ankle_macro`. Redundant. |
| `mirror_selfie` | **broken** | Listed in frontend [UGC_ALL_POSES](frontend/src/app/ugc/page.tsx:52) but has **no entry** in `POSE_DESCRIPTIONS`. Silently falls back to `best_match`. |
| `over_shoulder` | **broken** | Same — listed in UI, no backend prompt. Silent fallback. |

## Structural problems beyond individual prompts

1. **UI/backend drift**: `mirror_selfie` and `over_shoulder` exist only in the frontend. They never render as intended.
2. **Redundancy**: `hand_closeup` vs `finger_macro` vs `wrist_macro`; `feet_closeup` vs `ankle_macro`; `close_up` vs `neck_macro` for necklaces. Users pick one arbitrarily and get near-identical outputs.
3. **One framing block for all non-macro poses** — the source of the walking bug. Framing must be pose-specific.
4. **Vague pose language**: "confident stance", "elegantly posed". Gemini handles cinematographer language (lens, camera height, shot type) far better than adjectives.
5. **No negative prompts** on failure-prone poses — nothing says "NOT a close-up" when we need a full-body.

## What gets cut

Dropping: `back_view`, `hand_closeup`, `feet_closeup`, `mirror_selfie`, `over_shoulder`, `side_view` as a standalone option.

Reason: redundant, broken, or unreliable. `side_view` dies because the mandatory face rule can't coexist with a profile; if we fix that rule (we do), side_view still overlaps with the other full/mid-body poses without adding distinct value.

## What stays (and why)

Keeping 4 body-framed poses + 5 macros:

- `portrait` (renamed from `close_up`) — beauty-shot, face-anchored. Jewelry: necklace, earring, brooch.
- `three_quarter` (replaces `standing`) — waist-up, eye-level, confident stance.
- `seated` (replaces `sitting`) — explicit seated posture, mid-shot.
- `walking` — **full-body only**, face-framing rule dropped for this pose.
- `neck_macro`, `ear_macro`, `finger_macro`, `wrist_macro`, `ankle_macro`, `lapel_macro` — macros, one per jewelry category.

Per jewelry type, the user sees 3–5 poses. See [pose-final.md](pose-final.md) for the rewritten prompts and the validation plan.
