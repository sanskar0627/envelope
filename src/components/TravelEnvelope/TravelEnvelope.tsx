import '@fontsource/libre-caslon-text/400.css'
import '@fontsource/libre-caslon-text/700.css'
import '@fontsource/courier-prime/400.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import './TravelEnvelope.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import { AddressBlock, AirmailCancel, GreeceCancel, StampPaper, TempleCancel, VillageStampInk, WaveStampInk } from './art/PostalArt'
import { Ticket } from './art/Ticket'
import { Twine } from './art/Twine'
import { WaxSeal } from './art/WaxSeal'
import grainUrl from './textures/paper-grain.webp'
import { ENV, FLAP_POLY, FLAP_TIP, POSE, RIM, SEAL, SEAL_PUDDLE, SEAL_VIEW, OPEN_RECENTRE, SEQ_SEAL, SEQ_TEAR, TICKET, TICKET_INSIDE, TICKET_PEEK, VILLAGE_STAMP, WAVE_STAMP, pctX, pctY } from './constants'
import { BASE, buildFlapOpen, buildSealBreak, buildTear, buildTicketSlide, createRegistry } from './sequences'
import { play, wait, type Playback, type PlayOptions, type Track } from './timeline'

const VIEWBOX = `0 0 ${ENV.w} ${ENV.h}`
const flapPoints = FLAP_POLY.map(([x, y]) => `${x},${y}`).join(' ')

/** Everything outside the flap triangle — where body print may show. */
const BODY_PRINT_CLIP = `polygon(0 0, ${pctX(FLAP_TIP.x)} ${pctY(FLAP_TIP.y)}, 100% 0, 100% 100%, 0 100%)`

/**
 * Pocket mouth as an objectBoundingBox clip (0..1), so the pocket panels can be
 * cut responsively. A little jitter makes it read as a cut paper edge.
 */
const RIM_JAGGED = (() => {
  const pts: Array<[number, number]> = []
  for (let i = 0; i < RIM.length - 1; i++) {
    const [x0, y0] = RIM[i]
    const [x1, y1] = RIM[i + 1]
    const n = 10
    for (let k = 0; k < n; k++) {
      const t = k / n
      const j = Math.sin((i * n + k) * 12.9898) * 1.4 // deterministic wobble (units)
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + j])
    }
  }
  pts.push([RIM[RIM.length - 1][0], RIM[RIM.length - 1][1]])
  return pts
})()
const RIM_CLIP_D =
  'M0 1 ' + RIM_JAGGED.map(([x, y]) => `L${(x / ENV.w).toFixed(5)} ${(y / ENV.h).toFixed(5)}`).join(' ') + ' L1 1 Z'
const RIM_LINE = RIM_JAGGED.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** The ticket's box inside the envelope. */
const TICKET_BOX: CSSProperties = {
  left: pctX(TICKET_INSIDE.x),
  top: pctY(TICKET_INSIDE.y),
  width: pctX(TICKET.w),
  height: pctY(TICKET.h),
}

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
  open: 'Click the ticket',
}

/**
 * TravelEnvelope — a sealed vintage travel envelope that opens to reveal a
 * ticket. One physical object: every state is a transform of the same layers.
 */
