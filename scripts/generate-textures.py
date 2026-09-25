"""
Procedural material textures for the TravelEnvelope component.

Run:  python3 scripts/generate-textures.py
Deps: numpy, scipy, pillow

Every texture is seeded, so output is deterministic. Textures carry only
material (fibre, mottling, stains, wear, alpha edges). Lighting, ink and
shadows are applied live in CSS/SVG so they can respond to the animation.
"""

from __future__ import annotations

import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "components", "TravelEnvelope", "textures")
os.makedirs(OUT, exist_ok=True)

# Envelope geometry (must match constants.ts)
ENV_W, ENV_H = 2200, 1000            # 2.2 : 1
FLAP_TIP = (0.5, 0.56)               # flap tip in envelope-relative units


# --------------------------------------------------------------------------- noise helpers

def fft_noise(h: int, w: int, beta: float, rng: np.random.Generator) -> np.ndarray:
    """Periodic 1/f^beta noise in [-1, 1]. Periodic => tiles seamlessly."""
    white = rng.standard_normal((h, w))
    f = np.fft.fft2(white)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    r = np.sqrt(fx * fx + fy * fy)
    r[0, 0] = 1.0
    f = f / (r ** beta)
    f[0, 0] = 0
    n = np.real(np.fft.ifft2(f))
    n -= n.mean()
    return n / (np.abs(n).max() + 1e-9)


def band_noise(h, w, lo, hi, rng):
    """Band-limited periodic noise (frequencies in cycles/px)."""
    white = rng.standard_normal((h, w))
    f = np.fft.fft2(white)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    r = np.sqrt(fx * fx + fy * fy)
    mask = np.exp(-((np.log(r + 1e-9) - np.log(math.sqrt(lo * hi))) ** 2) / (2 * (np.log(hi / lo) / 2) ** 2))
    n = np.real(np.fft.ifft2(f * mask))
    n -= n.mean()
    return n / (np.abs(n).max() + 1e-9)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def to_rgba_img(rgb: np.ndarray, alpha: np.ndarray | None = None) -> Image.Image:
    rgb8 = np.clip(rgb * 255 + 0.5, 0, 255).astype(np.uint8)
    if alpha is None:
        return Image.fromarray(rgb8, "RGB")
    a8 = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb8, a8]), "RGBA")


# --------------------------------------------------------------------------- paper

def fibres(h, w, count, rng, length=(6, 26), width=1):
    """Short, gently curved fibres. Returns signed field (+light / -dark)."""
    img = Image.new("L", (w, h), 128)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = rng.uniform(0, w), rng.uniform(0, h)
        ang = rng.uniform(0, math.pi)
        L = rng.uniform(*length)
        curve = rng.uniform(-0.6, 0.6)
        pts = []
        for i in range(6):
            t = i / 5
            a = ang + curve * (t - 0.5)
            pts.append((x + math.cos(a) * L * t, y + math.sin(a) * L * t))
        tone = 128 + int(rng.choice([-1, 1]) * rng.uniform(10, 34))
        d.line(pts, fill=tone, width=width)
    arr = (np.asarray(img, dtype=np.float32) - 128) / 128
    return ndimage.gaussian_filter(arr, 0.55)


def paper_base(h, w, rng, base=(0.930, 0.858, 0.760)):
    """Aged cotton paper: mottling, grain, fibres. Returns RGB float."""
    mottle = fft_noise(h, w, 1.9, rng)                 # large soft clouds
    mid = band_noise(h, w, 1 / 90, 1 / 18, rng)        # blotchy mid detail
    grain = band_noise(h, w, 1 / 5, 1 / 1.6, rng)      # fine tooth
    fib = fibres(h, w, int(h * w / 260), rng)
    fib2 = fibres(h, w, int(h * w / 2600), rng, length=(20, 60))

    lum = 1 + 0.055 * mottle + 0.035 * mid + 0.045 * grain + 0.085 * fib + 0.05 * fib2
    warm = 0.5 + 0.5 * fft_noise(h, w, 2.2, rng)       # where paper yellowed more

    r = base[0] * lum + 0.010 * warm
    g = base[1] * lum - 0.018 * warm
    b = base[2] * lum - 0.060 * warm
    return np.dstack([r, g, b])


