// Song player: chord cards, scrolling lyrics with chord markers, transpose/capo, loop A/B.

import { getSong } from '../db.js';
import { parseChordPro } from '../chordpro.js';
import { displayChord } from '../transpose.js';
import { renderChordSVG } from '../chords.js';
import { ScrollEngine } from '../scroll.js';
import { Metronome } from '../audio/metronome.js';

export class SongPlayerView {
  constructor(rootEl, { onBack } = {}) {
    this.root = rootEl;
    this.onBack = onBack;
    this.song = null;
    this.parsed = null;
    this.transpose = 0;
    this.capo = 0;
    this.scrollMode = 'bpm';
    this.scrollEngine = null;
    this.metronome = new Metronome();
    this.metronomeOn = false;
    this.wakeLock = null;
    this.loopA = null;
    this.loopB = null;

    this.root.innerHTML = `
      <div class="player-controls">
        <div class="row">
          <button class="play-btn primary">▶ Play</button>
          <button class="met-btn ghost" title="Metronome">𝅘𝅥</button>
          <div class="grow"></div>
          <button class="tap-btn ghost">TAP</button>
          <span class="bpm-display value">100</span>
          <label>BPM</label>
        </div>
        <div class="row">
          <label>Speed</label>
          <input type="range" min="40" max="240" value="100" class="bpm-slider grow" />
        </div>
        <div class="row">
          <label>Transpose</label>
          <button class="transpose-down">−</button>
          <span class="transpose-display value">0</span>
          <button class="transpose-up">+</button>
          <div class="grow"></div>
          <label>Capo</label>
          <button class="capo-down">−</button>
          <span class="capo-display value">0</span>
          <button class="capo-up">+</button>
        </div>
        <div class="row">
          <button class="loop-clear ghost">Clear A/B</button>
          <span class="loop-status" style="font-size:12px;color:var(--fg-dim)"></span>
          <div class="grow"></div>
          <button class="mode-toggle ghost">Mode: BPM</button>
        </div>
      </div>
      <div class="chord-row"></div>
      <div class="lyrics-container">
        <div class="lyrics"></div>
      </div>
    `;

    this.root.style.display = 'none';
    this.root.style.flexDirection = 'column';
    this.root.style.overflow = 'hidden';
    this.root.style.minHeight = '0';

    this.chordRow = this.root.querySelector('.chord-row');
    this.lyricsContainer = this.root.querySelector('.lyrics-container');
    this.lyricsEl = this.root.querySelector('.lyrics');
    this.bindControls();
  }

  show() { this.root.style.display = 'flex'; }
  hide() { this.root.style.display = 'none'; this.stopAll(); }

  bindControls() {
    this.root.querySelector('.play-btn').addEventListener('click', () => this.togglePlay());
    this.root.querySelector('.met-btn').addEventListener('click', () => this.toggleMetronome());
    this.root.querySelector('.tap-btn').addEventListener('click', () => this.tap());
    this.root.querySelector('.bpm-slider').addEventListener('input', (e) => {
      const bpm = +e.target.value;
      this.scrollEngine?.setBpm(bpm);
      this.metronome.setBpm(bpm);
      this.root.querySelector('.bpm-display').textContent = bpm;
    });
    this.root.querySelector('.transpose-up').addEventListener('click', () => this.changeTranspose(+1));
    this.root.querySelector('.transpose-down').addEventListener('click', () => this.changeTranspose(-1));
    this.root.querySelector('.capo-up').addEventListener('click', () => this.changeCapo(+1));
    this.root.querySelector('.capo-down').addEventListener('click', () => this.changeCapo(-1));
    this.root.querySelector('.loop-clear').addEventListener('click', () => this.clearLoop());
    this.root.querySelector('.mode-toggle').addEventListener('click', () => this.toggleMode());
  }

  async load(id) {
    this.song = await getSong(id);
    if (!this.song) return;
    this.parsed = parseChordPro(this.song.source);
    if (this.parsed.tempo) {
      this.root.querySelector('.bpm-slider').value = this.parsed.tempo;
      this.root.querySelector('.bpm-display').textContent = this.parsed.tempo;
    }
    if (this.parsed.capo) {
      this.capo = this.parsed.capo;
      this.root.querySelector('.capo-display').textContent = this.capo;
    }
    this.transpose = 0;
    this.loopA = null; this.loopB = null;
    this.renderChords();
    this.renderLyrics();
    this.setupScrollEngine();
    await this.requestWakeLock();
  }

  setupScrollEngine() {
    this.scrollEngine = new ScrollEngine(this.lyricsContainer);
    this.scrollEngine.setMode(this.scrollMode);
    const bpm = parseInt(this.root.querySelector('.bpm-display').textContent, 10) || 100;
    this.scrollEngine.setBpm(bpm);
    this.metronome.setBpm(bpm);
  }

  renderChords() {
    this.chordRow.innerHTML = '';
    for (const chord of this.parsed.chords) {
      const displayed = displayChord(chord, this.transpose, this.capo);
      const card = document.createElement('div');
      card.className = 'chord-card';
      card.dataset.chord = chord;
      const svg = renderChordSVG(displayed);
      card.appendChild(svg);
      this.chordRow.appendChild(card);
    }
  }

