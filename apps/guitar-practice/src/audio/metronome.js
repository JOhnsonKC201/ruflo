// Drift-free metronome using the Chris Wilson lookahead-scheduler pattern.
// Synthesized clicks (no audio files needed).

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

export class Metronome {
  constructor() {
    this.ctx = null;
    this.bpm = 100;
    this.beatsPerBar = 4;
    this.running = false;
    this.nextNoteTime = 0;
    this.currentBeat = 0;
    this.timerId = null;
    this.onBeat = null; // (beatIndex, time) => void
  }

  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  start() {
    if (this.running) return;
    this.ensureContext();
    this.running = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = null;
  }

  setBpm(bpm) {
    this.bpm = Math.max(30, Math.min(300, bpm));
  }

  setBeatsPerBar(n) {
    this.beatsPerBar = Math.max(1, Math.min(16, n));
  }

  tick() {
    if (!this.running) return;
    while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD_S) {
      const isDownbeat = this.currentBeat % this.beatsPerBar === 0;
      this.scheduleClick(this.nextNoteTime, isDownbeat);
      if (this.onBeat) {
        const beatIdx = this.currentBeat % this.beatsPerBar;
        const time = this.nextNoteTime;
        setTimeout(() => this.onBeat && this.onBeat(beatIdx, time),
          Math.max(0, (time - this.ctx.currentTime) * 1000));
      }
      this.nextNoteTime += 60.0 / this.bpm;
      this.currentBeat++;
    }
    this.timerId = setTimeout(() => this.tick(), LOOKAHEAD_MS);
  }

  scheduleClick(time, accent) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1500 : 1000;
    osc.type = 'square';
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(accent ? 0.4 : 0.2, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}
