/**
 * Engraved (intaglio) artwork for the two postage stamps, in envelope units,
 * composed after the photographed reference:
 *
 *  - main stamp: a tall caldera crag fills the upper right (crag outlines and
 *    short vertical rock strokes), a band of choppy sea runs diagonally across
 *    the middle, whitewashed cubes step down the slope on the right, and a
 *    domed church with arched windows stands in the lower middle with houses
 *    beside it. Tone comes only from line density and weight.
 *  - small stamp: two heavy curling waves, each a band of close parallel cuts.
 */
import { VILLAGE_STAMP, WAVE_STAMP } from '../constants'
import { rng } from './geometry'

const INK = '#2b2723'
const f = (n: number) => Math.round(n * 10) / 10

type Pt = [number, number]

/** parallel rules across a box at `angle` degrees, spacing `gap`, slight hand wobble */
function rules(x: number, y: number, w: number, h: number, angle: number, gap: number, seed: number, wob = 0.6) {
  const r = rng(seed)
  const a = (angle * Math.PI) / 180
  const cx = x + w / 2
  const cy = y + h / 2
  const R = Math.hypot(w, h) / 2 + 4
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  let d = ''
  for (let o = -R; o <= R; o += gap * (0.85 + r() * 0.3)) {
    const px = cx - uy * o
    const py = cy + ux * o
    const j = (r() - 0.5) * wob
    d += `M${f(px - ux * R)} ${f(py - uy * R + j)} L${f(px + ux * R)} ${f(py + uy * R - j)} `
  }
  return d
}

/** short vertical rules filling a box (shaded walls) */
function vlines(x: number, y: number, w: number, h: number, gap: number) {
  let d = ''
  for (let xx = x + gap / 2; xx < x + w; xx += gap) d += `M${f(xx)} ${f(y + 0.8)} V${f(y + h - 0.8)} `
  return d
}

/** polyline through normalised points inside the image box */
const P = (ix: number, iy: number, iw: number, ih: number) => (pts: Pt[]) => pts.map(([u, v]) => [ix + u * iw, iy + v * ih] as Pt)
const poly = (pts: Pt[], close = true) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + (close ? ' Z' : '')

/** smooth open curve (Catmull-Rom) */
function curve(pts: Pt[]) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

