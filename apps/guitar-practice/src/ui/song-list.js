// Song library list screen with search + favorite + delete + setlist queue.

import { getAllSongs, deleteSong, saveSong } from '../db.js';

export class SongListView {
  constructor(rootEl, { onOpen, onAdd } = {}) {
    this.root = rootEl;
    this.onOpen = onOpen;
    this.onAdd = onAdd;
    this.songs = [];
    this.filter = '';
    this.root.innerHTML = `
      <div class="search-bar">
        <input type="search" placeholder="Search songs..." class="search-input" />
      </div>
      <div class="song-list"></div>
    `;
    this.listEl = this.root.querySelector('.song-list');
    this.searchEl = this.root.querySelector('.search-input');
    this.searchEl.addEventListener('input', () => {
      this.filter = this.searchEl.value.toLowerCase();
      this.render();
    });
  }

  async refresh() {
    this.songs = await getAllSongs();
    this.songs.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return (a.title || '').localeCompare(b.title || '');
    });
    this.render();
  }

  render() {
    const filtered = this.songs.filter(s => {
      if (!this.filter) return true;
      return (s.title || '').toLowerCase().includes(this.filter)
        || (s.artist || '').toLowerCase().includes(this.filter);
    });

    if (filtered.length === 0) {
      this.listEl.innerHTML = `
        <div class="empty-state">
          <p>${this.filter ? 'No matches.' : 'No songs yet. Tap + to add one.'}</p>
        </div>
      `;
      return;
    }

    this.listEl.innerHTML = '';
    for (const song of filtered) {
      const card = document.createElement('div');
      card.className = 'song-card';
      card.innerHTML = `
        <div class="meta">
          <div class="title"></div>
          <div class="artist"></div>
        </div>
        <button class="fav ${song.favorite ? 'on' : ''}" aria-label="Favorite">★</button>
      `;
      card.querySelector('.title').textContent = song.title || '(Untitled)';
      card.querySelector('.artist').textContent = song.artist || '';

      card.querySelector('.meta').addEventListener('click', () => this.onOpen && this.onOpen(song.id));
      card.querySelector('.fav').addEventListener('click', async (e) => {
        e.stopPropagation();
        song.favorite = !song.favorite;
        await saveSong(song);
        this.refresh();
      });

      // Long-press to delete
      let pressTimer = null;
      card.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(async () => {
          if (confirm(`Delete "${song.title}"?`)) {
            await deleteSong(song.id);
            this.refresh();
          }
        }, 800);
      }, { passive: true });
      card.addEventListener('touchend', () => clearTimeout(pressTimer));
      card.addEventListener('touchmove', () => clearTimeout(pressTimer));

      this.listEl.appendChild(card);
    }
  }
}
