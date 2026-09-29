/**
 * Geometry of the twine (envelope units): two twisted cords wrapped round the
 * envelope, close together at the top edge and splaying apart below the seal
 * (as in the photographed reference), plus the loose end that escapes from
 * under the wax and falls away to the lower left.
 *
 * Every path carries its taut shape and its slack shape (same command
 * structure) so the release can morph between them.
 */
import { SEAL, SEAL_K } from '../constants'

export type Pt = [number, number]

/** [taut, slack] centrelines of the two cords */
export const CORDS: Array<[string, string]> = [
  ['M1080 -16 C1075 290 1054 700 1034 1016', 'M1070 -6 C1030 300 1010 700 996 1024'],
  ['M1117 -16 C1121 290 1142 700 1160 1016', 'M1126 -6 C1170 300 1192 700 1196 1024'],
]

/** loose end: from under the wax, falling away to the lower left */
export const TAIL: [string, string] = [
  'M1030 640 C1022 700 990 760 948 806 C906 852 866 890 836 938',
  'M1026 648 C1012 718 976 780 934 826 C894 870 866 912 848 962',
]

export const CORD_W = 12.5
export const TAIL_W = 5.2

/** parse "M x y C ..." into cubic segments */
export function cubics(d: string): Array<[Pt, Pt, Pt, Pt]> {
  const n = d.match(/-?\d*\.?\d+/g)!.map(Number)
  const out: Array<[Pt, Pt, Pt, Pt]> = []
  let p0: Pt = [n[0], n[1]]
  for (let i = 2; i + 5 < n.length; i += 6) {
    const seg: [Pt, Pt, Pt, Pt] = [p0, [n[i], n[i + 1]], [n[i + 2], n[i + 3]], [n[i + 4], n[i + 5]]]
    out.push(seg)
    p0 = seg[3]
  }
  return out
}

function bez([p0, p1, p2, p3]: [Pt, Pt, Pt, Pt], t: number): Pt {
  const m = 1 - t
  return [
    m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
    m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
  ]
}

/** points evenly spaced by arc length along a path, with unit tangents */
export function samplePath(d: string, step: number): Array<{ p: Pt; t: Pt; s: number }> {
  const dense: Pt[] = []
  for (const seg of cubics(d)) for (let i = 0; i <= 200; i++) dense.push(bez(seg, i / 200))
  const out: Array<{ p: Pt; t: Pt; s: number }> = []
  let acc = 0
  let next = 0
  for (let i = 1; i < dense.length; i++) {
    const [ax, ay] = dense[i - 1]
    const [bx, by] = dense[i]
    const L = Math.hypot(bx - ax, by - ay)
    if (!L) continue
    while (next <= acc + L) {
      const k = (next - acc) / L
      out.push({ p: [ax + (bx - ax) * k, ay + (by - ay) * k], t: [(bx - ax) / L, (by - ay) / L], s: next })
      next += step
    }
    acc += L
  }
  return out
}

/** where a path crosses the rim of the wax (seal space), entering from `fromEnd` */
export function waxCrossing(d: string, rimR: number): Pt[] {
  const pts = samplePath(d, 2)
  const out: Pt[] = []
  let inside = Math.hypot(pts[0].p[0] - SEAL.cx, pts[0].p[1] - SEAL.cy) < rimR
  for (const { p } of pts) {
    const now = Math.hypot(p[0] - SEAL.cx, p[1] - SEAL.cy) < rimR
    if (now !== inside) out.push([(p[0] - SEAL.cx) / SEAL_K, (p[1] - SEAL.cy) / SEAL_K])
    inside = now
  }
  return out
}
