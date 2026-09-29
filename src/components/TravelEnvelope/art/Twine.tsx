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
  ['M807 961 c-9 2 -14 -2 -22 -1 c-4 0 -7 2 -9 4', 'M829 991 c-9 1 -15 -2 -23 -2 c-4 0 -7 2 -9 3'],
  ['M806 963 c-4 6 -9 9 -13 16 c-2 3 -2 7 -5 9', 'M828 993 c-4 6 -9 8 -14 14 c-2 3 -3 6 -6 8'],
]

/** slightly fatter turns along each strand (dash pattern of the lump stroke) */
const LUMPS = ['0 38 9 61 6 90 11 47', '0 52 7 44 10 83 8 71', '0 27 10 70 7 58 9 96', '0 64 8 39 6 77 12 55']

/** Stray fibres standing off the ply — sampled along each taut strand (deterministic). */
const HAIRS = (() => {
  const r = rng(808)
  const out: string[] = []
  const cubic = (d: string) => d.match(/-?\d*\.?\d+/g)!.map(Number)
  for (const [taut] of [...STRANDS, TAIL]) {
    const n = cubic(taut)
    const seg = n.length === 8 ? [n] : [n.slice(0, 8), [n[6], n[7], ...n.slice(8, 14)], [n[12], n[13], ...n.slice(14, 20)]]
    for (const [x0, y0, x1, y1, x2, y2, x3, y3] of seg) {
      for (let k = 0; k < 34; k++) {
        const t = r()
        const mt = 1 - t
        const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3
        const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
        const side = r() < 0.5 ? -1 : 1
        const len = 3 + r() * 10 * (r() < 0.15 ? 1.8 : 1)
        const a = (r() - 0.5) * 1.4
        out.push(`M${x.toFixed(1)} ${y.toFixed(1)} q${(side * len * 0.6).toFixed(1)} ${(a * len * 0.4).toFixed(1)} ${(side * len).toFixed(1)} ${(a * len + (r() - 0.5) * 4).toFixed(1)}`)
      }
    }
  }
  return out.join(' ')
})()

type Role = 'strand' | 'tail'

function Ply({ d, width, paint, role, lumps }: { d: [string, string]; width: number; paint: string; role: Role; lumps?: string }) {
  const [taut, slack] = d
  return (
    <>
      <path d={taut} data-slack={slack} data-role={role} stroke="#2a1406" strokeWidth={width + 1.6} />
      {/* a hand-twisted cord is never even: slightly fatter turns here and there */}
      {lumps && <path d={taut} data-slack={slack} data-role={role} stroke="#2a1406" strokeWidth={width + 2.6} strokeDasharray={lumps} strokeLinecap="round" />}
      <path d={taut} data-slack={slack} data-role={role} stroke={paint} strokeWidth={width} />
      {/* round cross-section: core shadow on the far side, highlight on the side facing the key light */}
      <path d={taut} data-slack={slack} data-role={role} stroke="#1e0d04" strokeWidth={width * 0.3} opacity={0.42} transform={`translate(${width * 0.33} 0)`} />
      <path d={taut} data-slack={slack} data-role={role} stroke="#e0ac78" strokeWidth={width * 0.14} opacity={0.22} transform={`translate(${-width * 0.26} 0)`} />
    </>
  )
}

export function Twine({ register }: { register: Register }) {
  const uid = useId().replace(/:/g, '')
  const shadowId = `te-twine-shadow-${uid}`
  const twistId = `te-twine-twist-${uid}`
  const clipId = `te-twine-clip-${uid}`
  const contactId = `te-twine-contact-${uid}`
  const taperId = `te-twine-taper-${uid}`
  const paint = `url(#${twistId})`
  return (
    <svg ref={register('twine.svg')} className="te-layer te-twine" viewBox="0 0 2200 1000" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {/* diagonal ply stripes: stroked along a near-vertical strand they read as twist */}
        {/* ply twist: each turn of fibre is a rounded band with a dark groove between turns;
            stroked along a near-vertical strand the bands read as a lay of twisted fibre */}
        {/* two-ply twist: each turn is a rounded bundle of fibre (dark at its edges, lit along its
            crown) and the two plies alternate in tone; the lay runs diagonally across the cord */}
        <linearGradient id={`${twistId}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a1d0a" />
          <stop offset="0.35" stopColor="#9a6538" />
          <stop offset="0.55" stopColor="#b9834f" />
          <stop offset="1" stopColor="#4a260f" />
        </linearGradient>
        <linearGradient id={`${twistId}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#331906" />
          <stop offset="0.4" stopColor="#7e4d28" />
          <stop offset="0.6" stopColor="#976036" />
          <stop offset="1" stopColor="#3c1f0b" />
        </linearGradient>
        <pattern id={twistId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-34) scale(0.72)">
          <rect width="10" height="5.2" fill={`url(#${twistId}-a)`} />
          <rect y="5" width="10" height="5" fill={`url(#${twistId}-b)`} />
          {/* individual fibres riding each bundle */}
          <path d="M0 1.7 L10 2.3 M0 3.3 L10 3 M0 6.6 L10 7.1 M0 8.2 L10 7.9" stroke="#d6a676" strokeWidth="0.28" opacity="0.5" />
        </pattern>
        {/* the loose end tapers: the full-thickness cord fades out toward the tip, revealing a thinner core */}
        <linearGradient id={taperId} gradientUnits="userSpaceOnUse" x1="950" y1="770" x2="815" y2="955">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${taperId}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width="2200" height="1000">
          <rect x="0" y="0" width="2200" height="1000" fill={`url(#${taperId})`} />
        </mask>
        <filter id={contactId} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
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
              <path key={i} d={taut} data-slack={slack} data-role="strand" strokeWidth={9} />
            ))}
            <path d={TAIL[0]} data-slack={TAIL[1]} data-role="tail" strokeWidth={8.5} />
          </g>
          <g ref={register('twine.contact')} filter={`url(#${contactId})`} stroke="#1e0e04" opacity="0.5" transform="translate(1.6 2.4)">
            {STRANDS.map(([taut, slack], i) => (
              <path key={i} d={taut} data-slack={slack} data-role="strand" strokeWidth={7} />
            ))}
            <path d={TAIL[0]} data-slack={TAIL[1]} data-role="tail" strokeWidth={6.5} />
          </g>
          {STRANDS.map((d, i) => (
            <Ply key={i} d={d} width={7} paint={paint} role="strand" lumps={LUMPS[i]} />
          ))}
          {/* loose tail: thin core the whole way, full cord fading out toward the tip */}
          <Ply d={TAIL} width={3.6} paint={paint} role="tail" />
          <g mask={`url(#${taperId}-m)`}>
            <Ply d={TAIL} width={6} paint={paint} role="tail" />
          </g>
          {/* stray fibres catching the light */}
          <path ref={register('twine.hairs')} d={HAIRS} stroke="#a4744a" strokeWidth={0.7} opacity={0.5} />
          <g ref={register('twine.fray')}>
            {TAIL_FRAY.map(([taut, slack], i) => (
              <path key={i} d={taut} data-slack={slack} stroke={i % 2 ? '#7a4a26' : '#a8764a'} strokeWidth={i < 3 ? 1.5 : 0.9} opacity={0.85} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  )
}
