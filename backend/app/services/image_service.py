from __future__ import annotations

"""Image processing service -- replaces Sharp (Node.js) with Pillow (Python).
Ported from lib/crop-to-ratio.ts, lib/watermark.ts, lib/logo-overlay-server.ts
"""

import base64
import io
import logging
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


def b64_to_image(b64_str: str) -> Image.Image:
    """Convert base64 string to PIL Image."""
    import re
    clean = re.sub(r"^data:image/\w+;base64,", "", b64_str)
    data = base64.b64decode(clean)
    return Image.open(io.BytesIO(data))


def image_to_b64(img: Image.Image, fmt: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def crop_to_ratio(image_b64: str, target_w: int, target_h: int) -> str:
    """Smart crop image to target aspect ratio.
    For small mismatches (<= 30%), uses center crop.
    For larger mismatches, crops what we can.
    """
    img = b64_to_image(image_b64)
    src_w, src_h = img.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    mismatch = abs(target_ratio - src_ratio) / max(target_ratio, src_ratio)

    if mismatch <= 0.30:
        if src_ratio > target_ratio:
            new_w = int(src_h * target_ratio)
            left = (src_w - new_w) // 2
            img = img.crop((left, 0, left + new_w, src_h))
        else:
            new_h = int(src_w / target_ratio)
            top = (src_h - new_h) // 2
            img = img.crop((0, top, src_w, top + new_h))
    else:
        if src_ratio > target_ratio:
            new_w = int(src_h * target_ratio)
            left = (src_w - new_w) // 2
            img = img.crop((left, 0, left + new_w, src_h))
        else:
            new_h = int(src_w / target_ratio)
            top = (src_h - new_h) // 2
            img = img.crop((0, top, src_w, top + new_h))

    img = img.resize((target_w, target_h), Image.LANCZOS)
    return image_to_b64(img)


def crop_to_ratio_contain(image_b64: str, target_w: int, target_h: int, bg_color: str = "white") -> str:
    """Fit image within target ratio (contain mode -- never crops product).
    Adds padding with bg_color.
    """
    img = b64_to_image(image_b64)
    img.thumbnail((target_w, target_h), Image.LANCZOS)

    bg = Image.new("RGB", (target_w, target_h), bg_color)
    offset_x = (target_w - img.size[0]) // 2
    offset_y = (target_h - img.size[1]) // 2

    if img.mode == "RGBA":
        bg.paste(img, (offset_x, offset_y), img)
    else:
        bg.paste(img, (offset_x, offset_y))

    return image_to_b64(bg)


def add_watermark(image_b64: str, text: str = "SoraPixel") -> str:
    """Add diagonal watermark text to image."""
    img = b64_to_image(image_b64).convert("RGBA")
    w, h = img.size

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_size = max(20, min(w, h) // 15)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()

    for y in range(0, h, font_size * 4):
        for x in range(0, w, font_size * 8):
            draw.text((x, y), text, fill=(255, 255, 255, 50), font=font)

    result = Image.alpha_composite(img, overlay)
    return image_to_b64(result.convert("RGB"))


def overlay_logo(image_b64: str, logo_b64: str, position: str = "bottom-right", max_size_pct: float = 0.15) -> str:
    """Overlay a logo on an image."""
    img = b64_to_image(image_b64).convert("RGBA")
    logo = b64_to_image(logo_b64).convert("RGBA")

    w, h = img.size
    max_logo_w = int(w * max_size_pct)
    max_logo_h = int(h * max_size_pct)
    logo.thumbnail((max_logo_w, max_logo_h), Image.LANCZOS)

    lw, lh = logo.size
    padding = int(w * 0.03)

    positions = {
        "top-left": (padding, padding),
        "top-right": (w - lw - padding, padding),
        "bottom-left": (padding, h - lh - padding),
        "bottom-right": (w - lw - padding, h - lh - padding),
        "center": ((w - lw) // 2, (h - lh) // 2),
    }
    pos = positions.get(position, positions["bottom-right"])

    img.paste(logo, pos, logo)
    return image_to_b64(img.convert("RGB"))


def resize_image(image_b64: str, max_width: int = 1024, max_height: int = 1024) -> str:
    """Resize image to fit within bounds while maintaining aspect ratio."""
    img = b64_to_image(image_b64)
    img.thumbnail((max_width, max_height), Image.LANCZOS)
    return image_to_b64(img)


def flatten_to_white(image_b64: str) -> str:
    """Flatten transparent image onto white background."""
    img = b64_to_image(image_b64).convert("RGBA")
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[3])
    return image_to_b64(bg)


def center_crop_closeup(image_b64: str, zoom: float = 0.5) -> str:
    """Create closeup by center-cropping the image."""
    img = b64_to_image(image_b64)
    w, h = img.size
    crop_w = int(w * zoom)
    crop_h = int(h * zoom)
    left = (w - crop_w) // 2
    top = (h - crop_h) // 2
    img = img.crop((left, top, left + crop_w, top + crop_h))
    img = img.resize((w, h), Image.LANCZOS)
    return image_to_b64(img)
