/**
 * AudioFabric Core — KI Singleton
 *
 * Central state object shared across all AudioFabric modules.
 * KI ("ki" — 気 — spirit/energy) holds refs to Three.js objects,
 * audio context, analyser, voice state, and the update loop registry.
 */

export const KI = {
  // Three.js refs (set by main)
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  // Viewport
  W: window.innerWidth,
  H: window.innerHeight,

  // Audio refs
  audioCtx: null,
  analyser: null,
  stream: null,

  // Voice state (updated by voice-engine)
  voice: {
    energy: 0,
    f0: 0,
    vowel: null,
    sounding: false,
    sustain: 0,
  },

  // Running flag
  running: false,

  // Update registry — modules register tick callbacks
  _updates: [],
  onUpdate(fn) { this._updates.push(fn); },
  runUpdates(dt, t) {
    for (let i = 0; i < this._updates.length; i++) {
      this._updates[i](dt, t);
    }
  }
};