export function TravelEnvelope() {
  const [phase, setPhase] = useState<Phase>('sealed')
  const [pressed, setPressed] = useState(false)

  /* ---- DOM registry: the timeline writes straight to these nodes ---- */
  const [{ nodes, register, snapshot, restore }] = useState(createRegistry)

  const playback = useRef<Playback | null>(null)
  const pressStart = useRef(0)
  /** the exact tracks each sequence ran with — Reseal plays them backwards */
  const ran = useRef<Partial<Record<'seal' | 'open' | 'slide' | 'tear', Track[]>>>({})
  const phaseRef = useRef<Phase>('sealed')
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  /** play + remember; honours reduced motion by compressing time */
  const run = useCallback(async (key: 'seal' | 'open' | 'slide' | 'tear', tracks: Track[], opts: PlayOptions = {}) => {
    if (!opts.reverse) ran.current[key] = tracks
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    playback.current = play(tracks, { ...opts, speed: (opts.speed ?? 1) * (reduced ? 3 : 1) })
    return playback.current.finished
  }, [])

  // the rest pose is recorded once, so a replay always lands pixel-identical
  useEffect(() => {
    snapshot()
    return () => playback.current?.cancel()
  }, [snapshot])

  /* ---- Sequence A · part 1: press → crack → release → twine off → flap lifts ---- */
  const breakSeal = useCallback(async () => {
    // a quick click still gets a full, readable press
    const remaining = SEQ_SEAL.minPress - (performance.now() - pressStart.current)
    if (remaining > 0) await wait(remaining)
    setPressed(false) // the wax rebounds (CSS) on the same beat the fracture starts
    setPhase('opening')
    if (!(await run('seal', buildSealBreak(nodes)))) return
    // … and without a pause the freed flap swings open on its fold
    if (!(await run('open', buildFlapOpen(nodes)))) return
    setPhase('open')
  }, [nodes, run])

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

  /* ---- Sequence B: click the ticket → it slides out, the envelope sinks away, the ticket comes to the hero pose ---- */
  const pullTicket = useCallback(async () => {
    const byKeyboard = document.activeElement === nodes.get('ticket')
    setPhase('sliding')
    if (!(await run('slide', buildTicketSlide(nodes)))) return
    // a breath in the hero pose, then the stub tears away
    await wait(SEQ_TEAR.breath)
    setPhase('tearing')
    if (!(await run('tear', buildTear(nodes)))) return
    setPhase('torn')
    if (byKeyboard) requestAnimationFrame(() => (nodes.get('reseal') as HTMLElement | undefined)?.focus())
  }, [nodes, run])

  /* ---- Sequence C: Reseal — everything runs backwards to the sealed envelope ---- */
  const reseal = useCallback(async () => {
    if (phaseRef.current !== 'torn') return
    const byKeyboard = document.activeElement === nodes.get('reseal')
    setPhase('resealing')
    const back: Array<['seal' | 'open' | 'slide' | 'tear', number]> = [
      ['tear', 1.8],
      ['slide', 1.5],
      ['open', 1.6],
      ['seal', 1.9],
    ]
    for (const [key, speed] of back) {
      const tracks = ran.current[key]
      if (tracks && !(await run(key, tracks, { reverse: true, speed }))) return
    }
    restore() // exact rest pose (clears every inline value the animation wrote)
    ran.current = {}
    setPressed(false)
    setPhase('sealed')
    if (byKeyboard) requestAnimationFrame(() => (nodes.get('sealButton') as HTMLElement | undefined)?.focus())
  }, [nodes, run, restore])

  /* ---- Resize: poses measured in px are re-fitted; animations re-fit when they finish ---- */
  useEffect(() => {
    let raf = 0
    const refit = () => {
      const ph = phaseRef.current
      const u = ((nodes.get('envelope') as HTMLElement | undefined)?.offsetWidth ?? ENV.w) / ENV.w
      const ticket = nodes.get('ticket') as HTMLElement | undefined
      if (ph === 'open' && ticket) ticket.style.transform = BASE.ticket(0, -TICKET_PEEK * u)
      if (ph === 'torn') {
        // put the scene back in its open pose, re-measure, and jump the slide to its end
        const scene = nodes.get('scene') as HTMLElement
        const env = nodes.get('envelope') as HTMLElement
        scene.style.transform = `translateY(${(OPEN_RECENTRE * ENV.h * u).toFixed(2)}px)`
        env.style.transform = `rotateZ(${POSE.rotateZ}deg)`
        if (ticket) ticket.style.transform = BASE.ticket(0, -TICKET_PEEK * u)
        const tracks = buildTicketSlide(nodes)
        tracks.forEach((t) => t.update((t.ease ?? ((x: number) => x))(1)))
        ran.current.slide = tracks
      }
    }
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(refit)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
    }
  }, [nodes])
  // a resize during an animation is caught up once it settles
  useEffect(() => {
    if (phase === 'open' || phase === 'torn') window.dispatchEvent(new Event('resize'))
  }, [phase])

  const onTicketClick = () => {
    if (phase === 'open') void pullTicket()
  }
  const onTicketKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (phase !== 'open' || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    void pullTicket()
  }

  const sceneStyle = {
    '--pose-rz': `${POSE.rotateZ}deg`,
  } as CSSProperties

  const hint = HINT[phase]

  return (
    <section ref={register('root')} className="te-stage" data-phase={phase} aria-label="Travel envelope from Santorini, Greece">
      {/* shared clip for the pocket mouth (objectBoundingBox = responsive) */}
      <svg className="te-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <clipPath id="te-pocket-clip" clipPathUnits="objectBoundingBox">
          <path d={RIM_CLIP_D} />
        </clipPath>
      </svg>
      <div ref={register('scene')} className="te-scene" style={sceneStyle}>
        <div ref={register('envelope')} className="te-envelope" data-phase={phase} data-press={pressed ? 'down' : 'up'}>
          {/* ---- shadows on the desk ---- */}
          <div className="te-shadow te-shadow--ambient" aria-hidden="true" />
          <div className="te-shadow te-shadow--contact" aria-hidden="true" />

          {/* ---- paper stack: edge thickness, then the envelope back ---- */}
          <div className="te-layer te-edge" aria-hidden="true" />

          {/* ---- inside: far wall, then the ticket, then the pocket panels in front ---- */}
          <div className="te-layer te-interior" aria-hidden="true">
            <div ref={register('interior.shade')} className="te-layer te-interior__shade" />
          </div>
          <div
            ref={register('ticket')}
            className="te-ticket"
            style={TICKET_BOX}
            role={phase === 'open' ? 'button' : undefined}
            tabIndex={phase === 'open' ? 0 : -1}
            aria-label={phase === 'open' ? 'Pull the ticket out of the envelope' : phase === 'torn' ? 'Boarding pass, Santorini to JTR, seat 17A, 12 June 2023' : undefined}
            aria-roledescription={phase === 'torn' ? 'ticket' : undefined}
            aria-hidden={phase === 'sealed' || phase === 'pressing' || phase === 'opening' ? true : undefined}
            onClick={onTicketClick}
            onKeyDown={onTicketKey}
          >
            <div ref={register('ticket.shadow')} className="te-ticket__shadow" />
            <div className="te-ticket__lift">
              <Ticket register={register} />
            </div>
          </div>
          <svg className="te-layer te-rim-ao" viewBox={VIEWBOX} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="te-rim-ao-blur" x="-5%" y="-20%" width="110%" height="140%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            {/* contact occlusion where the panels press on the ticket / far wall */}
            <polyline points={RIM_LINE} fill="none" stroke="#2c1a0c" strokeWidth={18} opacity={0.35} filter="url(#te-rim-ao-blur)" transform="translate(0 -4)" />
          </svg>

          {/* ---- the pocket panels (envelope back) ---- */}
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
            {/* faint waxy footprint left on the paper where the seal let go */}
            <div className="te-seal-residue" style={SEAL_BOX}>
              <WaxSeal part="body" layer="residue" register={register} />
            </div>
            {/* cut edge of the pocket mouth catching the light */}
            <svg className="te-layer" viewBox={VIEWBOX} preserveAspectRatio="none">
              <polyline points={RIM_LINE} fill="none" stroke="#fff6e4" strokeWidth={3} opacity={0.75} transform="translate(0 1.5)" />
              <polyline points={RIM_LINE} fill="none" stroke="#6b4a2c" strokeWidth={1.2} opacity={0.5} />
            </svg>
          </div>

          {/* ---- open flap's shadow on the desk (above the envelope) ---- */}
          <svg ref={register('flap.deskShadow')} className="te-flap-desk-shadow" viewBox="0 -620 2200 640" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="te-flap-desk-blur" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="16" />
              </filter>
            </defs>
            <polygon points={`0,0 ${FLAP_TIP.x},${-FLAP_TIP.y} ${ENV.w},0`} fill="#0c0603" filter="url(#te-flap-desk-blur)" transform="translate(26 22)" />
          </svg>

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
              <div ref={register('flap.outer.shade')} className="te-layer te-flap__shade te-flap__shade--outer" />
            </div>
            {/* inside of the flap: the back face, seen once it swings past vertical */}
            <div className="te-flap__face te-flap__face--inner">
              {/* un-mirror: the face is turned with rotateY so it lands tip-up when the flap flips over */}
              <div className="te-layer te-flap__inner-paper">
                <div ref={register('flap.inner.shade')} className="te-layer te-flap__shade te-flap__shade--inner" />
              </div>
            </div>
            {/*
              The seal cracks along the flap edge but, being bonded to the flap
              tip, lets go of the body paper and rides the flap open (hidden once
              the flap is past vertical). Both pieces live here, shadows first.
            */}
            <div className="te-seal-half te-seal-half--flap-shadow" style={SEAL_BOX}>
              <WaxSeal part="flap" layer="shadow" register={register} />
            </div>
            <div className="te-seal-half te-seal-half--body-shadow" style={SEAL_BOX}>
              <WaxSeal part="body" layer="shadow" register={register} />
            </div>
            <div ref={register('seal.body')} className="te-seal-half te-seal-half--body" style={SEAL_BOX}>
              <WaxSeal part="body" layer="wax" register={register} />
            </div>
            <div ref={register('seal.flap')} className="te-seal-half te-seal-half--flap" style={SEAL_BOX}>
              <WaxSeal part="flap" layer="wax" register={register} />
            </div>
          </div>

          {/* ---- twine, the flake of wax that stays behind, and the seal's hit area ---- */}
          <Twine register={register} />
          <div className="te-seal-half te-seal-half--chip" style={SEAL_BOX} aria-hidden="true">
            <WaxSeal part="body" layer="chip" register={register} />
          </div>
          <button
            ref={register('sealButton')}
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

        <p className="te-hint" data-visible={hint ? 'true' : 'false'} aria-hidden={hint ? undefined : true}>
          {hint ?? HINT.sealed}
        </p>
      </div>

      <button
        ref={register('reseal')}
        type="button"
        className="te-reseal"
        data-visible={phase === 'torn' ? 'true' : 'false'}
        disabled={phase !== 'torn'}
        aria-hidden={phase === 'torn' ? undefined : true}
        tabIndex={phase === 'torn' ? 0 : -1}
        onClick={() => void reseal()}
      >
        Reseal
      </button>
    </section>
  )
}

export default TravelEnvelope
