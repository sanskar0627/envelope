/**
 * Printed / stamped artwork for the envelope, drawn as engraving-style SVG in
 * envelope units (see constants.ts). Ink layers are composited with multiply
 * + an ink-wear mask in CSS, so everything here is drawn in flat ink colour.
 */
import { VILLAGE_STAMP, WAVE_STAMP } from '../constants'
import { perforationHoles, rng, wavePath } from './geometry'

const INK = '#2b2723'
const RED_INK = '#b8432f'
const SERIF = "'Libre Caslon Text', 'Times New Roman', serif"
const MONO = "'Courier Prime', 'Courier New', monospace"

/* ------------------------------------------------------------------ shared */

export function RingText({ id, r, text, size, color, spacing = 4 }: { id: string; r: number; text: string; size: number; color: string; spacing?: number }) {
  // circle path starting at the left, running clockwise over the top
  const d = `M ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0`
  return (
    <>
      <path id={id} d={d} fill="none" />
      <text fill={color} fontFamily={SERIF} fontWeight={700} fontSize={size} letterSpacing={spacing}>
        <textPath href={`#${id}`} startOffset="0" textLength={Math.PI * 2 * r * 0.985} lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
    </>
  )
}

/* ------------------------------------------------------------------ postmark: temple (grey) */

