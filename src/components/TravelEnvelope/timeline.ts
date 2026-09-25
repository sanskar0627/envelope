/**
 * Minimal, dependency-free animation timeline.
 *
 * Every moving part of the envelope is driven from ONE rAF clock, so the seal,
 * twine, flap and shadows can never drift apart. Tracks write straight to the
 * DOM (transform / opacity / path data), so React doesn't re-render per frame.
 */

export type Ease = (t: number) => number

/** CSS-equivalent cubic-bezier easing (Newton–Raphson with bisection fallback). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t
  const sy = (t: number) => ((ay * t + by) * t + cy) * t
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  const solve = (x: number) => {
    let t = x
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x
      const d = dx(t)
      if (Math.abs(e) < 1e-5) return t
      if (Math.abs(d) < 1e-6) break
      t -= e / d
    }
    let lo = 0
    let hi = 1
    t = x
    for (let i = 0; i < 20; i++) {
      const v = sx(t)
      if (Math.abs(v - x) < 1e-5) break
      if (v < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return t
  }
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)))
}

export const linear: Ease = (t) => t

/**
 * Critically-damped-ish settle: fast approach with a tiny, quickly damped
 * overshoot. `bounce` 0 = no overshoot. Never springy.
 */
export function settle(bounce = 0.04): Ease {
  return (t) => {
    if (t >= 1) return 1
    const w = 9
    const base = 1 - Math.exp(-w * t) * (1 + w * t)
    return base + Math.sin(Math.PI * t) * bounce * (1 - t)
  }
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Interpolates between two SVG path strings that share the same command structure. */
export function pathLerp(from: string, to: string): (t: number) => string {
  const num = /-?\d*\.?\d+(?:e-?\d+)?/g
  const a = from.match(num)!.map(Number)
  const b = to.match(num)!.map(Number)
  if (a.length !== b.length) throw new Error('pathLerp: paths must share structure')
  const parts = from.split(num)
  return (t) => {
    let s = parts[0]
    for (let i = 0; i < a.length; i++) s += (Math.round((a[i] + (b[i] - a[i]) * t) * 100) / 100).toString() + parts[i + 1]
    return s
  }
}

export interface Track {
  /** start time, ms from sequence start */
  at: number
  /** duration, ms */
  dur: number
  ease?: Ease
  /** receives eased progress 0..1 */
  update: (v: number) => void
}

export interface Playback {
  finished: Promise<boolean>
  cancel: () => void
}

export interface PlayOptions {
  /** playback rate (2 = twice as fast) */
  speed?: number
  /** play the same tracks backwards, ending exactly at their start values */
  reverse?: boolean
}

/** Longest step the clock may take in one frame (ms). A background tab or a
 * long frame slows the motion down instead of making it jump. */
const MAX_STEP = 64

/**
 * Plays tracks on a shared clock. Every track is written once at the start (so
 * the starting pose is exact) and once at its end (so the final pose is exact
 * regardless of frame timing). Resolves `true` when complete, `false` if cancelled.
 */
export function play(tracks: Track[], { speed = 1, reverse = false }: PlayOptions = {}): Playback {
  const total = Math.max(...tracks.map((t) => t.at + t.dur))
  let raf = 0
  let cancelled = false
  let resolveFn: (v: boolean) => void = () => {}
  const finished = new Promise<boolean>((r) => (resolveFn = r))
  const done = new Array(tracks.length).fill(false)
  let last = -1
  let elapsed = 0

  const progress = (tr: Track, t: number) => (tr.dur <= 0 ? (t >= tr.at ? 1 : 0) : Math.min(1, Math.max(0, (t - tr.at) / tr.dur)))

  const frame = (now: number) => {
    if (cancelled) return
    if (last >= 0) elapsed += Math.min(MAX_STEP, now - last) * speed
    last = now
    const t = reverse ? total - elapsed : elapsed
    for (let i = 0; i < tracks.length; i++) {
      if (done[i]) continue
      const tr = tracks[i]
      const p = progress(tr, t)
      tr.update((tr.ease ?? linear)(p))
      if (reverse ? p <= 0 : p >= 1) done[i] = true
    }
    if (elapsed >= total) resolveFn(true)
    else raf = requestAnimationFrame(frame)
  }

  for (const tr of tracks) tr.update((tr.ease ?? linear)(reverse ? 1 : 0))
  raf = requestAnimationFrame(frame)

  return {
    finished,
    cancel: () => {
      cancelled = true
      cancelAnimationFrame(raf)
      resolveFn(false)
    },
  }
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
