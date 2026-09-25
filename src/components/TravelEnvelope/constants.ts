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

/* ------------------------------------------------------------------ envelope interior */

/**
 * Mouth of the pocket: the top edge of the side/bottom panels, seen once the
 * flap is open. Everything above it shows the inside of the far wall (and the
 * ticket inside). Envelope units, left → right.
 */
export const RIM: ReadonlyArray<readonly [number, number]> = [
  [0, -3],
  [330, 136],
  [660, 262],
  [1100, 326],
  [1540, 262],
  [1870, 136],
  [2200, -3],
]

/* ------------------------------------------------------------------ ticket */

/**
 * The ticket is one sheet (main + stub joined by a perforation), in its own
 * units which are 1:1 with envelope units. See scripts/generate-textures.py.
 */
export const TICKET = {
  h: 880,
  main: 1505, // perforation x
  stub: 440,
  w: 1945,
  /** texture crops (the two pieces overlap by the ragged tear zone) */
  mainTexW: 1516.8,
  stubTexX: 1492,
  stubTexW: 452.8,
} as const

/** Where the ticket sits inside the envelope (top-left, envelope units). */
export const TICKET_INSIDE = { x: (ENV.w - TICKET.w) / 2, y: 100 } as const
/** How far it rises into view once the envelope is open. */
export const TICKET_PEEK = 42

/* ------------------------------------------------------------------ Sequence A · part 2 (opening) */

/** ms from the end of the seal break */
export const SEQ_OPEN = {
  flap: { at: 0, dur: 1150 },
  recentre: { at: 120, dur: 1150 },
  peek: { at: 980, dur: 620 },
} as const

/** How far the whole scene drifts down so the open flap stays in frame (fraction of envelope height). */
export const OPEN_RECENTRE = 0.27

/* ------------------------------------------------------------------ Sequence B (click the ticket) */

/** ms from the click */
export const SEQ_SLIDE = {
  grip: { at: 0, dur: 150 },
  slide: { at: 110, dur: 1050 },
  follow: { at: 110, dur: 1150 },
  sink: { at: 1080, dur: 900 },
  hero: { at: 1110, dur: 1100 },
} as const

/** The ticket slides this far up (envelope units, from its resting spot) — enough to clear the pocket mouth. */
export const SLIDE_OUT = 985
/** …drifting this far right as it goes (the stub leads, as in F2). */
export const SLIDE_DRIFT = 60
/** The camera follows the pull so the ticket barely rises on screen (fraction of envelope height). */
export const SLIDE_FOLLOW = 0.74
/** Hero pose: final screen rotation (deg, F3), width relative to the envelope, vertical position in the viewport. */
export const HERO = { rotate: 3.5, widthOfEnvelope: 1.08, maxWidthOfViewport: 0.9, maxHeightOfViewport: 0.62, centreY: 0.46 } as const

/* ------------------------------------------------------------------ Sequence B · part 2: the tear */

/** ms from the moment the ticket settles in the hero pose (after a short breath) */
export const SEQ_TEAR = {
  breath: 160,
  tension: { at: 0, dur: 300 },
  tear: { at: 230, dur: 520 },
  separate: { at: 720, dur: 820 },
} as const

/** Half-width of the torn-fibre overlays either side of the perforation (units) — matches generate-textures.py */
export const TEAR_STRIP = 20

/** Final separation (F3): stub moves right/down and turns back ~0.5° against the main ticket (units, deg). */
export const TORN = { mainShift: -14, stubShift: 30, stubDrop: 12, stubTurn: -0.5 } as const
