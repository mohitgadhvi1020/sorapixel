from __future__ import annotations

"""Image processing service -- replaces Sharp (Node.js) with Pillow (Python).
Ported from lib/crop-to-ratio.ts, lib/logo-overlay-server.ts
"""

import base64
import io
import logging

logger = logging.getLogger(__name__)


def _pil():
    """Lazy-load PIL to reduce startup memory on constrained environments."""
    from PIL import Image, ImageDraw, ImageFont
    return Image, ImageDraw, ImageFont


def b64_to_image(b64_str: str | bytes):
    """Convert base64 string (or raw bytes) to PIL Image."""
    import re
    Image, _, _ = _pil()
    if isinstance(b64_str, bytes):
        return Image.open(io.BytesIO(b64_str))
    clean = re.sub(r"^data:image/\w+;base64,", "", b64_str)
    data = base64.b64decode(clean)
    return Image.open(io.BytesIO(data))


def image_to_b64(img, fmt: str = "PNG") -> str:
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

    Image, _, _ = _pil()
    img = img.resize((target_w, target_h), Image.LANCZOS)
    return image_to_b64(img)


def crop_to_ratio_contain(image_b64: str, target_w: int, target_h: int, bg_color: str = "white") -> str:
    """Fit image within target ratio (contain mode -- never crops product).
    Adds padding with bg_color.
    """
    Image, _, _ = _pil()
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



def crop_to_ratio_top(image_b64: str, target_w: int, target_h: int) -> str:
    """Crop to target aspect ratio, biased toward keeping the TOP of the image.
    For catalogue/model shots where the face is at the top of the frame.
    Horizontal mismatch: center crop (left/right). Vertical mismatch: crop from bottom.
    """
    img = b64_to_image(image_b64)
    src_w, src_h = img.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        new_h = int(src_w / target_ratio)
        img = img.crop((0, 0, src_w, new_h))

    Image, _, _ = _pil()
    img = img.resize((target_w, target_h), Image.LANCZOS)
    return image_to_b64(img)


def overlay_logo(image_b64: str, logo_b64: str, position: str = "bottom-right", max_size_pct: float = 0.15) -> str:
    """Overlay a logo on an image."""
    Image, _, _ = _pil()
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
    Image, _, _ = _pil()
    img = b64_to_image(image_b64)
    img.thumbnail((max_width, max_height), Image.LANCZOS)
    return image_to_b64(img)


def flatten_to_white(image_b64: str) -> str:
    """Flatten transparent image onto white background."""
    Image, _, _ = _pil()
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
    Image, _, _ = _pil()
    img = img.resize((w, h), Image.LANCZOS)
    return image_to_b64(img)


_BRANDING_THEMES: dict[str, dict] = {
    "black-velvet":    {"bar": (12, 12, 14),    "accent": (196, 166, 125), "text": (255, 255, 255), "sub": (180, 170, 155)},
    "burgundy-velvet": {"bar": (52, 16, 28),    "accent": (220, 190, 150), "text": (255, 248, 240), "sub": (200, 180, 160)},
    "emerald-velvet":  {"bar": (14, 48, 32),    "accent": (210, 185, 140), "text": (255, 252, 245), "sub": (190, 180, 160)},
    "navy-velvet":     {"bar": (16, 24, 42),    "accent": (196, 176, 140), "text": (240, 245, 255), "sub": (175, 185, 200)},
    "pure-white":      {"bar": (255, 255, 255), "accent": (120, 100, 75),  "text": (30, 30, 30),    "sub": (100, 95, 85)},
    "cream-silk":      {"bar": (245, 234, 214), "accent": (140, 110, 70),  "text": (45, 38, 28),    "sub": (110, 100, 80)},
    "white-marble":    {"bar": (240, 236, 230), "accent": (130, 105, 70),  "text": (40, 35, 30),    "sub": (105, 95, 80)},
    "neutral-gray":    {"bar": (42, 42, 42),    "accent": (196, 166, 125), "text": (245, 245, 245), "sub": (180, 175, 165)},
}

