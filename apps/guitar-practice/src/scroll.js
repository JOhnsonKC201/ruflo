// Scroll engine with two modes: BPM-synced (lines per beat) and manual px/s.
// Supports loop A/B and speed-ramp.

export class ScrollEngine {
  constructor(scrollEl) {
    this.el = scrollEl;
    this.mode = 'pxps'; // 'pxps' | 'bpm'
    this.pxPerSec = 30;
    this.bpm = 100;
    this.linesPerBeat = 0.5; // 2 beats per line of lyric
    this.lineHeightPx = 32;
    this.running = false;
    this.rafId = null;
    this.lastTs = 0;
    this.loopAY = null; // pixel offset
    this.loopBY = null;
    this.rampCfg = null; // { startBpm, targetBpm, repsPerStep, stepSize, currentReps }
    this.onTick = null; // (scrollTop) => void
  }

  setMode(mode) { this.mode = mode; }
  setPxPerSec(v) { this.pxPerSec = Math.max(0, Math.min(300, v)); }
  setBpm(v) { this.bpm = Math.max(30, Math.min(300, v)); }
  setLineHeightPx(px) { this.lineHeightPx = px; }
  setLinesPerBeat(n) { this.linesPerBeat = n; }

  /** Tap-tempo: record taps, compute BPM from rolling average of intervals. */
  tap() {
    const now = performance.now();
    if (!this._taps) this._taps = [];
    this._taps.push(now);
    if (this._taps.length > 6) this._taps.shift();
    if (this._taps.length < 2) return null;
    let sum = 0;
    for (let i = 1; i < this._taps.length; i++) sum += this._taps[i] - this._taps[i - 1];
    const avgMs = sum / (this._taps.length - 1);
    if (avgMs > 2000) { this._taps = [now]; return null; }
    const bpm = Math.round(60000 / avgMs);
    this.setBpm(bpm);
    return bpm;
  }

  resetTaps() { this._taps = []; }

  setLoop(aY, bY) {
    this.loopAY = aY;
    this.loopBY = bY;
  }

  clearLoop() { this.loopAY = null; this.loopBY = null; }

  setRamp(cfg) {
    this.rampCfg = cfg ? { ...cfg, currentReps: 0 } : null;
    if (cfg) this.setBpm(cfg.startBpm);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    this.loop();
  }

  pause() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  toggle() {
    if (this.running) this.pause(); else this.start();
    return this.running;
  }

  loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;

    const speed = this.mode === 'bpm'
      ? this.bpm / 60 * this.linesPerBeat * this.lineHeightPx
      : this.pxPerSec;

    let nextTop = this.el.scrollTop + speed * dt;
    const maxTop = this.el.scrollHeight - this.el.clientHeight;

    if (this.loopAY != null && this.loopBY != null && nextTop >= this.loopBY) {
      nextTop = this.loopAY;
      if (this.rampCfg) this.handleRampLoop();
    } else if (nextTop >= maxTop) {
      this.pause();
      nextTop = maxTop;
    }

    this.el.scrollTop = nextTop;
    if (this.onTick) this.onTick(nextTop);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  handleRampLoop() {
    const r = this.rampCfg;
    r.currentReps++;
    if (r.currentReps >= r.repsPerStep) {
      r.currentReps = 0;
      const next = Math.min(r.targetBpm, this.bpm + r.stepSize);
      this.setBpm(next);
      if (next >= r.targetBpm) this.rampCfg = null;
    }
  }
}
