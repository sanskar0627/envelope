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

/** Wax seal: centre and diameter in envelope units. */
export const SEAL = { cx: 1094, cy: 520, d: 470 } as const

/** Postage stamps glued to the envelope back (top-left + size, envelope units). */
export const VILLAGE_STAMP = { x: 1690, y: 332, w: 430, h: 592 } as const
export const WAVE_STAMP = { x: 1450, y: 742, w: 158, h: 158 } as const

/** Resting pose of the envelope on the desk (matches the reference tilt). */
export const POSE = {
  rotateX: 9, // deg, camera looks slightly down onto the desk
  rotateZ: -2.6, // deg, right side lifted as in the reference
} as const

/** Percent helpers for positioning HTML layers inside the envelope box. */
export const pctX = (x: number) => `${(x / ENV.w) * 100}%`
export const pctY = (y: number) => `${(y / ENV.h) * 100}%`
