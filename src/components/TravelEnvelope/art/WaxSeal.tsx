/**
 * Wax seal rendered from a grayscale height map, split into two halves.
 *
 * The seal was poured across the flap tip, so when the envelope is opened it
 * breaks exactly along the flap edge: the upper piece stays bonded to the flap
 * (and rides it open), the lower piece stays on the envelope body. Both halves
 * render the *same* lit wax and are clipped along one shared jagged fracture
 * line, so at rest they read as a single seal with no seam.
 *
 * Lighting: the group inside the wax filter is drawn as height (white = high).
 * The filter turns it into lit wax (diffuse + tight specular + sheen + micro
 * grain), so ring, recessed die face and emblem all catch the top-left key.
 */
import { useId } from 'react'
import { ENV, FLAP_TIP, SEAL_VIEW, toSeal } from '../constants'
import { blobPath, rng } from './geometry'

const PUDDLE = blobPath(96, 7, 0.11, 26)
const PUDDLE_INNER = blobPath(84, 11, 0.07, 48)
/** thin film of wax that ran out onto the paper before it set */
const SKIRT = blobPath(100, 19, 0.12, 20)
const HALF = SEAL_VIEW / 2

/** Top-down propeller plane — the seal's emblem. */
const EMBLEM = (() => {
  // three broad, rounded propeller blades on a hub (the reference seal's device):
  // one up, two swept low and nearly horizontal, with the shaft running down between them
  const blade = (deg: number) => {
    const a = (deg * Math.PI) / 180
    const c = Math.cos(a)
    const sn = Math.sin(a)
    const pt = (x: number, y: number) => `${(x * c - y * sn).toFixed(2)} ${(x * sn + y * c).toFixed(2)}`
    // paddle blade: narrow at the hub, broad and rounded at the tip, along -y
    return `M${pt(-3.2, -7)} C${pt(-7, -14)} ${pt(-11.5, -24)} ${pt(-10, -33)} C${pt(-8.5, -40)} ${pt(8.5, -40)} ${pt(10, -33)} C${pt(11.5, -24)} ${pt(7, -14)} ${pt(3.2, -7)} Z`
  }
  return [blade(0), blade(104), blade(256)].join(' ')
})()
/** shaft with a small arrow-head tail, pointing down */
const EMBLEM_SHAFT = 'M-2.4 8 L2.4 8 L1.8 38 L6 38 L0 47 L-6 38 L-1.8 38 Z'

