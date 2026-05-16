// Standalone metronome screen.

import { Metronome } from '../audio/metronome.js';

export class MetronomeView {
  constructor(rootEl) {
    this.root = rootEl;
    this.met = new Metronome();
    this.bpm = 100;
    this.bpb = 4;

    this.root.innerHTML = `
      <div class="metronome">
        <div class="bpm-display">100</div>
        <div class="beats"></div>
        <div class="controls">
          <button class="play-btn primary">Start</button>
          <div class="row">
            <label>BPM</label>
            <input type="range" min="40" max="240" value="100" class="bpm-slider" />
            <span class="bpm-val value">100</span>
          </div>
          <div class="row">
            <label>Beats/bar</label>
            <input type="range" min="1" max="8" value="4" class="bpb-slider" />
            <span class="bpb-val value">4</span>
          </div>
          <button class="tap-btn">TAP TEMPO</button>
        </div>
      </div>
    `;

    this.displayEl = this.root.querySelector('.bpm-display');
    this.beatsEl = this.root.querySelector('.beats');
    this.bpmSlider = this.root.querySelector('.bpm-slider');
    this.bpbSlider = this.root.querySelector('.bpb-slider');
    this.bpmVal = this.root.querySelector('.bpm-val');
    this.bpbVal = this.root.querySelector('.bpb-val');
    this.playBtn = this.root.querySelector('.play-btn');

    this.met.onBeat = (idx) => this.flashBeat(idx);

    this.renderBeats();

    this.bpmSlider.addEventListener('input', () => this.setBpm(+this.bpmSlider.value));
    this.bpbSlider.addEventListener('input', () => this.setBpb(+this.bpbSlider.value));
    this.playBtn.addEventListener('click', () => this.toggle());
    this.root.querySelector('.tap-btn').addEventListener('click', () => this.tap());
  }

  setBpm(v) {
    this.bpm = v;
    this.met.setBpm(v);
    this.displayEl.textContent = v;
    this.bpmVal.textContent = v;
    this.bpmSlider.value = v;
  }

  setBpb(v) {
    this.bpb = v;
    this.met.setBeatsPerBar(v);
    this.bpbVal.textContent = v;
    this.renderBeats();
  }

  renderBeats() {
    this.beatsEl.innerHTML = '';
    for (let i = 0; i < this.bpb; i++) {
      const d = document.createElement('div');
      d.className = 'beat' + (i === 0 ? ' downbeat' : '');
      this.beatsEl.appendChild(d);
    }
  }

  flashBeat(idx) {
    const beats = this.beatsEl.children;
    for (const b of beats) b.classList.remove('active');
    if (beats[idx]) {
      beats[idx].classList.add('active');
      setTimeout(() => beats[idx]?.classList.remove('active'), 100);
    }
  }

  toggle() {
    if (this.met.running) {
      this.met.stop();
      this.playBtn.textContent = 'Start';
      this.playBtn.classList.add('primary');
    } else {
      this.met.start();
      this.playBtn.textContent = 'Stop';
      this.playBtn.classList.remove('primary');
    }
  }

  tap() {
    const now = performance.now();
    if (!this._taps) this._taps = [];
    this._taps.push(now);
    if (this._taps.length > 6) this._taps.shift();
    if (this._taps.length < 2) return;
    let sum = 0;
    for (let i = 1; i < this._taps.length; i++) sum += this._taps[i] - this._taps[i - 1];
    const avg = sum / (this._taps.length - 1);
    if (avg > 2000) { this._taps = [now]; return; }
    this.setBpm(Math.round(60000 / avg));
  }

  hide() { if (this.met.running) this.toggle(); }
}
