"""
Paints the Santorini postcard image printed on the ticket.

Pipeline (deterministic):
  1. compose the scene as layered SVG (sky, clouds, caldera, sea, village,
     blue-domed church) — generated here with a seeded RNG
  2. rasterise it with headless Chromium (Playwright)            -> base.png
  3. painterly pass (edge-preserving smoothing + brush jitter), vintage print
     grade (faded blacks, warm cast), paper grain, craquelure, scuffs
  4. save src/components/TravelEnvelope/textures/ticket-photo.webp

Run:  python3 scripts/paint-santorini.py
Deps: numpy, scipy, opencv-python, pillow, node + playwright-core (for step 2)
"""

from __future__ import annotations

import math
import os
import subprocess
import tempfile

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "src", "components", "TravelEnvelope", "textures", "ticket-photo.webp")
W, H = 1400, 1000
rng = np.random.default_rng(1956)


def r(a, b):
    return float(rng.uniform(a, b))


# --------------------------------------------------------------------------- 1. scene

def cloud(cx, cy, s, op=1.0, n=22):
    """Cumulus: many overlapping puffs, lit from the top-left, grey flat base."""
    lit, shade = [], []
    for _ in range(n):
        t = r(-1, 1)
        px = cx + t * s * 1.6
        py = cy - (1 - abs(t)) * s * r(0.2, 0.75) + r(-0.1, 0.1) * s
        pr = s * r(0.22, 0.48) * (1.25 - abs(t) * 0.5)
        shade.append(f'<circle cx="{px + pr * 0.18:.1f}" cy="{py + pr * 0.28:.1f}" r="{pr:.1f}"/>')
        lit.append(f'<circle cx="{px - pr * 0.12:.1f}" cy="{py - pr * 0.1:.1f}" r="{pr * 0.86:.1f}"/>')
    base = f'<ellipse cx="{cx:.1f}" cy="{cy + s * 0.12:.1f}" rx="{s * 1.7:.1f}" ry="{s * 0.2:.1f}"/>'
    return (
        f'<g opacity="{op}">'
        f'<g fill="#aebfcd" filter="url(#soft)">{"".join(shade)}{base}</g>'
        f'<g fill="url(#cloudFill)" filter="url(#softer)">{"".join(lit)}</g></g>'
    )


def ridge(y0, amp, color, seed, x0=0, x1=W, rough=6):
    rr = np.random.default_rng(seed)
    xs = np.linspace(x0, x1, 60)
    ph = rr.uniform(0, 6, 4)
    ys = y0 - amp * (0.5 + 0.5 * np.sin(xs / 210 + ph[0])) * (0.6 + 0.4 * np.sin(xs / 90 + ph[1]))
    ys += rr.normal(0, rough, len(xs))
    pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in zip(xs, ys))
    return f'<polygon points="{x0},{H} {pts} {x1},{H}" fill="{color}"/>'


def house(x, y, w, h, lit="#eeebe4", shade="#a9aebb", roof=True):
    side = w * r(0.18, 0.3)
    parts = [
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{lit}"/>',
        f'<rect x="{x + w:.1f}" y="{y + 2:.1f}" width="{side:.1f}" height="{h - 2:.1f}" fill="{shade}"/>',
    ]
    if roof and rng.random() < 0.35:  # little barrel vault
        parts.append(f'<path d="M{x:.1f} {y:.1f} a{w / 2:.1f} {w * 0.22:.1f} 0 0 1 {w:.1f} 0 Z" fill="{lit}"/>')
    # openings: arched doors / windows in blue-grey or deep shadow
    n = int(rng.integers(1, 3))
    for k in range(n):
        ww = w * r(0.14, 0.22)
        hh = h * r(0.28, 0.45)
        wx = x + w * (0.2 + 0.55 * k / max(1, n - 1 if n > 1 else 1)) - ww / 2 if n > 1 else x + w * r(0.25, 0.6)
        wy = y + h * r(0.3, 0.5)
        col = "#2f4a66" if rng.random() < 0.55 else "#4b6f96"
        parts.append(f'<path d="M{wx:.1f} {wy + hh:.1f} v{-hh + ww / 2:.1f} a{ww / 2:.1f} {ww / 2:.1f} 0 0 1 {ww:.1f} 0 v{hh - ww / 2:.1f} Z" fill="{col}"/>')
    # soft cast shadow under the eave
    parts.append(f'<rect x="{x:.1f}" y="{y + h - 4:.1f}" width="{w + side:.1f}" height="6" fill="#8d8e96" opacity="0.5"/>')
    return "".join(parts)


