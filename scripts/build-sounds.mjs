/**
 * Synthesises the stings that go with the call bursts and writes them to
 * public/sounds as small MP3s. They are homages, not recordings: `shout` is
 * a slam with a synthetic shout in the manner of a courtroom "Objection!",
 * `shout-kong` slams twice, and `alert` is the rising two-note "!" of a
 * stealth game's alarm, with an echo. Everything is drawn from a sawtooth,
 * a pulse wave, sines and filtered noise, so the files can be rebuilt from
 * this script alone.
 *
 *   node scripts/build-sounds.mjs
 */
import { writeFileSync } from 'node:fs'
import { Mp3Encoder } from '@breezystack/lamejs'

const SR = 44100
const OUT = new URL('../public/sounds/', import.meta.url)
/** Peak level of the strikes already on the table, so the stings sit beside them. */
const PEAK_DB = -9

/** A fixed-seed noise source, so every build is the same file. */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const buffer = (seconds) => new Float32Array(Math.round(seconds * SR))
const decay = (t, tau) => Math.exp(-t / tau)

/** A band-pass biquad (RBJ cookbook), for formants and the whoosh. */
function bandpass(f, q) {
  const w0 = (2 * Math.PI * f) / SR
  const alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  const b0 = alpha / a0
  const b2 = -alpha / a0
  const a1 = (-2 * Math.cos(w0)) / a0
  const a2 = (1 - alpha) / a0
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  return (x) => {
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = x
    y2 = y1
    y1 = y
    return y
  }
}

/** One-pole low-pass. */
function lowpass(f) {
  const a = Math.exp((-2 * Math.PI * f) / SR)
  let y = 0
  return (x) => (y = (1 - a) * x + a * y)
}

const WAVES = {
  sine: (p) => Math.sin(p),
  tri: (p) => (2 / Math.PI) * Math.asin(Math.sin(p)),
  saw: (p) => 2 * ((p / (2 * Math.PI)) % 1) - 1,
  pulse: (p) => ((p / (2 * Math.PI)) % 1 < 0.3 ? 1 : -1),
}

/**
 * A tone whose pitch glides from f0 to f1 over `glide` seconds. Its loudness
 * holds for `hold` seconds, then decays with time constant `tau`. `shape`
 * may filter each sample, as the formants do for the shout.
 */
function tone(buf, { start = 0, dur, f0, f1 = f0, glide = dur, hold = 0, tau, amp, wave = 'sine', attack = 0.001, vibrato = 0, shape = (x) => x }) {
  const i0 = Math.round(start * SR)
  const n = Math.min(Math.round(dur * SR), buf.length - i0)
  const osc = WAVES[wave]
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const g = Math.min(1, t / glide)
    // An exponential glide sounds like a falling object; a linear one like a siren.
    let f = f0 * Math.pow(f1 / f0, g)
    if (vibrato) f *= 1 + vibrato * Math.sin(2 * Math.PI * 6 * t) * Math.min(1, Math.max(0, (t - 0.08) / 0.1))
    phase += (2 * Math.PI * f) / SR
    const env = Math.min(1, t / attack) * (t < hold ? 1 : decay(t - hold, tau))
    buf[i0 + i] += amp * env * shape(osc(phase))
  }
}

/** A burst of noise between two frequencies, decaying with time constant `tau`; `sweep` glides the band's centre up or down instead. */
function noise(buf, { start = 0, dur, tau, amp, hp, lp, seed = 1, attack = 0.001 }) {
  const r = rng(seed)
  const i0 = Math.round(start * SR)
  const n = Math.min(Math.round(dur * SR), buf.length - i0)
  const aLp = Math.exp((-2 * Math.PI * lp) / SR)
  const aHp = Math.exp((-2 * Math.PI * hp) / SR)
  let l1 = 0
  let l2 = 0
  let h1 = 0
  let h2 = 0
  let x1 = 0
  let y1 = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const w = r() * 2 - 1
    l1 = (1 - aLp) * w + aLp * l1
    l2 = (1 - aLp) * l1 + aLp * l2
    h1 = aHp * (h1 + l2 - x1)
    x1 = l2
    h2 = aHp * (h2 + h1 - y1)
    y1 = h1
    buf[i0 + i] += amp * Math.min(1, t / attack) * decay(t, tau) * h2
  }
}

/** A whoosh: noise through a band-pass whose centre rises over the burst. */
function whoosh(buf, { start = 0, dur, amp, f0, f1, seed = 2 }) {
  const r = rng(seed)
  const i0 = Math.round(start * SR)
  const n = Math.min(Math.round(dur * SR), buf.length - i0)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const g = t / dur
    // A fresh narrow band each few samples is cheap and good enough for a swoosh.
    if (i % 64 === 0) whoosh.filter = bandpass(f0 * Math.pow(f1 / f0, g), 2.5)
    const env = Math.sin(Math.PI * g) ** 2
    buf[i0 + i] += amp * env * whoosh.filter(r() * 2 - 1) * 4
  }
}

