/**
 * Printed / stamped artwork for the envelope, drawn as engraving-style SVG in
 * envelope units (see constants.ts). Ink layers are composited with multiply
 * + an ink-wear mask in CSS, so everything here is drawn in flat ink colour.
 */
import { perforationHoles, wavePath } from './geometry'

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

/** a ring of tiny beads / ticks, as cut into the rubber of old datestamps */
function Beads({ r, n, size, color, tick = false }: { r: number; n: number; size: number; color: string; tick?: boolean }) {
  return (
    <g fill={color} stroke={tick ? color : 'none'} strokeWidth={tick ? size : 0}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        const c = Math.cos(a)
        const sn = Math.sin(a)
        return tick ? (
          <path key={i} d={`M${(c * (r - 3)).toFixed(1)} ${(sn * (r - 3)).toFixed(1)} L${(c * (r + 3)).toFixed(1)} ${(sn * (r + 3)).toFixed(1)}`} />
        ) : (
          <circle key={i} cx={(c * r).toFixed(1)} cy={(sn * r).toFixed(1)} r={size} />
        )
      })}
    </g>
  )
}

/* ------------------------------------------------------------------ postmark: temple (grey) */

export function TempleCancel({ x, y, id }: { x: number; y: number; id: string }) {
  const cols = [-50, -25, 0, 25, 50]
  return (
    <g transform={`translate(${x} ${y}) rotate(-6)`} stroke={INK} fill="none" opacity={0.82}>
      <circle r={158} strokeWidth={5.5} />
      <Beads r={152} n={96} size={1.3} color={INK} />
      <circle r={146} strokeWidth={2.2} />
      <circle r={103} strokeWidth={3.6} />
      <circle r={108} strokeWidth={0.9} />
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
        {/* shaded mountain faces: short parallel strokes down the slopes */}
        {Array.from({ length: 14 }, (_, i) => (
          <path key={`mh${i}`} d={`M${-100 + i * 15} ${-14 - ((i * 37) % 22)} l${6} ${12}`} strokeWidth={1.2} opacity={0.85} />
        ))}
        {/* low sun and its rays behind the ridge */}
        <circle cx={62} cy={-58} r={9} strokeWidth={1.6} />
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI + (i / 8) * Math.PI
          return <path key={`sr${i}`} d={`M${(62 + Math.cos(a) * 13).toFixed(1)} ${(-58 + Math.sin(a) * 13).toFixed(1)} l${(Math.cos(a) * 6).toFixed(1)} ${(Math.sin(a) * 6).toFixed(1)}`} strokeWidth={1.1} />
        })}
        {/* cypresses either side */}
        {[-86, 84].map((cx) => (
          <g key={cx}>
            <path d={`M${cx} 60 C${cx - 7} 40 ${cx - 6} 20 ${cx} 4 C${cx + 6} 20 ${cx + 7} 40 ${cx} 60 Z`} strokeWidth={1.6} />
            <path d={`M${cx} 12 V58 M${cx - 3} 30 l3 -4 l3 4 M${cx - 4} 44 l4 -5 l4 5`} strokeWidth={0.9} />
          </g>
        ))}
        {/* pediment + entablature */}
        <path d="M-66 -2 L0 -30 L66 -2 Z" strokeWidth={3.2} />
        <path d="M-66 -2 H66 M-68 6 H68" strokeWidth={3.2} />
        {/* columns */}
        {cols.map((cx) => (
          <g key={cx}>
            <path d={`M${cx - 6} 8 V58 M${cx + 6} 8 V58`} strokeWidth={2.6} />
            <path d={`M${cx - 9} 10 H${cx + 9} M${cx - 9} 57 H${cx + 9}`} strokeWidth={2.2} />
            <path d={`M${cx - 2.5} 14 V54 M${cx + 2.5} 14 V54`} strokeWidth={0.8} opacity={0.75} />
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
      <Beads r={158} n={72} size={1.4} color={RED_INK} tick />
      <circle r={152} strokeWidth={2.4} />
      <circle r={108} strokeWidth={3.4} />
      <circle r={102} strokeWidth={1} strokeDasharray="3 5" />
      <g stroke="none">
        <RingText id={`${id}-ring`} r={121} size={26} color={RED_INK} text="PAR AVION ✦ AIR MAIL ✦ THIRA ✦ HELLAS ✦ " />
      </g>
      <g strokeLinecap="round" strokeLinejoin="round" transform="rotate(-24)">
        {/* airliner, side-on, climbing */}
        <path
          d="M-78 6 C-60 -2 20 -8 58 -6 C72 -5 84 0 84 6 C84 12 70 14 56 14 L-56 14 C-68 14 -78 12 -78 6 Z"
          strokeWidth={3.4}
        />
        {/* fuselage shading: engraved lines along the belly */}
        <path d="M-60 10 H52 M-54 12.5 H44" strokeWidth={1} />
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
    <g transform={`translate(${x} ${y}) rotate(-4)`} stroke={INK} fill="none" opacity={0.64}>
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
      <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fffaf0" stopOpacity={0.5} />
        <stop offset="0.5" stopColor="#fffaf0" stopOpacity={0} />
        <stop offset="1" stopColor="#7a5230" stopOpacity={0.16} />
      </linearGradient>
      <radialGradient id={`${id}-age`} cx="0.5" cy="0.5" r="0.72">
        <stop offset="0.6" stopColor="#c49a68" stopOpacity={0} />
        <stop offset="1" stopColor="#b98a58" stopOpacity={0.42} />
      </radialGradient>
      {/* the cut face of the stamp paper: its thickness shows along the lower-right teeth */}
      <rect x={x - hole * 0.6} y={y - hole * 0.6} width={w + hole * 1.2} height={h + hole * 1.2} fill="#b89c78" mask={`url(#${id})`} transform="translate(1.4 2.2)" />
      <rect x={x - hole * 0.6} y={y - hole * 0.6} width={w + hole * 1.2} height={h + hole * 1.2} fill="currentColor" mask={`url(#${id})`} />
      <rect x={x - hole * 0.6} y={y - hole * 0.6} width={w + hole * 1.2} height={h + hole * 1.2} fill="url(#te-stamp-grain)" mask={`url(#${id})`} style={{ mixBlendMode: 'overlay' }} />
      {/* toned toward the edges, lit from the top-left */}
      <rect x={x - hole * 0.6} y={y - hole * 0.6} width={w + hole * 1.2} height={h + hole * 1.2} fill={`url(#${id}-age)`} mask={`url(#${id})`} style={{ mixBlendMode: 'multiply' }} />
      <rect x={x - hole * 0.6} y={y - hole * 0.6} width={w + hole * 1.2} height={h + hole * 1.2} fill={`url(#${id}-light)`} mask={`url(#${id})`} />
      {/* torn perforation teeth: fibres crushed around each punched hole, a hint of the hole's wall on the far side */}
      <g mask={`url(#${id})`} fill="none">
        {holes.map(([hx, hy], i) => (
          <circle key={i} cx={hx} cy={hy} r={hole + 0.9} stroke="#8c7456" strokeWidth={1.3} opacity={0.32} />
        ))}
        {holes.map(([hx, hy], i) => (
          <circle key={`w${i}`} cx={hx - 0.5} cy={hy - 0.8} r={hole + 0.4} stroke="#fff8ea" strokeWidth={0.8} opacity={0.35} strokeDasharray={`${(hole * 1.6).toFixed(1)} ${(hole * 5).toFixed(1)}`} />
        ))}
      </g>
    </g>
  )
}

export { VillageStampInk, WaveStampInk } from './StampEngraving'

/* ------------------------------------------------------------------ address block */

export function AddressBlock() {
  return (
    <g fill={INK}>
      <text x={96} y={556} fontFamily={SERIF} fontWeight={700} fontSize={104} textLength={612} lengthAdjust="spacing">
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