def stain_layer(h, w, rng, spots=40, rings=2, zones=None):
    """Foxing (small rust dots) + faint tide-line stains. Returns darkening field 0..1 and tint."""
    field = np.zeros((h, w), np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    blob_noise = band_noise(h, w, 1 / 14, 1 / 3, rng)

    for _ in range(spots):
        if zones is not None and rng.random() < 0.7:
            zx0, zy0, zx1, zy1 = zones[rng.integers(len(zones))]
            cx, cy = rng.uniform(zx0, zx1) * w, rng.uniform(zy0, zy1) * h
        else:
            cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        n_dots = rng.integers(1, 7)
        for _k in range(n_dots):
            ox, oy = cx + rng.normal(0, 16), cy + rng.normal(0, 12)
            rad = rng.uniform(1.4, 6.5) * (2.3 if rng.random() < 0.22 else 1)
            x0, x1 = int(max(ox - rad * 4, 0)), int(min(ox + rad * 4, w))
            y0, y1 = int(max(oy - rad * 4, 0)), int(min(oy + rad * 4, h))
            if x1 <= x0 or y1 <= y0:
                continue
            sub = np.hypot(xx[y0:y1, x0:x1] - ox, yy[y0:y1, x0:x1] - oy) / rad
            sub = sub + 0.45 * blob_noise[y0:y1, x0:x1]
            field[y0:y1, x0:x1] = np.maximum(field[y0:y1, x0:x1], (1 - smoothstep(0.55, 1.05, sub)) * rng.uniform(0.35, 1))

    # soft diffuse halos around dot clusters
    halo = ndimage.gaussian_filter(field, 9) * 1.4

    ring_field = np.zeros((h, w), np.float32)
    for _ in range(rings):
        cx, cy = rng.uniform(0.1, 0.9) * w, rng.uniform(0.1, 0.9) * h
        R = rng.uniform(0.07, 0.16) * w
        warp = fft_noise(h, w, 2.4, rng) * R * 0.9
        d = np.hypot(xx - cx, (yy - cy) * 1.15) + warp
        tide = np.exp(-((d - R) ** 2) / (2 * (R * 0.018) ** 2))
        fill = (1 - smoothstep(R * 0.8, R, d)) * 0.25
        ring_field += (tide * 0.35 + fill * 0.6) * rng.uniform(0.25, 0.45)

    return np.clip(field, 0, 1), np.clip(halo, 0, 1), np.clip(ring_field, 0, 1)


def apply_stains(rgb, dots, halo, rings):
    rust = np.array([0.72, 0.43, 0.24])
    tea = np.array([0.80, 0.62, 0.42])
    out = rgb.copy()
    out = out * (1 - rings[..., None] * 0.22) + tea * rings[..., None] * 0.22
    out = out * (1 - halo[..., None] * 0.28) + tea * halo[..., None] * 0.28
    out = out * (1 - dots[..., None] * 0.75) + rust * dots[..., None] * 0.75
    return out


def polygon_sdf(h, w, poly):
    """Signed distance (px) to polygon; negative inside."""
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    m = np.asarray(mask) > 127
    din = ndimage.distance_transform_edt(m)
    dout = ndimage.distance_transform_edt(~m)
    return np.where(m, -din, dout).astype(np.float32)


def worn_alpha(sdf, rng, h, w, rough=2.6, feather=0.9):
    """Irregular, slightly frayed paper edge from an SDF."""
    edge_noise = band_noise(h, w, 1 / 60, 1 / 6, rng) * rough + band_noise(h, w, 1 / 4, 1 / 1.5, rng) * 0.9
    d = sdf + edge_noise
    return 1 - smoothstep(-feather, feather, d)


def edge_ageing(rgb, sdf, rng, h, w, width=26, strength=0.20):
    """Browning / soiling that creeps in from the edges, with a crisp worn rim."""
    var = 0.6 + 0.4 * fft_noise(h, w, 2.0, rng)
    inside = np.clip(-sdf, 0, None)
    creep = np.exp(-inside / (width * var.clip(0.3, 1.2)))
    rim = np.exp(-inside / 3.0)
    brown = np.array([0.66, 0.47, 0.30])
    k = (creep * strength + rim * 0.34)[..., None]
    return rgb * (1 - k) + brown * k


def crease(h, w, p0, p1, rng, depth=0.05, soft=1.4):
    """A fold line: dark valley with a light ridge beside it (light from top-left)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    nx, ny = -dy / L, dx / L
    t = ((xx - x0) * dx + (yy - y0) * dy) / (L * L)
    dist = (xx - x0) * nx + (yy - y0) * ny
    wob = band_noise(h, w, 1 / 200, 1 / 40, rng) * 1.2
    dist = dist + wob
    along = smoothstep(-0.02, 0.06, t) * (1 - smoothstep(0.94, 1.02, t))
    fade = 0.6 + 0.4 * band_noise(h, w, 1 / 120, 1 / 30, rng)
    valley = np.exp(-(dist ** 2) / (2 * soft ** 2))
    ridge = np.exp(-((dist - 2.6 * np.sign(ny + 1e-6)) ** 2) / (2 * (soft * 1.6) ** 2))
    return (-valley * depth + ridge * depth * 0.55) * along * fade


# --------------------------------------------------------------------------- envelope parts

def envelope_body():
    rng = np.random.default_rng(1936)
    h, w = ENV_H, ENV_W
    rgb = paper_base(h, w, rng)

    # corners rounded and slightly worn
    m = 5
    poly = [(m, m + 3), (w - m, m), (w - m - 2, h - m), (m + 2, h - m - 1)]
    sdf = polygon_sdf(h, w, poly)
    # rounded corners: soften SDF by blurring near corners
    sdf = ndimage.gaussian_filter(sdf, 3.0)

    dots, halo, rings = stain_layer(
        h, w, rng, spots=32, rings=2,
        zones=[(0.06, 0.05, 0.40, 0.35), (0.05, 0.55, 0.40, 0.95), (0.85, 0.75, 1.0, 1.0), (0.9, 0.0, 1.0, 0.2)],
    )
    rgb = apply_stains(rgb, dots, halo, rings)
    rgb = edge_ageing(rgb, sdf, rng, h, w, width=30, strength=0.22)

    # hidden side-flap folds: extremely faint (flap covers most of them)
    tip = (0.5 * w, 0.64 * h)
    shade = crease(h, w, (0, h), tip, rng, depth=0.018) + crease(h, w, (w, h), tip, rng, depth=0.018)
    # a couple of handling creases
    shade += crease(h, w, (0.02 * w, 0.78 * h), (0.3 * w, 0.93 * h), rng, depth=0.028)
    shade += crease(h, w, (0.93 * w, 0.02 * h), (0.995 * w, 0.24 * h), rng, depth=0.03)
    rgb = rgb * (1 + shade[..., None])

    alpha = worn_alpha(sdf, rng, h, w)
    return to_rgba_img(rgb, alpha)


def envelope_flap_outer():
    rng = np.random.default_rng(2024)
    h, w = ENV_H, ENV_W
    rgb = paper_base(h, w, rng, base=(0.928, 0.852, 0.752))

    tx, ty = FLAP_TIP[0] * w, FLAP_TIP[1] * h
    poly = [(2, 3), (w - 3, 1), (tx + 14, ty - 8), (tx, ty), (tx - 14, ty - 8)]
    sdf = polygon_sdf(h, w, poly)
    sdf = ndimage.gaussian_filter(sdf, 2.2)

    dots, halo, rings = stain_layer(
        h, w, rng, spots=16, rings=1,
        zones=[(0.18, 0.08, 0.36, 0.3), (0.05, 0.0, 0.2, 0.15), (0.85, 0.0, 0.98, 0.1)],
    )
    rgb = apply_stains(rgb, dots * 0.9, halo, rings * 0.7)
    rgb = edge_ageing(rgb, sdf, rng, h, w, width=18, strength=0.16)

    # soft fold highlight near hinge (paper bends over the top edge)
    yy = np.mgrid[0:h, 0:w][0].astype(np.float32)
    hinge = np.exp(-yy / 10) * 0.06
    rgb = rgb * (1 + hinge[..., None])

    alpha = worn_alpha(sdf, rng, h, w, rough=2.0)
    return to_rgba_img(rgb, alpha)


def envelope_flap_inner():
    """Inside face of the flap: the less-bleached side of the sheet, with a
    coffee ring near the tip (seen at the apex once the flap is open)."""
    rng = np.random.default_rng(4242)
    h, w = ENV_H, ENV_W
    rgb = paper_base(h, w, rng, base=(0.815, 0.715, 0.580))

    tx, ty = FLAP_TIP[0] * w, FLAP_TIP[1] * h
    poly = [(2, 3), (w - 3, 1), (tx + 14, ty - 8), (tx, ty), (tx - 14, ty - 8)]
    sdf = ndimage.gaussian_filter(polygon_sdf(h, w, poly), 2.2)

    dots, halo, rings = stain_layer(h, w, rng, spots=10, rings=0, zones=[(0.3, 0.05, 0.7, 0.4)])
    rgb = apply_stains(rgb, dots, halo, rings)
    # coffee drip near the tip (appears near the apex in the open state)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    for cx, cy, rr, k in ((0.487, 0.445, 16, 1.0), (0.503, 0.47, 10, 0.8), (0.495, 0.415, 6, 0.6)):
        warp = band_noise(h, w, 1 / 30, 1 / 6, rng) * rr * 0.35
        d = np.hypot(xx - cx * w, (yy - cy * h) * 1.1) + warp
        spot = (1 - smoothstep(rr * 0.75, rr, d)) * 0.35 + np.exp(-((d - rr) ** 2) / (2 * 2.2 ** 2)) * 0.6
        rgb = rgb * (1 - spot[..., None] * 0.55 * k) + np.array([0.45, 0.27, 0.14]) * spot[..., None] * 0.55 * k
    rgb = edge_ageing(rgb, sdf, rng, h, w, width=22, strength=0.22)
    # gum strip along the diagonal edges (slightly glossy, darker band)
    band = np.exp(-np.clip(-sdf, 0, None) / 26) * (1 - np.exp(-np.clip(-sdf, 0, None) / 4))
    rgb = rgb * (1 - band[..., None] * 0.07)
    shade = crease(h, w, (0.2 * w, 0.02 * h), (0.36 * w, 0.3 * h), rng, depth=0.03)
    rgb = rgb * (1 + shade[..., None])
    alpha = worn_alpha(sdf, rng, h, w, rough=2.0)
    return to_rgba_img(rgb, alpha)


def envelope_interior():
    """Inside of the envelope's far wall, seen through the open mouth."""
    rng = np.random.default_rng(777)
    h, w = ENV_H, ENV_W
    rgb = paper_base(h, w, rng, base=(0.845, 0.748, 0.618))
    m = 5
    sdf = ndimage.gaussian_filter(polygon_sdf(h, w, [(m, m + 3), (w - m, m), (w - m - 2, h - m), (m + 2, h - m - 1)]), 3.0)
    rgb = edge_ageing(rgb, sdf, rng, h, w, width=30, strength=0.2)
    # inner seams of the side flaps glued behind
    shade = crease(h, w, (0.0, 0.02 * h), (0.3 * w, 0.62 * h), rng, depth=0.035)
    shade += crease(h, w, (w, 0.02 * h), (0.7 * w, 0.62 * h), rng, depth=0.035)
    rgb = rgb * (1 + shade[..., None])
    return to_rgba_img(rgb, worn_alpha(sdf, rng, h, w))


# Ticket geometry (envelope units) — must match constants.ts TICKET
TK_H, TK_MAIN, TK_STUB = 880, 1505, 440
TK_SCALE = 1.25
TK_HOLE_R, TK_HOLE_STEP = 6.5, 24
TEAR_STRIP = 20  # half-width (units) of the torn-fibre overlays


def ticket_sheet():
    """One continuous sheet of ticket stock, split along the perforation into
    main + stub with *complementary* alpha, so the two pieces fit exactly at
    rest and can tear apart later. Holes are punched through both."""
    rng = np.random.default_rng(1223)
    S = TK_SCALE
    W_, H_ = int((TK_MAIN + TK_STUB) * S), int(TK_H * S)
    rgb = paper_base(H_, W_, rng, base=(0.925, 0.845, 0.735))
    m = 4
    sdf = ndimage.gaussian_filter(polygon_sdf(H_, W_, [(m, m), (W_ - m, m + 2), (W_ - m, H_ - m), (m, H_ - m - 2)]), 3.2)

    dots, halo, rings = stain_layer(
        H_, W_, rng, spots=46, rings=2,
        zones=[(0.0, 0.0, 0.2, 1.0), (0.72, 0.0, 0.8, 1.0), (0.9, 0.0, 1.0, 1.0), (0.2, 0.9, 0.8, 1.0)],
    )
    rgb = apply_stains(rgb, dots * 1.1, halo * 1.2, rings)
    # tea-coloured blotches creeping in from the edges (heavier than the envelope)
    blot = fft_noise(H_, W_, 1.7, rng)
    inside = np.clip(-sdf, 0, None)
    near_edge = np.exp(-inside / (0.07 * H_))
    patches = smoothstep(0.05, 0.35, blot * 0.8 + near_edge * 0.55 - 0.2)
    tide = np.clip(ndimage.gaussian_laplace(patches, 2.0) * -18, 0, 1)
    tea = np.array([0.74, 0.55, 0.36])
    rgb = rgb * (1 - patches[..., None] * 0.28) + tea * patches[..., None] * 0.28
    rgb = rgb * (1 - tide[..., None] * 0.18)
    # fine abrasion: light scuffs where the print surface wore off
    scuff = smoothstep(0.55, 0.75, band_noise(H_, W_, 1 / 40, 1 / 6, rng)) * near_edge
    rgb = rgb * (1 - scuff[..., None] * 0.1) + scuff[..., None] * 0.1 * 0.97
    rgb = edge_ageing(rgb, sdf, rng, H_, W_, width=46, strength=0.42)

    # handling creases: long diagonal across the info column, a short cross crease
    shade = crease(H_, W_, (0.01 * W_, 0.06 * H_), (0.2 * W_, 0.98 * H_), rng, depth=0.06, soft=1.6)
    shade += crease(H_, W_, (0.0, 0.47 * H_), (0.19 * W_, 0.42 * H_), rng, depth=0.04)
    shade += crease(H_, W_, (0.62 * W_, 0.0), (0.66 * W_, 0.3 * H_), rng, depth=0.03)
    rgb = rgb * (1 + shade[..., None])

    # dog-eared bottom-left corner: folded crease + lighter, flattened corner
    yy, xx = np.mgrid[0:H_, 0:W_].astype(np.float32)
    fold = (xx / (0.045 * W_) + (H_ - yy) / (0.13 * H_)) < 1
    rgb = np.where(fold[..., None], rgb * 1.02 + 0.015, rgb)
    shade = crease(H_, W_, (0.0, 0.87 * H_), (0.045 * W_, H_), rng, depth=0.08, soft=1.2)
    rgb = rgb * (1 + shade[..., None])

    # chipped, softened edges
    chips = smoothstep(0.55, 0.9, band_noise(H_, W_, 1 / 30, 1 / 8, rng)) * 11
    alpha = worn_alpha(sdf + chips, rng, H_, W_, rough=3.2)

    # perforation: holes punched through
    px = TK_MAIN * S
    step = TK_HOLE_STEP * S
    hole_r = TK_HOLE_R * S
    holes = np.zeros((H_, W_), np.float32)
    ys = np.arange(step / 2, H_, step)
    for hy in ys:
        d = np.hypot(xx - px, yy - hy)
        holes = np.maximum(holes, 1 - smoothstep(hole_r - 1.0, hole_r + 0.6, d))
    # ink-dark rim where the pin crushed the fibres
    rim = np.zeros_like(holes)
    for hy in ys:
        d = np.hypot(xx - px, yy - hy)
        rim = np.maximum(rim, np.exp(-((d - hole_r - 1.2) ** 2) / 2.5))
    rgb = rgb * (1 - rim[..., None] * 0.18)
    alpha = alpha * (1 - holes)

    # tear path through the holes: ragged, fibrous bridges between them
    jag = band_noise(H_, 64, 1 / 8, 1 / 2, rng)[:, 0] * 2.6 * S + band_noise(H_, 64, 1 / 60, 1 / 12, rng)[:, 0] * 2.0 * S
    tear_x = px + jag
    main_mask = (xx < tear_x[:, None]).astype(np.float32)
    # 1px soft split so the pieces don't show a hairline gap at rest
    main_mask = ndimage.gaussian_filter(main_mask, (0, 0.5))
    stub_mask = 1 - main_mask

    split = int(px + 6 * S) + 8
    main = to_rgba_img(rgb[:, :split], (alpha * main_mask)[:, :split])
    stub_x0 = int(px - 6 * S) - 8
    stub = to_rgba_img(rgb[:, stub_x0:], (alpha * stub_mask)[:, stub_x0:])
    print(f"  ticket crop offsets (px @ x{S}): main 0..{split}, stub {stub_x0}..{W_}")

    # torn-edge fibres: once the bridges between the holes break, each edge shows
    # a fringe of lighter, fluffed-out fibres. One strip per piece, same sheet
    # coordinates as the tear (TEAR_STRIP units either side of the perforation).
    frng = np.random.default_rng(99)
    half = int(TEAR_STRIP * S)
    sx0 = int(px) - half
    hole_ys = ys
    strips = []
    for side in (-1, 1):  # -1: main (fibres stick out to the right), +1: stub (to the left)
        SS = 3  # supersample
        img = Image.new("RGBA", (2 * half * SS, H_ * SS), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        # exposed, whiter paper core right at the torn edge
        for yy in range(0, H_, 1):
            near = np.min(np.abs(hole_ys - yy))
            if near < hole_r * 0.95:
                continue  # hole: nothing to tear here
            ex = (tear_x[yy] - sx0) * SS
            band = (1.2 + frng.random() * 1.6) * S * SS
            x0, x1 = (ex - band, ex) if side < 0 else (ex, ex + band)
            d.line([(x0, yy * SS), (x1, yy * SS)], fill=(246, 238, 222, int(150 + frng.random() * 70)), width=SS)
        # fibres fluffing out past the edge
        for _ in range(int(H_ * 1.6)):
            yy = frng.uniform(0, H_)
            if np.min(np.abs(hole_ys - yy)) < hole_r * 0.9:
                continue
            ex = tear_x[int(min(H_ - 1, yy))] - sx0
            L = frng.uniform(1.0, 5.5) * S
            ang = frng.normal(0, 0.55)
            dx = -side * math.cos(ang) * L  # outward from the piece
            dy = math.sin(ang) * L
            start = ex + side * frng.uniform(0, 1.2) * S  # rooted just inside the paper
            tone = int(frng.uniform(215, 250))
            d.line([(start * SS, yy * SS), ((start + dx) * SS, (yy + dy) * SS)], fill=(tone, tone - 8, tone - 22, int(frng.uniform(110, 220))), width=max(1, int(0.5 * S * SS)))
        img = img.resize((2 * half, H_), Image.LANCZOS)
        strips.append(img)
    # wear that sits ON TOP of the print (photo + ink): burnt edges, rust
    # speckles, crease lines where the ink cracked, white scuffs. Split with the
    # same masks so it tears with the pieces.
    wrng = np.random.default_rng(4711)
    wa = np.zeros((H_, W_), np.float32)  # alpha of darkening
    wc = np.zeros((H_, W_, 3), np.float32)  # colour of darkening
    lite = np.zeros((H_, W_), np.float32)  # alpha of whitening
    inside = np.clip(-sdf, 0, None)
    burn_var = 0.5 + 0.5 * band_noise(H_, W_, 1 / 90, 1 / 12, wrng)
    burn = np.exp(-inside / (13 * S)) * np.clip(burn_var, 0, 1) * 0.85
    burn += smoothstep(0.55, 0.85, band_noise(H_, W_, 1 / 40, 1 / 10, wrng)) * np.exp(-inside / (40 * S)) * 0.35
    burn_col = np.array([0.42, 0.25, 0.12])
    wa = np.maximum(wa, burn)
    wc += burn_col * burn[..., None]
    # grime: soft, patchy browning creeping in from the edges and corners
    grime = smoothstep(0.1, 0.55, fft_noise(H_, W_, 1.6, wrng) * 0.7 + np.exp(-inside / (0.06 * H_)) * 0.8 - 0.25) * 0.38
    wc += np.array([0.52, 0.34, 0.17]) * grime[..., None]
    wa = np.maximum(wa, grime)
    sp_dots, sp_halo, _ = stain_layer(H_, W_, wrng, spots=34, rings=0, zones=[(0.0, 0.0, 1.0, 0.12), (0.0, 0.88, 1.0, 1.0), (0.0, 0.0, 0.08, 1.0), (0.93, 0.0, 1.0, 1.0)])
    rust = np.clip(sp_dots * 0.6 + sp_halo * 0.3, 0, 0.7)
    wc += np.array([0.55, 0.31, 0.14]) * rust[..., None]
    wa = np.maximum(wa, rust)
    wc = wc / np.maximum(wa, 1e-4)[..., None] * (wa > 0)[..., None]
    # cracked ink along the handling creases: light hairline + faint dark shoulder
    for p0, p1, k in (((0.01, 0.06), (0.2, 0.98), 1.0), ((0.0, 0.47), (0.19, 0.42), 0.8), ((0.62, 0.0), (0.66, 0.3), 0.6), ((0.0, 0.87), (0.045, 1.0), 1.0)):
        c = crease(H_, W_, (p0[0] * W_, p0[1] * H_), (p1[0] * W_, p1[1] * H_), wrng, depth=1.0, soft=1.3)
        lite = np.maximum(lite, np.clip(c, 0, 1) * 0.75 * k)
    scuffs = smoothstep(0.72, 0.9, band_noise(H_, W_, 1 / 9, 1 / 2.5, wrng)) * smoothstep(0.2, 0.8, band_noise(H_, W_, 1 / 120, 1 / 30, wrng))
    lite = np.maximum(lite, scuffs * 0.5)
    # compose: whitening over darkening
    out_a = np.clip(wa + lite * (1 - wa), 0, 1)
    out_rgb = (wc * wa[..., None] * (1 - lite[..., None]) + np.array([0.97, 0.95, 0.9]) * lite[..., None]) / np.maximum(out_a, 1e-4)[..., None]
    out_a = out_a * alpha
    wear_main = to_rgba_img(out_rgb[:, :split], (out_a * main_mask)[:, :split])
    wear_stub = to_rgba_img(out_rgb[:, stub_x0:], (out_a * stub_mask)[:, stub_x0:])
    return main, stub, strips[0], strips[1], wear_main, wear_stub


# --------------------------------------------------------------------------- environment + utility tiles

def desk_tile(size=1024):
    """Warm, dark bookcloth / linen: seamless tile."""
    rng = np.random.default_rng(77)
    h = w = size
    # weave: two orthogonal thread fields with slub variation
    warp_threads = np.sin(np.arange(w) * 2 * math.pi / 4.0)[None, :]
    weft_threads = np.sin(np.arange(h) * 2 * math.pi / 4.0)[:, None]
    slub_x = band_noise(h, w, 1 / 64, 1 / 8, rng)
    slub_y = band_noise(h, w, 1 / 64, 1 / 8, rng)
    # stretch slubs along thread direction
    slub_x = ndimage.gaussian_filter(slub_x, (6, 0.6), mode="wrap")
    slub_y = ndimage.gaussian_filter(slub_y, (0.6, 6), mode="wrap")
    checker = ((np.arange(h)[:, None] // 4 + np.arange(w)[None, :] // 4) % 2) * 2 - 1
    weave = 0.5 * (warp_threads * (checker > 0) + weft_threads * (checker < 0))
    weave = ndimage.gaussian_filter(weave, 0.7, mode="wrap")
    mottle = fft_noise(h, w, 2.0, rng)
    grain = band_noise(h, w, 1 / 3, 1 / 1.4, rng)

    lum = 1 + 0.10 * weave + 0.09 * slub_x + 0.07 * slub_y + 0.05 * mottle + 0.03 * grain
    base = np.array([0.225, 0.172, 0.135])
    rgb = base[None, None, :] * lum[..., None]
    return to_rgba_img(rgb)


def ink_mask_tile(size=512):
    """Printing wear: mostly opaque, with pitted holes + uneven density. Grey = alpha."""
    rng = np.random.default_rng(5)
    h = w = size
    density = 0.86 + 0.14 * fft_noise(h, w, 1.6, rng)
    pits = band_noise(h, w, 1 / 6, 1 / 1.8, rng)
    holes = smoothstep(0.42, 0.62, pits)
    speck = band_noise(h, w, 1 / 30, 1 / 8, rng)
    voids = smoothstep(0.55, 0.8, speck)
    a = density * (1 - 0.85 * holes) * (1 - 0.7 * voids)
    a = np.clip(a, 0, 1)
    img = Image.fromarray((a * 255).astype(np.uint8), "L")
    rgba = Image.merge("RGBA", (img, img, img, img))
    return rgba


def grain_tile(size=512):
    """Neutral paper tooth for overlay blending (mid-grey = no change)."""
    rng = np.random.default_rng(9)
    h = w = size
    g = 0.5 * band_noise(h, w, 1 / 5, 1 / 1.6, rng) + 0.35 * band_noise(h, w, 1 / 40, 1 / 10, rng)
    f = fibres(h, w, int(h * w / 300), rng)
    v = 0.5 + 0.10 * g + 0.10 * f
    return to_rgba_img(np.dstack([v, v, v]))


def save_webp(img: Image.Image, name: str, q=86):
    path = os.path.join(OUT, name)
    img.save(path, "WEBP", quality=q, method=6, use_sharp_yuv=True)
    print(f"  {name:28s} {img.size[0]}x{img.size[1]}  {os.path.getsize(path) / 1024:.0f} KB")


if __name__ == "__main__":
    import sys

    only = set(sys.argv[1:])  # optional: generate a subset, e.g. `ticket flap-inner`
    want = lambda k: not only or k in only  # noqa: E731
    print("Generating textures ->", os.path.abspath(OUT))
    if want("body"):
        save_webp(envelope_body(), "envelope-body.webp", q=92)
    if want("flap"):
        save_webp(envelope_flap_outer(), "envelope-flap-outer.webp", q=92)
    if want("flap-inner"):
        save_webp(envelope_flap_inner(), "envelope-flap-inner.webp", q=92)
    if want("interior"):
        save_webp(envelope_interior(), "envelope-interior.webp", q=90)
    if want("ticket"):
        main, stub, fib_main, fib_stub, wear_main, wear_stub = ticket_sheet()
        save_webp(wear_main, "ticket-wear-main.webp", q=90)
        save_webp(wear_stub, "ticket-wear-stub.webp", q=90)
        save_webp(main, "ticket-main.webp", q=92)
        save_webp(stub, "ticket-stub.webp", q=92)
        save_webp(fib_main, "tear-fibres-main.webp", q=90)
        save_webp(fib_stub, "tear-fibres-stub.webp", q=90)
    if want("desk"):
        save_webp(desk_tile(), "desk-linen.webp", q=82)
    if want("ink"):
        save_webp(ink_mask_tile(), "ink-wear.webp", q=90)
    if want("grain"):
        save_webp(grain_tile(), "paper-grain.webp", q=85)
