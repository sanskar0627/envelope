/**
 * Twisted twine wrapped round the envelope (envelope units).
 *
 * Built as the physical cord is: two plies twisted round each other, so along
 * the cord you see a run of diagonal bundles. Each bundle is a small rounded
 * band crossing the cord at the lay angle; it is lit along its crown on the
 * side facing the key light (top-left) and falls into shadow where it dives
 * under the next bundle (the groove). The cord as a whole is a cylinder: its
 * far (right) side is in shade, and it casts a tight contact shadow plus a
 * softer cast shadow down-right on the paper.
 *
 * Animation: the release morphs each strand path from taut to slack
 * (`data-slack`) and then retracts it with a dash pattern (`data-role`). The
 * explicit ply bundles are generated for the resting pose only; they fade out
 * as the cord goes slack and the patterned cord underneath carries the motion.
 */
import { useId } from 'react'
import { rng } from './geometry'
import { CORDS, CORD_W, TAIL, TAIL_W, samplePath, type Pt } from './twineGeometry'

type Register = (name: string) => (el: Element | null) => void
const f = (n: number) => Math.round(n * 10) / 10

/** the ply bundles along one cord: [bundle outline, groove line, crown highlight] */
function plies(d: string, width: number, pitch: number, seed: number, taper?: { from: number; to: number; min: number }) {
  const r = rng(seed)
  const pts = samplePath(d, pitch / 2)
  const total = pts[pts.length - 1]?.s ?? 1
  const bundles: string[] = []
  const grooves: string[] = []
  const crowns: string[] = []
  const lay = 0.9 // how far along the cord a bundle travels as it crosses it (× pitch)
  for (let i = 0; i + 2 < pts.length; i += 2) {
    const a = pts[i]
    const b = pts[Math.min(pts.length - 1, i + 2)]
    let w = width * (1 + (r() - 0.5) * 0.12) // hand-twisted: never quite even
    if (taper) {
      const k = Math.min(1, Math.max(0, (a.s / total - taper.from) / (taper.to - taper.from)))
      w *= 1 - (1 - taper.min) * k
    }
    const n: Pt = [-a.t[1], a.t[0]] // left normal (toward -x for a downward cord)
    const hw = w / 2
    const along = (p: Pt, t: Pt, k: number): Pt => [p[0] + t[0] * pitch * k, p[1] + t[1] * pitch * k]
    // a bundle runs from the left edge at a to the right edge a lay further on
    const l0 = [a.p[0] + n[0] * hw, a.p[1] + n[1] * hw] as Pt
    const r0 = along([a.p[0] - n[0] * hw, a.p[1] - n[1] * hw], a.t, lay)
    const r1 = along(r0, a.t, 0.62)
    const l1 = along(l0, a.t, 0.62)
    const bulge = (p: Pt, q: Pt, k: number): Pt => [(p[0] + q[0]) / 2 - a.t[0] * pitch * k, (p[1] + q[1]) / 2 - a.t[1] * pitch * k]
    const c0 = bulge(l0, r0, 0.22)
    const c1 = bulge(l1, r1, -0.22)
    bundles.push(`M${f(l0[0])} ${f(l0[1])} Q${f(c0[0])} ${f(c0[1])} ${f(r0[0])} ${f(r0[1])} L${f(r1[0])} ${f(r1[1])} Q${f(c1[0])} ${f(c1[1])} ${f(l1[0])} ${f(l1[1])} Z`)
    grooves.push(`M${f(l1[0])} ${f(l1[1])} Q${f(c1[0])} ${f(c1[1])} ${f(r1[0])} ${f(r1[1])}`)
    // crown: the lit ridge of the bundle, only on the half that faces the light
    const m0: Pt = [(l0[0] * 0.8 + r0[0] * 0.2), (l0[1] * 0.8 + r0[1] * 0.2)]
    const m1: Pt = [(l0[0] * 0.35 + r0[0] * 0.65), (l0[1] * 0.35 + r0[1] * 0.65)]
    const mc = bulge(m0, m1, -0.1)
    crowns.push(`M${f(m0[0] + a.t[0] * 2)} ${f(m0[1] + a.t[1] * 2)} Q${f(mc[0] + a.t[0] * 2.4)} ${f(mc[1] + a.t[1] * 2.4)} ${f(m1[0] + a.t[0] * 2.6)} ${f(m1[1] + a.t[1] * 2.6)}`)
    void b
  }
  return { bundles: bundles.join(' '), grooves: grooves.join(' '), crowns: crowns.join(' ') }
}

