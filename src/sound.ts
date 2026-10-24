/**
 * Table sounds: short recordings of pieces set down on a wooden board, soft
 * and low, served from public/sounds and played through <audio> elements. Media elements keep playing on an
 * iPad whose ringer is muted, where synthesised Web Audio goes silent, and
 * they need nothing but one tap on the page before the first sound.
 */

export type Cue = 'pick' | 'discard' | 'claim' | 'kong' | 'draw' | 'deal' | 'win' | 'exhausted' | 'flower'

const BASE = `${import.meta.env.BASE_URL}sounds/`

/** Files per cue. Several takes of the clack so a run of discards does not repeat. */
export const TAKES: Record<Cue, string[]> = {
  pick: ['pick.mp3'],
  discard: ['discard-1.mp3', 'discard-2.mp3', 'discard-3.mp3', 'discard-4.mp3'],
  claim: ['claim.mp3'],
  kong: ['kong.mp3'],
  draw: ['draw.mp3'],
  deal: ['deal.mp3'],
  win: ['win.mp3'],
  exhausted: ['exhausted.mp3'],
  flower: ['flower.mp3'],
}

/** How many copies of a file may sound at once. */
const VOICES: Record<Cue, number> = { pick: 2, discard: 2, claim: 2, kong: 1, draw: 2, deal: 1, win: 1, exhausted: 1, flower: 2 }

/** Relative levels. iOS ignores element volume, so the files are also mastered to these levels. */
const VOLUME: Record<Cue, number> = { pick: 0.35, discard: 0.75, claim: 0.75, kong: 0.75, draw: 0.5, deal: 0.55, win: 0.7, exhausted: 0.6, flower: 0.5 }

const pools = new Map<string, HTMLAudioElement[]>()
const timers = new Set<ReturnType<typeof setTimeout>>()
const nextTake: Partial<Record<Cue, number>> = {}
let muted = false
let unlocked = false

function supported(): boolean {
  return typeof Audio !== 'undefined'
}

function pool(file: string, voices: number): HTMLAudioElement[] {
  let list = pools.get(file)
  if (!list) {
    list = []
    for (let i = 0; i < voices; i++) {
      const el = new Audio(BASE + file)
      el.preload = 'auto'
      list.push(el)
    }
    pools.set(file, list)
  }
  return list
}

function allElements(): HTMLAudioElement[] {
  const out: HTMLAudioElement[] = []
  for (const cue of Object.keys(TAKES) as Cue[]) for (const file of TAKES[cue]) out.push(...pool(file, VOICES[cue]))
  return out
}

/**
 * Call from a user gesture. Loading every element inside the gesture is what
 * lets a mobile browser play them later without another tap.
 */
export function unlock(): void {
  if (!supported()) return
  unlocked = true
  for (const el of allElements()) {
    try {
      el.load()
    } catch {
      /* ignore */
    }
  }
}

export function setMuted(value: boolean): void {
  muted = value
  if (value) {
    for (const t of timers) clearTimeout(t)
    timers.clear()
    for (const list of pools.values()) for (const el of list) if (!el.paused) el.pause()
  }
}

export function isMuted(): boolean {
  return muted
}

function fire(cue: Cue): void {
  const takes = TAKES[cue]
  const i = (nextTake[cue] ?? Math.floor(Math.random() * takes.length)) % takes.length
  nextTake[cue] = i + 1 + Math.floor(Math.random() * (takes.length - 1))
  const list = pool(takes[i], VOICES[cue])
  const el = list.find((e) => e.paused || e.ended) ?? list[0]
  try {
    el.volume = VOLUME[cue]
    if (el.readyState > 0) el.currentTime = 0
    void el.play().catch(() => {})
  } catch {
    /* a browser that refuses is a quiet table, not a broken one */
  }
}

/** Play one cue, `at` seconds from now. Silent when muted, unsupported, or before the first gesture. */
export function play(cue: Cue, at = 0): void {
  if (muted || !unlocked || !supported()) return
  if (at <= 0) return fire(cue)
  const t = setTimeout(() => {
    timers.delete(t)
    if (!muted) fire(cue)
  }, at * 1000)
  timers.add(t)
}
