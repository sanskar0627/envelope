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

const PUDDLE = blobPath(96, 7, 0.075, 44)
const PUDDLE_INNER = blobPath(84, 11, 0.06, 36)
const HALF = SEAL_VIEW / 2

/** Top-down propeller plane — the seal's emblem. */
const EMBLEM =
  'M0 -34 C4 -34 5.5 -28 5.5 -20 L5.5 -8 L34 -2 C36 -1.5 36 3 34 3.5 L5.5 6 L4.5 22 L15 27 C16 27.5 16 30 15 30.5 L0 29 L-15 30.5 C-16 30 -16 27.5 -15 27 L-4.5 22 L-5.5 6 L-34 3.5 C-36 3 -36 -1.5 -34 -2 L-5.5 -8 L-5.5 -20 C-5.5 -28 -4 -34 0 -34 Z'

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
export function WaxSeal({ part, layer, register }: { part: SealPart; layer: 'shadow' | 'wax'; register: Register }) {
  const uid = useId().replace(/:/g, '')
  const wax = `te-wax-${uid}`
  const shadow = `te-wax-shadow-${uid}`
  const clip = `te-wax-clip-${uid}`
  const puddleClip = `te-wax-puddle-${uid}`
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
        <filter id={shadow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={wax} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          {/* height field: relief (softened) × dome falloff at the puddle edge */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="relief" />
          <feColorMatrix in="relief" type="luminanceToAlpha" result="reliefA" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="dome" />
          <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed="4" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0" result="grainA" />
          <feComposite in="reliefA" in2="dome" operator="arithmetic" k1="1.0" k2="0" k3="0" k4="0" result="h0" />
          <feComposite in="h0" in2="grainA" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="height" />

          <feDiffuseLighting in="height" surfaceScale="11" diffuseConstant="1.12" lightingColor="#fff0ea" result="diffuse">
            <feDistantLight azimuth="235" elevation="52" />
          </feDiffuseLighting>
          <feSpecularLighting in="height" surfaceScale="11" specularConstant="1.35" specularExponent="42" lightingColor="#fff1e6" result="spec">
            <feDistantLight azimuth="235" elevation="50" />
          </feSpecularLighting>
          <feSpecularLighting in="height" surfaceScale="11" specularConstant="0.35" specularExponent="6" lightingColor="#ff7a66" result="sheen">
            <feDistantLight azimuth="235" elevation="42" />
          </feSpecularLighting>

          <feFlood floodColor="#8e1510" result="base" />
          <feComposite in="base" in2="SourceAlpha" operator="in" result="baseIn" />
          <feComposite in="baseIn" in2="diffuse" operator="arithmetic" k1="1.02" k2="0" k3="0" k4="0" result="lit" />
          <feComposite in="sheen" in2="SourceAlpha" operator="in" result="sheenIn" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="lit" in2="sheenIn" operator="arithmetic" k1="0" k2="1" k3="0.28" k4="0" result="lit2" />
          <feComposite in="lit2" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.62" k4="0" result="glossy" />
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
        </g>
      )}

      {/* lit wax */}
      {layer === 'wax' && (
        <g className="te-seal__wax">
          <g clipPath={`url(#${clip})`}>
            <g filter={`url(#${wax})`}>
              <path d={PUDDLE} fill="#8a8a8a" />
              <path d={PUDDLE_INNER} fill="#9a9a9a" />
              <circle r={68} fill="none" stroke="#c4c4c4" strokeWidth={12} />
              <circle r={61} fill="#7d7d7d" />
              <circle r={52} fill="#777" />
              <circle r={56} fill="none" stroke="#9a9a9a" strokeWidth={2.2} />
              <path d={EMBLEM} fill="#b4b4b4" transform="rotate(-18) scale(1.08)" />
              <circle r={4.5} cy={-8} fill="#c6c6c6" transform="rotate(-18)" />
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

      {layer === 'wax' && part === 'body' && (
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