/** Soft clipping for a little punch, then a peak at `peakDb` and a short fade at the end. */
function finish(buf, drive, peakDb = PEAK_DB) {
  const k = Math.tanh(drive)
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive) / k
  let peak = 0
  for (const s of buf) peak = Math.max(peak, Math.abs(s))
  const gain = Math.pow(10, peakDb / 20) / peak
  const fade = Math.round(0.01 * SR)
  for (let i = 0; i < buf.length; i++) {
    const tail = buf.length - i
    buf[i] *= gain * (tail < fade ? tail / fade : 1)
  }
  return buf
}

/** The slam: a falling thump and a smack of noise. */
function slam(buf, { start = 0, size = 1, seed = 1 }) {
  tone(buf, { start, dur: 0.4, f0: 170 * size, f1: 45, glide: 0.1, tau: 0.09 * size, amp: 1 })
  noise(buf, { start, dur: 0.2, tau: 0.02, amp: 0.8, hp: 900, lp: 4000, seed })
}

/**
 * A shout with no words: a sawtooth voice gliding down through the formants
 * of an open "ah", driven hard. It barks rather than speaks.
 */
function shoutVoice(buf, { start = 0, dur = 0.32, amp = 0.9 }) {
  const formants = [
    [700, 8, 1],
    [1150, 10, 0.55],
    [2500, 12, 0.22],
  ].map(([f, q, g]) => ({ filter: bandpass(f, q), g }))
  const shape = (x) => {
    let y = 0
    for (const { filter, g } of formants) y += g * filter(x)
    return Math.tanh(y * 6)
  }
  tone(buf, { start, dur, f0: 230, f1: 150, glide: dur, hold: 0.1, tau: 0.07, amp, wave: 'saw', attack: 0.012, vibrato: 0.02, shape })
}

/** "Objection!": a quick whoosh, the slam, and the shout on top of it. */
function shout() {
  const buf = buffer(0.6)
  whoosh(buf, { start: 0, dur: 0.07, amp: 0.25, f0: 500, f1: 3000 })
  slam(buf, { start: 0.06 })
  shoutVoice(buf, { start: 0.06 })
  return finish(buf, 1.5)
}

/** For a kong: the slam lands twice, the second time harder, and the shout is longer. */
function shoutKong() {
  const buf = buffer(0.75)
  whoosh(buf, { start: 0, dur: 0.07, amp: 0.25, f0: 500, f1: 3000 })
  slam(buf, { start: 0.06, size: 0.8, seed: 3 })
  slam(buf, { start: 0.2, size: 1.3, seed: 4 })
  shoutVoice(buf, { start: 0.06, dur: 0.42, amp: 0.95 })
  return finish(buf, 1.6)
}

/**
 * The alert: a short low note and a higher held one, bright and electronic,
 * with a tap of noise at the front and two echoes trailing off.
 */
function alert() {
  const buf = buffer(1.1)
  // Pulse waves overshoot when encoded, so the alert is rolled off and set 1 dB lower; it lands at about -9 dBFS as an MP3.
  const lp = lowpass(3500)
  const shape = (x) => lp(x)
  const sting = (start, amp) => {
    tone(buf, { start, dur: 0.06, f0: 1046.5, hold: 0.05, tau: 0.01, amp: amp * 0.8, wave: 'pulse', shape })
    tone(buf, { start: start + 0.055, dur: 0.4, f0: 1568, hold: 0.08, tau: 0.12, amp, wave: 'pulse', shape })
    // An octave below each, quietly, so the sting has a body on small speakers.
    tone(buf, { start, dur: 0.06, f0: 523.25, hold: 0.05, tau: 0.01, amp: amp * 0.3 })
    tone(buf, { start: start + 0.055, dur: 0.4, f0: 784, hold: 0.08, tau: 0.12, amp: amp * 0.35 })
  }
  noise(buf, { dur: 0.05, tau: 0.008, amp: 0.5, hp: 2000, lp: 8000, seed: 9 })
  sting(0, 1)
  sting(0.24, 0.4)
  sting(0.48, 0.18)
  return finish(buf, 1.2, PEAK_DB - 1)
}

function writeMp3(name, samples) {
  const enc = new Mp3Encoder(1, SR, 96)
  const pcm = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)))
  const bytes = Buffer.concat([enc.encodeBuffer(pcm), enc.flush()].map((p) => Buffer.from(p)))
  writeFileSync(new URL(name, OUT), bytes)
  let peak = 0
  let sum = 0
  for (const s of samples) {
    peak = Math.max(peak, Math.abs(s))
    sum += s * s
  }
  const db = (x) => (20 * Math.log10(x)).toFixed(1)
  console.log(`${name}: ${(samples.length / SR).toFixed(2)} s, peak ${db(peak)} dBFS, rms ${db(Math.sqrt(sum / samples.length))} dBFS, ${bytes.length} bytes`)
}

writeMp3('shout.mp3', shout())
writeMp3('shout-kong.mp3', shoutKong())
writeMp3('alert.mp3', alert())