/** hairline cracks crazing the set wax (seal space): short branching polylines, mostly on the flat die face */
const CRAZE = (() => {
  const r = rng(404)
  const out: string[] = []
  for (let k = 0; k < 16; k++) {
    const a0 = r() * Math.PI * 2
    const d0 = 10 + r() * 44
    let x = Math.cos(a0) * d0
    let y = Math.sin(a0) * d0
    let dir = r() * Math.PI * 2
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`
    const steps = 3 + Math.floor(r() * 5)
    for (let i = 0; i < steps; i++) {
      dir += (r() - 0.5) * 1.3
      const len = 3 + r() * 7
      x += Math.cos(dir) * len
      y += Math.sin(dir) * len
      if (Math.hypot(x, y) > 58) break
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
    }
    out.push(d)
  }
  return out.join(' ')
})()

/** fine handling scratches: long, shallow, slightly curved (seal space) */
const SCRATCHES = (() => {
  const r = rng(515)
  const out: string[] = []
  for (let k = 0; k < 11; k++) {
    const a = r() * Math.PI * 2
    const d = r() * 60
    const x = Math.cos(a) * d
    const y = Math.sin(a) * d
    const dir = r() * Math.PI
    const len = 8 + r() * 22
    const bend = (r() - 0.5) * 6
    out.push(`M${x.toFixed(1)} ${y.toFixed(1)} q${(Math.cos(dir) * len * 0.5 - Math.sin(dir) * bend).toFixed(1)} ${(Math.sin(dir) * len * 0.5 + Math.cos(dir) * bend).toFixed(1)} ${(Math.cos(dir) * len).toFixed(1)} ${(Math.sin(dir) * len).toFixed(1)}`)
  }
  return out.join(' ')
})()

/** tiny bubbles and pits frozen in the surface (seal space, on the rim ring and outer puddle) */
const PITS = (() => {
  const r = rng(71)
  const out: Array<[number, number, number]> = []
  while (out.length < 12) {
    const a = r() * Math.PI * 2
    const d = 58 + r() * 34
    out.push([Math.cos(a) * d, Math.sin(a) * d, 0.5 + r() * 0.8])
  }
  return out
})()

/** where the twine runs under the wax: the wax bulges over each strand at the rim (seal space) */
const TWINE_RIDGES: Array<[number, number, number]> = [
  [-3.5, -86, -4], [1.4, -86, -3], [14.6, -85, 1], [19.8, -85, 1],
  [-18, 86, 8], [-12.6, 86, 7], [17.6, 86, 1], [23, 86, 1],
]

/* ------------------------------------------------------------------ fracture geometry */

type Pt = [number, number]
const f = (n: number) => Math.round(n * 100) / 100

/** Jagged arm from the flap tip outward along one flap edge, in seal space. */
function fractureArm(toX: number, toY: number, seed: number): Pt[] {
  const r = rng(seed)
  const [tx, ty] = toSeal(FLAP_TIP.x, FLAP_TIP.y)
  const [ex, ey] = toSeal(toX, toY)
  const dx = ex - tx
  const dy = ey - ty
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const pts: Pt[] = [[tx, ty]]
  // walk until well past the wax rim
  for (let s = 4; s < 140; s += 3 + r() * 3) {
    const kink = r() < 0.12 ? (r() - 0.5) * 4.2 : (r() - 0.5) * 1.6
    pts.push([tx + ux * s - uy * kink, ty + uy * s + ux * kink])
  }
  return pts
}

const ARM_L = fractureArm(0, 0, 3)
const ARM_R = fractureArm(ENV.w, 0, 5)
/** full fracture polyline, left rim → tip → right rim */
const FRACTURE: Pt[] = [...ARM_L.slice().reverse(), ...ARM_R.slice(1)]

const toD = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ')
const armLength = (pts: Pt[]) => pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0)

const CRACK = {
  left: toD(ARM_L),
  right: toD(ARM_R),
  leftLen: armLength(ARM_L),
  rightLen: armLength(ARM_R),
  full: toD(FRACTURE),
}

/** clip regions; the flap piece overlaps the body piece by a hair so no seam shows at rest */
const lastL = ARM_L[ARM_L.length - 1]
const lastR = ARM_R[ARM_R.length - 1]
const FLAP_REGION = toD([[-HALF, lastL[1]], ...FRACTURE.map(([x, y]) => [x, y + 1.4] as Pt), [HALF, lastR[1]], [HALF, -HALF], [-HALF, -HALF]]) + 'Z'
const BODY_REGION = toD([[-HALF, lastL[1]], ...FRACTURE, [HALF, lastR[1]], [HALF, HALF], [-HALF, HALF]]) + 'Z'

/** hairline side-cracks that branch off the main fracture as it propagates */
const MICRO = [
  { at: 0.3, arm: ARM_L, d: [-3, 9] },
  { at: 0.55, arm: ARM_R, d: [4, 10] },
  { at: 0.75, arm: ARM_L, d: [2, -8] },
].map(({ at, arm, d }) => {
  const p = arm[Math.floor(arm.length * at)]
  return `M${f(p[0])} ${f(p[1])} l${d[0] * 0.5} ${d[1] * 0.45} l${d[0] * 0.5} ${d[1] * 0.55}`
})

/** a flake of wax that pops off the lower piece when it fractures */
const CHIP_AT: Pt = [63, -9]
const CHIP = 'M-5.6 -3.4 L0.8 -6 L6.2 -1.8 L4.6 4.2 L-2.4 5.6 L-6.2 1.6 Z'

/* ------------------------------------------------------------------ component */

export type SealPart = 'flap' | 'body'
type Register = (name: string) => (el: Element | null) => void

/**
 * One piece of the seal. Each piece is rendered as two stacked layers — its
 * cast shadow and its wax — so both shadows always sit *under* both waxes and
 * no shadow ever paints across the other piece at rest.
 */
export function WaxSeal({ part, layer, register }: { part: SealPart; layer: 'shadow' | 'wax' | 'chip' | 'residue'; register: Register }) {
  const uid = useId().replace(/:/g, '')
  const wax = `te-wax-${uid}`
  const shadow = `te-wax-shadow-${uid}`
  const clip = `te-wax-clip-${uid}`
  const puddleClip = `te-wax-puddle-${uid}`
  const skirtClip = `te-wax-skirt-${uid}`
  const soft = `te-wax-soft-${uid}`
  const region = part === 'flap' ? FLAP_REGION : BODY_REGION
  const r = (name: string) => register(`seal.${part}.${name}`)

  return (
    <svg className="te-seal__svg" viewBox={`${-HALF} ${-HALF} ${SEAL_VIEW} ${SEAL_VIEW}`} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={region} />
        </clipPath>
        <clipPath id={puddleClip}>
          <path d={PUDDLE} />
        </clipPath>
        <clipPath id={skirtClip}>
          <path d={SKIRT} />
        </clipPath>
        <filter id={soft} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id={shadow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={wax} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          {/* height field: relief (softened) × dome falloff at the puddle edge */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="relief" />
          <feColorMatrix in="relief" type="luminanceToAlpha" result="reliefA" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="dome" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.009 0" result="grainA" />
          <feComposite in="reliefA" in2="dome" operator="arithmetic" k1="1.0" k2="0" k3="0" k4="0" result="h0" />
          <feComposite in="h0" in2="grainA" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="height" />

          <feDiffuseLighting in="height" surfaceScale="11" diffuseConstant="0.98" lightingColor="#fff0ea" result="diffuse">
            <feDistantLight azimuth="235" elevation="52" />
          </feDiffuseLighting>
          <feSpecularLighting in="height" surfaceScale="11" specularConstant="1.2" specularExponent="34" lightingColor="#ffe9dc" result="spec">
            <feDistantLight azimuth="235" elevation="50" />
          </feSpecularLighting>
          <feSpecularLighting in="height" surfaceScale="11" specularConstant="0.5" specularExponent="44" lightingColor="#fff4ec" result="gloss">
            <feDistantLight azimuth="228" elevation="46" />
          </feSpecularLighting>
          <feSpecularLighting in="height" surfaceScale="11" specularConstant="0.42" specularExponent="5" lightingColor="#ff3a2a" result="sheen">
            <feDistantLight azimuth="235" elevation="42" />
          </feSpecularLighting>

          <feFlood floodColor="#690d08" result="base" />
          <feComposite in="base" in2="SourceAlpha" operator="in" result="baseIn" />
          <feComposite in="baseIn" in2="diffuse" operator="arithmetic" k1="1.02" k2="0" k3="0" k4="0" result="lit" />
          <feComposite in="sheen" in2="SourceAlpha" operator="in" result="sheenIn" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="lit" in2="sheenIn" operator="arithmetic" k1="0" k2="1" k3="0.13" k4="0" result="lit2" />
          <feComposite in="lit2" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0" result="glossy0" />
          <feComposite in="gloss" in2="SourceAlpha" operator="in" result="glossIn" />
          <feComposite in="glossy0" in2="glossIn" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="glossy" />
          <feComposite in="glossy" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>

      {/* contact + cast shadow of THIS piece (clip travels with the offset) */}
      {layer === 'shadow' && (
        <g className="te-seal__shadow" ref={r('shadow')}>
          <g filter={`url(#${shadow})`}>
            <g transform="translate(5 9)" clipPath={`url(#${clip})`}>
              <path d={PUDDLE} transform="scale(1.01)" fill="#2a0c05" opacity="0.5" />
            </g>
          </g>
          <g transform="translate(1.4 2.4)" clipPath={`url(#${clip})`}>
            <path d={PUDDLE} fill="#3a0f08" opacity="0.55" />
          </g>
          {/* wax oil wicked into the paper around the seal: a faint darker halo */}
          <g filter={`url(#${shadow})`} clipPath={`url(#${clip})`}>
            <path d={SKIRT} transform="scale(1.06)" fill="none" stroke="#6a3a1c" strokeWidth={5} opacity={0.2} />
          </g>
        </g>
      )}

      {/* the whole seal's footprint, left as a faint waxy stain once it lifts */}
      {layer === 'residue' && (
        <g ref={r('residue')} opacity={0}>
          {/* a greasy ghost of the puddle edge and a few specks of wax */}
          <path d={PUDDLE} transform="scale(0.97)" fill="none" stroke="#8a3020" strokeWidth={1.2} strokeDasharray="14 6 30 9 8 5" opacity={0.13} />
          <circle cx={-52} cy={58} r={2.2} fill="#8e1510" opacity={0.7} />
          <circle cx={38} cy={72} r={1.6} fill="#8e1510" opacity={0.6} />
          <circle cx={70} cy={30} r={1.3} fill="#8e1510" opacity={0.55} />
        </g>
      )}

      {/* lit wax */}
      {layer === 'wax' && (
        <g className="te-seal__wax">
          <g clipPath={`url(#${clip})`}>
            <g filter={`url(#${wax})`}>
              <path d={SKIRT} fill="#3c3c3c" />
              <path d={PUDDLE} fill="#8a8a8a" />
              <path d={PUDDLE_INNER} fill="#9a9a9a" />
              {TWINE_RIDGES.map(([x, y, rot], i) => (
                <ellipse key={`tr${i}`} cx={x} cy={y} rx={2.6} ry={9} transform={`rotate(${rot} ${x} ${y})`} fill="#8c8c8c" />
              ))}
              <circle r={68} fill="none" stroke="#c4c4c4" strokeWidth={12} />
              <circle r={61} fill="#7d7d7d" />
              <circle r={52} fill="#777" />
              <circle r={56} fill="none" stroke="#9a9a9a" strokeWidth={2.2} />
              {/* crazing: hairline grooves in the set wax */}
              <path d={CRAZE} fill="none" stroke="#545454" strokeWidth={0.7} />
              <g transform="rotate(-6)">
                {/* the die squeezed the wax: a shallow moat of compressed wax around the device */}
                <path d={EMBLEM} fill="none" stroke="#6c6c6c" strokeWidth={7} strokeLinejoin="round" />
                <path d={EMBLEM_SHAFT} fill="none" stroke="#6c6c6c" strokeWidth={6} strokeLinejoin="round" />
                <path d={EMBLEM_SHAFT} fill="#a4a4a4" />
                {/* raised blades: a soft ramp up from the face so they read as domed, not outlined */}
                <path d={EMBLEM} fill="#9c9c9c" stroke="#9c9c9c" strokeWidth={2.4} strokeLinejoin="round" />
                <path d={EMBLEM} fill="#bcbcbc" transform="scale(0.9)" />
                <path d={EMBLEM} fill="#cacaca" transform="scale(0.72)" />
                <circle r={9} fill="#b0b0b0" />
                <circle r={7.5} fill="none" stroke="#d6d6d6" strokeWidth={2} />
                <circle r={3.2} fill="#8e8e8e" />
              </g>
              {PITS.map(([x, y, pr], i) => (
                <circle key={`p${i}`} cx={x} cy={y} r={pr} fill="#6a6a6a" opacity={0.7} />
              ))}
            </g>
            {/* thin wax at the melted edge lets light through: a warmer, lighter rim */}
            <path d={SKIRT} fill="none" stroke="#c0301c" strokeWidth={3.4} opacity={0.32} filter={`url(#${soft})`} clipPath={`url(#${skirtClip})`} />
            {/* hairline cracks and handling scratches in the set wax */}
            <g clipPath={`url(#${puddleClip})`} fill="none" strokeLinecap="round">
              <path d={CRAZE} stroke="#2a0302" strokeWidth={0.45} opacity={0.4} />
              <path d={CRAZE} stroke="#ff9d86" strokeWidth={0.3} opacity={0.16} transform="translate(0.5 0.7)" />
              <path d={SCRATCHES} stroke="#ffc2b0" strokeWidth={0.32} opacity={0.2} />
            </g>
            {/* broken edge of this piece: only visible once the halves part */}
            <g ref={r('fracture')} opacity={0} clipPath={`url(#${puddleClip})`}>
              <path d={CRACK.full} fill="none" stroke="#3d0403" strokeWidth={3.4} strokeLinejoin="round" />
              <path
                d={CRACK.full}
                fill="none"
                stroke="#d2604c"
                strokeWidth={0.8}
                opacity={0.55}
                transform={part === 'flap' ? 'translate(0 -1.6)' : 'translate(0 1.6)'}
              />
            </g>
            {part === 'body' && (
              /* the pit left where the flake came away */
              <path ref={r('pit')} d={CHIP} transform={`translate(${CHIP_AT[0]} ${CHIP_AT[1]})`} fill="#4c0504" opacity={0} />
            )}
          </g>

          {part === 'flap' && (
            /* the fracture as it propagates: dark hairline + lit lip, drawn from the pressure point outward */
            <g fill="none" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#${puddleClip})`}>
              {(['left', 'right'] as const).map((side) => {
                const len = side === 'left' ? CRACK.leftLen : CRACK.rightLen
                return (
                  <g key={side}>
                    <path
                      ref={r(`crack.${side}`)}
                      data-len={len}
                      d={CRACK[side]}
                      stroke="#2a0201"
                      strokeWidth={1.7}
                      strokeDasharray={`${len} ${len}`}
                      strokeDashoffset={len}
                    />
                    <path
                      ref={r(`crackLip.${side}`)}
                      data-len={len}
                      d={CRACK[side]}
                      stroke="#f0907a"
                      strokeWidth={0.7}
                      opacity={0.6}
                      transform="translate(0.5 1.1)"
                      strokeDasharray={`${len} ${len}`}
                      strokeDashoffset={len}
                    />
                  </g>
                )
              })}
              <g ref={r('micro')} stroke="#2a0201" strokeWidth={0.9} opacity={0}>
                {MICRO.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
            </g>
          )}
        </g>
      )}

      {layer === 'chip' && (
        <g transform={`translate(${CHIP_AT[0]} ${CHIP_AT[1]})`}>
          {/* shadow stays on the paper plane; the flake itself flies above it */}
          <path ref={r('chipShadow')} d={CHIP} fill="#2a0c05" opacity={0} />
          <g ref={r('chip')} opacity={0}>
            <path d={CHIP} fill="#9a1a13" stroke="#5a0806" strokeWidth={0.6} />
            <path d="M-4.2 -2.6 L0.8 -4.6 L4 -1.8" fill="none" stroke="#ff9f8a" strokeWidth={0.9} opacity={0.8} />
          </g>
        </g>
      )}
    </svg>
  )
}
