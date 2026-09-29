/**
 * The flap is a separate sheet lying on the envelope body, hinged on the top
 * fold and held down only at its tip by the wax. Between the hinge and the
 * seal its free edges bow up a little off the body, so along each edge there
 * is a real, shallow cavity: graded warm occlusion right under the edge, a
 * soft contact shadow, and a broad cast shadow falling down-right (key light
 * top-left). Nothing is drawn where the edge runs under the wax. The flap's
 * own cut edge shows its thickness: the left edge faces the light (pale rim),
 * the right edge faces away (dark rim).
 *
 * Everything is authored in envelope units (ENV.w × ENV.h).
 */
import { FLAP_TIP, ENV, SEAL } from '../constants'
import { rng } from './geometry'

type Pt = [number, number]
const f = (n: number) => Math.round(n * 10) / 10

/** how far the edge stands off the body, 0..1, from the hinge corner (t=0) to the tip (t=1) */
function liftProfile(seed: number) {
  const r = rng(seed)
  const waves = Array.from({ length: 3 }, (_, k) => ({ a: 0.08 / (k + 1), f: 2 + k * 2.3 + r(), p: r() * 6.28 }))
  return (t: number) => {
    // a corner curl near the hinge, a long bow in the middle, pinned under the wax at the tip
    const bow = Math.sin(Math.PI * Math.min(1, t / 0.92)) ** 0.9
    const curl = Math.exp(-t / 0.06) * 0.35
    const pin = 1 - Math.max(0, (t - 0.72) / 0.28) ** 1.6
    let v = (0.28 + 0.72 * bow) * pin + curl
    for (const w of waves) v += w.a * Math.sin(t * w.f * 6.28 + w.p)
    return Math.max(0.05, Math.min(1.2, v))
  }
}

type Edge = { from: Pt; to: Pt; body: Pt; lift: (t: number) => number; lit: boolean }

const unit = ([x, y]: Pt): Pt => {
  const l = Math.hypot(x, y)
  return [x / l, y / l]
}

const EDGES: Edge[] = [
  // left edge: hinge corner (0,0) → tip; the body lies below-left of it
  { from: [0, 0], to: [FLAP_TIP.x, FLAP_TIP.y], body: unit([-FLAP_TIP.y, FLAP_TIP.x]), lift: liftProfile(11), lit: true },
  // right edge: hinge corner (ENV.w,0) → tip; the body lies below-right
  { from: [ENV.w, 0], to: [FLAP_TIP.x, FLAP_TIP.y], body: unit([FLAP_TIP.y, ENV.w - FLAP_TIP.x]), lift: liftProfile(23), lit: false },
]

const N = 64

/** fraction along an edge where it runs in under the wax (nothing is drawn past it: nothing can show through the seal) */
function tEnd(e: Edge) {
  const R = SEAL.d / 2 + 10
  for (let i = 0; i <= 400; i++) {
    const t = i / 400
    const x = e.from[0] + (e.to[0] - e.from[0]) * t
    const y = e.from[1] + (e.to[1] - e.from[1]) * t
    if (Math.hypot(x - SEAL.cx, y - SEAL.cy) < R) return t
  }
  return 1
}

/** a band on the body side of an edge: width(t) units, displaced by the light direction */
function band(e: Edge, width: (lift: number) => number, shift: (lift: number) => Pt = () => [0, 0], inset = 0) {
  const outer: Pt[] = []
  const inner: Pt[] = []
  const end = tEnd(e)
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * end
    // taper to nothing just as the edge reaches the wax
    const taper = Math.min(1, (end - t) / 0.06)
    const x = e.from[0] + (e.to[0] - e.from[0]) * t
    const y = e.from[1] + (e.to[1] - e.from[1]) * t
    const L = e.lift(t)
    const [sx, sy] = shift(L)
    inner.push([x - e.body[0] * inset + sx * 0.3 * taper, y - e.body[1] * inset + sy * 0.3 * taper])
    const w = width(L) * taper
    outer.push([x + e.body[0] * w + sx * taper, y + e.body[1] * w + sy * taper])
  }
  return 'M' + [...inner, ...outer.reverse()].map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z'
}

/** a line running just inside the flap, `d` units from its edge */
function rimLine(e: Edge, d: number) {
  const pts: Pt[] = []
  const end = tEnd(e) - 0.02
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * end
    pts.push([e.from[0] + (e.to[0] - e.from[0]) * t - e.body[0] * d, e.from[1] + (e.to[1] - e.from[1]) * t - e.body[1] * d])
  }
  return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')
}

/** light direction on the desk plane (shadows fall down-right) */
const LIGHT: Pt = [0.42, 0.9]

const CAST = EDGES.map((e) => band(e, (L) => 8 + 36 * L, (L) => [LIGHT[0] * 18 * L, LIGHT[1] * 18 * L])).join(' ')
const CONTACT = EDGES.map((e) => band(e, (L) => 2.5 + 8 * L, undefined, 0.5)).join(' ')
const CAVITY = EDGES.map((e) => band(e, (L) => 1 + 3 * L, undefined, 0.6)).join(' ')
const AMBIENT = EDGES.map((e) => band(e, () => 64)).join(' ')

type Register = (name: string) => (el: Element | null) => void

/** Shadows the closed flap casts on the body (sits under the flap, over the body). */
export function FlapShadow({ register, viewBox }: { register: Register; viewBox: string }) {
  return (
    <svg ref={register('flap.shadow')} className="te-layer te-flap-shadow" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="te-flap-ao" x="-5%" y="-10%" width="110%" height="120%">
          <feGaussianBlur stdDeviation="24" />
        </filter>
        <filter id="te-flap-cast" x="-5%" y="-10%" width="110%" height="120%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="te-flap-contact" x="-5%" y="-10%" width="110%" height="120%">
          <feGaussianBlur stdDeviation="3.6" />
        </filter>
        <filter id="te-flap-cavity" x="-5%" y="-10%" width="110%" height="120%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      {/* paper over paper: broad, faint occlusion */}
      <path d={AMBIENT} fill="#4a2c14" opacity={0.16} filter="url(#te-flap-ao)" />
      {/* soft cast shadow, wider where the edge stands further off the body */}
      <g ref={register('flap.shadow.soft')}>
        <path d={CAST} fill="#3e2410" opacity={0.3} filter="url(#te-flap-cast)" />
      </g>
      {/* contact shadow, then the shallow cavity right under the edge: warm and graded, never a black line */}
      <g ref={register('flap.shadow.edge')}>
        <path d={CONTACT} fill="#3a200c" opacity={0.3} filter="url(#te-flap-contact)" />
        <path d={CAVITY} fill="#2e1808" opacity={0.24} filter="url(#te-flap-cavity)" />
      </g>
    </svg>
  )
}

/** The flap sheet's own cut edge (thickness) and the curl catching the light; lives on the flap's outer face. */
export function FlapRim() {
  return (
    <g fill="none" strokeLinecap="round">
      {EDGES.map((e, i) => (
        <g key={i}>
          {/* top-surface curl just inside the edge: brighter on the lit side */}
          <path d={rimLine(e, 7)} stroke={e.lit ? '#fff4e0' : '#fff0da'} strokeWidth={9} opacity={e.lit ? 0.32 : 0.12} filter="url(#te-flap-rim-blur)" />
          {/* the cut face of the paper */}
          <path d={rimLine(e, 1.3)} stroke={e.lit ? '#fbf1dc' : '#b39676'} strokeWidth={2.2} opacity={e.lit ? 0.62 : 0.35} />
        </g>
      ))}
    </g>
  )
}