  renderLyrics() {
    this.lyricsEl.innerHTML = '';
    for (const line of this.parsed.lines) {
      if (line.type === 'blank') {
        const el = document.createElement('div');
        el.className = 'blank';
        this.lyricsEl.appendChild(el);
        continue;
      }
      if (line.type === 'comment') {
        const el = document.createElement('div');
        el.className = 'comment';
        el.textContent = line.text;
        this.lyricsEl.appendChild(el);
        continue;
      }
      if (line.type === 'section_start') {
        const el = document.createElement('div');
        el.className = 'section-label';
        el.textContent = line.section;
        this.lyricsEl.appendChild(el);
        continue;
      }
      if (line.type === 'section_end' || line.type === 'directive') continue;
      if (line.type === 'lyric') {
        this.lyricsEl.appendChild(this.renderLyricLine(line));
      }
    }
  }

  renderLyricLine(line) {
    const el = document.createElement('div');
    el.className = 'lyric-line';

    const chordsTrack = document.createElement('div');
    chordsTrack.className = 'chords-track';

    const textTrack = document.createElement('div');
    textTrack.className = 'text-track';
    textTrack.textContent = line.text || ' ';

    // Place chord markers proportionally based on character position
    const len = line.text.length || 1;
    for (const c of line.chords) {
      const span = document.createElement('span');
      span.className = 'chord-marker';
      span.textContent = displayChord(c.chord, this.transpose, this.capo);
      span.style.left = `${(c.pos / len) * 100}%`;
      span.dataset.chord = c.chord;
      span.addEventListener('click', () => this.highlightChord(c.chord));
      chordsTrack.appendChild(span);
    }

    el.appendChild(chordsTrack);
    el.appendChild(textTrack);

    // Long-press to set loop A/B. All listeners passive so iOS can scroll freely.
    let pressTimer = null;
    let startX = 0, startY = 0;
    const startPress = (e) => {
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX; startY = t.clientY;
      pressTimer = setTimeout(() => this.setLoopPoint(el), 700);
    };
    const cancelOnMove = (e) => {
      const t = e.touches ? e.touches[0] : e;
      if (!t) return;
      if (Math.abs(t.clientX - startX) > 6 || Math.abs(t.clientY - startY) > 6) {
        clearTimeout(pressTimer);
      }
    };
    const cancelPress = () => clearTimeout(pressTimer);
    el.addEventListener('touchstart', startPress, { passive: true });
    el.addEventListener('touchend', cancelPress, { passive: true });
    el.addEventListener('touchmove', cancelOnMove, { passive: true });
    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', cancelPress);
    el.addEventListener('mouseleave', cancelPress);

    return el;
  }

  highlightChord(chord) {
    this.chordRow.querySelectorAll('.chord-card').forEach(c => c.classList.remove('highlight'));
    const target = this.chordRow.querySelector(`.chord-card[data-chord="${chord}"]`);
    if (target) {
      target.classList.add('highlight');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  setLoopPoint(el) {
    if (this.loopA == null) {
      this.loopA = el.offsetTop;
      el.classList.add('loop-marker', 'loop-a');
      this.root.querySelector('.loop-status').textContent = 'A set, long-press for B';
    } else if (this.loopB == null) {
      this.loopB = el.offsetTop + el.offsetHeight;
      el.classList.add('loop-marker', 'loop-b');
      this.scrollEngine?.setLoop(this.loopA, this.loopB);
      this.root.querySelector('.loop-status').textContent = 'Looping A↔B';
    } else {
      this.clearLoop();
    }
  }

  clearLoop() {
    this.loopA = null; this.loopB = null;
    this.scrollEngine?.clearLoop();
    this.lyricsEl.querySelectorAll('.loop-marker').forEach(el => {
      el.classList.remove('loop-marker', 'loop-a', 'loop-b');
    });
    this.root.querySelector('.loop-status').textContent = '';
  }

  togglePlay() {
    const running = this.scrollEngine?.toggle();
    this.root.querySelector('.play-btn').textContent = running ? '❚❚ Pause' : '▶ Play';
  }

  toggleMetronome() {
    if (this.metronomeOn) {
      this.metronome.stop();
      this.metronomeOn = false;
      this.root.querySelector('.met-btn').classList.remove('primary');
      this.root.querySelector('.met-btn').classList.add('ghost');
    } else {
      this.metronome.start();
      this.metronomeOn = true;
      this.root.querySelector('.met-btn').classList.add('primary');
      this.root.querySelector('.met-btn').classList.remove('ghost');
    }
  }

  tap() {
    const bpm = this.scrollEngine?.tap();
    if (bpm) {
      this.root.querySelector('.bpm-display').textContent = bpm;
      this.root.querySelector('.bpm-slider').value = bpm;
      this.metronome.setBpm(bpm);
    }
  }

  changeTranspose(delta) {
    this.transpose = Math.max(-12, Math.min(12, this.transpose + delta));
    this.root.querySelector('.transpose-display').textContent = this.transpose > 0 ? `+${this.transpose}` : this.transpose;
    this.renderChords();
    this.renderLyrics();
  }

  changeCapo(delta) {
    this.capo = Math.max(0, Math.min(12, this.capo + delta));
    this.root.querySelector('.capo-display').textContent = this.capo;
    this.renderChords();
    this.renderLyrics();
  }

  toggleMode() {
    this.scrollMode = this.scrollMode === 'bpm' ? 'pxps' : 'bpm';
    this.scrollEngine?.setMode(this.scrollMode);
    this.root.querySelector('.mode-toggle').textContent = `Mode: ${this.scrollMode === 'bpm' ? 'BPM' : 'px/s'}`;
  }

  async requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { /* user denied or unsupported */ }
  }

  stopAll() {
    this.scrollEngine?.pause();
    if (this.metronomeOn) this.toggleMetronome();
    if (this.wakeLock) { this.wakeLock.release(); this.wakeLock = null; }
  }
}
