/** Small deterministic helpers for procedural SVG artwork. */

/** Mulberry32: tiny seeded PRNG so artwork is identical on every render. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f = (n: number) => Math.round(n * 100) / 100

/** Closed, smooth path through points (Catmull-Rom → cubic Bézier). */
export function smoothClosedPath(pts: Array<[number, number]>): string {
  const n = pts.length
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + 'Z'
}

/** Irregular "melted" blob around the origin — used for the wax puddle. */
export function blobPath(radius: number, seed: number, lumpiness = 0.07, count = 40): string {
  const r = rng(seed)
  // a few low-frequency lobes + fine drips so the outline reads as poured wax
  const lobes = Array.from({ length: 4 }, () => ({ k: 2 + Math.floor(r() * 5), p: r() * Math.PI * 2, a: r() }))
  const pts: Array<[number, number]> = []
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2
    let k = 1
    for (const l of lobes) k += Math.sin(t * l.k + l.p) * lumpiness * 0.45 * l.a
    k += (r() - 0.5) * lumpiness * 0.9
    pts.push([Math.cos(t) * radius * k, Math.sin(t) * radius * k])
  }
  return smoothClosedPath(pts)
}

/** Horizontal wavy line from x0 to x1 (engraving-style sea / cancellation). */
export function wavePath(x0: number, x1: number, y: number, amp: number, len: number, phase = 0): string {
  let d = `M${f(x0)} ${f(y + Math.sin(phase) * amp)}`
  const half = len / 2
  let x = x0
  let up = Math.sin(phase) < 0
  while (x < x1) {
    const nx = Math.min(x + half, x1)
    d += ` Q${f((x + nx) / 2)} ${f(y + (up ? -amp : amp) * 1.6)} ${f(nx)} ${f(y)}`
    x = nx
    up = !up
  }
  return d
}

/** Circles placed along a rectangle's edges — punched out to form perforations. */
export function perforationHoles(x: number, y: number, w: number, h: number, step: number) {
  const holes: Array<[number, number]> = []
  const nx = Math.max(2, Math.round(w / step))
  const ny = Math.max(2, Math.round(h / step))
  for (let i = 0; i <= nx; i++) {
    const px = x + (w * i) / nx
    holes.push([px, y], [px, y + h])
  }
  for (let j = 1; j < ny; j++) {
    const py = y + (h * j) / ny
    holes.push([x, py], [x + w, py])
  }
  return holes
}