def scene_svg() -> str:
    s = []
    s.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
    s.append("""<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2468a3"/><stop offset="0.35" stop-color="#4f93c6"/>
        <stop offset="0.72" stop-color="#9cc4df"/><stop offset="1" stop-color="#d9e6ea"/>
      </linearGradient>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3d82b4"/><stop offset="0.35" stop-color="#236aa3"/>
        <stop offset="1" stop-color="#123f78"/>
      </linearGradient>
      <radialGradient id="cloudFill" cx="0.35" cy="0.25" r="0.9">
        <stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="#f1f4f6"/><stop offset="1" stop-color="#d6dfe6"/>
      </radialGradient>
      <radialGradient id="dome" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stop-color="#3f86dc"/><stop offset="0.45" stop-color="#0d56b3"/><stop offset="1" stop-color="#062f73"/>
      </radialGradient>
      <linearGradient id="rock" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7a6655"/><stop offset="1" stop-color="#3f3530"/>
      </linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="5"/></filter><filter id="softer"><feGaussianBlur stdDeviation="3.2"/></filter>
      <filter id="haze"><feGaussianBlur stdDeviation="1.4"/></filter>
    </defs>""")
    horizon = 520
    s.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
    # clouds
    s.append(cloud(470, 250, 84, 1, 30))
    s.append(cloud(220, 340, 46, 0.92, 18))
    s.append(cloud(790, 170, 44, 0.88, 16))
    s.append(cloud(1110, 250, 36, 0.8, 14))
    s.append(cloud(640, 395, 30, 0.65, 11))
    s.append(cloud(80, 200, 30, 0.6, 10))
    # distant caldera rim (hazy) and headland
    s.append(f'<g filter="url(#haze)">{ridge(horizon - 10, 70, "#86a3b9", 3, 0, 820, 1.2)}</g>')
    s.append(f'<g filter="url(#haze)">{ridge(horizon + 4, 46, "#6687a0", 5, 0, 700, 1.2)}</g>')
    s.append(f'<g filter="url(#haze)">{ridge(horizon + 18, 60, "#4d6a80", 9, 380, 900, 1.5)}</g>')
    # sea
    s.append(f'<rect y="{horizon + 18}" width="{W}" height="{H - horizon}" fill="url(#sea)"/>')
    # ripples: short light dashes, denser toward the viewer
    rip = []
    for i in range(420):
        yy = horizon + 30 + (i / 420) ** 1.6 * (H - horizon)
        xx = r(-20, 900)
        ln = 6 + (yy - horizon) * 0.05 * r(0.5, 1.5)
        op = r(0.15, 0.4)
        rip.append(f'<path d="M{xx:.1f} {yy:.1f} h{ln:.1f}" stroke="#bcd8ea" stroke-width="{1 + (yy - horizon) / 300:.2f}" opacity="{op:.2f}"/>')
    s.append("".join(rip))
    # boat + wake
    s.append('<path d="M560 700 q-60 14 -150 22" stroke="#e6f0f5" stroke-width="3" fill="none" opacity="0.8"/>')
    s.append('<path d="M556 694 h18 l-3 7 h-13 Z" fill="#f3f3f0"/>')

    # village cliff: rock mass on the right, from the ridge down to the water
    cliff = "M600 1000 C630 880 690 780 750 700 C820 610 900 520 1000 440 C1100 370 1250 310 1400 280 L1400 1000 Z"
    s.append(f'<path d="{cliff}" fill="url(#rock)"/>')
    s.append(f'<clipPath id="cliffClip"><path d="{cliff}"/></clipPath><g clip-path="url(#cliffClip)">')
    for _ in range(160):  # volcanic strata + scree, following the slope
        y0 = r(260, 1000)
        x0 = r(560, 1400)
        L = r(40, 200)
        c = ["#8a7462", "#5b4b41", "#9c8a78", "#4a3c35", "#6f6a5c"][int(rng.integers(0, 5))]
        s.append(f'<path d="M{x0:.0f} {y0:.0f} q{L / 2:.0f} {-L * 0.25:.0f} {L:.0f} {-L * 0.45:.0f}" stroke="{c}" stroke-width="{r(2, 9):.1f}" opacity="{r(0.35, 0.8):.2f}" fill="none"/>')
    s.append("</g>")
    # cascading houses (back to front)
    houses = []
    for _ in range(520):
        y = r(290, 960)
        edge = 1060 - (y - 300) * 0.62  # left limit of the village down the caldera slope
        x = r(edge - 20, W + 10)
        if rng.random() < 0.18 and x < edge + 90:
            continue  # leave rock showing between terraces
        sc = 0.6 + (y - 290) / 670 * 0.7  # nearer = bigger
        houses.append((y + r(-6, 6), x, r(24, 64) * sc, r(18, 44) * sc))
    houses.sort()
    s.extend(house(x, y, w, h) for (y, x, w, h) in houses)

    # the blue-domed church (the hero) — drawn at 1:1 then scaled up about its
    # base so it reads as the subject, as in the reference postcard
    cx, cy, rd = 900, 470, 92
    s.append(f'<g transform="translate({cx} {cy + 210}) scale(1.32) translate({-cx - 70} {-cy - 210})">')
    s.append(f'<rect x="{cx - 104}" y="{cy}" width="208" height="210" fill="#f4f2ec"/>')
    s.append(f'<rect x="{cx + 104}" y="{cy + 6}" width="46" height="204" fill="#bdbcc0"/>')
    s.append(f'<rect x="{cx - 112}" y="{cy - 8}" width="224" height="16" fill="#fbfaf6"/>')
    s.append(f'<rect x="{cx - 104}" y="{cy + 8}" width="208" height="10" fill="#c9cbd2" opacity="0.7"/>')
    s.append(f'<rect x="{cx + 40}" y="{cy + 8}" width="64" height="202" fill="#dcdde2" opacity="0.8"/>')
    s.append(f'<path d="M{cx - rd} {cy - 8} A{rd} {rd * 0.98} 0 0 1 {cx + rd} {cy - 8} Z" fill="url(#dome)"/>')
    s.append(f'<path d="M{cx - rd * 0.8} {cy - 12} A{rd * 0.8} {rd * 0.4} 0 0 1 {cx + rd * 0.8} {cy - 12}" stroke="#06265c" stroke-width="3" fill="none" opacity="0.35"/>')
    s.append(f'<rect x="{cx - 3}" y="{cy - rd - 44}" width="6" height="38" fill="#f5f1e8"/><rect x="{cx - 14}" y="{cy - rd - 32}" width="28" height="6" fill="#f5f1e8"/>')
    for k, dx in enumerate((-64, -8, 48)):
        s.append(f'<path d="M{cx + dx} {cy + 150} v-58 a14 14 0 0 1 28 0 v58 Z" fill="{"#2b4768" if k != 1 else "#1d3552"}"/>')
    # bell tower
    bx = cx + 170
    s.append(f'<rect x="{bx}" y="{cy - 60}" width="70" height="250" fill="#f1efe8"/><rect x="{bx + 70}" y="{cy - 56}" width="18" height="246" fill="#b3b3b8"/>')
    s.append(f'<path d="M{bx + 18} {cy + 20} v-40 a17 17 0 0 1 34 0 v40 Z" fill="#284460"/>')
    s.append(f'<path d="M{bx} {cy - 60} q35 -40 70 0 Z" fill="#f4f2ec"/><rect x="{bx + 33}" y="{cy - 110}" width="4" height="34" fill="#f1efe8"/>')
    # arcade under the church terrace
    s.append(f'<rect x="{cx - 150}" y="{cy + 210}" width="420" height="90" fill="#efece5"/>')
    for k in range(4):
        ax = cx - 130 + k * 100
        s.append(f'<path d="M{ax} {cy + 300} v-50 a30 30 0 0 1 60 0 v50 Z" fill="{"#3b5f86" if k % 2 else "#2c4c70"}"/>')
    s.append(f'<rect x="{cx + 270}" y="{cy + 214}" width="26" height="86" fill="#b9b8bd"/>')
    s.append("</g>")
    # foreground terrace with the big arch
    s.append('<path d="M700 1000 V820 H1400 V1000 Z" fill="#ece9e1"/>')
    s.append('<path d="M760 1000 V900 a70 70 0 0 1 140 0 V1000 Z" fill="#36597f"/>')
    s.append('<path d="M1000 1000 V880 a60 60 0 0 1 120 0 V1000 Z" fill="#2b4a6d"/>')
    s.append('<path d="M700 820 H1400 V836 H700 Z" fill="#c9c6c2"/>')
    s.append('<path d="M620 1000 C660 930 700 880 720 840 L760 1000 Z" fill="#4a3d35"/>')
    s.append("</svg>")
    return "".join(s)


