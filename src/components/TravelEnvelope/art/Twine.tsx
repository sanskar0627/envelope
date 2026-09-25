/**
 * Natural-fibre twine wrapped around the envelope, drawn in envelope units.
 * Each strand is two plied threads (a diagonal ply pattern stroked along the
 * strand reads as twist) with a highlight on the lit side and a soft offset
 * shadow for contact with the paper.
 *
 * Every twine path carries its taut shape (`d`) and its slack shape
 * (`data-slack`, same command structure) so the release can morph between
 * them. The whole twine is clipped to just beyond the envelope edges: sliding
 * When the seal breaks, the twine's ends (held in the wax) are freed and the
 * tied tension recoils: each strand zips back from the seal to the envelope
 * edges and around to the underside. `data-role` tells the choreography how
 * each path retracts.
 */
import { useId } from 'react'
import { rng } from './geometry'

type Register = (name: string) => (el: Element | null) => void

/** [taut, slack] — slack bows outward and droops as tension goes */
const STRANDS: Array<[string, string]> = [
  ['M1092 -14 C1078 300 1054 640 1000 1014', 'M1080 -4 C1034 300 1012 662 980 1022'],
  ['M1104 -14 C1092 300 1070 640 1014 1014', 'M1098 -2 C1054 322 1040 684 1002 1024'],
  ['M1130 -14 C1130 300 1134 640 1142 1014', 'M1138 -4 C1174 302 1188 662 1168 1022'],
  ['M1142 -14 C1144 320 1148 660 1156 1014', 'M1150 -2 C1198 332 1210 684 1184 1024'],
]

// loose tail escaping from under the seal
const TAIL: [string, string] = [
  'M1034 668 C1006 720 978 742 930 790 C886 834 860 880 842 918 C834 936 822 952 806 962',
  'M1030 676 C1000 738 968 772 922 822 C882 866 866 912 858 946 C852 964 842 980 828 992',
]
const TAIL_FRAY: Array<[string, string]> = [
  ['M806 962 c-8 5 -16 7 -26 6', 'M828 992 c-9 3 -18 3 -27 -1'],
  ['M806 962 c-6 8 -11 15 -20 20', 'M828 992 c-7 7 -13 13 -23 16'],
  ['M806 962 c-2 9 -2 16 -8 24', 'M828 992 c-3 8 -4 15 -11 22'],
]

/** Stray fibres standing off the ply — sampled along each taut strand (deterministic). */
const HAIRS = (() => {
  const r = rng(808)
  const out: string[] = []
  const cubic = (d: string) => d.match(/-?\d*\.?\d+/g)!.map(Number)
  for (const [taut] of [...STRANDS, TAIL]) {
    const n = cubic(taut)
    const seg = n.length === 8 ? [n] : [n.slice(0, 8), [n[6], n[7], ...n.slice(8, 14)], [n[12], n[13], ...n.slice(14, 20)]]
    for (const [x0, y0, x1, y1, x2, y2, x3, y3] of seg) {
      for (let k = 0; k < 16; k++) {
        const t = r()
        const mt = 1 - t
        const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3
        const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
        const side = r() < 0.5 ? -1 : 1
        const len = 4 + r() * 9
        const a = (r() - 0.5) * 1.4
        out.push(`M${x.toFixed(1)} ${y.toFixed(1)} q${(side * len * 0.6).toFixed(1)} ${(a * len * 0.4).toFixed(1)} ${(side * len).toFixed(1)} ${(a * len + (r() - 0.5) * 4).toFixed(1)}`)
      }
    }
  }
  return out.join(' ')
})()

type Role = 'strand' | 'tail'

function Ply({ d, width, paint, role }: { d: [string, string]; width: number; paint: string; role: Role }) {
  const [taut, slack] = d
  return (
    <>
      <path d={taut} data-slack={slack} data-role={role} stroke="#3f220e" strokeWidth={width + 2.4} />
      <path d={taut} data-slack={slack} data-role={role} stroke={paint} strokeWidth={width} />
      {/* rounded highlight on the side facing the key light */}
      <path d={taut} data-slack={slack} data-role={role} stroke="#e2b27f" strokeWidth={width * 0.22} opacity={0.35} transform={`translate(${-width * 0.22} 0)`} />
    </>
  )
}

export function Twine({ register }: { register: Register }) {
  const uid = useId().replace(/:/g, '')
  const shadowId = `te-twine-shadow-${uid}`
  const twistId = `te-twine-twist-${uid}`
  const clipId = `te-twine-clip-${uid}`
  const paint = `url(#${twistId})`
  return (
    <svg ref={register('twine.svg')} className="te-layer te-twine" viewBox="0 0 2200 1000" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {/* diagonal ply stripes: stroked along a near-vertical strand they read as twist */}
        <pattern id={twistId} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <rect width="12" height="12" fill="#8c5a33" />
          <rect y="0" width="12" height="4.6" fill="#b98355" />
          <rect y="4.6" width="12" height="1.2" fill="#d8a978" opacity="0.7" />
          <rect y="10.6" width="12" height="1.4" fill="#4d2a12" opacity="0.8" />
        </pattern>
        <filter id={shadowId} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        {/* the twine wraps just over the top and bottom edges, then goes around the back */}
        <clipPath id={clipId}>
          <rect x={-40} y={-20} width={2280} height={1040} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round">
        <g>
          <g ref={register('twine.shadow')} filter={`url(#${shadowId})`} stroke="#2a1405" opacity="0.42" transform="translate(5 7)">
            {STRANDS.map(([taut, slack], i) => (
              <path key={i} d={taut} data-slack={slack} data-role="strand" strokeWidth={12} />
            ))}
            <path d={TAIL[0]} data-slack={TAIL[1]} data-role="tail" strokeWidth={11} />
          </g>
          {STRANDS.map((d, i) => (
            <Ply key={i} d={d} width={10.5} paint={paint} role="strand" />
          ))}
          <Ply d={TAIL} width={9.5} paint={paint} role="tail" />
          {/* stray fibres catching the light */}
          <path ref={register('twine.hairs')} d={HAIRS} stroke="#d2a577" strokeWidth={1.1} opacity={0.55} />
          <g ref={register('twine.fray')}>
            {TAIL_FRAY.map(([taut, slack], i) => (
              <path key={i} d={taut} data-slack={slack} stroke="#9c6a44" strokeWidth={2.6} opacity={0.85} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  )
}
