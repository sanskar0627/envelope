/**
 * Choreography: turns the timing table in constants.ts into timeline tracks
 * that write to registered DOM nodes. Keeping this separate from the
 * component keeps the JSX about *structure* and this file about *motion*.
 */
import { EASE, FLAP_RELEASE_ANGLE, OPEN_RECENTRE, SEQ_OPEN, SEQ_SEAL, TICKET, TICKET_PEEK } from './constants'
import { cubicBezier, lerp, linear, pathLerp, type Track } from './timeline'

export type NodeMap = Map<string, Element>

/**
 * Named DOM registry. `register(name)` returns a stable callback ref, so the
 * choreography can address any node ("flap", "seal.body.chip", …) without
 * threading dozens of refs through props.
 */
export function createRegistry() {
  const nodes: NodeMap = new Map()
  const cache = new Map<string, (el: Element | null) => void>()
  const register = (name: string) => {
    let fn = cache.get(name)
    if (!fn) {
      fn = (el: Element | null) => {
        if (el) nodes.set(name, el)
        else nodes.delete(name)
      }
      cache.set(name, fn)
    }
    return fn
  }
  return { nodes, register }
}

const ease = (k: keyof typeof EASE) => {
  const [x1, y1, x2, y2] = EASE[k]
  return cubicBezier(x1, y1, x2, y2)
}

/** resting transforms — every animated transform is written relative to these */
export const BASE = {
  sealBody: 'translate(-50%, -50%) translateZ(2.4px)',
  sealFlap: 'translate(-50%, -50%) translateZ(2.6px)',
  /** perspective only while the flap is in motion (see CSS note on --persp); flat poses stay crisp */
  flap: (deg: number) =>
    deg === 0
      ? 'translateZ(1px)'
      : deg >= 180
        ? 'translateZ(1px) rotateX(180deg)'
        : `perspective(var(--persp)) translateZ(1px) rotateX(${deg}deg)`,
} as const

function style(el: Element | undefined, prop: 'transform' | 'opacity' | 'backgroundColor', value: string) {
  if (el) (el as HTMLElement | SVGElement).style[prop] = value
}
function attr(el: Element | undefined, name: string, value: string) {
  el?.setAttribute(name, value)
}
const hump = (p: number) => 4 * p * (1 - p)

/**
 * Seal break (Sequence A, part 1). Starts on pointer release.
 * press is CSS (pointer-driven) → fracture → flake → release → twine slack →
 * twine recoils off → flap tip lifts off the body (hand-off to Step 3).
 */
