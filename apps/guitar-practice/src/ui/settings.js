// Settings screen: theme, default BPM, export/import library.

import { getAllSongs, saveSong, getSetting, setSetting } from '../db.js';

export class SettingsView {
  constructor(rootEl) {
    this.root = rootEl;
    this.root.innerHTML = `
      <div class="settings">
        <div class="group">
          <h3>About</h3>
          <p style="color:var(--fg-dim);font-size:13px;">Guitar Practice v1 — offline-first PWA. All data stored on this device.</p>
        </div>
        <div class="group">
          <h3>Library</h3>
          <div class="row">
            <span>Songs in library</span>
            <span class="count value">0</span>
          </div>
          <div style="display:flex;gap:8px;padding-top:8px;">
            <button class="export-btn">Export JSON</button>
            <button class="import-btn">Import JSON</button>
            <input type="file" accept=".json,application/json" class="import-file" style="display:none" />
          </div>
        </div>
        <div class="group">
          <h3>Display</h3>
          <div class="row">
            <span>Theme</span>
            <select class="theme-select">
              <option value="auto">Auto (system)</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      </div>
    `;

    this.countEl = this.root.querySelector('.count');
    this.themeSelect = this.root.querySelector('.theme-select');
    this.importFile = this.root.querySelector('.import-file');

    this.root.querySelector('.export-btn').addEventListener('click', () => this.exportLibrary());
    this.root.querySelector('.import-btn').addEventListener('click', () => this.importFile.click());
    this.importFile.addEventListener('change', (e) => this.importLibrary(e.target.files[0]));
    this.themeSelect.addEventListener('change', () => this.applyTheme(this.themeSelect.value));

    this.init();
  }

  async init() {
    const theme = await getSetting('theme', 'auto');
    this.themeSelect.value = theme;
    this.applyTheme(theme, false);
    this.refresh();
  }

  async refresh() {
    const songs = await getAllSongs();
    this.countEl.textContent = songs.length;
  }

  async applyTheme(theme, save = true) {
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (theme === 'dark') root.style.colorScheme = 'dark';
    else if (theme === 'light') root.style.colorScheme = 'light';
    else root.style.colorScheme = '';
    if (save) await setSetting('theme', theme);
  }

  async exportLibrary() {
    const songs = await getAllSongs();
    const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guitar-practice-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importLibrary(file) {
    if (!file) return;
    const text = await file.text();
    let songs;
    try { songs = JSON.parse(text); } catch { alert('Invalid JSON file.'); return; }
    if (!Array.isArray(songs)) { alert('JSON must be an array of songs.'); return; }
    let count = 0;
    for (const s of songs) {
      if (s.id && s.source) { await saveSong(s); count++; }
    }
    alert(`Imported ${count} songs.`);
    this.refresh();
  }
}
