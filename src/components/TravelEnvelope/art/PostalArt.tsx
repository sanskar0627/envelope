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
const SLAB = "'Zilla Slab', 'Rockwell', serif"
const GROTESK = "'Inter', 'Helvetica Neue', Arial, sans-serif"

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
      {/* a globe behind the aircraft: latitude and meridian lines, broken by the plane */}
      <g strokeWidth={1.2} opacity={0.7}>
        <clipPath id={`${id}-globe`}>
          <circle r={96} />
        </clipPath>
        <g clipPath={`url(#${id}-globe)`}>
          {[-60, -30, 0, 30, 60].map((yy) => (
            <path key={`lat${yy}`} d={`M-100 ${yy} Q0 ${yy + 14} 100 ${yy}`} strokeDasharray="14 5 22 6" />
          ))}
          {[-50, 0, 50].map((xx) => (
            <path key={`lon${xx}`} d={`M${xx} -100 Q${xx * 0.6} 0 ${xx} 100`} strokeDasharray="18 6" />
          ))}
        </g>
      </g>
      {/* airliner seen from above, climbing up to the right across the whole centre */}
      <g strokeLinecap="round" strokeLinejoin="round" transform="rotate(-42) scale(1.12)">
        <path d="M-80 0 C-80 -6 -70 -9 -58 -9 L58 -8 C74 -8 86 -4 90 0 C86 4 74 8 58 8 L-58 9 C-70 9 -80 6 -80 0 Z" fill="#fff" fillOpacity={0} strokeWidth={3.2} />
        {/* wings and tailplane */}
        <path d="M-6 -8 L-30 -62 L-16 -64 L22 -8 M-6 8 L-30 62 L-16 64 L22 8" strokeWidth={3} />
        <path d="M-64 -8 L-78 -30 L-70 -31 L-52 -8 M-64 8 L-78 30 L-70 31 L-52 8" strokeWidth={2.6} />
        {/* engines under the wings */}
        <path d="M-18 -30 h14 M-12 -46 h12 M-18 30 h14 M-12 46 h12" strokeWidth={4} />
        {/* engraved shading along the fuselage and panel lines */}
        <path d="M-66 3.5 H70 M-62 6 H60" strokeWidth={1} />
        <path d="M-40 -8 V8 M20 -8 V8 M48 -7 V7" strokeWidth={0.9} />
        {[-44, -32, -20, -8, 4, 16, 28, 40, 52].map((wx) => (
          <circle key={wx} cx={wx} cy={-3} r={1.7} fill={RED_INK} stroke="none" />
        ))}
        {/* cockpit */}
        <path d="M74 -4 q8 4 0 8" strokeWidth={1.4} />
      </g>
      {/* speed lines trailing down-left */}
      <path d="M-96 58 l30 -26 M-84 76 l26 -22 M-104 34 l20 -18" strokeWidth={2.2} />
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
        x={-104}
        y={28}
        fontFamily={GROTESK}
        fontWeight={700}
        fontSize={82}
        textLength={250}
        lengthAdjust="spacingAndGlyphs"
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
        <stop offset="0.7" stopColor="#c49a68" stopOpacity={0} />
        <stop offset="1" stopColor="#b98a58" stopOpacity={0.16} />
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
  // set like the reference: a worn slab-serif name, typewriter country and coordinates,
  // all in the same faded charcoal ink as the postal marks
  return (
    <g fill={INK} stroke={INK} paintOrder="stroke" strokeLinejoin="round">
      <text x={114} y={548} fontFamily={SLAB} fontWeight={600} fontSize={126} textLength={596} lengthAdjust="spacing" strokeWidth={0} opacity={0.88}>
        SANTORINI
      </text>
      <text x={120} y={622} fontFamily={MONO} fontWeight={400} fontSize={74} textLength={262} lengthAdjust="spacing" strokeWidth={0.3} opacity={0.84}>
        GREECE
      </text>
      <path d="M122 690 C200 689.4 330 690.6 428 689.6" fill="none" stroke={INK} strokeWidth={2} opacity={0.62} />
      <g fontFamily={MONO} fontSize={52} strokeWidth={0.8} opacity={0.86}>
        <text x={122} y={788} textLength={302} lengthAdjust="spacing">
          36.3932° N
        </text>
        <text x={122} y={848} textLength={302} lengthAdjust="spacing">
          25.4615° E
        </text>
      </g>
    </g>
  )
}
