// Reference tone playback for tuning by ear. Synthesized sine waves, no samples needed.

// Standard tuning frequencies (Hz)
export const STRINGS = [
  { name: 'E2', label: 'Low E', freq: 82.41 },
  { name: 'A2', label: 'A',     freq: 110.00 },
  { name: 'D3', label: 'D',     freq: 146.83 },
  { name: 'G3', label: 'G',     freq: 196.00 },
  { name: 'B3', label: 'B',     freq: 246.94 },
  { name: 'E4', label: 'High E', freq: 329.63 },
];

let ctx = null;
let currentOsc = null;
let currentGain = null;

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playTone(freq, durationS = 2) {
  stopTone();
  const c = ensureContext();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  const t = c.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
  gain.gain.setValueAtTime(0.3, t + durationS - 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, t + durationS);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + durationS);
  currentOsc = osc;
  currentGain = gain;
}

export function stopTone() {
  if (currentOsc) {
    try { currentOsc.stop(); } catch {}
    currentOsc.disconnect();
    currentOsc = null;
  }
  if (currentGain) { currentGain.disconnect(); currentGain = null; }
}