def rasterise(svg: str) -> np.ndarray:
    pw = os.environ.get("PW_DIR")  # folder containing node_modules/playwright-core
    with tempfile.TemporaryDirectory() as td:
        svg_p = os.path.join(td, "scene.svg")
        png_p = os.path.join(td, "scene.png")
        open(svg_p, "w").write(svg)
        js = f"""
        const {{ chromium }} = require('playwright-core');
        (async () => {{
          const b = await chromium.launch({{ executablePath: process.env.CHROME }});
          const p = await b.newPage({{ viewport: {{ width: {W}, height: {H} }} }});
          await p.goto('file://{svg_p}');
          await p.screenshot({{ path: '{png_p}' }});
          await b.close();
        }})();"""
        subprocess.run(["node", "-e", js], check=True, cwd=pw)
        return np.asarray(Image.open(png_p).convert("RGB"), dtype=np.float32) / 255


# --------------------------------------------------------------------------- 3. painterly + print

def painterly(img: np.ndarray) -> np.ndarray:
    """Stroke-based rendering (Hertzmann-style): coarse-to-fine layers of short,
    oriented brush strokes sampled from the reference. Strokes follow the
    image's structure (perpendicular to the colour gradient)."""
    h, w = img.shape[:2]
    canvas = cv2.GaussianBlur(img, (0, 0), 6)
    lum = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    gx = cv2.Sobel(cv2.GaussianBlur(lum, (0, 0), 3), cv2.CV_32F, 1, 0)
    gy = cv2.Sobel(cv2.GaussianBlur(lum, (0, 0), 3), cv2.CV_32F, 0, 1)
    for radius, thresh in ((10, 0.05), (5, 0.035), (2.5, 0.02)):
        ref = cv2.GaussianBlur(img, (0, 0), radius * 0.6)
        diff = np.linalg.norm(canvas - ref, axis=2)
        grid = max(1, int(radius))
        pts = [(x, y) for y in range(0, h, grid) for x in range(0, w, grid)]
        rng.shuffle(pts)
        layer = canvas.copy()
        for x, y in pts:
            x0, y0 = min(w - 1, x + int(rng.integers(0, grid))), min(h - 1, y + int(rng.integers(0, grid)))
            if radius < 9 and diff[y0, x0] < thresh:
                continue
            col = ref[y0, x0] * (1 + rng.normal(0, 0.03, 3)) * (1 + rng.normal(0, 0.035))
            ang = math.atan2(gy[y0, x0], gx[y0, x0]) + math.pi / 2
            if abs(gx[y0, x0]) + abs(gy[y0, x0]) < 4:
                ang = math.radians(20 + rng.normal(0, 18))  # flat areas: loose diagonal hatching
            L = radius * r(1.6, 3.2)
            dx, dy = math.cos(ang) * L, math.sin(ang) * L
            p1 = (int((x0 - dx) * 4), int((y0 - dy) * 4))
            p2 = (int((x0 + dx) * 4), int((y0 + dy) * 4))
            cv2.line(layer, p1, p2, tuple(float(c) for c in np.clip(col, 0, 1)), max(1, int(radius * 1.1)), cv2.LINE_AA, shift=2)
        canvas = layer
    # a whisper of the crisp original keeps the hero shapes legible
    return np.clip(canvas * 0.9 + img * 0.1, 0, 1)


