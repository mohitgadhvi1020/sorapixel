#!/usr/bin/env python3
"""20-sample composition eval for the 'jewelry as hero' initiative.

Runs a matrix of jewelry_type × pose cells, generates one UGC image per cell
via the exact same prompt path the API uses, then scores each output with the
composition_check vision gate. Writes PNG outputs + a CSV + a markdown summary
to ./eval_output.

Usage:

    # From backend/
    python scripts/eval_ugc_composition.py \\
        --seed-dir ./eval_seeds \\
        --out ./eval_output

Seed directory layout — one seed JPEG/PNG per jewelry type, named:
    ring.jpg, necklace.jpg, earring.jpg, bracelet.jpg, bangle.jpg

(Other types — pendant, anklet, chain, brooch, set — are optional.)

Flags:
    --quality standard|pro   — generation quality, default standard
    --poses   "a,b,c"        — override pose list (comma-separated)
    --types   "a,b,c"        — override jewelry types
    --dry-run                — skip generation; just print the prompt per cell

⚠️ This script hits Vertex/Gemini and costs real credits — ~20 image gens plus
20 vision-check calls per full run. Use --dry-run first.
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import logging
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BACKEND = HERE.parent
sys.path.insert(0, str(BACKEND))

from app.services.prompt_service import build_catalogue_prompt  # noqa: E402
from app.services.gemini_service import generate_image, generate_image_pro  # noqa: E402
from app.services.composition_check import check_jewelry_composition  # noqa: E402

logger = logging.getLogger("eval_ugc")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

DEFAULT_TYPES = ["ring", "necklace", "earring", "bracelet", "bangle"]

# 4 poses per type = 20 cells. Mixes one macro pose and three non-macro.
DEFAULT_POSES_BY_TYPE = {
    "ring":     ["finger_macro", "hand_closeup", "close_up", "sitting"],
    "necklace": ["neck_macro",   "close_up",     "standing", "side_view"],
    "earring":  ["ear_macro",    "close_up",     "side_view", "standing"],
    "bracelet": ["wrist_macro",  "hand_closeup", "standing", "sitting"],
    "bangle":   ["wrist_macro",  "hand_closeup", "standing", "side_view"],
    "pendant":  ["neck_macro",   "close_up",     "standing", "sitting"],
    "anklet":   ["ankle_macro",  "feet_closeup", "sitting",  "standing"],
    "chain":    ["neck_macro",   "close_up",     "standing", "side_view"],
    "brooch":   ["lapel_macro",  "close_up",     "standing", "side_view"],
    "set":      ["close_up",     "standing",     "side_view", "sitting"],
}


def load_seed(seed_dir: Path, jewelry_type: str) -> str | None:
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = seed_dir / f"{jewelry_type}{ext}"
        if p.exists():
            return base64.b64encode(p.read_bytes()).decode()
    logger.warning("No seed image for %s in %s", jewelry_type, seed_dir)
    return None


def run_cell(jewelry_type: str, pose: str, seed_b64: str, quality: str, dry_run: bool) -> dict:
    prompt = build_catalogue_prompt(
        model_type="indian_woman",
        pose=pose,
        background="best_match",
        category_slug="jewellery",
        jewelry_type=jewelry_type,
        gender="woman",
        nationality="Indian",
        outfit_description="a simple solid black sleeveless top, no patterns",
    )

    cell: dict = {"jewelry_type": jewelry_type, "pose": pose, "prompt_chars": len(prompt)}

    if dry_run:
        cell["dry_run"] = True
        cell["prompt_head"] = prompt[:400]
        return cell

    try:
        gen = (generate_image_pro if quality == "pro" else generate_image)(prompt, seed_b64)
        image_b64 = gen["base64"]
    except Exception as e:
        cell["error"] = f"generation: {e}"
        return cell

    cell["image_b64"] = image_b64
    report = check_jewelry_composition(image_b64, jewelry_type)
    if report is None:
        cell["check_error"] = "composition_check returned None"
    else:
        cell.update(report.to_dict())
    return cell


def write_outputs(cells: list[dict], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    csv_path = out_dir / "results.csv"
    fields = [
        "jewelry_type", "pose", "passed",
        "jewelry_uncropped", "jewelry_sharp_and_lit",
        "composition_hero", "face_framed_naturally",
        "reason", "error", "check_error",
    ]
    with csv_path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for c in cells:
            w.writerow({k: c.get(k, "") for k in fields})

    for c in cells:
        b64 = c.get("image_b64")
        if not b64:
            continue
        png_path = out_dir / f"{c['jewelry_type']}__{c['pose']}.png"
        png_path.write_bytes(base64.b64decode(b64))

    # Aggregate numbers
    total = len(cells)
    scored = [c for c in cells if "passed" in c]
    agg = {
        "total_cells": total,
        "scored_cells": len(scored),
        "pass_rate": (sum(1 for c in scored if c["passed"]) / len(scored)) if scored else 0.0,
        "per_criterion": {},
    }
    for k in ("jewelry_uncropped", "jewelry_sharp_and_lit", "composition_hero", "face_framed_naturally"):
        hits = sum(1 for c in scored if c.get(k))
        agg["per_criterion"][k] = (hits / len(scored)) if scored else 0.0

    (out_dir / "summary.json").write_text(json.dumps(agg, indent=2))

    md = ["# UGC composition eval results", "",
          f"- cells: {total}", f"- scored: {len(scored)}",
          f"- overall pass rate: {agg['pass_rate']:.0%}", "",
          "## Per-criterion pass rate", ""]
    for k, v in agg["per_criterion"].items():
        md.append(f"- {k}: {v:.0%}")
    md += ["", "## Failures", ""]
    for c in scored:
        if not c["passed"]:
            md.append(f"- **{c['jewelry_type']} / {c['pose']}** — {c.get('reason', '')}")
    (out_dir / "summary.md").write_text("\n".join(md) + "\n")

    logger.info("Wrote %d cells to %s (pass_rate=%.0f%%)", total, out_dir, agg["pass_rate"] * 100)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed-dir", type=Path, default=BACKEND / "eval_seeds")
    ap.add_argument("--out", type=Path, default=BACKEND / "eval_output")
    ap.add_argument("--quality", choices=["standard", "pro"], default="standard")
    ap.add_argument("--types", type=str, default=",".join(DEFAULT_TYPES))
    ap.add_argument("--poses", type=str, default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.seed_dir.exists():
        logger.error("Seed dir %s missing. Put one <type>.jpg per jewelry type there.", args.seed_dir)
        return 2

    types = [t.strip() for t in args.types.split(",") if t.strip()]
    pose_override = [p.strip() for p in args.poses.split(",") if p.strip()] or None

    cells: list[dict] = []
    for jt in types:
        seed = load_seed(args.seed_dir, jt) if not args.dry_run else "dry_run"
        if seed is None:
            continue
        poses = pose_override or DEFAULT_POSES_BY_TYPE.get(jt, ["standing", "close_up", "side_view", "sitting"])
        for pose in poses:
            logger.info("→ %s / %s", jt, pose)
            cells.append(run_cell(jt, pose, seed, args.quality, args.dry_run))

    if args.dry_run:
        for c in cells:
            logger.info("[dry] %s/%s prompt_chars=%d", c["jewelry_type"], c["pose"], c["prompt_chars"])
        return 0

    write_outputs(cells, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
