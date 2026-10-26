"""Generates the PWA icons in public/icons/: pink rounded square, white open book, little heart.

Run: python3 scripts/make-icons.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

PINK = (255, 179, 206)
PINK_DARK = (240, 106, 155)
PLUM = (75, 44, 60)
WHITE = (255, 255, 255)
OUT = Path(__file__).resolve().parent.parent / 'public' / 'icons'
SS = 4  # supersampling for smooth edges


def heart(draw, cx, cy, r, fill, outline, width):
    # two circles + a triangle
    draw.ellipse([cx - 2 * r, cy - r, cx, cy + r], fill=fill)
    draw.ellipse([cx, cy - r, cx + 2 * r, cy + r], fill=fill)
    draw.polygon([(cx - 1.93 * r, cy + 0.45 * r), (cx + 1.93 * r, cy + 0.45 * r), (cx, cy + 2.4 * r)], fill=fill)


def book(draw, s, scale):
    """Open book centred in an s×s canvas, `scale` = fraction of the canvas it may use."""
    w = s * scale
    cx, cy = s / 2, s / 2 + w * 0.08
    half, h = w / 2, w * 0.56
    lw = max(2, round(w * 0.035))
    top, bottom = cy - h / 2, cy + h / 2
    left_page = [(cx, top + h * 0.10), (cx - half * 0.12, top), (cx - half, top + h * 0.02), (cx - half, bottom), (cx - half * 0.12, bottom - h * 0.03), (cx, bottom + h * 0.04)]
    right_page = [(2 * cx - x, y) for x, y in left_page]
    for page in (left_page, right_page):
        draw.polygon(page, fill=WHITE, outline=PLUM)
        draw.line(page + [page[0]], fill=PLUM, width=lw, joint='curve')
    draw.line([(cx, top + h * 0.10), (cx, bottom + h * 0.04)], fill=PLUM, width=lw)
    # text lines
    for i in range(3):
        y = top + h * (0.32 + i * 0.18)
        draw.line([(cx - half * 0.78, y), (cx - half * 0.25, y)], fill=PINK, width=lw)
        draw.line([(cx + half * 0.25, y), (cx + half * 0.78, y)], fill=PINK, width=lw)
    heart(draw, cx, top - w * 0.12, w * 0.085, PINK_DARK, PLUM, lw)


def make(size, maskable=False):
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if maskable:
        # full bleed; the OS crops it, so keep the drawing inside the inner 60%
        draw.rectangle([0, 0, s, s], fill=PINK)
        book(draw, s, 0.52)
    else:
        lw = round(s * 0.03)
        draw.rounded_rectangle([lw, lw, s - lw, s - lw], radius=s * 0.22, fill=PINK, outline=PLUM, width=lw)
        book(draw, s, 0.62)
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(parents=True, exist_ok=True)
make(192).save(OUT / 'icon-192.png')
make(512).save(OUT / 'icon-512.png')
make(512, maskable=True).save(OUT / 'icon-maskable-512.png')
make(180, maskable=True).convert('RGB').save(OUT / 'apple-touch-icon.png')  # iOS adds its own rounding
make(64).save(OUT / 'favicon-64.png')
print('icons written to', OUT)