def craquelure(h, w) -> np.ndarray:
    """White crack network (aged print emulsion): Voronoi cell borders, broken + varied."""
    pts = rng.uniform(0, 1, (150, 2)) * [w, h]
    yy, xx = np.mgrid[0:h, 0:w]
    grid = np.stack([xx.ravel(), yy.ravel()], 1).astype(np.float32)
    # nearest + second-nearest distance via chunked search
    d1 = np.full(len(grid), 1e9, np.float32)
    d2 = np.full(len(grid), 1e9, np.float32)
    for p in pts:
        d = np.hypot(grid[:, 0] - p[0], grid[:, 1] - p[1])
        m1 = d < d1
        d2 = np.where(m1, d1, np.minimum(d2, d))
        d1 = np.where(m1, d, d1)
    edge = (d2 - d1).reshape(h, w)
    warp = ndimage.gaussian_filter(rng.standard_normal((h, w)), 6) * 30
    crack = np.exp(-((edge + warp * 0.02) ** 2) / 0.9)
    keep = ndimage.gaussian_filter(rng.standard_normal((h, w)), 22)
    keep /= keep.std()
    crack *= ndimage.gaussian_filter((keep > -0.2).astype(np.float32), 8) * 0.8
    return np.clip(crack, 0, 1)


def print_grade(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    # vintage: lifted blacks, softened highlights, slight warm cast, reduced saturation in shadows
    img = 0.035 + img * 0.95
    lum = img.mean(2, keepdims=True)
    img = lum + (img - lum) * 1.12  # the reference print is vivid: keep the Aegean blues rich
    img = img * np.array([1.02, 1.0, 0.95]) + np.array([0.015, 0.01, 0])
    # uneven fade toward the edges of the print
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy]).astype(np.float32)
    fade = np.exp(-edge / 50) * 0.14
    img = img * (1 - fade[..., None]) + np.array([0.93, 0.88, 0.8]) * fade[..., None]
    # grain
    g = ndimage.gaussian_filter(rng.standard_normal((h, w)), 0.8)
    img *= 1 + 0.03 * g[..., None]
    # craquelure (white hairlines) + scuffs
    cr = craquelure(h, w)
    img = img * (1 - cr[..., None] * 0.5) + cr[..., None] * 0.5 * np.array([0.96, 0.95, 0.92])
    scuff = (ndimage.gaussian_filter(rng.standard_normal((h, w)), 1.2) > 1.25).astype(np.float32)
    scuff = ndimage.gaussian_filter(scuff, 0.8) * 0.8
    img = img * (1 - scuff[..., None]) + scuff[..., None] * 0.97
    return np.clip(img, 0, 1)


if __name__ == "__main__":
    base = rasterise(scene_svg())
    art = print_grade(painterly(base))
    Image.fromarray((art * 255 + 0.5).astype(np.uint8)).save(OUT, "WEBP", quality=88, method=6)
    print("wrote", os.path.abspath(OUT), f"{os.path.getsize(OUT) / 1024:.0f} KB")
