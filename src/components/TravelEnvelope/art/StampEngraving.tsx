/**
 * Engraved (intaglio) artwork for the two postage stamps, in envelope units.
 *
 * Built the way a line engraver works: tone comes from line density and line
 * weight, never from fills. Sky is ruled with fine lines that thicken toward
 * the horizon; the cliff is modelled with contour lines that follow the rock
 * plus cross-hatching in the shadows; the sea is rows of swell lines, heavier
 * and wider-spaced toward the viewer, broken where light glints; whitewashed
 * buildings are left as paper (white knock-outs) with just their outlines and
 * dark doorways. A beaded frame and a ruled value tablet finish the design.
 */
import { VILLAGE_STAMP, WAVE_STAMP } from '../constants'
import { rng, wavePath } from './geometry'

const INK = '#2b2723'
const SERIF = "'Libre Caslon Text', 'Times New Roman', serif"
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
  const ix = x + 34
  const iy = y + 34
  const iw = w - 68
  const ih = h - 118
  const N = P(ix, iy, iw, ih)
  const r = rng(77)
  const HZ = 0.43 // horizon

  // caldera cliff: crest line from the sea up to the top-right
  const crest: Pt[] = [
    [0.44, 0.66], [0.47, 0.55], [0.5, 0.47], [0.55, 0.41], [0.6, 0.34], [0.64, 0.3], [0.7, 0.24], [0.76, 0.2], [0.83, 0.15], [0.9, 0.12], [1.02, 0.1],
  ]
  const cliffFoot: Pt[] = [[1.02, 1.02], [0.52, 1.02], [0.47, 0.84], [0.44, 0.66]]
  const cliff = poly(N([...crest, ...cliffFoot]))
  // distant island on the horizon, left
  const island = poly(N([[-0.02, HZ], [-0.02, 0.37], [0.05, 0.345], [0.1, 0.36], [0.16, 0.325], [0.22, 0.31], [0.27, 0.335], [0.33, 0.35], [0.38, 0.375], [0.42, 0.4], [0.46, HZ]]))
  const sea = poly(N([[-0.02, HZ], [0.6, HZ], [0.44, 0.66], [0.47, 0.84], [0.52, 1.02], [-0.02, 1.02]]))

  // contour lines following the rock face (strata), clipped to the cliff
  const strata: string[] = []
  for (let k = 1; k < 16; k++) {
    const pts = crest.map(([u, v], i) => [u + 0.004 * k + (r() - 0.5) * 0.006, v + k * 0.028 + Math.sin(i * 1.7 + k) * 0.006] as Pt)
    strata.push(curve(N(pts)))
  }

  // houses cascading down below the crest (paper-white knock-outs)
  type House = { x: number; y: number; w: number; h: number }
  const houses: House[] = []
  for (let t = 0.1; t < 0.98; t += 0.034) {
    const idx = t * (crest.length - 1)
    const i0 = Math.floor(idx)
    const i1 = Math.min(crest.length - 1, i0 + 1)
    const k = idx - i0
    const cu = crest[i0][0] + (crest[i1][0] - crest[i0][0]) * k
    const cv = crest[i0][1] + (crest[i1][1] - crest[i0][1]) * k
    const rows = 3 + Math.floor(r() * 3) + (t > 0.4 ? 2 : 0)
    for (let row = 0; row < rows; row++) {
      const hw = 11 + r() * 11
      const hh = 9 + r() * 7
      const hx = ix + cu * iw + (r() - 0.3) * 10
      const hy = iy + cv * ih + 4 + row * (hh + 3 + r() * 5)
      if (hy > iy + ih * 0.66 || hx + hw > ix + iw - 4) continue
      houses.push({ x: hx, y: hy, w: hw, h: hh })
    }
  }
  houses.sort((a, b) => a.y - b.y)

  // foreground church, bottom-right
  const ch = { x: ix + iw * 0.6, y: iy + ih * 0.76, w: iw * 0.3, h: ih * 0.2 }
  const dome = { cx: ch.x + ch.w * 0.42, cy: ch.y, r: ch.w * 0.27 }
  // meridians over the dome, bunched toward the shaded (right) side
  const domeLines: string[] = []
  for (let k = -4; k <= 6; k++) {
    const s = Math.sign(k) * (Math.abs(k) / 6.5) ** 0.8
    const bx = dome.cx + s * dome.r
    domeLines.push(`M${f(bx)} ${f(dome.cy)} Q${f(dome.cx + s * dome.r * 0.95)} ${f(dome.cy - dome.r * 0.9)} ${f(dome.cx)} ${f(dome.cy - dome.r * 1.02)}`)
  }

  const clip = 'te-eng-village'
  return (
    <>
    {/* plate slightly out of register on a second pass: a faint offset ghost of the linework */}
    <use href="#te-eng-village-art" transform="translate(1.4 -0.9)" opacity={0.12} />
    <g id="te-eng-village-art" stroke={INK} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <clipPath id={`${clip}-img`}>
          <rect x={ix} y={iy} width={iw} height={ih} />
        </clipPath>
        <clipPath id={`${clip}-cliff`}>
          <path d={cliff} />
        </clipPath>
        <clipPath id={`${clip}-sea`}>
          <path d={sea} />
        </clipPath>
        <clipPath id={`${clip}-island`}>
          <path d={island} />
        </clipPath>
        <clipPath id={`${clip}-dome`}>
          <path d={`M${dome.cx - dome.r} ${dome.cy} A${dome.r} ${dome.r * 1.02} 0 0 1 ${dome.cx + dome.r} ${dome.cy} Z`} />
        </clipPath>
        <clipPath id={`${clip}-tablet`}>
          <rect x={ix} y={iy + ih + 8} width={iw} height={h - ih - 34 - 8 - 22} />
        </clipPath>
      </defs>

      {/* ---- frame: fine outer rule, beaded band, heavy inner rule ---- */}
      <rect x={x + 14} y={y + 14} width={w - 28} height={h - 28} strokeWidth={1.3} />
      <rect x={x + 18} y={y + 18} width={w - 36} height={h - 36} strokeWidth={0.7} />
      <g fill={INK} stroke="none">
        {Array.from({ length: Math.floor((w - 56) / 9) }, (_, i) => (
          <g key={`bx${i}`}>
            <circle cx={x + 28 + i * 9} cy={y + 26} r={1.6} />
          </g>
        ))}
        {Array.from({ length: Math.floor((h - 56) / 9) }, (_, i) => (
          <g key={`by${i}`}>
            <circle cx={x + 26} cy={y + 28 + i * 9} r={1.6} />
            <circle cx={x + w - 26} cy={y + 28 + i * 9} r={1.6} />
          </g>
        ))}
      </g>
      {/* corner rosettes */}
      {[
        [x + 26, y + 26],
        [x + w - 26, y + 26],
      ].map(([cx, cy], i) => (
        <g key={`ro${i}`} strokeWidth={1}>
          <circle cx={cx} cy={cy} r={5.5} fill="#fff" />
          <circle cx={cx} cy={cy} r={2} fill={INK} stroke="none" />
        </g>
      ))}

      <g clipPath={`url(#${clip}-img)`}>
        {/* ---- sky: ruled lines thickening toward the horizon ---- */}
        {Array.from({ length: Math.floor((ih * HZ) / 5.2) }, (_, i) => {
          const yy = iy + 3 + i * 5.2
          const t = (yy - iy) / (ih * HZ)
          return <path key={`s${i}`} d={`M${ix} ${f(yy)} H${ix + iw}`} strokeWidth={f(0.45 + t * 0.9)} opacity={0.75 + t * 0.25} />
        })}
        {/* clouds: paper knocked out of the sky, shaded underneath */}
        {[
          [0.06, 0.08, 0.34],
          [0.3, 0.2, 0.26],
        ].map(([u, v, s], i) => {
          const cx = ix + u * iw
          const cy = iy + v * ih
          const W = s * iw
          const d = `M${cx} ${cy} q${W * 0.08} ${-W * 0.16} ${W * 0.22} ${-W * 0.08} q${W * 0.1} ${-W * 0.18} ${W * 0.28} ${-W * 0.05} q${W * 0.16} ${-W * 0.1} ${W * 0.26} ${W * 0.06} q${W * 0.14} ${W * 0.02} ${W * 0.12} ${W * 0.12} Z`
          return (
            <g key={`c${i}`}>
              <path d={d} fill="#fff" stroke="none" transform="translate(0 -2) scale(1)" />
              <path d={d} strokeWidth={1.1} />
              <path d={`M${cx + W * 0.1} ${cy - 3} q${W * 0.3} 3 ${W * 0.7} -1`} strokeWidth={0.8} />
            </g>
          )
        })}
        {/* sun low over the island */}
        <circle cx={ix + iw * 0.24} cy={iy + ih * 0.27} r={13} fill="#fff" strokeWidth={1.2} />

        {/* ---- distant island: dense fine hatch, a few ridge contours ---- */}
        <path d={island} fill="#fff" stroke="none" />
        <g clipPath={`url(#${clip}-island)`}>
          <path d={rules(ix, iy + ih * 0.28, iw * 0.5, ih * 0.18, -28, 2.6, 5, 0.4)} strokeWidth={0.8} />
          <path d={rules(ix, iy + ih * 0.28, iw * 0.5, ih * 0.18, 0, 3.4, 6, 0.2)} strokeWidth={0.55} opacity={0.8} />
        </g>
        <path d={island} strokeWidth={1.4} />

        {/* ---- sea: swell lines, heavier and wider apart toward the viewer, broken by glints ---- */}
        <path d={sea} fill="#fff" stroke="none" />
        <g clipPath={`url(#${clip}-sea)`}>
          {Array.from({ length: 40 }, (_, i) => {
            const t = i / 39
            const yy = iy + ih * HZ + 3 + (ih * (1 - HZ)) * (t * 0.35 + t * t * 0.65)
            const dash = `${f(30 + r() * 90)} ${f(3 + r() * 7)} ${f(20 + r() * 60)} ${f(2 + r() * 5)}`
            return (
              <path
                key={`w${i}`}
                d={wavePath(ix - 20, ix + iw * 0.62, yy, 0.7 + t * 2.4, 12 + t * 26, i * 1.7)}
                strokeWidth={f(0.7 + t * 1.4)}
                strokeDasharray={dash}
                strokeDashoffset={f(r() * 80)}
              />
            )
          })}
          {/* glitter path under the sun */}
          {Array.from({ length: 10 }, (_, i) => (
            <path key={`g${i}`} d={`M${f(ix + iw * 0.24 - 10 + r() * 20)} ${f(iy + ih * (HZ + 0.02 + i * 0.02))} h${f(4 + r() * 8)}`} stroke="#fff" strokeWidth={2.2} />
          ))}
        </g>

        {/* sailing boat */}
        <g strokeWidth={1.2} fill="#fff">
          <path d={`M${ix + iw * 0.12} ${iy + ih * 0.585} h36 l-6 7 h-25 Z`} />
          <path d={`M${ix + iw * 0.12 + 18} ${iy + ih * 0.58} v-38 l18 34 Z`} />
          <path d={`M${ix + iw * 0.12 + 16} ${iy + ih * 0.58} v-29 l-13 25 Z`} />
          <path d={`M${ix + iw * 0.12 - 4} ${iy + ih * 0.6} q24 4 44 0`} strokeWidth={0.8} fill="none" />
        </g>

        {/* ---- cliff: paper, then contour strata, then cross-hatch in the shade ---- */}
        <path d={cliff} fill="#fff" stroke="none" />
        <g clipPath={`url(#${clip}-cliff)`}>
          {strata.map((d, i) => (
            <path key={`st${i}`} d={d} strokeWidth={f(0.7 + (i % 3) * 0.25)} opacity={0.9} />
          ))}
          <path d={rules(ix + iw * 0.4, iy + ih * 0.35, iw * 0.35, ih * 0.7, 62, 3.4, 12, 0.5)} strokeWidth={0.75} />
          <path d={rules(ix + iw * 0.42, iy + ih * 0.55, iw * 0.3, ih * 0.5, -28, 4.2, 13, 0.5)} strokeWidth={0.65} opacity={0.85} />
          <path d={rules(ix + iw * 0.6, iy + ih * 0.1, iw * 0.45, ih * 0.9, 50, 5.5, 14, 0.5)} strokeWidth={0.6} opacity={0.7} />
          {/* deepest shade low on the face: a third, finer hatch direction */}
          <path d={rules(ix + iw * 0.44, iy + ih * 0.66, iw * 0.2, ih * 0.36, 8, 2.3, 15, 0.3)} strokeWidth={0.5} opacity={0.9} />
          {/* stippled rock texture along the strata */}
          {Array.from({ length: 140 }, (_, i) => (
            <circle key={`dt${i}`} cx={f(ix + iw * (0.45 + r() * 0.55))} cy={f(iy + ih * (0.1 + r() * 0.9))} r={f(0.5 + r() * 0.6)} fill={INK} stroke="none" opacity={0.7} />
          ))}
        </g>
        {/* surf working along the foot of the cliff, and a few rocks awash */}
        {Array.from({ length: 9 }, (_, i) => {
          const t = i / 8
          const u = 0.44 + 0.08 * t * t
          const v = 0.66 + 0.36 * t
          return <path key={`sf${i}`} d={`M${f(ix + iw * (u - 0.1))} ${f(iy + ih * v)} q${f(iw * 0.04)} ${f(-3)} ${f(iw * 0.09)} ${f(-1)}`} strokeWidth={0.7} strokeDasharray="6 3 10 2" />
        })}
        {[
          [0.36, 0.78, 7],
          [0.4, 0.9, 5],
          [0.31, 0.95, 4],
        ].map(([u, v, rr], i) => (
          <g key={`rk${i}`}>
            <path d={`M${f(ix + iw * u - rr * 1.6)} ${f(iy + ih * v)} q${f(rr * 0.4)} ${f(-rr * 1.3)} ${f(rr * 1.6)} ${f(-rr * 1.1)} q${f(rr * 1.2)} 0 ${f(rr * 1.6)} ${f(rr * 1.1)} Z`} fill="#fff" strokeWidth={1} />
            {/* shaded flank of the rock */}
            <path d={`M${f(ix + iw * u + rr * 0.5)} ${f(iy + ih * v - rr * 0.8)} l${f(rr * 0.5)} ${f(rr * 0.7)} M${f(ix + iw * u + rr * 0.9)} ${f(iy + ih * v - rr * 0.9)} l${f(rr * 0.5)} ${f(rr * 0.8)} M${f(ix + iw * u + rr * 0.1)} ${f(iy + ih * v - rr * 0.6)} l${f(rr * 0.4)} ${f(rr * 0.55)}`} strokeWidth={0.55} />
          </g>
        ))}
        <path d={curve(N(crest))} strokeWidth={1.8} />
        <path d={curve(N([[0.44, 0.66], [0.46, 0.76], [0.48, 0.86], [0.52, 1.02]]))} strokeWidth={1.4} />

        {/* scrub and a tree on the crest */}
        {[0.7, 0.77, 0.85].map((u, i) => {
          const cx = ix + u * iw
          const cy = iy + ih * (0.24 - (u - 0.7) * 0.6) - 2
          return <path key={`sc${i}`} d={`M${f(cx - 8)} ${f(cy)} q2 -9 8 -10 q7 0 8 10 Z`} strokeWidth={1} fill={INK} fillOpacity={0.35} />
        })}
        <g strokeWidth={1.1}>
          <path d={`M${ix + iw * 0.93} ${iy + ih * 0.11} v-18`} strokeWidth={1.6} />
          <path
            d={`M${ix + iw * 0.93 - 18} ${iy + ih * 0.11 - 16} q-4 -12 8 -16 q2 -12 14 -9 q10 -6 16 4 q12 2 8 14 q4 10 -8 12 q-10 6 -20 1 q-14 2 -18 -6 Z`}
            fill="#fff"
          />
          {Array.from({ length: 14 }, (_, i) => (
            <path key={`lf${i}`} d={`M${f(ix + iw * 0.93 - 14 + r() * 30)} ${f(iy + ih * 0.11 - 34 + r() * 20)} q2 -2 4 0`} strokeWidth={0.9} />
          ))}
        </g>

        {/* whitewashed houses */}
        <g fill="#fff" strokeWidth={1.1}>
          {houses.map((hs, i) => (
            <g key={`h${i}`}>
              <rect x={hs.x} y={hs.y} width={hs.w} height={hs.h} rx={1.8} />
              {/* shaded side wall */}
              <path d={vlines(hs.x + hs.w * 0.72, hs.y, hs.w * 0.28, hs.h, 1.9)} strokeWidth={0.5} />
              <path d={`M${f(hs.x + hs.w * 0.72)} ${f(hs.y)} V${f(hs.y + hs.h)}`} strokeWidth={0.7} />
              {/* doorway and window */}
              <path d={`M${f(hs.x + hs.w * 0.2)} ${f(hs.y + hs.h)} v${f(-hs.h * 0.45)} a${f(hs.w * 0.08)} ${f(hs.w * 0.08)} 0 0 1 ${f(hs.w * 0.16)} 0 v${f(hs.h * 0.45)}`} fill={INK} stroke="none" />
              <rect x={hs.x + hs.w * 0.48} y={hs.y + hs.h * 0.28} width={hs.w * 0.12} height={hs.h * 0.22} fill={INK} stroke="none" />
            </g>
          ))}
        </g>

        {/* ---- foreground church: big hatched dome, cross, arcades, bell tower ---- */}
        <g fill="#fff" strokeWidth={1.3}>
          <rect x={ch.x - 18} y={ch.y + ch.h * 0.1} width={ch.w + 40} height={ch.h + 20} />
          <rect x={ch.x} y={ch.y} width={ch.w * 0.84} height={ch.h} />
          <path d={`M${dome.cx - dome.r - 6} ${dome.cy} h${dome.r * 2 + 12} v6 h-${dome.r * 2 + 12} Z`} />
          <path d={`M${dome.cx - dome.r} ${dome.cy} A${dome.r} ${dome.r * 1.02} 0 0 1 ${dome.cx + dome.r} ${dome.cy} Z`} />
          <g clipPath={`url(#${clip}-dome)`}>
            {domeLines.map((d, i) => (
              <path key={`dm${i}`} d={d} fill="none" strokeWidth={0.8} />
            ))}
            <path d={rules(dome.cx, dome.cy - dome.r, dome.r, dome.r, 90, 2.1, 21, 0.1)} strokeWidth={0.7} fill="none" />
          </g>
          <path d={`M${dome.cx} ${dome.cy - dome.r * 1.02} v-20 M${dome.cx - 7} ${dome.cy - dome.r * 1.02 - 13} h14`} strokeWidth={2} fill="none" />
          {/* arcade */}
          {[0.12, 0.34, 0.56].map((u, i) => {
            const ax = ch.x + ch.w * u
            return <path key={`ar${i}`} d={`M${f(ax)} ${f(ch.y + ch.h)} v${f(-ch.h * 0.5)} a${f(ch.w * 0.07)} ${f(ch.w * 0.07)} 0 0 1 ${f(ch.w * 0.14)} 0 v${f(ch.h * 0.5)}`} fill={INK} stroke="none" />
          })}
          {/* bell tower */}
          <rect x={ch.x + ch.w * 0.86} y={ch.y - ch.h * 0.55} width={ch.w * 0.2} height={ch.h * 1.55} />
          <path d={`M${ch.x + ch.w * 0.86} ${ch.y - ch.h * 0.55} q${ch.w * 0.1} -16 ${ch.w * 0.2} 0`} />
          <path d={`M${ch.x + ch.w * 0.96} ${ch.y - ch.h * 0.55 - 8} v-14 M${ch.x + ch.w * 0.96 - 5} ${ch.y - ch.h * 0.55 - 16} h10`} strokeWidth={1.5} fill="none" />
          <path d={`M${ch.x + ch.w * 0.9} ${ch.y - ch.h * 0.1} v-14 a${ch.w * 0.06} ${ch.w * 0.06} 0 0 1 ${ch.w * 0.12} 0 v14 Z`} fill={INK} stroke="none" />
          <path d={vlines(ch.x + ch.w * 0.99, ch.y - ch.h * 0.55, ch.w * 0.07, ch.h * 1.55, 1.9)} strokeWidth={0.55} fill="none" />
          <path d={vlines(ch.x + ch.w * 0.7, ch.y, ch.w * 0.14, ch.h, 2.2)} strokeWidth={0.55} fill="none" />
          {/* steps down to the water */}
          {[0, 1, 2, 3].map((k) => (
            <path key={`stp${k}`} d={`M${f(ch.x - 18 - k * 8)} ${f(ch.y + ch.h * 1.1 + k * 7)} h${f(26 + k * 2)}`} fill="none" strokeWidth={1} />
          ))}
        </g>
      </g>

      {/* heavy inner rule over the picture edge */}
      <rect x={ix} y={iy} width={iw} height={ih} strokeWidth={2.6} />

      {/* ---- value tablet: ruled ground, white lettering ---- */}
      <g clipPath={`url(#${clip}-tablet)`}>
        <path d={rules(ix, iy + ih + 8, iw, h - ih - 64, 0, 3.4, 41, 0.1)} strokeWidth={0.5} opacity={0.8} />
      </g>
      <rect x={ix} y={iy + ih + 8} width={iw} height={h - ih - 34 - 8 - 22} strokeWidth={1.6} />
      <g fontFamily={SERIF} fontWeight={700} fill="#fff" stroke={INK} strokeWidth={1.4} paintOrder="stroke">
        <text x={ix + 12} y={y + h - 38} fontSize={30} letterSpacing={7}>
          HELLAS
        </text>
        <text x={ix + iw - 10} y={y + h - 36} textAnchor="end" fontSize={36}>
          5Δ
        </text>
      </g>
    </g>
    </>
  )
}

