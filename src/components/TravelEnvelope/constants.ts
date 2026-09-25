/**
 * Geometry for the travel envelope.
 *
 * All artwork is authored in one shared coordinate space (ENV.w × ENV.h) that
 * maps 1:1 onto the envelope box, so every layer (paper, print, flap, twine,
 * seal) stays registered no matter how the component is scaled.
 * Values were measured from the reference frames (envelope ≈ 2.2 : 1).
 */
export const ENV = {
  w: 2200,
  h: 1000,
} as const

export const ASPECT = ENV.w / ENV.h

/** Tip of the top flap, in envelope units. The flap hinges on the top edge. */
export const FLAP_TIP = { x: 1100, y: 560 } as const

/** Flap outline (top-left corner → tip → top-right corner). */
export const FLAP_POLY: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [FLAP_TIP.x, FLAP_TIP.y],
  [ENV.w, 0],
]

/** Wax seal: centre and visible wax diameter in envelope units. */
export const SEAL = { cx: 1094, cy: 520, d: 470 } as const

/** Postage stamps glued to the envelope back (top-left + size, envelope units). */
export const VILLAGE_STAMP = { x: 1690, y: 332, w: 430, h: 592 } as const
export const WAVE_STAMP = { x: 1450, y: 742, w: 158, h: 158 } as const

/** Resting pose of the envelope on the desk (matches the reference tilt). */
export const POSE = {
  rotateZ: -2.6, // deg, right side lifted as in the reference
} as const

/** Percent helpers for positioning HTML layers inside the envelope box. */
export const pctX = (x: number) => `${(x / ENV.w) * 100}%`
export const pctY = (y: number) => `${(y / ENV.h) * 100}%`

/* ------------------------------------------------------------------ wax seal local space */

/** The seal SVG is authored in a 240-unit box centred on the seal; the wax puddle is ≈192 units wide. */
export const SEAL_VIEW = 240
export const SEAL_PUDDLE = 192
/** envelope units per seal-SVG unit */
export const SEAL_K = (SEAL.d * (SEAL_VIEW / SEAL_PUDDLE)) / SEAL_VIEW

/** Converts an envelope-space point into the seal SVG's local space. */
export const toSeal = (x: number, y: number): [number, number] => [(x - SEAL.cx) / SEAL_K, (y - SEAL.cy) / SEAL_K]

/* ------------------------------------------------------------------ motion */

/** Named easing curves (cubic-bezier control points) — see PROGRESS.md §5. */
export const EASE = {
  /** crisp press-in, like a thumb meeting resistance */
  press: [0.3, 0, 0.2, 1],
  /** decisive release with no overshoot */
  out: [0.22, 1, 0.36, 1],
  /** material fracture: instant start, quick stop */
  snap: [0.1, 0.7, 0.2, 1],
  /** falling / sliding under gravity */
  gravity: [0.55, 0, 0.85, 0.4],
  /** symmetric, paper-like */
  inOut: [0.65, 0, 0.35, 1],
} as const

/**
 * Sequence A (click the seal) — step 2 portion, ms from pointer release.
 * Order is physical: the wax must crack and the twine must be off before the
 * flap can move.
 */
export const SEQ_SEAL = {
  minPress: 130, // a click shorter than this still gets a full press
  rebound: { at: 0, dur: 220 },
  crack: { at: 40, dur: 230 },
  microCracks: { at: 150, dur: 160 },
  chip: { at: 170, dur: 420 },
  pop: { at: 210, dur: 260 },
  slack: { at: 250, dur: 300 },
  retract: { at: 470, dur: 420 },
  flapLift: { at: 840, dur: 460 },
} as const

/** Flap angle (deg) the release leaves it at — the hand-off point into Step 3. */
export const FLAP_RELEASE_ANGLE = 3.5