export function TempleCancel({ x, y, id }: { x: number; y: number; id: string }) {
  const cols = [-50, -25, 0, 25, 50]
  return (
    <g transform={`translate(${x} ${y}) rotate(-6)`} stroke={INK} fill="none" opacity={0.82}>
      <circle r={158} strokeWidth={5.5} />
      <circle r={147} strokeWidth={2.4} />
      <circle r={103} strokeWidth={3.6} />
      <g stroke="none">
        <RingText id={`${id}-ring`} r={116} size={25} color={INK} text="SANTORINI ✦ THIRA ✦ CYCLADES ✦ 1937 ✦ " />
      </g>
      <clipPath id={`${id}-clip`}>
        <circle r={98} />
      </clipPath>
      <g clipPath={`url(#${id}-clip)`} strokeLinecap="round" strokeLinejoin="round">
        {/* distant ridge */}
        <path d="M-110 8 L-78 -22 L-60 -12 L-38 -46 L-14 -20 L6 -34 L32 -6 L54 -30 L80 -8 L110 -18" strokeWidth={3} />
        {[-36, -26, -16].map((yy, i) => (
          <path key={i} d={`M${-44 + i * 6} ${yy + 14} l${16 - i * 3} ${-8 + i * 2}`} strokeWidth={1.8} />
        ))}
        {[-24, -14].map((yy, i) => (
          <path key={`r${i}`} d={`M${46 + i * 6} ${yy} l${14} ${6}`} strokeWidth={1.8} />
        ))}
        {/* pediment + entablature */}
        <path d="M-66 -2 L0 -30 L66 -2 Z" strokeWidth={3.2} />
        <path d="M-66 -2 H66 M-68 6 H68" strokeWidth={3.2} />
        {/* columns */}
        {cols.map((cx) => (
          <g key={cx}>
            <path d={`M${cx - 6} 8 V58 M${cx + 6} 8 V58`} strokeWidth={2.6} />
            <path d={`M${cx - 9} 10 H${cx + 9} M${cx - 9} 57 H${cx + 9}`} strokeWidth={2.2} />
            <path d={`M${cx} 14 V54`} strokeWidth={1.2} opacity={0.7} />
          </g>
        ))}
        {/* stylobate steps */}
        <path d="M-74 62 H74 M-82 70 H82 M-90 78 H90" strokeWidth={3} />
        {/* ground hatching */}
        {[88, 96].map((yy) => (
          <path key={yy} d={`M-96 ${yy} H96`} strokeWidth={1.6} strokeDasharray="10 6" />
        ))}
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ postmark: airmail (red) */

export function AirmailCancel({ x, y, id }: { x: number; y: number; id: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(8)`} stroke={RED_INK} fill="none" opacity={0.78}>
      <circle r={164} strokeWidth={5.5} strokeDasharray="520 10 180 8 400 14" />
      <circle r={152} strokeWidth={2.4} />
      <circle r={108} strokeWidth={3.4} />
      <g stroke="none">
        <RingText id={`${id}-ring`} r={121} size={26} color={RED_INK} text="PAR AVION ✦ AIR MAIL ✦ THIRA ✦ HELLAS ✦ " />
      </g>
      <g strokeLinecap="round" strokeLinejoin="round" transform="rotate(-24)">
        {/* airliner, side-on, climbing */}
        <path
          d="M-78 6 C-60 -2 20 -8 58 -6 C72 -5 84 0 84 6 C84 12 70 14 56 14 L-56 14 C-68 14 -78 12 -78 6 Z"
          strokeWidth={3.4}
          fill={RED_INK}
          fillOpacity={0.18}
        />
        <path d="M-70 4 L-86 -30 L-72 -30 L-50 2" strokeWidth={3.2} />
        <path d="M-10 8 L-40 46 L-22 46 L22 10" strokeWidth={3.2} />
        <path d="M-6 2 L-24 -26 L-12 -26 L14 2" strokeWidth={2.6} />
        {[-42, -28, -14, 0, 14, 28, 42].map((wx) => (
          <circle key={wx} cx={wx} cy={2} r={2.6} fill={RED_INK} stroke="none" />
        ))}
        {/* speed lines */}
        <path d="M-96 26 H-58 M-104 36 H-70 M-92 -12 H-70" strokeWidth={2.4} />
      </g>
      {/* clouds */}
      <path d="M-70 64 q10 -14 24 -6 q8 -14 24 -4 q14 -4 16 10 H-70 Z" strokeWidth={2.4} />
      <path d="M30 -64 q8 -10 18 -4 q8 -10 20 -2 q10 -2 10 8 H30 Z" strokeWidth={2.2} />
    </g>
  )
}

/* ------------------------------------------------------------------ oval GREECE cancel with anchor */

export function GreeceCancel({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-4)`} stroke={INK} fill="none" opacity={0.8}>
      {/* cancellation bars running out across the stamp */}
      {[-70, -46, 46, 70].map((yy, i) => (
        <path key={yy} d={wavePath(140, 360, yy, 5, 46, i)} strokeWidth={3} strokeLinecap="round" />
      ))}
      <ellipse rx={188} ry={116} strokeWidth={5} />
      <ellipse rx={176} ry={104} strokeWidth={2.2} />
      {/* wavy rules above + below the name */}
      <path d={wavePath(-128, 150, -56, 4, 40)} strokeWidth={2.6} />
      <path d={wavePath(-138, 150, -40, 4, 40, 1.4)} strokeWidth={2.6} />
      <path d={wavePath(-138, 150, 52, 4, 40)} strokeWidth={2.6} />
      <path d={wavePath(-128, 150, 68, 4, 40, 1.4)} strokeWidth={2.6} />
      <text
        x={18}
        y={26}
        textAnchor="middle"
        fontFamily={SERIF}
        fontWeight={700}
        fontSize={78}
        letterSpacing={3}
        fill={INK}
        stroke="none"
      >
        GREECE
      </text>
      {/* anchor, overlapping the left of the oval */}
      <g transform="translate(-178 4)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={0} cy={-52} r={11} />
        <path d="M0 -41 V52" />
        <path d="M-26 -28 H26" />
        <path d="M-48 18 C-44 46 -20 58 0 56 C20 58 44 46 48 18" />
        <path d="M-56 26 L-48 14 L-38 26 M56 26 L48 14 L38 26" />
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ postage stamps */


/** Stamp paper (drawn in the "applied" layer, beneath the ink). */
export function StampPaper({ x, y, w, h, id, hole = 9, step = 28, rotate = 0 }: { x: number; y: number; w: number; h: number; id: string; hole?: number; step?: number; rotate?: number }) {
  const holes = perforationHoles(x, y, w, h, step)
  const cx = x + w / 2
  const cy = y + h / 2
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <mask id={id}>
        <rect x={x - hole} y={y - hole} width={w + hole * 2} height={h + hole * 2} fill="#fff" />
        {holes.map(([hx, hy], i) => (
          <circle key={i} cx={hx} cy={hy} r={hole} fill="#000" />
        ))}
        {/* the perforated rim is a little outside the printed frame */}
      </mask>
      <rect x={x - hole * 0.6} y={y - hole * 0.6} width={w + hole * 1.2} height={h + hole * 1.2} fill="currentColor" mask={`url(#${id})`} />
      <rect x={x - hole * 0.6} y={y - hole * 0.6} width={w + hole * 1.2} height={h + hole * 1.2} fill="url(#te-stamp-grain)" mask={`url(#${id})`} style={{ mixBlendMode: 'overlay' }} />
    </g>
  )
}

/** Deterministic house layout cascading down the caldera cliff. */
function villageHouses(ix: number, iy: number, iw: number, ih: number) {
  const r = rng(31)
  const houses: Array<{ x: number; y: number; w: number; h: number; dome: boolean }> = []
  for (let t = 0.02; t < 0.96; t += 0.065) {
    const rows = 4 + Math.floor(r() * 4)
    for (let row = 0; row < rows; row++) {
      const x = ix + iw * (0.34 + 0.6 * t) + (r() - 0.5) * 14
      const edgeY = iy + ih * (0.36 - 0.31 * t)
      const y = edgeY + 10 + row * (24 + r() * 8) + (r() - 0.5) * 6
      // stay on the rock: left boundary of the cliff face
      const xmin = ix + iw * (0.3 + 0.24 * Math.max(0, (y - iy - ih * 0.38) / (ih * 0.62)))
      if (x < xmin + 8 || y > iy + ih * 0.74 || x > ix + iw - 18) continue
      houses.push({ x, y, w: 20 + r() * 18, h: 16 + r() * 12, dome: false })
    }
  }
  houses.sort((a, b) => a.y - b.y)
  return houses
}

export function VillageStampInk() {
  const { x, y, w, h } = VILLAGE_STAMP
  const ix = x + 30
  const iy = y + 30
  const iw = w - 60
  const ih = h - 96
  const clipId = 'te-clip-village'
  const houses = villageHouses(ix, iy, iw, ih)
  const cliff = `M${ix + iw * 0.28} ${iy + ih * 0.38}
    C${ix + iw * 0.42} ${iy + ih * 0.3} ${ix + iw * 0.55} ${iy + ih * 0.18} ${ix + iw * 0.72} ${iy + ih * 0.13}
    C${ix + iw * 0.84} ${iy + ih * 0.09} ${ix + iw * 0.94} ${iy + ih * 0.03} ${ix + iw} ${iy + ih * 0.01}
    L${ix + iw} ${iy + ih} L${ix + iw * 0.52} ${iy + ih}
    C${ix + iw * 0.5} ${iy + ih * 0.78} ${ix + iw * 0.38} ${iy + ih * 0.58} ${ix + iw * 0.28} ${iy + ih * 0.38} Z`
  return (
    <g stroke={INK} fill="none" opacity={0.88} strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <clipPath id={clipId}>
          <rect x={ix} y={iy} width={iw} height={ih} />
        </clipPath>
        <pattern id="te-hatch-cliff" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <path d="M0 3 H6" stroke={INK} strokeWidth={1.35} />
        </pattern>
        <pattern id="te-hatch-dome" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
          <path d="M0 2 H4" stroke={INK} strokeWidth={1.3} />
        </pattern>
        <pattern id="te-hatch-sky" width="10" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 4 H10" stroke={INK} strokeWidth={0.8} opacity={0.55} />
        </pattern>
      </defs>

      {/* frames */}
      <rect x={x + 16} y={y + 16} width={w - 32} height={h - 32} strokeWidth={1.6} />
      <rect x={ix} y={iy} width={iw} height={ih} strokeWidth={3} />

      <g clipPath={`url(#${clipId})`}>
        {/* engraved sky, fading toward the horizon */}
        <rect x={ix} y={iy} width={iw} height={ih * 0.3} fill="url(#te-hatch-sky)" stroke="none" />
        <path d={`M${ix + 26} ${iy + 60} q14 -12 30 -4 q12 -10 26 0 q14 0 14 10 h-70 Z`} strokeWidth={1.4} fill="#fff" />
        {/* distant island on the horizon */}
        <path d={`M${ix} ${iy + ih * 0.46} q40 -18 90 -10 q30 -12 60 4 L${ix + iw * 0.4} ${iy + ih * 0.47}`} strokeWidth={1.6} fill="url(#te-hatch-cliff)" />
        {/* caldera cliff */}
        <path d={cliff} fill="url(#te-hatch-cliff)" strokeWidth={2} />
        {/* scrub along the ridge */}
        {[0.6, 0.67, 0.73, 0.8, 0.88, 0.94].map((t, i) => (
          <path
            key={i}
            d={`M${ix + iw * t} ${iy + ih * (0.36 - 0.31 * ((t - 0.34) / 0.6)) - 2} q-${6 + (i % 2) * 3} -16 0 -${24 + (i % 3) * 6} q${6 + (i % 2) * 3} 14 0 ${24 + (i % 3) * 6} Z`}
            strokeWidth={1.4}
            fill="url(#te-hatch-dome)"
          />
        ))}
        {/* whitewashed houses (white fill knocks the rock hatching out) */}
        <g fill="#fff" strokeWidth={1.5}>
          {houses.map((hs, i) => (
            <g key={i}>
              <rect x={hs.x} y={hs.y} width={hs.w} height={hs.h} rx={2.5} />
              <path d={`M${hs.x + hs.w * 0.28} ${hs.y + hs.h} v-${hs.h * 0.42} a${hs.w * 0.1} ${hs.w * 0.1} 0 0 1 ${hs.w * 0.2} 0 v${hs.h * 0.42}`} strokeWidth={1.2} />
              <path d={`M${hs.x + hs.w * 0.64} ${hs.y + hs.h * 0.3} h${hs.w * 0.16} v${hs.h * 0.22} h-${hs.w * 0.16} Z`} strokeWidth={1.1} />
              <path d={`M${hs.x + hs.w} ${hs.y + 2} v${hs.h - 2}`} strokeWidth={2.4} opacity={0.5} />
            </g>
          ))}
          {/* blue-domed churches */}
          {[
            [0.56, 0.36, 19],
            [0.78, 0.3, 17],
            [0.7, 0.52, 15],
          ].map(([tx, ty, r], i) => {
            const cx = ix + iw * tx
            const cy = iy + ih * ty
            return (
              <g key={`d${i}`}>
                <rect x={cx - r - 5} y={cy} width={(r + 5) * 2} height={r * 1.5} rx={2} />
                <path d={`M${cx - r} ${cy} A${r} ${r * 0.95} 0 0 1 ${cx + r} ${cy} Z`} fill="url(#te-hatch-dome)" />
                <path d={`M${cx} ${cy - r * 0.95} v-12 M${cx - 5} ${cy - r * 0.95 - 7} h10`} strokeWidth={1.8} />
                <path d={`M${cx - 4} ${cy + r * 1.5} v-${r * 0.6} a4 4 0 0 1 8 0 v${r * 0.6}`} strokeWidth={1.2} />
              </g>
            )
          })}
          {/* bell tower */}
          <g>
            <rect x={ix + iw * 0.64} y={iy + ih * 0.24} width={20} height={34} />
            <path d={`M${ix + iw * 0.64 + 5} ${iy + ih * 0.24 + 18} a5 6 0 0 1 10 0`} strokeWidth={1.2} />
            <path d={`M${ix + iw * 0.64 + 10} ${iy + ih * 0.24} v-10`} strokeWidth={1.6} />
          </g>
        </g>
        {/* sea: engraved swell, denser toward the viewer */}
        {Array.from({ length: 16 }, (_, i) => {
          const yy = iy + ih * 0.5 + i * (8 + i * 0.9)
          const x1 = ix + iw * (0.32 + i * 0.022)
          return <path key={i} d={wavePath(ix - 10, x1, yy, 1.6 + i * 0.18, 26 + i * 2.4, i * 1.3)} strokeWidth={1.3 + i * 0.05} />
        })}
        {/* sailing boat */}
        <g strokeWidth={1.5} fill="#fff">
          <path d={`M${ix + 38} ${iy + ih * 0.585} h34 l-5 7 h-24 Z`} />
          <path d={`M${ix + 55} ${iy + ih * 0.58} v-34 l17 30 Z`} />
          <path d={`M${ix + 53} ${iy + ih * 0.58} v-26 l-12 22 Z`} />
        </g>
      </g>

      {/* value + country */}
      <text x={ix + 4} y={y + h - 36} fontFamily={SERIF} fontWeight={700} fontSize={30} letterSpacing={7} fill={INK} stroke="none">
        HELLAS
      </text>
      <text x={ix + iw - 2} y={y + h - 36} textAnchor="end" fontFamily={SERIF} fontWeight={700} fontSize={36} fill={INK} stroke="none">
        5Δ
      </text>
    </g>
  )
}

export function WaveStampInk() {
  const { x, y, w, h } = WAVE_STAMP
  const ix = x + 16
  const iy = y + 16
  const iw = w - 32
  const ih = h - 32
  return (
    <g stroke={INK} fill="none" opacity={0.84} strokeLinecap="round" transform={`rotate(-3 ${x + w / 2} ${y + h / 2})`}>
      <clipPath id="te-clip-wave">
        <rect x={ix} y={iy} width={iw} height={ih} />
      </clipPath>
      <rect x={ix} y={iy} width={iw} height={ih} strokeWidth={3} />
      <g clipPath="url(#te-clip-wave)">
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={wavePath(ix - 6, ix + iw + 6, iy + 20 + i * 15, 5, 36, i * 0.9)} strokeWidth={3.2} />
        ))}
        <circle cx={ix + iw * 0.72} cy={iy + 22} r={12} strokeWidth={2.6} fill="#f4ecdc" />
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ address block */

export function AddressBlock() {
  return (
    <g fill={INK}>
      <text x={96} y={556} fontFamily={SERIF} fontWeight={700} fontSize={118} textLength={612} lengthAdjust="spacingAndGlyphs">
        SANTORINI
      </text>
      <text x={100} y={628} fontFamily={SERIF} fontWeight={400} fontSize={56} letterSpacing={9} textLength={290} lengthAdjust="spacing" opacity={0.92}>
        GREECE
      </text>
      <path d="M102 692 H430" stroke={INK} strokeWidth={2.4} opacity={0.72} />
      <g fontFamily={MONO} fontSize={50} opacity={0.9}>
        <text x={100} y={784}>36.3932° N</text>
        <text x={100} y={848}>25.4615° E</text>
      </g>
    </g>
  )
}
