import '@fontsource/libre-caslon-text/400.css'
import '@fontsource/libre-caslon-text/700.css'
import '@fontsource/courier-prime/400.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import './TravelEnvelope.css'

import type { CSSProperties } from 'react'
import { AddressBlock, AirmailCancel, GreeceCancel, StampPaper, TempleCancel, VillageStampInk, WaveStampInk } from './art/PostalArt'
import { Twine } from './art/Twine'
import { WaxSeal } from './art/WaxSeal'
import grainUrl from './textures/paper-grain.webp'
import { ENV, FLAP_POLY, FLAP_TIP, POSE, SEAL, VILLAGE_STAMP, WAVE_STAMP, pctX, pctY } from './constants'

/** The seal SVG viewBox (240) is larger than the wax puddle (≈192) to leave room for its shadow. */
const SEAL_SVG_RATIO = 240 / 192
const VIEWBOX = `0 0 ${ENV.w} ${ENV.h}`
const flapPoints = FLAP_POLY.map(([x, y]) => `${x},${y}`).join(' ')

/** Everything outside the flap triangle — where body print may show. */
const BODY_PRINT_CLIP = `polygon(0 0, ${pctX(FLAP_TIP.x)} ${pctY(FLAP_TIP.y)}, 100% 0, 100% 100%, 0 100%)`

/**
 * TravelEnvelope — a sealed vintage travel envelope that opens to reveal a
 * ticket. One physical object: every state is a transform of the same layers.
 */
export function TravelEnvelope() {
  const sceneStyle = {
    '--pose-rx': `${POSE.rotateX}deg`,
    '--pose-rz': `${POSE.rotateZ}deg`,
  } as CSSProperties

  const sealStyle: CSSProperties = {
    left: pctX(SEAL.cx),
    top: pctY(SEAL.cy),
    width: pctX(SEAL.d * SEAL_SVG_RATIO),
  }

  return (
    <section className="te-stage" aria-label="Sealed travel envelope from Santorini, Greece">
      <div className="te-scene" style={sceneStyle}>
        <div className="te-envelope" data-phase="sealed">
          {/* ---- shadows on the desk ---- */}
          <div className="te-shadow te-shadow--ambient" aria-hidden="true" />
          <div className="te-shadow te-shadow--contact" aria-hidden="true" />

          {/* ---- paper stack: edge thickness, then the envelope back ---- */}
          <div className="te-layer te-edge" aria-hidden="true" />
          <div className="te-layer te-body" aria-hidden="true">
            {/* stamps are separate pieces of paper glued on */}
            <svg className="te-layer te-applied" viewBox={VIEWBOX} preserveAspectRatio="none" style={{ clipPath: BODY_PRINT_CLIP }}>
              <defs>
                <pattern id="te-stamp-grain" width="240" height="240" patternUnits="userSpaceOnUse">
                  <image href={grainUrl} width="240" height="240" />
                </pattern>
              </defs>
              <g className="te-stamp-paper">
                <StampPaper id="te-perf-village" {...VILLAGE_STAMP} />
                <StampPaper id="te-perf-wave" {...WAVE_STAMP} hole={7} step={22} rotate={-3} />
              </g>
            </svg>
            <svg className="te-layer te-ink" viewBox={VIEWBOX} preserveAspectRatio="none" style={{ clipPath: BODY_PRINT_CLIP }}>
              <AddressBlock />
              <VillageStampInk />
              <WaveStampInk />
              <GreeceCancel x={1705} y={476} />
              {/* the airmail cancel was struck across the flap edge */}
              <AirmailCancel id="te-air-body" x={1894} y={176} />
            </svg>
            <div className="te-layer te-light" />
          </div>

          {/* ---- top flap (hinged on the top edge) ---- */}
          <svg className="te-layer te-flap-shadow" viewBox={VIEWBOX} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="te-flap-shadow-blur" x="-5%" y="-5%" width="110%" height="110%">
                <feGaussianBlur stdDeviation="7" />
              </filter>
            </defs>
            <polyline points={flapPoints} fill="none" stroke="#3b200c" strokeWidth={16} filter="url(#te-flap-shadow-blur)" transform="translate(3 9)" />
            <polyline points={flapPoints} fill="none" stroke="#4a2a12" strokeWidth={4} opacity={0.5} transform="translate(0 2.5)" />
          </svg>
          <div className="te-flap" aria-hidden="true">
            <div className="te-flap__face te-flap__face--outer">
              <svg className="te-layer te-ink" viewBox={VIEWBOX} preserveAspectRatio="none">
                <defs>
                  <clipPath id="te-clip-flap">
                    <polygon points={flapPoints} />
                  </clipPath>
                </defs>
                <g clipPath="url(#te-clip-flap)">
                  <TempleCancel id="te-temple" x={1531} y={190} />
                  <AirmailCancel id="te-air-flap" x={1894} y={176} />
                </g>
              </svg>
              <div className="te-layer te-light te-light--flap" />
            </div>
          </div>

          {/* ---- twine + wax seal ---- */}
          <Twine />
          <button type="button" className="te-seal" style={sealStyle} aria-label="Break the wax seal to open the envelope">
            <WaxSeal />
          </button>
        </div>
      </div>

      <p className="te-hint" aria-hidden="true">
        Click the seal
      </p>
    </section>
  )
}

export default TravelEnvelope