export function VillageStampInk() {
  const { x, y, w, h } = VILLAGE_STAMP
  const ix = x + 26
  const iy = y + 26
  const iw = w - 52
  const ih = h - 52
  const N = P(ix, iy, iw, ih)
  const U = (u: number) => ix + u * iw
  const V = (v: number) => iy + v * ih
  const r = rng(77)
  const clip = 'te-eng-village'

  /* ---- the crag: jagged left contour from the top down into the sea ---- */
  const cragEdge: Pt[] = [
    [0.52, -0.02], [0.55, 0.05], [0.51, 0.1], [0.56, 0.15], [0.54, 0.2], [0.6, 0.25], [0.57, 0.3], [0.63, 0.35], [0.6, 0.4], [0.66, 0.45], [0.7, 0.5], [0.8, 0.53], [1.02, 0.55],
  ]
  const crag = poly(N([...cragEdge, [1.02, -0.02]]))
  // crag faces: a few internal crag outlines following the rock, then short vertical cuts
  const cragLines: string[] = []
  for (let k = 1; k < 4; k++) {
    const pts = cragEdge.slice(0, 11).map(([u, v], i) => [u + k * 0.055 + Math.sin(i * 2.1 + k) * 0.012, v + k * 0.01] as Pt)
    cragLines.push(curve(N(pts)))
  }
  // rock face: columns of jointed rock, each a jagged vertical contour with short cross-joints
  const rock: string[] = []
  for (let c = 0; c < 11; c++) {
    const u0 = 0.56 + c * 0.042 + (r() - 0.5) * 0.01
    let v = -0.02
    let u = u0
    let d = `M${f(U(u))} ${f(V(v))}`
    while (v < 0.52) {
      v += 0.025 + r() * 0.03
      u = u0 + (r() - 0.5) * 0.02
      d += ` L${f(U(u))} ${f(V(v))}`
      if (r() < 0.35) rock.push(`M${f(U(u))} ${f(V(v))} l${f(iw * (0.012 + r() * 0.022))} ${f((r() - 0.5) * 4)}`)
    }
    rock.push(d)
  }
  // scrub and a lone tree on the crest
  const tree = `M${f(U(0.64))} ${f(V(0.035))} q-10 -4 -8 -14 q-6 -10 6 -14 q4 -10 14 -5 q10 -4 12 6 q10 4 4 13 q2 10 -10 10 q-6 6 -18 4 Z`

  /* ---- the sea band: choppy wave rows running diagonally, lighter where it meets the crag ---- */
  const seaTop = (u: number) => 0.62 - 0.28 * u // upper boundary (rises to the right)
  const waves: Array<{ d: string; w: number }> = []
  for (let k = 0; k < 34; k++) {
    const t = k / 33
    const u0 = -0.15
    const pts: Pt[] = []
    const off = 0.02 + t * 0.34
    for (let u = u0; u <= 1.02; u += 0.04) {
      const v = seaTop(u) + off + Math.sin(u * 60 + k * 1.7) * 0.006
      pts.push([u, v])
    }
    const amp = 2 + t * 3
    // choppy strokes: short arcs along the row with gaps where light glints
    let d = ''
    for (let i = 0; i < pts.length - 1; i++) {
      if (r() < 0.18) continue
      const [a, b] = N([pts[i], pts[i + 1]])
      const mx = (a[0] + b[0]) / 2
      const my = (a[1] + b[1]) / 2 - amp * (r() < 0.5 ? 1 : 1.6)
      d += `M${f(a[0])} ${f(a[1])} Q${f(mx)} ${f(my)} ${f(b[0])} ${f(b[1])} `
    }
    waves.push({ d, w: 1.3 + t * 1.3 })
  }
  const seaClip = poly(N([[-0.2, seaTop(-0.2)], [1.05, seaTop(1.05)], [1.05, 1.05], [-0.2, 1.05]]))

  /* ---- whitewashed cubes stepping down the slope on the right ---- */
  type Box = { x: number; y: number; w: number; h: number }
  const cubes: Box[] = []
  const rc = rng(31)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const u = 0.74 + col * 0.068 + (row % 2) * 0.03 + (rc() - 0.5) * 0.02
      const v = 0.52 + row * 0.055 + (rc() - 0.5) * 0.012
      if (u > 0.98 || rc() < 0.12) continue
      cubes.push({ x: U(u), y: V(v), w: iw * (0.05 + rc() * 0.03), h: ih * (0.038 + rc() * 0.02) })
    }
  }
  cubes.sort((a, b) => a.y - b.y)

  /* ---- the church ---- */
  const ch = { x: U(0.3), y: V(0.66), w: iw * 0.42, h: ih * 0.34 }
  const dome = { cx: ch.x + ch.w * 0.5, cy: ch.y, r: ch.w * 0.24 }
  const ribs: string[] = []
  for (let k = -5; k <= 5; k++) {
    const sgn = k / 5.5
    ribs.push(`M${f(dome.cx + sgn * dome.r)} ${f(dome.cy)} Q${f(dome.cx + sgn * dome.r * 0.92)} ${f(dome.cy - dome.r * 0.9)} ${f(dome.cx)} ${f(dome.cy - dome.r * 1.08)}`)
  }
  const arch = (ax: number, ay: number, aw: number, ah: number) => `M${f(ax)} ${f(ay + ah)} V${f(ay + aw / 2)} A${f(aw / 2)} ${f(aw / 2)} 0 0 1 ${f(ax + aw)} ${f(ay + aw / 2)} V${f(ay + ah)} Z`
  const courses: string[] = []
  for (let yy = ch.y + 10; yy < ch.y + ch.h; yy += 7) {
    for (let xx = ch.x + 4 + ((yy / 7) % 2) * 6; xx < ch.x + ch.w - 8; xx += 12 + r() * 10) courses.push(`M${f(xx)} ${f(yy)} h${f(4 + r() * 5)}`)
  }
  const sideHouses: Box[] = [
    { x: U(0.74), y: V(0.78), w: iw * 0.12, h: ih * 0.22 },
    { x: U(0.86), y: V(0.72), w: iw * 0.15, h: ih * 0.28 },
    { x: U(0.14), y: V(0.84), w: iw * 0.15, h: ih * 0.16 },
  ]

  return (
    <>
      {/* plate slightly out of register on a second pass: a faint offset ghost of the linework */}
      <use href="#te-eng-village-art" transform="translate(1.4 -0.9)" opacity={0.1} />
      <g id="te-eng-village-art" stroke={INK} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <clipPath id={`${clip}-img`}>
            <rect x={ix} y={iy} width={iw} height={ih} />
          </clipPath>
          <clipPath id={`${clip}-crag`}>
            <path d={crag} />
          </clipPath>
          <clipPath id={`${clip}-sea`}>
            <path d={seaClip} />
          </clipPath>
          <clipPath id={`${clip}-dome`}>
            <path d={`M${dome.cx - dome.r} ${dome.cy} A${dome.r} ${dome.r * 1.08} 0 0 1 ${dome.cx + dome.r} ${dome.cy} Z`} />
          </clipPath>
        </defs>

        {/* printed frame: a fine rule just inside the perforations */}
        <rect x={x + 12} y={y + 12} width={w - 24} height={h - 24} strokeWidth={1.1} />
        <rect x={ix} y={iy} width={iw} height={ih} strokeWidth={2.2} />

        <g clipPath={`url(#${clip}-img)`}>
          {/* sky: loose engraved cloud curls */}
          {[
            [0.06, 0.07, 0.3],
            [0.22, 0.16, 0.22],
            [0.08, 0.26, 0.18],
          ].map(([u, v, s0], i) => {
            const W = s0 * iw
            const cx = U(u)
            const cy = V(v)
            return (
              <g key={`cl${i}`} strokeWidth={1.1}>
                <path d={`M${f(cx)} ${f(cy)} q${f(W * 0.12)} ${f(-W * 0.14)} ${f(W * 0.26)} ${f(-W * 0.04)} q${f(W * 0.1)} ${f(-W * 0.14)} ${f(W * 0.26)} ${f(-W * 0.02)} q${f(W * 0.16)} ${f(-W * 0.06)} ${f(W * 0.24)} ${f(W * 0.06)}`} />
                <path d={`M${f(cx + W * 0.08)} ${f(cy + 5)} q${f(W * 0.3)} 4 ${f(W * 0.7)} -2`} strokeWidth={0.7} />
                <path d={`M${f(cx + W * 0.2)} ${f(cy + 10)} q${f(W * 0.2)} 3 ${f(W * 0.45)} -1`} strokeWidth={0.6} />
              </g>
            )
          })}
          {/* birds */}
          {[
            [0.36, 0.06],
            [0.42, 0.09],
          ].map(([u, v], i) => (
            <path key={`b${i}`} d={`M${f(U(u))} ${f(V(v))} q5 -5 9 0 q4 -5 9 0`} strokeWidth={1} />
          ))}

          {/* ---- crag ---- */}
          <path d={crag} fill="#fff" stroke="none" />
          <g clipPath={`url(#${clip}-crag)`}>
            {cragLines.map((d, i) => (
              <path key={`cr${i}`} d={d} strokeWidth={0.9 + (i % 2) * 0.4} />
            ))}
            <path d={rock.join(' ')} strokeWidth={1.3} />
            {/* shade on the rock faces: fine vertical cuts on the right of each column */}
            <path d={rules(U(0.6), V(0), iw * 0.42, ih * 0.52, 88, 3.4, 12, 0.4)} strokeWidth={0.45} opacity={0.75} />
          </g>
          <path d={curve(N(cragEdge.slice(0, 11)))} strokeWidth={1.8} />
          <path d={tree} strokeWidth={1.1} fill="#fff" />
          <path d={`M${f(U(0.645))} ${f(V(0.035))} v10`} strokeWidth={1.4} />

          {/* ---- sea ---- */}
          <g clipPath={`url(#${clip}-sea)`}>
            <path d={seaClip} fill="#fff" stroke="none" />
            {waves.map((wv, i) => (
              <path key={`wv${i}`} d={wv.d} strokeWidth={f(wv.w)} />
            ))}
          </g>

          {/* ---- cubes on the slope ---- */}
          <g fill="#fff" strokeWidth={1.4}>
            {cubes.map((b, i) => (
              <g key={`cu${i}`}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} />
                <path d={vlines(b.x + b.w * 0.7, b.y, b.w * 0.3, b.h, 1.9)} strokeWidth={0.5} />
                <path d={arch(b.x + b.w * 0.18, b.y + b.h * 0.35, b.w * 0.18, b.h * 0.65)} fill={INK} stroke="none" />
                <path d={`M${f(b.x - 1)} ${f(b.y)} h${f(b.w + 2)}`} strokeWidth={1.4} />
              </g>
            ))}
          </g>

          {/* ---- houses beside the church ---- */}
          <g fill="#fff" strokeWidth={1.2}>
            {sideHouses.map((b, i) => (
              <g key={`sh${i}`}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} />
                <path d={`M${f(b.x - 2)} ${f(b.y)} h${f(b.w + 4)}`} strokeWidth={1.8} />
                <path d={vlines(b.x + b.w * 0.74, b.y + 1, b.w * 0.26, b.h - 1, 2)} strokeWidth={0.55} />
                <path d={arch(b.x + b.w * 0.14, b.y + b.h * 0.3, b.w * 0.16, b.h * 0.34)} fill={INK} stroke="none" />
                <path d={arch(b.x + b.w * 0.42, b.y + b.h * 0.3, b.w * 0.16, b.h * 0.34)} fill={INK} stroke="none" />
                {i === 1 && <path d={`M${f(b.x + b.w * 0.5)} ${f(b.y)} v-10 a8 8 0 0 1 16 0 v10`} strokeWidth={1} />}
              </g>
            ))}
          </g>

          {/* ---- the church: stone body, big ribbed dome, lantern and cross, side domes, arcade ---- */}
          <g fill="#fff" strokeWidth={1.9}>
            <rect x={ch.x} y={ch.y} width={ch.w} height={ch.h} />
            <path d={courses.join(' ')} strokeWidth={0.9} fill="none" />
            <path d={vlines(ch.x + ch.w * 0.82, ch.y, ch.w * 0.18, ch.h, 2)} strokeWidth={0.55} fill="none" />
            {/* drum */}
            <rect x={dome.cx - dome.r * 0.92} y={dome.cy - 2} width={dome.r * 1.84} height={14} />
            {[-0.6, -0.2, 0.2, 0.6].map((k) => (
              <path key={`dw${k}`} d={arch(dome.cx + k * dome.r - 3, dome.cy + 1, 6, 10)} fill={INK} stroke="none" />
            ))}
            {/* dome */}
            <path d={`M${dome.cx - dome.r} ${dome.cy} A${dome.r} ${dome.r * 1.08} 0 0 1 ${dome.cx + dome.r} ${dome.cy} Z`} />
            <g clipPath={`url(#${clip}-dome)`} fill="none">
              {ribs.map((d, i) => (
                <path key={`rb${i}`} d={d} strokeWidth={1.3} />
              ))}
              <path d={rules(dome.cx + dome.r * 0.2, dome.cy - dome.r * 1.1, dome.r, dome.r * 1.1, 90, 1.8, 21, 0.1)} strokeWidth={0.55} />
            </g>
            <rect x={dome.cx - 4} y={dome.cy - dome.r * 1.08 - 10} width={8} height={10} />
            <path d={`M${f(dome.cx)} ${f(dome.cy - dome.r * 1.08 - 10)} v-14 M${f(dome.cx - 6)} ${f(dome.cy - dome.r * 1.08 - 18)} h12`} strokeWidth={1.8} fill="none" />
            {/* side domes */}
            {[0.12, 0.88].map((k) => {
              const cx = ch.x + ch.w * k
              const rr = ch.w * 0.1
              return (
                <g key={`sd${k}`}>
                  <path d={`M${f(cx - rr)} ${f(ch.y)} A${f(rr)} ${f(rr * 1.1)} 0 0 1 ${f(cx + rr)} ${f(ch.y)} Z`} />
                  <path d={`M${f(cx)} ${f(ch.y - rr * 1.1)} v-9 M${f(cx - 4)} ${f(ch.y - rr * 1.1 - 5)} h8`} strokeWidth={1.3} fill="none" />
                  <path d={rules(cx, ch.y - rr * 1.1, rr, rr * 1.1, 90, 1.8, 30, 0.1)} strokeWidth={0.5} fill="none" clipPath={`url(#${clip}-img)`} opacity={0.9} />
                </g>
              )
            })}
            {/* arched windows and door */}
            {[0.16, 0.34, 0.6, 0.78].map((k) => (
              <path key={`aw${k}`} d={arch(ch.x + ch.w * k - 5, ch.y + ch.h * 0.2, 10, 22)} fill={INK} stroke="none" />
            ))}
            <path d={arch(ch.x + ch.w * 0.43, ch.y + ch.h * 0.46, ch.w * 0.14, ch.h * 0.54)} fill={INK} stroke="none" />
            <path d={`M${f(ch.x - 4)} ${f(ch.y + ch.h * 0.12)} h${f(ch.w + 8)}`} strokeWidth={1.6} fill="none" />
          </g>

          {/* foreground: terrace wall and steps */}
          {[0, 1, 2, 3].map((k) => (
            <path key={`st${k}`} d={`M${f(U(0.02))} ${f(V(0.93 + k * 0.018))} h${f(iw * (0.3 - k * 0.04))}`} strokeWidth={1} />
          ))}
        </g>

        <rect x={ix} y={iy} width={iw} height={ih} strokeWidth={2.2} />
      </g>
    </>
  )
}