_FONT_PATHS_ELEGANT = [
    "/System/Library/Fonts/Supplemental/Didot.ttc",
    "/System/Library/Fonts/Supplemental/Bodoni 72.ttc",
    "/System/Library/Fonts/Supplemental/Baskerville.ttc",
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
]
_FONT_PATHS_DETAIL = [
    "/System/Library/Fonts/Avenir Next.ttc",
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _load_font(paths: list[str], size: int):
    _, _, ImageFont = _pil()
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def add_branding_bar(
    image_b64: str,
    business_name: str = "",
    phone: str = "",
    website: str = "",
    logo_url: str | None = None,
    background: str = "",
) -> str:
    """Append an elegant branding strip below the image, styled to match
    the selected background theme for high contrast and a luxury feel."""
    theme = _BRANDING_THEMES.get(background, _BRANDING_THEMES["black-velvet"])
    bar_color = theme["bar"]
    accent = theme["accent"]
    text_color = theme["text"]
    sub_color = theme["sub"]
    is_light_bar = sum(bar_color) > 500

    Image, ImageDraw, _ = _pil()
    img = b64_to_image(image_b64).convert("RGBA")
    w, h = img.size
    bar_h = max(90, int(h * 0.13))

    bar = Image.new("RGBA", (w, bar_h), (*bar_color, 255))
    draw = ImageDraw.Draw(bar)

    name_size = max(20, int(bar_h * 0.32))
    detail_size = max(12, int(bar_h * 0.17))
    letter_spacing_size = max(10, int(bar_h * 0.10))
    font_name = _load_font(_FONT_PATHS_ELEGANT, name_size)
    font_detail = _load_font(_FONT_PATHS_DETAIL, detail_size)
    font_spacing = _load_font(_FONT_PATHS_DETAIL, letter_spacing_size)

    line_color = (*accent, 90)
    pad_x = int(w * 0.06)
    line_left = pad_x
    line_right = w - pad_x

    top_line_y = int(bar_h * 0.10)
    draw.line([(line_left, top_line_y), (line_right, top_line_y)], fill=line_color, width=1)

    logo_offset = 0
    if logo_url:
        try:
            import httpx
            resp = httpx.get(logo_url, timeout=5)
            if resp.status_code == 200:
                Img, _, _ = _pil()
                logo_img = Img.open(io.BytesIO(resp.content)).convert("RGBA")
                logo_size = bar_h - 30
                logo_img.thumbnail((logo_size, logo_size), Img.LANCZOS)
                ly = (bar_h - logo_img.size[1]) // 2
                bar.paste(logo_img, (pad_x, ly), logo_img)
                logo_offset = logo_img.size[0] + 16
        except Exception:
            pass

    x = pad_x + logo_offset

    name_upper = business_name.upper() if business_name else ""
    details = "  ·  ".join(filter(None, [phone, website]))

    name_h = 0
    gap = int(bar_h * 0.10)
    detail_h = 0
    if name_upper:
        nb = draw.textbbox((0, 0), name_upper, font=font_name)
        name_h = nb[3] - nb[1]
    if details:
        db = draw.textbbox((0, 0), details, font=font_detail)
        detail_h = db[3] - db[1]

    total_content = name_h + (gap if name_h and detail_h else 0) + detail_h
    content_top = (bar_h - total_content) // 2

    if name_upper:
        draw.text((x, content_top), name_upper, fill=(*text_color, 255), font=font_name)

    if details:
        detail_y = content_top + name_h + gap if name_h else content_top
        draw.text((x, detail_y), details, fill=(*sub_color, 230), font=font_detail)

    dot_r = max(4, int(bar_h * 0.04))
    dot_color = (*accent, 180)
    right_x = w - pad_x - dot_r
    draw.ellipse(
        [right_x - dot_r, bar_h // 2 - dot_r,
         right_x + dot_r, bar_h // 2 + dot_r],
        fill=dot_color,
    )

    bottom_line_y = bar_h - top_line_y
    draw.line([(line_left, bottom_line_y), (line_right, bottom_line_y)], fill=line_color, width=1)

    Img, _, _ = _pil()
    canvas = Img.new("RGB", (w, h + bar_h), bar_color)
    canvas.paste(img.convert("RGB"), (0, 0))
    canvas.paste(bar.convert("RGB"), (0, h))
    return image_to_b64(canvas)