export function WaveStampInk() {
  const { x, y, w, h } = WAVE_STAMP
  const ix = x + 16
  const iy = y + 16
  const iw = w - 32
  const ih = h - 32
  const r = rng(9)
  return (
    <g stroke={INK} fill="none" strokeLinecap="round" transform={`rotate(-3 ${x + w / 2} ${y + h / 2})`}>
      <clipPath id="te-clip-wave">
        <rect x={ix} y={iy} width={iw} height={ih} />
      </clipPath>
      <rect x={x + 9} y={y + 9} width={w - 18} height={h - 18} strokeWidth={0.8} />
      <g clipPath="url(#te-clip-wave)">
        {/* ruled sky */}
        {Array.from({ length: 8 }, (_, i) => (
          <path key={`s${i}`} d={`M${ix} ${iy + 3 + i * 4} H${ix + iw}`} strokeWidth={0.5 + i * 0.07} />
        ))}
        <circle cx={ix + iw * 0.72} cy={iy + 20} r={11} fill="#fff" strokeWidth={1.4} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return <path key={`ray${i}`} d={`M${f(ix + iw * 0.72 + Math.cos(a) * 14)} ${f(iy + 20 + Math.sin(a) * 14)} l${f(Math.cos(a) * 5)} ${f(Math.sin(a) * 5)}`} strokeWidth={0.9} />
        })}
        {/* big engraved waves: crest line + hatched troughs */}
        {Array.from({ length: 6 }, (_, i) => {
          const yy = iy + 40 + i * 15
          return (
            <g key={i}>
              <path d={wavePath(ix - 6, ix + iw + 6, yy, 4.6, 36, i * 0.9)} strokeWidth={2.4} />
              <path d={wavePath(ix - 6, ix + iw + 6, yy + 4, 3.6, 36, i * 0.9)} strokeWidth={0.8} />
              <path d={wavePath(ix - 6, ix + iw + 6, yy + 7.5, 2.6, 36, i * 0.9)} strokeWidth={0.6} strokeDasharray={`${f(10 + r() * 20)} 4`} />
            </g>
          )
        })}
      </g>
      <rect x={ix} y={iy} width={iw} height={ih} strokeWidth={2.2} />
    </g>
  )
}
