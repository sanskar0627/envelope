/**
 * Natural-fibre twine wrapped around the envelope, drawn in envelope units.
 * Each strand is two plied threads: a dark core, a lighter body and a short
 * dash pattern that reads as the twist of the ply. A soft offset shadow gives
 * it contact with the paper.
 */
import { useId } from 'react'

type Strand = string

// two strands forming a slight V, crossing under the seal (see reference)
const STRANDS: Strand[] = [
  'M1092 -14 C1078 300 1054 640 1000 1014',
  'M1104 -14 C1092 300 1070 640 1014 1014',
  'M1130 -14 C1130 300 1134 640 1142 1014',
  'M1142 -14 C1144 320 1148 660 1156 1014',
]

// loose tail escaping from under the seal
const TAIL = 'M1034 668 C1006 720 978 742 930 790 C886 834 860 880 842 918 C834 936 822 952 806 962'
const TAIL_FRAY = [
  'M806 962 c-8 5 -16 7 -26 6',
  'M806 962 c-6 8 -11 15 -20 20',
  'M806 962 c-2 9 -2 16 -8 24',
]

function Ply({ d, width, paint }: { d: string; width: number; paint: string }) {
  return (
    <>
      <path d={d} stroke="#3f220e" strokeWidth={width + 2.4} />
      <path d={d} stroke={paint} strokeWidth={width} />
      {/* rounded highlight on the side facing the key light */}
      <path d={d} stroke="#e2b27f" strokeWidth={width * 0.22} opacity={0.35} transform={`translate(${-width * 0.22} 0)`} />
    </>
  )
}

export function Twine() {
  const uid = useId().replace(/:/g, '')
  const shadowId = `te-twine-shadow-${uid}`
  const twistId = `te-twine-twist-${uid}`
  const paint = `url(#${twistId})`
  return (
    <svg className="te-layer te-twine" viewBox="0 0 2200 1000" preserveAspectRatio="none" aria-hidden="true">
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
      </defs>
      <g fill="none" strokeLinecap="round">
        <g filter={`url(#${shadowId})`} stroke="#2a1405" opacity="0.42" transform="translate(5 7)">
          {STRANDS.map((d, i) => (
            <path key={i} d={d} strokeWidth={12} />
          ))}
          <path d={TAIL} strokeWidth={11} />
        </g>
        {STRANDS.map((d, i) => (
          <Ply key={i} d={d} width={10.5} paint={paint} />
        ))}
        <Ply d={TAIL} width={9.5} paint={paint} />
        {TAIL_FRAY.map((d, i) => (
          <path key={i} d={d} stroke="#9c6a44" strokeWidth={2.6} opacity={0.85} />
        ))}
      </g>
    </svg>
  )
}
