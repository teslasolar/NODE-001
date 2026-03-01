/**
 * AudioFabric Voice Engine
 *
 * Captures microphone input via Web Audio API, runs real-time
 * analysis (energy, F0 pitch detection, vowel/phoneme classification),
 * and feeds results into KI.voice for visualization consumption.
 *
 * Based on ASS-OS Vagal Phoneme Reference v1.0
 */

import { KI } from './core.js';

// ── Config ──────────────────────────────────────────────────────────
const FFT_SIZE = 2048;
const SMOOTHING = 0.82;
const ENERGY_SMOOTHING = 0.12;
const F0_MIN = 60;
const F0_MAX = 500;
const SILENCE_THRESHOLD = 0.008;
const SUSTAIN_DECAY = 0.6; // seconds before sustain resets after silence

// ── Vowel formant windows (Hz) — simplified two-formant model ─────
// Each vowel has [F1_low, F1_high, F2_low, F2_high]
const VOWEL_FORMANTS = {
  ah: [600, 900, 1000, 1400],   // /ɑː/  open back
  oh: [400, 600, 700, 1100],    // /oʊ/  mid back rounded
  ee: [250, 400, 2000, 2800],   // /iː/  close front
  eh: [500, 700, 1600, 2100],   // /ɛ/   mid front
  oo: [280, 400, 700, 1100],    // /uː/  close back rounded
  mm: [200, 400, 800, 1400],    // /m/   nasal (low energy, low formants)
};

// ── State ───────────────────────────────────────────────────────────
let analyser = null;
let timeData = null;
let freqData = null;
let sampleRate = 44100;
let prevVowel = null;
let sustainTimer = 0;
let silenceTimer = 0;

/**
 * Initialize microphone capture and audio analysis.
 * Returns a promise that resolves when mic access is granted.
 */
export async function init() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
  });

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  sampleRate = ctx.sampleRate;

  const source = ctx.createMediaStreamSource(stream);
  analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = SMOOTHING;
  source.connect(analyser);

  timeData = new Float32Array(analyser.fftSize);
  freqData = new Float32Array(analyser.frequencyBinCount);

  // Expose on KI for direct access by visualizers
  KI.audioCtx = ctx;
  KI.analyser = analyser;
  KI.stream = stream;

  // Register update tick
  KI.onUpdate(tick);
}

/**
 * Per-frame analysis tick.
 */
function tick(dt) {
  if (!analyser) return;

  analyser.getFloatTimeDomainData(timeData);
  analyser.getFloatFrequencyData(freqData);

  // ── Energy (RMS) ────────────────────────────────────────────────
  let sum = 0;
  for (let i = 0; i < timeData.length; i++) sum += timeData[i] * timeData[i];
  const rms = Math.sqrt(sum / timeData.length);
  KI.voice.energy += (rms - KI.voice.energy) * ENERGY_SMOOTHING;

  const sounding = KI.voice.energy > SILENCE_THRESHOLD;
  KI.voice.sounding = sounding;

  // ── F0 Pitch Detection (autocorrelation) ────────────────────────
  if (sounding) {
    KI.voice.f0 = detectF0(timeData, sampleRate);
  } else {
    KI.voice.f0 *= 0.9; // decay
  }

  // ── Vowel Classification ────────────────────────────────────────
  if (sounding && KI.voice.energy > SILENCE_THRESHOLD * 2) {
    const vowel = classifyVowel(freqData, sampleRate);
    if (vowel) {
      if (vowel === prevVowel) {
        sustainTimer += dt;
      } else {
        sustainTimer = 0;
        prevVowel = vowel;
      }
      KI.voice.vowel = vowel;
      KI.voice.sustain = sustainTimer;
      silenceTimer = 0;
    }
  } else {
    silenceTimer += dt;
    if (silenceTimer > SUSTAIN_DECAY) {
      sustainTimer *= 0.95;
      KI.voice.sustain = sustainTimer;
      if (sustainTimer < 0.05) {
        KI.voice.vowel = null;
        prevVowel = null;
        sustainTimer = 0;
      }
    }
  }
}

/**
 * Autocorrelation-based F0 pitch detector.
 */
function detectF0(buffer, sr) {
  const minLag = Math.floor(sr / F0_MAX);
  const maxLag = Math.floor(sr / F0_MIN);
  let bestCorr = 0;
  let bestLag = 0;

  for (let lag = minLag; lag <= maxLag && lag < buffer.length; lag++) {
    let corr = 0;
    for (let i = 0; i < buffer.length - lag; i++) {
      corr += buffer[i] * buffer[i + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  return bestLag > 0 ? sr / bestLag : 0;
}

/**
 * Two-formant vowel classifier.
 * Finds peak frequencies in F1 (200-1000Hz) and F2 (800-3000Hz) bands,
 * then matches against known vowel formant windows.
 */
function classifyVowel(freqBins, sr) {
  const binHz = sr / (freqBins.length * 2);

  // Find peak in F1 band (200-1000 Hz)
  const f1Low = Math.floor(200 / binHz);
  const f1High = Math.ceil(1000 / binHz);
  let f1Peak = 0, f1Freq = 0;
  for (let i = f1Low; i <= f1High && i < freqBins.length; i++) {
    const mag = freqBins[i];
    if (mag > f1Peak) { f1Peak = mag; f1Freq = i * binHz; }
  }

  // Find peak in F2 band (800-3000 Hz)
  const f2Low = Math.floor(800 / binHz);
  const f2High = Math.ceil(3000 / binHz);
  let f2Peak = 0, f2Freq = 0;
  for (let i = f2Low; i <= f2High && i < freqBins.length; i++) {
    const mag = freqBins[i];
    if (mag > f2Peak) { f2Peak = mag; f2Freq = i * binHz; }
  }

  // Match against formant windows
  let bestMatch = null;
  let bestScore = -Infinity;

  for (const [vowel, [f1lo, f1hi, f2lo, f2hi]] of Object.entries(VOWEL_FORMANTS)) {
    const f1In = (f1Freq >= f1lo && f1Freq <= f1hi) ? 1 : 0;
    const f2In = (f2Freq >= f2lo && f2Freq <= f2hi) ? 1 : 0;
    const score = f1In + f2In;
    if (score > bestScore) { bestScore = score; bestMatch = vowel; }
  }

  return bestScore >= 1 ? bestMatch : null;
}
