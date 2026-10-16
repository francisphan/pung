/**
 * Table sounds, synthesised on the fly with the Web Audio API so there is
 * nothing to download. Every sound is built from the same three parts a
 * real tile makes on felt: a sharp bone click, a short body ring and a dull
 * thud from the table.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let muted = false
let unlocked = false

function context(): AudioContext | null {
  if (muted) return null
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.55
      master.connect(ctx.destination)
      const seconds = 1
      noise = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

/** Call from a user gesture so browsers let the sound through. */
export function unlock(): void {
  unlocked = true
  const c = context()
  if (!c || !master) return
  // A silent tick inside the gesture is what iOS Safari needs.
  const g = c.createGain()
  g.gain.value = 0
  const o = c.createOscillator()
  o.connect(g).connect(master)
  o.start()
  o.stop(c.currentTime + 0.01)
}

export function setMuted(value: boolean): void {
  muted = value
  if (value && ctx && ctx.state === 'running') void ctx.suspend().catch(() => {})
  if (!value && unlocked) context()
}

export function isMuted(): boolean {
  return muted
}

function vary(amount = 0.08): number {
  return 1 + (Math.random() * 2 - 1) * amount
}

interface Clack {
  /** Seconds from now. */
  at?: number
  gain?: number
  pitch?: number
  /** -1 left to 1 right. */
  pan?: number
  /** How much table thud under the click. */
  thud?: number
}

function out(c: AudioContext, pan: number): AudioNode {
  if (!master) return c.destination
  if (typeof c.createStereoPanner !== 'function' || pan === 0) return master
  const p = c.createStereoPanner()
  p.pan.value = pan
  p.connect(master)
  return p
}

function clack(c: AudioContext, { at = 0, gain = 1, pitch = 1, pan = 0, thud = 1 }: Clack): void {
  if (!noise) return
  const t = c.currentTime + at
  const dest = out(c, pan)
  const p = pitch * vary()

  // Bone click: a burst of noise through a narrow band.
  const src = c.createBufferSource()
  src.buffer = noise
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 2800 * p
  band.Q.value = 1.4
  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(0.9 * gain, t + 0.002)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
  src.connect(band).connect(env).connect(dest)
  src.start(t, Math.random() * 0.5)
  src.stop(t + 0.08)

  // Body ring: a short pitched tick that falls as it dies.
  const ring = c.createOscillator()
  ring.type = 'triangle'
  ring.frequency.setValueAtTime(1500 * p, t)
  ring.frequency.exponentialRampToValueAtTime(950 * p, t + 0.04)
  const renv = c.createGain()
  renv.gain.setValueAtTime(0.0001, t)
  renv.gain.exponentialRampToValueAtTime(0.3 * gain, t + 0.002)
  renv.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  ring.connect(renv).connect(dest)
  ring.start(t)
  ring.stop(t + 0.06)

  // Felt thud.
  if (thud > 0) {
    const low = c.createOscillator()
    low.type = 'sine'
    low.frequency.setValueAtTime(170, t)
    low.frequency.exponentialRampToValueAtTime(90, t + 0.07)
    const lenv = c.createGain()
    lenv.gain.setValueAtTime(0.0001, t)
    lenv.gain.exponentialRampToValueAtTime(0.5 * gain * thud, t + 0.004)
    lenv.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    low.connect(lenv).connect(dest)
    low.start(t)
    low.stop(t + 0.1)
  }
}

/** A tile slid off the wall into the rack. */
function slide(c: AudioContext, at = 0): void {
  if (!noise) return
  const t = c.currentTime + at
  const src = c.createBufferSource()
  src.buffer = noise
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(500, t)
  lp.frequency.exponentialRampToValueAtTime(2200, t + 0.12)
  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(0.16, t + 0.03)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
  src.connect(lp).connect(env).connect(out(c, 0.15))
  src.start(t, Math.random() * 0.5)
  src.stop(t + 0.16)
  clack(c, { at: at + 0.12, gain: 0.3, pitch: 1.25, pan: 0.15, thud: 0.3 })
}

export type Cue = 'pick' | 'discard' | 'claim' | 'kong' | 'draw' | 'deal' | 'win' | 'exhausted' | 'flower'

/** Play one cue, `at` seconds from now. Silent when muted or before the first gesture. */
export function play(cue: Cue, at = 0): void {
  const c = context()
  if (!c) return
  switch (cue) {
    case 'pick':
      clack(c, { at, gain: 0.35, pitch: 1.35, thud: 0.2 })
      break
    case 'discard':
      clack(c, { at, gain: 1, pitch: 1 })
      break
    case 'flower':
      clack(c, { at, gain: 0.5, pitch: 1.2, thud: 0.5 })
      break
    case 'claim':
      clack(c, { at, gain: 0.9, pitch: 1.05, pan: -0.1 })
      clack(c, { at: at + 0.085, gain: 1, pitch: 0.92, pan: 0.1 })
      break
    case 'kong':
      clack(c, { at, gain: 0.8, pitch: 1.1, pan: -0.15 })
      clack(c, { at: at + 0.08, gain: 0.9, pitch: 1, pan: 0 })
      clack(c, { at: at + 0.165, gain: 1, pitch: 0.9, pan: 0.15 })
      break
    case 'draw':
      slide(c, at)
      break
    case 'deal': {
      // Washing the tiles: a clatter that thins out as the walls are built.
      const n = 26
      for (let i = 0; i < n; i++) {
        const frac = i / n
        const when = at + frac * frac * 1.1 + Math.random() * 0.03
        clack(c, { at: when, gain: 0.55 - frac * 0.3, pitch: 0.9 + Math.random() * 0.4, pan: Math.random() * 1.6 - 0.8, thud: 0.4 })
      }
      break
    }
    case 'win': {
      // Laying the hand down: a run of tiles that speeds up, then the last pair.
      let when = at
      for (let i = 0; i < 7; i++) {
        clack(c, { at: when, gain: 0.7 + i * 0.04, pitch: 1 + i * 0.03, pan: -0.5 + i * 0.16, thud: 0.6 })
        when += 0.13 - i * 0.012
      }
      clack(c, { at: when + 0.08, gain: 1, pitch: 0.95, pan: 0.2 })
      clack(c, { at: when + 0.16, gain: 1, pitch: 0.9, pan: 0.3 })
      break
    }
    case 'exhausted':
      clack(c, { at, gain: 0.5, pitch: 0.8, thud: 1.4 })
      break
  }
}
