// Tuner + reference tones UI.

import { Tuner } from '../audio/tuner.js';
import { STRINGS, playTone, stopTone } from '../audio/reference.js';

export class TunerView {
  constructor(rootEl) {
    this.root = rootEl;
    this.tuner = null;
    this.active = false;

    this.root.innerHTML = `
      <div class="tuner">
        <button class="toggle primary">Start Tuner</button>
        <div class="note">—<span class="octave"></span></div>
        <div class="cents-bar">
          <div class="center-line"></div>
          <div class="indicator" style="left:50%"></div>
        </div>
        <div class="cents-label">0¢</div>
        <p style="color:var(--fg-dim);font-size:13px;">Or tap a string for reference tone:</p>
      </div>
      <div class="string-buttons">
        ${STRINGS.map(s => `<button data-freq="${s.freq}" data-name="${s.name}">${s.label}<br><small style="color:var(--fg-dim)">${s.name}</small></button>`).join('')}
      </div>
    `;

    this.noteEl = this.root.querySelector('.note');
    this.octaveEl = this.root.querySelector('.octave');
    this.indicatorEl = this.root.querySelector('.indicator');
    this.centsLabelEl = this.root.querySelector('.cents-label');
    this.toggleBtn = this.root.querySelector('.toggle');

    this.toggleBtn.addEventListener('click', () => this.toggleTuner());

    this.root.querySelectorAll('.string-buttons button').forEach(btn => {
      btn.addEventListener('click', () => {
        const freq = parseFloat(btn.dataset.freq);
        playTone(freq, 3);
      });
    });
  }

  async toggleTuner() {
    if (this.active) {
      this.tuner?.stop();
      this.tuner = null;
      this.active = false;
      this.toggleBtn.textContent = 'Start Tuner';
      this.toggleBtn.classList.add('primary');
      this.noteEl.firstChild.textContent = '—';
      this.octaveEl.textContent = '';
    } else {
      this.tuner = new Tuner({ onPitch: (p) => this.updatePitch(p) });
      try {
        await this.tuner.start();
        this.active = true;
        this.toggleBtn.textContent = 'Stop';
        this.toggleBtn.classList.remove('primary');
      } catch (err) {
        alert('Microphone access denied or unavailable.');
        this.tuner = null;
      }
    }
  }

  updatePitch({ note, octave, cents }) {
    this.noteEl.firstChild.textContent = note;
    this.octaveEl.textContent = octave;
    const pct = 50 + (cents / 50) * 50;
    this.indicatorEl.style.left = `${Math.max(0, Math.min(100, pct))}%`;
    this.indicatorEl.classList.toggle('in-tune', Math.abs(cents) < 5);
    this.centsLabelEl.textContent = `${cents > 0 ? '+' : ''}${cents}¢`;
  }

  hide() {
    if (this.active) this.toggleTuner();
    stopTone();
  }
}
