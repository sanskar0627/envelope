/**
 * Wax seal rendered from a grayscale height map.
 *
 * The group inside #te-wax is drawn as *height* (white = high). The filter
 * turns it into lit wax: diffuse shading + a tight specular for the glossy
 * sheen, plus micro-noise for surface imperfections. Because the relief is
 * real lighting (not painted gradients) the ring, the recessed stamp face and
 * the embossed plane all catch light consistently from the top-left key.
 */
import { useId } from 'react'
import { blobPath } from './geometry'

const PUDDLE = blobPath(96, 7, 0.075, 44)
const PUDDLE_INNER = blobPath(84, 11, 0.06, 36)

/** Top-down propeller plane — the seal's emblem. */
const EMBLEM =
  'M0 -34 C4 -34 5.5 -28 5.5 -20 L5.5 -8 L34 -2 C36 -1.5 36 3 34 3.5 L5.5 6 L4.5 22 L15 27 C16 27.5 16 30 15 30.5 L0 29 L-15 30.5 C-16 30 -16 27.5 -15 27 L-4.5 22 L-5.5 6 L-34 3.5 C-36 3 -36 -1.5 -34 -2 L-5.5 -8 L-5.5 -20 C-5.5 -28 -4 -34 0 -34 Z'

export function WaxSeal() {
  const uid = useId().replace(/:/g, '')
  const wax = `te-wax-${uid}`
  const shadow = `te-wax-shadow-${uid}`
  return (
    <svg className="te-seal__svg" viewBox="-120 -120 240 240" aria-hidden="true" focusable="false">
      <defs>
        <filter id={shadow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={wax} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          {/* height field: relief (softened) × dome falloff at the puddle edge */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="relief" />
          <feColorMatrix in="relief" type="luminanceToAlpha" result="reliefA" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="dome" />
          <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed="4" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0" result="grainA" />
          <feComposite in="reliefA" in2="dome" operator="arithmetic" k1="1.0" k2="0" k3="0" k4="0" result="h0" />
          <feComposite in="h0" in2="grainA" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="height" />

          <feDiffuseLighting in="height" surfaceScale="11" diffuseConstant="1.12" lightingColor="#fff0ea" result="diffuse">
            <feDistantLight azimuth="235" elevation="52" />
          </feDiffuseLighting>
          <feSpecularLighting in="height" surfaceScale="11" specularConstant="1.35" specularExponent="42" lightingColor="#fff1e6" result="spec">
            <feDistantLight azimuth="235" elevation="50" />
          </feSpecularLighting>
          <feSpecularLighting in="height" surfaceScale="11" specularConstant="0.35" specularExponent="6" lightingColor="#ff7a66" result="sheen">
            <feDistantLight azimuth="235" elevation="42" />
          </feSpecularLighting>

          {/* wax body colour: deep oxblood, lifted slightly where the wax is thick */}
          <feFlood floodColor="#8e1510" result="base" />
          <feComposite in="base" in2="SourceAlpha" operator="in" result="baseIn" />
          <feComposite in="baseIn" in2="diffuse" operator="arithmetic" k1="1.02" k2="0" k3="0" k4="0" result="lit" />
          <feComposite in="sheen" in2="SourceAlpha" operator="in" result="sheenIn" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="lit" in2="sheenIn" operator="arithmetic" k1="0" k2="1" k3="0.28" k4="0" result="lit2" />
          <feComposite in="lit2" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.62" k4="0" result="glossy" />
          <feComposite in="glossy" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>

      {/* contact + cast shadow on the paper */}
      <g filter={`url(#${shadow})`}>
        <path d={PUDDLE} transform="translate(5 9) scale(1.01)" fill="#2a0c05" opacity="0.5" />
      </g>
      <path d={PUDDLE} transform="translate(1.4 2.4)" fill="#3a0f08" opacity="0.55" />

      {/* height map → lit wax */}
      <g filter={`url(#${wax})`}>
        <path d={PUDDLE} fill="#8a8a8a" />
        <path d={PUDDLE_INNER} fill="#9a9a9a" />
        {/* raised lip thrown up around the stamp */}
        <circle r={68} fill="none" stroke="#c4c4c4" strokeWidth={12} />
        {/* pressed, slightly concave stamp face */}
        <circle r={61} fill="#7d7d7d" />
        <circle r={52} fill="#777" />
        {/* fine engraved border of the die */}
        <circle r={56} fill="none" stroke="#9a9a9a" strokeWidth={2.2} />
        {/* embossed emblem */}
        <path d={EMBLEM} fill="#b4b4b4" transform="rotate(-18) scale(1.08)" />
        <circle r={4.5} cy={-8} fill="#c6c6c6" transform="rotate(-18)" />
      </g>
    </svg>
  )
}
