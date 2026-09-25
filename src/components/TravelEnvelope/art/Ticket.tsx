/**
 * The travel ticket: one sheet of aged stock split by a perforation into the
 * main ticket (info column + painted Santorini photo) and the boarding stub.
 *
 * Both pieces are drawn in shared *sheet* coordinates (0..TICKET.w × 0..h), so
 * their artwork registers perfectly at the perforation. Each piece is its own
 * element so it can tear away later (Step 5); their paper textures carry
 * complementary torn edges (scripts/generate-textures.py).
 *
 * Layout measured from reference F3 (see PROGRESS.md §2).
 */
import { TEAR_STRIP, TICKET } from '../constants'
import photoUrl from '../textures/ticket-photo.webp'
import { RingText } from './PostalArt'
import { wavePath } from './geometry'
import { QR_PATH, QR_SIZE } from './qr'

const INK = '#27231f'
const SANS = "'Inter', 'Helvetica Neue', Arial, sans-serif"
const MONO = "'Courier Prime', 'Courier New', monospace"

/* ------------------------------------------------------------------ main: info column */

function VillageSketch({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  // quick pen sketch of Oia: stacked cubes, one dome, a bell arch
  const cubes: Array<[number, number, number, number]> = [
    [0.04, 0.55, 0.22, 0.42],
    [0.24, 0.42, 0.2, 0.55],
    [0.42, 0.6, 0.24, 0.37],
    [0.64, 0.46, 0.2, 0.51],
    [0.82, 0.62, 0.16, 0.35],
    [0.12, 0.25, 0.18, 0.3],
    [0.5, 0.28, 0.16, 0.32],
  ]
  return (
    <g stroke={INK} fill="none" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
      <rect x={x} y={y} width={w} height={h} strokeWidth={3} />
      <g transform={`translate(${x + 8} ${y + 8}) scale(${(w - 16) / 100} ${(h - 16) / 100})`} strokeWidth={2.2}>
        {cubes.map(([cx, cy, cw, ch], i) => (
          <g key={i}>
            <rect x={cx * 100} y={cy * 100} width={cw * 100} height={ch * 100} fill="#fff" vectorEffect="non-scaling-stroke" />
            <path d={`M${cx * 100 + cw * 30} ${cy * 100 + ch * 100} v${-ch * 40} a${cw * 10} ${cw * 10} 0 0 1 ${cw * 20} 0 v${ch * 40}`} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        <path d="M33 25 a12 11 0 0 1 24 0 Z" fill={INK} fillOpacity={0.35} vectorEffect="non-scaling-stroke" />
        <path d="M45 14 v-9 M41 9 h8" vectorEffect="non-scaling-stroke" />
        <path d="M0 97 q30 -6 60 -2 t40 0" vectorEffect="non-scaling-stroke" />
      </g>
    </g>
  )
}

function InfoColumn() {
  return (
    <g fill={INK}>
      <text x={62} y={112} fontFamily={SANS} fontWeight={700} fontSize={46} letterSpacing={1.5}>
        SANTORINI
      </text>
      <VillageSketch x={70} y={132} w={250} h={170} />
      <text x={66} y={356} fontFamily={SANS} fontWeight={600} fontSize={40} letterSpacing={5}>
        GREECE
      </text>
      {/* wavy cancellation + small round postmark */}
      <g stroke={INK} fill="none" strokeWidth={2.6} strokeLinecap="round" opacity={0.85}>
        {[392, 410, 428, 446].map((yy, i) => (
          <path key={yy} d={wavePath(58, 250, yy, 3.2, 30, i * 0.8)} />
        ))}
        <g transform="translate(300 420) rotate(-12)">
          <circle r={58} strokeWidth={3.4} />
          <circle r={40} strokeWidth={2} />
          <g stroke="none">
            <RingText id="te-tk-mini-ring" r={46} size={13} color={INK} spacing={2} text="THIRA ✦ AIR ✦ 1923 ✦ " />
          </g>
          <path d="M-22 6 L0 -4 L22 6 M-16 6 v14 M-6 6 v14 M6 6 v14 M16 6 v14 M-24 22 h48" strokeWidth={2.2} />
        </g>
      </g>
      <text x={62} y={528} fontFamily={MONO} fontSize={56} letterSpacing={1}>
        12.06.23
      </text>
      <text x={62} y={588} fontFamily={MONO} fontSize={46} letterSpacing={2}>
        SANTORINI
      </text>
      <text x={62} y={818} fontFamily={SANS} fontWeight={500} fontSize={34} letterSpacing={1}>
        Nº 0736
      </text>
      {/* dashed divider between column and photo */}
      <path d="M392 44 V836" stroke={INK} strokeWidth={2.2} strokeDasharray="10 9" opacity={0.55} fill="none" />
    </g>
  )
}

/* ------------------------------------------------------------------ main: photo */

const PHOTO = { x: 418, y: 96, w: 1040, h: 728 } as const

function PhotoPostmark() {
  return (
    <g transform="translate(1318 734) rotate(-10)" stroke={INK} fill="none" opacity={0.82}>
      <circle r={108} strokeWidth={4.4} />
      <circle r={78} strokeWidth={2.4} />
      <g stroke="none">
        <RingText id="te-tk-photo-ring" r={88} size={25} color={INK} spacing={3} text="SANTORINI ✦ GREECE ✦ SANTORINI ✦ GREECE ✦ " />
      </g>
      <g strokeWidth={2.6} strokeLinejoin="round">
        <path d="M-50 40 V2 H-22 V40 M-22 40 V-14 H8 V40 M8 40 V10 H36 V40 M-58 40 H56" />
        <path d="M-14 -14 a12 11 0 0 1 24 0" />
        <path d="M-2 -25 v-10 M-7 -30 h10" />
        <path d="M-42 20 h8 M-10 8 h8 M16 22 h10" />
      </g>
      {/* cancel lines trailing off to the left, over the photo */}
      <g strokeWidth={3}>
        <path d={wavePath(-300, -118, -30, 4, 40)} />
        <path d={wavePath(-280, -116, -8, 4, 40, 1.2)} />
        <path d={wavePath(-300, -118, 14, 4, 40, 2.4)} />
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ stub */

function Stub() {
  const qr = 250
  const qx = TICKET.main + (TICKET.stub - qr) / 2
  const cx = TICKET.main + TICKET.stub / 2
  return (
    <g fill={INK}>
      <text x={cx} y={214} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={156} letterSpacing={-3}>
        17A
      </text>
      {/* two little aircraft marks (as on the reference stub) */}
      {[
        [cx - 26, 262, -30, 0.26],
        [cx + 22, 252, 20, 0.22],
      ].map(([x, y, r, k], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}
          d="M-86 4 C-60 -2 30 -6 64 -4 C80 -3 92 2 92 7 C92 12 78 14 64 14 L-70 12 C-82 12 -90 9 -86 4 Z M-2 4 L-46 54 L-24 54 L34 6 Z M-6 2 L-34 -34 L-18 -34 L22 2 Z M-76 6 L-94 -26 L-80 -26 L-56 6 Z"
        />
      ))}
      {/* airliner silhouette */}
      <g transform={`translate(${cx} 356) rotate(-14)`}>
        <path d="M-86 4 C-60 -2 30 -6 64 -4 C80 -3 92 2 92 7 C92 12 78 14 64 14 L-70 12 C-82 12 -90 9 -86 4 Z" />
        <path d="M-2 4 L-46 54 L-24 54 L34 6 Z" />
        <path d="M-6 2 L-34 -34 L-18 -34 L22 2 Z" />
        <path d="M-76 6 L-94 -26 L-80 -26 L-56 6 Z" />
      </g>
      {/* QR */}
      <g transform={`translate(${qx} 432) scale(${qr / QR_SIZE})`}>
        <path d={QR_PATH} shapeRendering="crispEdges" />
      </g>
      <path d={`M${TICKET.main + 60} 730 H${TICKET.main + TICKET.stub - 60}`} stroke={INK} strokeWidth={2.4} />
      <text x={cx} y={806} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={46} letterSpacing={2}>
        SNT → JTR
      </text>
      {/* tear guide just inside the perforation */}
      <path d={`M${TICKET.main + 26} 40 V840`} stroke={INK} strokeWidth={1.8} strokeDasharray="6 10" opacity={0.4} fill="none" />
    </g>
  )
}

/* ------------------------------------------------------------------ pieces */

type Register = (name: string) => (el: Element | null) => void

const pct = (v: number) => `${(v / TICKET.w) * 100}%`
const pctOf = (v: number, of: number) => `${(v / of) * 100}%`

/**
 * Both pieces of the ticket. Positioned inside a `.te-ticket` box whose
 * aspect is TICKET.w : TICKET.h.
 */
export function Ticket({ register }: { register: Register }) {
  return (
    <>
      <div ref={register('ticket.main')} className="te-ticket__piece te-ticket__piece--main" style={{ left: 0, width: pct(TICKET.mainTexW) }}>
        <svg className="te-ticket__photo" viewBox={`0 0 ${TICKET.mainTexW} ${TICKET.h}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <clipPath id="te-tk-photo-clip">
              <rect x={PHOTO.x} y={PHOTO.y} width={PHOTO.w} height={PHOTO.h} rx={3} />
            </clipPath>
          </defs>
          <image href={photoUrl} x={PHOTO.x} y={PHOTO.y} width={PHOTO.w} height={PHOTO.h} preserveAspectRatio="xMidYMid slice" clipPath="url(#te-tk-photo-clip)" />
          {/* print edge: the photo sits in a very slightly darker inked border */}
          <rect x={PHOTO.x} y={PHOTO.y} width={PHOTO.w} height={PHOTO.h} rx={3} fill="none" stroke="#3b3024" strokeOpacity={0.35} strokeWidth={2} />
        </svg>
        <svg className="te-ticket__ink" viewBox={`0 0 ${TICKET.mainTexW} ${TICKET.h}`} preserveAspectRatio="none" aria-hidden="true">
          <InfoColumn />
          <PhotoPostmark />
        </svg>
        {/* wear over the print: burnt edges, rust speckle, cracked ink along the creases */}
        <div className="te-ticket__wear te-ticket__wear--main" />
        <div className="te-ticket__light" />
        {/* fluffed fibres along the torn edge — revealed top → bottom as it tears */}
        <div
          ref={register('ticket.fibres.main')}
          className="te-ticket__fibres te-ticket__fibres--main"
          style={{ left: pctOf(TICKET.main - TEAR_STRIP, TICKET.mainTexW), width: pctOf(TEAR_STRIP * 2, TICKET.mainTexW) }}
        />
      </div>
      <div
        ref={register('ticket.stub')}
        className="te-ticket__piece te-ticket__piece--stub"
        style={{ left: pct(TICKET.stubTexX), width: pct(TICKET.stubTexW) }}
      >
        <svg className="te-ticket__ink" viewBox={`${TICKET.stubTexX} 0 ${TICKET.stubTexW} ${TICKET.h}`} preserveAspectRatio="none" aria-hidden="true">
          <Stub />
        </svg>
        <div className="te-ticket__wear te-ticket__wear--stub" />
        <div className="te-ticket__light" />
        <div
          ref={register('ticket.fibres.stub')}
          className="te-ticket__fibres te-ticket__fibres--stub"
          style={{ left: pctOf(TICKET.main - TEAR_STRIP - TICKET.stubTexX, TICKET.stubTexW), width: pctOf(TEAR_STRIP * 2, TICKET.stubTexW) }}
        />
      </div>
    </>
  )
}