const CORD_PLIES = CORDS.map(([taut], i) => plies(taut, CORD_W, 7.2, 40 + i))
const TAIL_PLIES = plies(TAIL[0], TAIL_W, 4.4, 77, { from: 0.55, to: 1, min: 0.55 })

/** frayed end: the plies come apart into a few loose fibres */
const FRAY: Array<[string, string]> = [
  ['M836 938 c-4 6 -10 10 -18 12 c-5 1 -9 4 -12 8', 'M848 962 c-4 6 -10 9 -18 11 c-5 1 -9 4 -12 7'],
  ['M836 938 c-1 8 -4 14 -9 20 c-3 4 -4 8 -4 12', 'M848 962 c-1 7 -4 13 -9 19 c-3 4 -4 8 -4 11'],
  ['M836 938 c-7 3 -13 3 -20 1 c-5 -1 -9 0 -12 3', 'M848 962 c-7 2 -13 2 -20 0 c-5 -1 -9 0 -12 3'],
  ['M836 938 c2 7 1 13 -2 19', 'M848 962 c2 7 1 12 -2 18'],
  ['M835 939 c-6 7 -13 11 -21 13 c-3 1 -6 3 -8 6', 'M847 963 c-6 6 -13 10 -21 12 c-3 1 -6 3 -8 6'],
]

/** stray fibres standing off the cords (deterministic) */
const HAIRS = (() => {
  const r = rng(808)
  const out: string[] = []
  for (const [taut] of [...CORDS, TAIL]) {
    for (const { p, t } of samplePath(taut, 14)) {
      if (r() < 0.45) continue
      const side = r() < 0.5 ? -1 : 1
      const w = taut === TAIL[0] ? TAIL_W : CORD_W
      const x = p[0] - t[1] * side * w * 0.45
      const y = p[1] + t[0] * side * w * 0.45
      const len = 3 + r() * 8 * (r() < 0.15 ? 1.8 : 1)
      const ang = Math.atan2(t[1], t[0]) + side * (0.5 + r() * 0.8)
      out.push(`M${f(x)} ${f(y)} q${f(Math.cos(ang) * len * 0.6)} ${f(Math.sin(ang) * len * 0.6 + (r() - 0.5) * 3)} ${f(Math.cos(ang) * len)} ${f(Math.sin(ang) * len)}`)
    }
  }
  return out.join(' ')
})()

type Role = 'strand' | 'tail'

/** the continuous cord body (what moves): shaded cylinder painted with the twist pattern */
function Cord({ d, width, paint, role }: { d: [string, string]; width: number; paint: string; role: Role }) {
  const [taut, slack] = d
  return (
    <>
      <path d={taut} data-slack={slack} data-role={role} stroke="#2c1506" strokeWidth={width + 1.2} />
      <path d={taut} data-slack={slack} data-role={role} stroke={paint} strokeWidth={width} />
      {/* cylinder: the far side turns away from the key light */}
      <path d={taut} data-slack={slack} data-role={role} stroke="#1c0c03" strokeWidth={width * 0.32} opacity={0.45} transform={`translate(${f(width * 0.34)} 0)`} />
    </>
  )
}

