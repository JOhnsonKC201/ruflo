// Pitch detection via YIN autocorrelation.
// Returns { frequency, note, octave, cents } or null when below confidence threshold.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4 = 440;
const A4_MIDI = 69;

/**
 * YIN pitch detection.
 * @param {Float32Array} buffer
 * @param {number} sampleRate
 * @param {number} threshold
 * @returns {number} frequency in Hz, or -1 if no pitch detected
 */
export function yinDetect(buffer, sampleRate, threshold = 0.1) {
  const N = buffer.length;
  const halfN = Math.floor(N / 2);
  const yinBuf = new Float32Array(halfN);

  // 1. Difference function
  for (let tau = 0; tau < halfN; tau++) {
    let sum = 0;
    for (let i = 0; i < halfN; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuf[tau] = sum;
  }

  // 2. Cumulative mean normalized difference
  yinBuf[0] = 1;
  let running = 0;
  for (let tau = 1; tau < halfN; tau++) {
    running += yinBuf[tau];
    yinBuf[tau] = yinBuf[tau] * tau / running;
  }

  // 3. Absolute threshold
  let tau = -1;
  for (let t = 2; t < halfN; t++) {
    if (yinBuf[t] < threshold) {
      while (t + 1 < halfN && yinBuf[t + 1] < yinBuf[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return -1;

  // 4. Parabolic interpolation for sub-sample precision
  let betterTau = tau;
  if (tau > 0 && tau < halfN - 1) {
    const s0 = yinBuf[tau - 1];
    const s1 = yinBuf[tau];
    const s2 = yinBuf[tau + 1];
    betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }

  return sampleRate / betterTau;
}

/**
 * Convert a frequency to note + cents-off-from-pitch.
 * @param {number} freq
 */
export function freqToNote(freq) {
  if (freq <= 0) return null;
  const midi = 12 * Math.log2(freq / A4) + A4_MIDI;
  const midiRound = Math.round(midi);
  const cents = Math.round((midi - midiRound) * 100);
  const note = NOTE_NAMES[(midiRound + 1200) % 12];
  const octave = Math.floor(midiRound / 12) - 1;
  return { note, octave, cents, midi: midiRound, frequency: freq };
}

export class Tuner {
  constructor({ onPitch, bufferSize = 2048 } = {}) {
    this.onPitch = onPitch;
    this.bufferSize = bufferSize;
    this.ctx = null;
    this.stream = null;
    this.analyser = null;
    this.buffer = null;
    this.rafId = null;
    this.running = false;
  }

  async start() {
    if (this.running) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.bufferSize;
    source.connect(this.analyser);
    this.buffer = new Float32Array(this.bufferSize);
    this.running = true;
    this.loop();
  }

  loop() {
    if (!this.running) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    // RMS gate to skip silence
    let rms = 0;
    for (let i = 0; i < this.buffer.length; i++) rms += this.buffer[i] * this.buffer[i];
    rms = Math.sqrt(rms / this.buffer.length);
    if (rms > 0.01) {
      const freq = yinDetect(this.buffer, this.ctx.sampleRate);
      if (freq > 0) {
        const note = freqToNote(freq);
        if (note && this.onPitch) this.onPitch(note);
      }
    }
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.ctx) this.ctx.close();
    this.stream = null;
    this.ctx = null;
  }
}
