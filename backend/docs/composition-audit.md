# UGC Composition Audit — "Jewelry as Hero"

Scope: jewelry UGC generation (Catalogue / Branding). Goal — jewelry is the visual hero
in every frame. Composition, focus, and lighting must favour the piece, not the model.

## Pipeline entry points

- API: `POST /catalogue/generate` → `backend/app/routers/catalogue.py`
- Prompt builder: `build_catalogue_prompt` / `build_branding_prompt` in
  `backend/app/services/prompt_service.py`
- Generator: `generate_image` / `generate_image_pro` (Gemini / Vertex) in
  `backend/app/services/gemini_service.py`
- Post-processing: `jewelry_zoom_crop`, `crop_to_ratio_top`, `add_branding_bar`
  in `backend/app/services/image_service.py`
- Model/LoRA: none custom — we use Gemini 2.5 Flash Image / Gemini 3 Pro Image.
  All composition control is via prompt.

## Static audit of the current prompt (pre-change)

Strengths already present:
- Macro poses (`*_macro`) explicitly declare the jewelry is the hero and demand
  30–50 % frame fill + shallow DoF.
- `JEWELRY_UGC_RULES` already includes hair-tuck rule for earrings and
  neckline-low rule for necklaces.
- Detection service supplies per-item counts / pair flags.

Gaps driving the reported failures:

| # | Gap                                                                                                | Failure mode it produces                                                     |
|---|----------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| 1 | Non-macro poses (standing/sitting/side/back/walking) have no "jewelry is hero" directive           | Jewelry is tiny, out of focus, or centred on a busy background               |
| 2 | Non-macro branch opens with FACE framing rule; jewelry prominence sits 150 lines later             | Model reads "face must be fully visible" as primary objective                |
| 3 | No explicit NEGATIVE PROMPTS block                                                                 | Hair drapes over earrings/necklace, sleeves cover bracelets, jewelry crops   |
| 4 | No per-jewelry-type composition rules for non-macro poses (only size hints)                        | Ring on standing shot is a 3-pixel speck; necklace hidden by saree pallu     |
| 5 | No per-jewelry-type lighting direction (rim / side / key-catch)                                    | Flat uniform lighting → stones and metal look dull                           |
| 6 | No shallow-DoF directive for non-macro portrait poses                                              | Everything equally sharp, eye drifts to face instead of jewelry              |
| 7 | No post-generation quality gate                                                                    | Bad outputs ship directly to the user                                        |

## Predicted 20-sample failure distribution (before changes)

Estimated from eyeballing recent outputs in drafts + the prompt analysis above.
To be replaced with measured numbers after running `scripts/eval_ugc_composition.py`.

| Criterion                              | Pre-change (predicted) | Target |
|----------------------------------------|------------------------|--------|
| Jewelry fully visible & uncropped      | ~60 %                  | ≥95 %  |
| Jewelry in sharp focus with clear light| ~50 %                  | ≥90 %  |
| Composition draws eye to jewelry       | ~40 %                  | ≥90 %  |
| Model face framed naturally            | ~85 %                  | ≥95 %  |

## Changes shipped in this pass

1. New `JEWELRY_UGC_COMPOSITION` dict (`prompt_service.py`) — per jewelry type:
   framing rule + key-light rule + occlusion rule + focal-plane rule.
2. New `JEWELRY_HERO_DIRECTIVE` block injected at the **top** of every UGC
   prompt (macro and non-macro) so "jewelry is the hero" is the first thing the
   model reads.
3. New `JEWELRY_NEGATIVE_PROMPTS` block appended to every UGC prompt.
4. Non-macro branch now adds a "shallow depth of field, jewelry in focal plane"
   directive, **without** losing the "face must not crop awkwardly" rule.
5. New `backend/app/services/composition_check.py` vision gate —
   `check_jewelry_composition(image_b64, jewelry_type)` returns pass/fail per
   criterion. Gated behind `CATALOGUE_COMPOSITION_CHECK` env flag (default off
   so it does not silently burn credits in prod until we tune retry limits).
   When enabled, `catalogue.py` will retry up to `COMPOSITION_RETRIES` times
   (default 1) with a strengthened prompt before returning the result, and logs
   failures to `tracking_service` metadata so we can measure drift.
6. `scripts/eval_ugc_composition.py` — runnable eval that generates the 20
   sample cells (5 jewelry types × 4 poses) against a provided seed image and
   writes scores + thumbnails to `eval_output/`.

## Post-change measurements

_To fill after running the eval script. Commit the numbers here, don't just
paste them in Slack._

| Criterion                              | Measured | Notes |
|----------------------------------------|----------|-------|
| Jewelry fully visible & uncropped      |          |       |
| Jewelry in sharp focus with clear light|          |       |
| Composition draws eye to jewelry       |          |       |
| Model face framed naturally            |          |       |

## Deferred / flagged to product

- **Model/LoRA**: not changed. Prompt changes cover the known failure modes; if
  post-change numbers don't hit 90 %+ we should revisit — a jewelry-specific
  LoRA or a dedicated macro checkpoint would push further than prompt work
  alone.
- **Agent 3 pose list**: not in this branch. Once it lands, run the eval with
  `--poses path/to/poses.json` so every pose × jewelry cell is covered.
- **Auto-regen cost**: each retry is a full Gemini call. Keep
  `COMPOSITION_RETRIES=1` until we have a month of pass-rate data.