export function Twine({ register }: { register: Register }) {
  const uid = useId().replace(/:/g, '')
  const shadowId = `te-twine-shadow-${uid}`
  const contactId = `te-twine-contact-${uid}`
  const twistId = `te-twine-twist-${uid}`
  const bundleId = `te-twine-bundle-${uid}`
  const clipId = `te-twine-clip-${uid}`
  const paint = `url(#${twistId})`
  return (
    <svg ref={register('twine.svg')} className="te-layer te-twine" viewBox="0 0 2200 1000" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {/* fallback twist for the moving cord: alternating plies across a diagonal lay */}
        <pattern id={twistId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-36) scale(0.72)">
          <rect width="10" height="10" fill="#6d3f1d" />
          <rect y="0.8" width="10" height="3.6" fill="#9a6435" />
          <rect y="5.6" width="10" height="3" fill="#835228" />
          <rect y="4.5" width="10" height="0.9" fill="#2e1606" />
          <rect y="9.1" width="10" height="0.9" fill="#2e1606" />
        </pattern>
        {/* a bundle of fibre: darker where it curves away, lit along its middle */}
        <linearGradient id={bundleId} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#7e4c24" />
          <stop offset="0.45" stopColor="#9a6233" />
          <stop offset="1" stopColor="#4e2a10" />
        </linearGradient>
        <filter id={contactId} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id={shadowId} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        {/* the twine wraps just over the top and bottom edges, then goes around the back */}
        <clipPath id={clipId}>
          <rect x={-40} y={-20} width={2280} height={1040} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round">
        {/* shadows on the paper: soft cast shadow down-right, then a tight contact line */}
        <g ref={register('twine.shadow')} filter={`url(#${shadowId})`} stroke="#2a1405" opacity="0.4" transform="translate(6 8)">
          {CORDS.map(([taut, slack], i) => (
            <path key={i} d={taut} data-slack={slack} data-role="strand" strokeWidth={CORD_W + 2} />
          ))}
          <path d={TAIL[0]} data-slack={TAIL[1]} data-role="tail" strokeWidth={TAIL_W + 1} />
        </g>
        <g ref={register('twine.contact')} filter={`url(#${contactId})`} stroke="#1e0e04" opacity="0.55" transform="translate(1.8 2.6)">
          {CORDS.map(([taut, slack], i) => (
            <path key={i} d={taut} data-slack={slack} data-role="strand" strokeWidth={CORD_W - 1} />
          ))}
          <path d={TAIL[0]} data-slack={TAIL[1]} data-role="tail" strokeWidth={TAIL_W - 1} />
        </g>

        {CORDS.map((d, i) => (
          <Cord key={i} d={d} width={CORD_W} paint={paint} role="strand" />
        ))}
        <Cord d={TAIL} width={TAIL_W * 0.8} paint={paint} role="tail" />

        {/* the resting cords' real ply structure (fades out when the cords go slack) */}
        <g ref={register('twine.helix')}>
          {[...CORD_PLIES, TAIL_PLIES].map((p, i) => (
            <g key={i}>
              <path d={p.bundles} fill={`url(#${bundleId})`} stroke="#3a1c08" strokeWidth={0.5} strokeLinejoin="round" />
              <path d={p.grooves} stroke="#1f0d03" strokeWidth={i < 2 ? 1.3 : 0.8} opacity={0.75} />
              <path d={p.crowns} stroke="#d9a877" strokeWidth={i < 2 ? 0.9 : 0.6} opacity={0.55} />
            </g>
          ))}
          {/* the cylinder's shade over the bundles, and a faint sheen on the lit side */}
          {CORDS.map(([taut], i) => (
            <g key={`s${i}`}>
              <path d={taut} stroke="#1c0c03" strokeWidth={CORD_W * 0.3} opacity={0.32} transform={`translate(${f(CORD_W * 0.36)} 0)`} />
              <path d={taut} stroke="#f0c69a" strokeWidth={CORD_W * 0.1} opacity={0.14} transform={`translate(${f(-CORD_W * 0.2)} 0)`} />
            </g>
          ))}
        </g>

        {/* stray fibres catching the light */}
        <path ref={register('twine.hairs')} d={HAIRS} stroke="#a57446" strokeWidth={0.6} opacity={0.55} />
        <g ref={register('twine.fray')} strokeLinecap="round">
          {FRAY.map(([taut, slack], i) => (
            <path key={i} d={taut} data-slack={slack} stroke={i % 2 ? '#6e401e' : '#a8764a'} strokeWidth={i < 2 ? 1.4 : 0.8} opacity={0.9} />
          ))}
        </g>
      </g>
    </svg>
  )
}
