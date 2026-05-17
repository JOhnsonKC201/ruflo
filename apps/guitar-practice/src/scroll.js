// Scroll engine with two modes: BPM-synced (lines per beat) and manual px/s.
// Supports loop A/B and speed-ramp.

// scrollEl may be null/undefined → engine scrolls the document/window instead.
function getCurrentTop(el) {
  if (el) return el.scrollTop;
  return window.scrollY || document.documentElement.scrollTop || 0;
}
function setCurrentTop(el, top) {
  if (el) { el.scrollTop = top; return; }
  window.scrollTo(0, top);
}
function getMaxTop(el) {
  if (el) return Math.max(0, el.scrollHeight - el.clientHeight);
  const doc = document.documentElement;
  return Math.max(0, doc.scrollHeight - window.innerHeight);
}

export class ScrollEngine {
  constructor(scrollEl) {
    this.el = scrollEl || null;
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
    // Sync internal float position with current real scroll, then accumulate
    // sub-pixel deltas internally. Without this, e.g. 0.4 px/frame is lost
    // because window.scrollY always reports rounded integers, so reading back
    // each frame would reset accumulation.
    this._currentY = getCurrentTop(this.el);
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
    const dt = Math.min(0.1, (now - this.lastTs) / 1000); // clamp to handle tab-switch gaps
    this.lastTs = now;

    const speed = this.mode === 'bpm'
      ? this.bpm / 60 * this.linesPerBeat * this.lineHeightPx
      : this.pxPerSec;

    const maxTop = getMaxTop(this.el);
    // If the user manually scrolled, snap the internal accumulator to the
    // visible position so we resume from where they are.
    const visibleTop = getCurrentTop(this.el);
    if (Math.abs(visibleTop - this._currentY) > 2) this._currentY = visibleTop;

    this._currentY += speed * dt;

    if (this.loopAY != null && this.loopBY != null && this._currentY >= this.loopBY) {
      this._currentY = this.loopAY;
      if (this.rampCfg) this.handleRampLoop();
    } else if (maxTop > 0 && this._currentY >= maxTop) {
      this._currentY = maxTop;
      this.pause();
    }

    setCurrentTop(this.el, this._currentY);
    if (this.onTick) this.onTick(this._currentY);
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
