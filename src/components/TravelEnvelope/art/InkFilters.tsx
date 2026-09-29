/**
 * How ink actually sits on paper, as SVG filters (static: rasterised once).
 *
 * - Rubber-stamp cancellations: the rubber never meets the paper evenly, so
 *   strokes wobble a little, pressure fades across the impression, and the
 *   paper's tooth leaves pin-holes where no ink landed. A touch of bleed where
 *   ink wicks into the fibres.
 * - Intaglio (engraved) stamp printing: crisp lines with a slight spread and
 *   very fine voids; pressure is almost even.
 * - Letterpress / typewriter: small wobble, fine tooth, mild fade.
 *
 * Each variant differs only in scales and seeds; `seed` makes impressions
 * individual so no two postmarks fade the same way.
 */

type InkProps = { id: string; seed: number; wobble: number; tooth: number; pressure: [number, number]; pressureFreq?: number; bleed?: number; skip?: number; toothAt?: number }

function InkFilter({ id, seed, wobble, tooth, pressure, pressureFreq = 0.006, bleed = 0.35, skip = 5.15, toothAt = 0.69 }: InkProps) {
  const [pa, pb] = pressure
  return (
    <filter id={id} x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
      {/* stroke wobble: the rubber / plate never meets the paper perfectly flat */}
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed={seed} result="warp" />
      <feDisplacementMap in="SourceGraphic" in2="warp" scale={wobble} xChannelSelector="R" yChannelSelector="G" result="wob" />
      {/* uneven pressure across the impression */}
      <feTurbulence type="fractalNoise" baseFrequency={pressureFreq} numOctaves="2" seed={seed + 7} result="press" />
      <feColorMatrix in="press" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${pa} 0 0 0 ${pb}`} result="pressA" />
      {/* paper tooth: pin-holes where the fibres stood proud of the ink */}
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed={seed + 13} result="grain" />
      <feColorMatrix in="grain" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${-tooth} 0 0 0 ${(tooth * toothAt).toFixed(3)}`} result="toothA" />
      {/* larger bald patches where the rubber skipped */}
      <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="2" seed={seed + 29} result="skip" />
      <feColorMatrix in="skip" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -7 0 0 0 ${skip}`} result="skipA" />
      <feComposite in="wob" in2="toothA" operator="in" result="t1" />
      <feComposite in="t1" in2="pressA" operator="in" result="t2" />
      <feComposite in="t2" in2="skipA" operator="in" result="t3" />
      {/* ink wicks a hair into the fibres */}
      <feGaussianBlur in="t3" stdDeviation={bleed} />
    </filter>
  )
}

/** All ink filters used on the envelope (place once inside an <svg><defs>). */
export function InkFilterDefs() {
  return (
    <>
      <InkFilter id="te-ink-temple" seed={3} wobble={3.2} tooth={10} pressure={[2.6, -0.12]} />
      <InkFilter id="te-ink-air" seed={17} wobble={3.6} tooth={9} pressure={[2.4, -0.16]} pressureFreq={0.008} />
      <InkFilter id="te-ink-greece" seed={41} wobble={3.8} tooth={9} pressure={[2.6, -0.28]} pressureFreq={0.009} skip={5.05} />
      <InkFilter id="te-ink-intaglio" seed={5} wobble={1.2} tooth={11} pressure={[1.6, 0.14]} pressureFreq={0.01} bleed={0.34} skip={5.5} toothAt={0.74} />
      <InkFilter id="te-ink-type" seed={61} wobble={0.8} tooth={6} toothAt={0.86} pressure={[1.9, 0.12]} pressureFreq={0.012} bleed={0.36} skip={5.8} />
    </>
  )
}
