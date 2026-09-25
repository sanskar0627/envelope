import '@fontsource/libre-caslon-text/400.css'
import '@fontsource/libre-caslon-text/700.css'
import '@fontsource/courier-prime/400.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import './TravelEnvelope.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import { AddressBlock, AirmailCancel, GreeceCancel, StampPaper, TempleCancel, VillageStampInk, WaveStampInk } from './art/PostalArt'
import { Twine } from './art/Twine'
import { WaxSeal } from './art/WaxSeal'
import grainUrl from './textures/paper-grain.webp'
import { ENV, FLAP_POLY, FLAP_TIP, POSE, SEAL, SEAL_PUDDLE, SEAL_VIEW, SEQ_SEAL, VILLAGE_STAMP, WAVE_STAMP, pctX, pctY } from './constants'
import { buildSealBreak, createRegistry } from './sequences'
import { play, wait, type Playback } from './timeline'

const VIEWBOX = `0 0 ${ENV.w} ${ENV.h}`
const flapPoints = FLAP_POLY.map(([x, y]) => `${x},${y}`).join(' ')

/** Everything outside the flap triangle — where body print may show. */
const BODY_PRINT_CLIP = `polygon(0 0, ${pctX(FLAP_TIP.x)} ${pctY(FLAP_TIP.y)}, 100% 0, 100% 100%, 0 100%)`

/** Both seal pieces and the hit area share one placement. */
const SEAL_BOX: CSSProperties = {
  left: pctX(SEAL.cx),
  top: pctY(SEAL.cy),
  width: pctX(SEAL.d * (SEAL_VIEW / SEAL_PUDDLE)),
}

/**
 * Interaction phases (PROGRESS.md §5). Only `sealed`, `open` and `torn`
 * accept input; everything else is an animation in flight.
 */
export type Phase = 'sealed' | 'pressing' | 'opening' | 'open' | 'sliding' | 'tearing' | 'torn' | 'resealing'

const HINT: Partial<Record<Phase, string>> = {
  sealed: 'Click the seal',
  pressing: 'Click the seal',
}

/**
 * TravelEnvelope — a sealed vintage travel envelope that opens to reveal a
 * ticket. One physical object: every state is a transform of the same layers.
 */
export function TravelEnvelope() {
  const [phase, setPhase] = useState<Phase>('sealed')
  const [pressed, setPressed] = useState(false)

  /* ---- DOM registry: the timeline writes straight to these nodes ---- */
  const [{ nodes, register }] = useState(createRegistry)

  const playback = useRef<Playback | null>(null)
  const pressStart = useRef(0)
  useEffect(() => () => playback.current?.cancel(), [])

  /* ---- Sequence A · part 1: press → crack → release → twine off → flap lifts ---- */
  const breakSeal = useCallback(async () => {
    // a quick click still gets a full, readable press
    const remaining = SEQ_SEAL.minPress - (performance.now() - pressStart.current)
    if (remaining > 0) await wait(remaining)
    setPressed(false) // the wax rebounds (CSS) on the same beat the fracture starts
    setPhase('opening')
    playback.current = play(buildSealBreak(nodes))
    await playback.current.finished
    // Step 3 continues from here: the flap rotates open on its hinge.
  }, [nodes])

  const startPress = () => {
    pressStart.current = performance.now()
    setPressed(true)
    setPhase('pressing')
  }
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (phase === 'sealed' && e.button === 0) startPress()
  }
  const onPointerUp = () => {
    if (phase === 'pressing') void breakSeal()
  }
  const cancelPress = () => {
    // sliding off the seal before letting go cancels, like lifting a thumb
    if (phase !== 'pressing') return
    setPressed(false)
    setPhase('sealed')
  }
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // keyboard activation (Enter / Space) arrives as a click with detail 0
    if (e.detail !== 0 || phase !== 'sealed') return
    startPress()
    void breakSeal()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ') e.preventDefault()
  }

  const sceneStyle = {
    '--pose-rz': `${POSE.rotateZ}deg`,
  } as CSSProperties

  const hint = HINT[phase]

  return (
    <section className="te-stage" aria-label="Travel envelope from Santorini, Greece">
      <div className="te-scene" style={sceneStyle}>
        <div className="te-envelope" data-phase={phase} data-press={pressed ? 'down' : 'up'}>
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
          <svg ref={register('flap.shadow')} className="te-layer te-flap-shadow" viewBox={VIEWBOX} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="te-flap-shadow-blur" x="-5%" y="-5%" width="110%" height="110%">
                <feGaussianBlur stdDeviation="7" />
              </filter>
            </defs>
            <polyline ref={register('flap.shadow.soft')} points={flapPoints} fill="none" stroke="#3b200c" strokeWidth={16} filter="url(#te-flap-shadow-blur)" transform="translate(3 9)" />
            <polyline ref={register('flap.shadow.edge')} points={flapPoints} fill="none" stroke="#4a2a12" strokeWidth={4} opacity={0.5} transform="translate(0 2.5)" />
          </svg>
          <div ref={register('flap')} className="te-flap" aria-hidden="true">
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
            {/* upper piece of the seal: bonded to the flap, rides it open */}
            <div className="te-seal-half te-seal-half--flap-shadow" style={SEAL_BOX}>
              <WaxSeal part="flap" layer="shadow" register={register} />
            </div>
            <div ref={register('seal.flap')} className="te-seal-half te-seal-half--flap" style={SEAL_BOX}>
              <WaxSeal part="flap" layer="wax" register={register} />
            </div>
          </div>

          {/* ---- twine, lower piece of the seal, and the seal's hit area ---- */}
          <Twine register={register} />
          <div className="te-seal-half te-seal-half--body-shadow" style={SEAL_BOX} aria-hidden="true">
            <WaxSeal part="body" layer="shadow" register={register} />
          </div>
          <div ref={register('seal.body')} className="te-seal-half te-seal-half--body" style={SEAL_BOX} aria-hidden="true">
            <WaxSeal part="body" layer="wax" register={register} />
          </div>
          <button
            type="button"
            className="te-seal"
            style={SEAL_BOX}
            aria-label="Break the wax seal to open the envelope"
            disabled={phase !== 'sealed' && phase !== 'pressing'}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onClick={onClick}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>

      <p className="te-hint" data-visible={hint ? 'true' : 'false'} aria-hidden={hint ? undefined : true}>
        {hint ?? HINT.sealed}
      </p>
    </section>
  )
}

export default TravelEnvelope
