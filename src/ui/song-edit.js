// Add/edit a song. Paste ChordPro, preview, save.

import { saveSong, getSong } from '../db.js';
import { parseChordPro } from '../chordpro.js';

export class SongEditView {
  constructor(rootEl, { onSaved, onCancel } = {}) {
    this.root = rootEl;
    this.onSaved = onSaved;
    this.onCancel = onCancel;
    this.editingId = null;

    this.root.innerHTML = `
      <div class="edit-form">
        <div class="help">
          Paste a song in <strong>ChordPro</strong> format. Put chords in square brackets inline with lyrics:
          <code>[Am]This is a [C]line</code>. Use <code>{title: ...}</code>, <code>{artist: ...}</code>,
          <code>{key: ...}</code>, <code>{tempo: 120}</code>, <code>{start_of_chorus}...{end_of_chorus}</code>.
        </div>
        <label>Title <input class="title-input" placeholder="Song title" /></label>
        <label>Artist <input class="artist-input" placeholder="Artist" /></label>
        <label>ChordPro source
          <textarea class="source-input" spellcheck="false" placeholder="{title: My Song}
{artist: ...}

[G]Verse [D]goes [Em]here[C]..."></textarea>
        </label>
        <div class="actions">
          <button class="cancel-btn ghost">Cancel</button>
          <button class="save-btn primary">Save</button>
        </div>
      </div>
    `;

    this.titleEl = this.root.querySelector('.title-input');
    this.artistEl = this.root.querySelector('.artist-input');
    this.sourceEl = this.root.querySelector('.source-input');

    this.root.querySelector('.save-btn').addEventListener('click', () => this.save());
    this.root.querySelector('.cancel-btn').addEventListener('click', () => this.onCancel && this.onCancel());

    // Auto-fill title/artist from directives when user types in source
    this.sourceEl.addEventListener('blur', () => {
      const parsed = parseChordPro(this.sourceEl.value);
      if (parsed.title && !this.titleEl.value) this.titleEl.value = parsed.title;
      if (parsed.artist && !this.artistEl.value) this.artistEl.value = parsed.artist;
    });
  }

  async loadForEdit(id) {
    this.editingId = id;
    const song = id ? await getSong(id) : null;
    this.titleEl.value = song?.title || '';
    this.artistEl.value = song?.artist || '';
    this.sourceEl.value = song?.source || '';
  }

  reset(initialSource = '') {
    this.editingId = null;
    this.titleEl.value = '';
    this.artistEl.value = '';
    this.sourceEl.value = initialSource;
  }

  async save() {
    const source = this.sourceEl.value.trim();
    if (!source) { alert('Paste some ChordPro source first.'); return; }
    const parsed = parseChordPro(source);
    const title = this.titleEl.value.trim() || parsed.title || 'Untitled';
    const artist = this.artistEl.value.trim() || parsed.artist || '';
    const song = {
      id: this.editingId || `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title, artist, source,
      favorite: false,
      updated: Date.now(),
    };
    await saveSong(song);
    if (this.onSaved) this.onSaved(song.id);
  }
}