export function buildSealBreak(n: NodeMap): Track[] {
  const T = SEQ_SEAL
  const tracks: Track[] = []

  /* fracture propagates from the pressure point (flap tip) outward along both flap edges */
  ;(['left', 'right'] as const).forEach((side, i) => {
    const lines = [n.get(`seal.flap.crack.${side}`), n.get(`seal.flap.crackLip.${side}`)]
    const len = Number(lines[0]?.getAttribute('data-len') ?? 0)
    tracks.push({
      at: T.crack.at + i * 28,
      dur: T.crack.dur - i * 28,
      ease: ease('snap'),
      update: (v) => lines.forEach((el) => attr(el, 'stroke-dashoffset', String(len * (1 - v)))),
    })
  })
  tracks.push({
    at: T.microCracks.at,
    dur: T.microCracks.dur,
    ease: ease('out'),
    update: (v) => attr(n.get('seal.flap.micro'), 'opacity', String(0.75 * v)),
  })

  /* a flake of wax pops off the lower piece and lands on the paper */
  const chip = n.get('seal.body.chip')
  const chipShadow = n.get('seal.body.chipShadow')
  const land = { x: 44, y: 40, spin: 250 }
  const easeOut = ease('out')
  tracks.push({
    at: T.chip.at,
    dur: T.chip.dur,
    ease: linear,
    update: (p) => {
      const h = hump(p) // height above the paper
      const x = land.x * easeOut(p)
      const y = land.y * p - 22 * h
      attr(chip, 'opacity', p > 0 ? '1' : '0')
      attr(chip, 'transform', `translate(${x} ${y}) rotate(${land.spin * easeOut(p)}) scale(${1 + 0.35 * h})`)
      attr(chipShadow, 'opacity', String(p > 0 ? 0.45 * (1 - 0.55 * h) : 0))
      attr(chipShadow, 'transform', `translate(${x + 0.8 + 5 * h} ${land.y * p + 1.4 + 8 * h}) rotate(${land.spin * easeOut(p)}) scale(${1 - 0.2 * h})`)
    },
  })
  tracks.push({
    at: T.chip.at,
    dur: 90,
    ease: easeOut,
    update: (v) => attr(n.get('seal.body.pit'), 'opacity', String(0.7 * v)),
  })

  /* stored tension releases: the pieces part along the fracture */
  tracks.push({
    at: T.pop.at,
    dur: T.pop.dur,
    ease: ease('out'),
    update: (v) => {
      style(n.get('seal.flap'), 'transform', `${BASE.sealFlap} translate3d(0, ${-0.35 * v}%, ${3 * v}px) scale(${1 + 0.006 * v})`)
      // the whole seal lets go of the body paper (both pieces lift a touch)
      style(n.get('seal.body'), 'transform', `${BASE.sealBody} translate3d(0, ${0.12 * v}%, ${2 * v}px) scale(${1 + 0.003 * v})`)
      attr(n.get('seal.body.residue'), 'opacity', String(v))
      attr(n.get('seal.flap.fracture'), 'opacity', String(v))
      attr(n.get('seal.body.fracture'), 'opacity', String(v))
    },
  })

  /* twine: tension goes, strands bow and lift off the paper … */
  const twineSvg = n.get('twine.svg')
  const morphs = Array.from(twineSvg?.querySelectorAll<SVGPathElement>('[data-slack]') ?? []).map((el) => {
    const taut = el.dataset.taut ?? (el.dataset.taut = el.getAttribute('d') ?? '')
    const to = pathLerp(taut, el.dataset.slack ?? taut)
    return (v: number) => el.setAttribute('d', to(v))
  })
  tracks.push({
    at: T.slack.at,
    dur: T.slack.dur,
    ease: ease('out'),
    update: (v) => {
      morphs.forEach((m) => m(v))
      const sh = n.get('twine.shadow')
      attr(sh, 'transform', `translate(${lerp(5, 10, v)} ${lerp(7, 16, v)})`)
      attr(sh, 'opacity', String(lerp(0.42, 0.3, v)))
    },
  })
  /* … then the freed ends recoil: every strand zips back from the seal to the
     envelope edges (and round to the underside); the loose tail is drawn in
     under the seal. Implemented as a two-dash pattern closing toward the ends. */
  const SEAL_AT = 0.52 // where the seal sits along a strand (fraction of length)
  const paths = Array.from(twineSvg?.querySelectorAll<SVGPathElement>('path[data-role]') ?? [])
  let lengths: number[] | null = null
  tracks.push({
    at: T.retract.at,
    dur: T.retract.dur,
    ease: cubicBezier(0.3, 0.5, 0.25, 1), // released tension: fast whip, friction brakes it
    update: (v) => {
      if (v === 0 && !lengths) return
      lengths ??= paths.map((el) => el.getTotalLength())
      // the last few units are the wrap round the paper edge: gone from view
      style(twineSvg, 'opacity', String(v < 0.88 ? 1 : Math.max(0, (1 - v) / 0.12)))
      paths.forEach((el, i) => {
        const L = lengths![i]
        if (el.dataset.role === 'tail') {
          const a = L * (1 - v)
          el.setAttribute('stroke-dasharray', `${a} ${L + 1}`)
        } else {
          const a = L * SEAL_AT * (1 - v) // upper run retracts to the top edge
          const b = L * (SEAL_AT + (1 - SEAL_AT) * v) // lower run retracts to the bottom edge
          el.setAttribute('stroke-dasharray', `${a} ${Math.max(0, b - a)} ${L - b + 1}`)
        }
      })
    },
  })
  tracks.push({
    at: T.retract.at,
    dur: 120,
    ease: ease('out'),
    update: (v) => attr(n.get('twine.fray'), 'opacity', String(1 - v)),
  })

  /* the flap tip, now free, lifts off the body — hand-off to the opening */
  tracks.push({
    at: T.flapLift.at,
    dur: T.flapLift.dur,
    ease: ease('out'),
    update: (v) => {
      style(n.get('flap'), 'transform', BASE.flap(FLAP_RELEASE_ANGLE * v))
      attr(n.get('flap.shadow.soft'), 'transform', `translate(${3 + 3 * v} ${9 + 16 * v})`)
      style(n.get('flap.shadow'), 'opacity', String(0.34 + 0.12 * v))
    },
  })

  return tracks
}