export function WaveStampInk() {
  const { x, y, w, h } = WAVE_STAMP
  const ix = x + 14
  const iy = y + 14
  const iw = w - 28
  const ih = h - 28
  // two heavy curling waves (bands of close parallel cuts), after the reference
  const band = (y0: number, amp: number, seed: number) => {
    const r = rng(seed)
    const out: string[] = []
    for (let k = 0; k < 8; k++) {
      const yy = iy + y0 + k * 3.2
      out.push(`M${f(ix - 4)} ${f(yy + amp)} C${f(ix + iw * 0.25)} ${f(yy - amp * 1.4 + r())} ${f(ix + iw * 0.5)} ${f(yy + amp * 1.6)} ${f(ix + iw * 0.72)} ${f(yy - amp * 0.4)} S${f(ix + iw + 6)} ${f(yy - amp * 1.2)} ${f(ix + iw + 6)} ${f(yy - amp * 1.2)}`)
    }
    return out.join(' ')
  }
  return (
    <g stroke={INK} fill="none" strokeLinecap="round" transform={`rotate(-3 ${x + w / 2} ${y + h / 2})`}>
      <clipPath id="te-clip-wave">
        <rect x={ix} y={iy} width={iw} height={ih} />
      </clipPath>
      <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} strokeWidth={0.9} />
      <g clipPath="url(#te-clip-wave)">
        <path d={band(8, 10, 3)} strokeWidth={2.2} />
        <path d={band(56, 12, 4)} strokeWidth={2.2} />
        <path d={band(98, 9, 5)} strokeWidth={1.9} />
        {/* curling crests */}
        <path d={`M${f(ix + iw * 0.62)} ${f(iy + 30)} c10 -12 26 -10 30 2 c2 8 -6 12 -12 8`} strokeWidth={2.2} />
        <path d={`M${f(ix + iw * 0.12)} ${f(iy + 82)} c10 -12 26 -10 30 2 c2 8 -6 12 -12 8`} strokeWidth={2.2} />
      </g>
      <rect x={ix} y={iy} width={iw} height={ih} strokeWidth={2} />
    </g>
  )
}