/* ------------------------------------------------------------------ Sequence A · part 2: the flap opens */

/**
 * Brightness of a face under the top-left key light, relative to lying flat
 * (1 = as lit as at rest). L ≈ normalize(-0.5, -0.6, 0.62); rotateX(a) turns
 * the outer normal to (0, -sin a, cos a).
 */
const outerLight = (a: number) => (0.6 * Math.sin(a) + 0.62 * Math.cos(a)) / 0.62
const innerLight = (a: number) => (-0.6 * Math.sin(a) - 0.62 * Math.cos(a)) / 0.62

/** Shade overlay colour for a relative brightness (b > 1 brightens, b < 1 darkens). */
function shade(b: number, maxDark: number) {
  return b >= 1 ? `rgba(255, 246, 228, ${Math.min(0.22, (b - 1) * 0.5).toFixed(3)})` : `rgba(26, 14, 6, ${Math.min(maxDark, (1 - b) * 0.62).toFixed(3)})`
}

export function buildFlapOpen(n: NodeMap): Track[] {
  const T = SEQ_OPEN
  const from = FLAP_RELEASE_ANGLE
  const flap = n.get('flap')
  const outerShade = n.get('flap.outer.shade')
  const innerShade = n.get('flap.inner.shade')
  const bodyShadow = n.get('flap.shadow')
  const deskShadow = n.get('flap.deskShadow')
  const interior = n.get('interior.shade')
  const rad = Math.PI / 180

  return [
    {
      // a paper flap: reluctant off the gum, quick through vertical, settling flat
      at: T.flap.at,
      dur: T.flap.dur,
      ease: cubicBezier(0.5, 0.02, 0.18, 1),
      update: (v) => {
        const deg = from + (180 - from) * v
        const a = deg * rad
        style(flap, 'transform', BASE.flap(deg))
        style(outerShade, 'backgroundColor', deg < 90 ? shade(outerLight(a), 0.5) : 'transparent')
        style(innerShade, 'backgroundColor', deg > 90 ? shade(Math.max(0, innerLight(a)), 0.75) : 'transparent')
        // the shadow line the closed flap cast on the body fades as it lifts away
        style(bodyShadow, 'opacity', String(0.46 * Math.max(0, 1 - (deg - from) / 35)))
        // once over the top, the flap lies on the desk and casts a soft shadow there
        style(deskShadow, 'opacity', String(0.5 * Math.max(0, (deg - 120) / 60) ** 1.5))
        // light floods into the envelope as the mouth opens
        style(interior, 'opacity', String(0.92 - 0.5 * Math.min(1, deg / 150)))
      },
    },
    {
      // the camera eases down so the open flap stays in frame
      at: T.recentre.at,
      dur: T.recentre.dur,
      ease: ease('inOut'),
      update: (v) => style(n.get('scene'), 'transform', `translateY(calc(var(--env-w) / 2.2 * ${(OPEN_RECENTRE * v).toFixed(4)}))`),
    },
    {
      // the ticket, freed of the flap's pressure, rises a little in the pocket
      at: T.peek.at,
      dur: T.peek.dur,
      ease: ease('out'),
      update: (v) => style(n.get('ticket'), 'transform', `translateY(${((-TICKET_PEEK / TICKET.h) * 100 * v).toFixed(3)}%)`),
    },
  ]
}
