// Bootstrap: screen router, service worker registration, share-target handling.

import { seedIfEmpty } from './db.js';
import { SEED_SONGS } from './songs-seed.js';
import { SongListView } from './ui/song-list.js';
import { SongPlayerView } from './ui/song-player.js';
import { SongEditView } from './ui/song-edit.js';
import { TunerView } from './ui/tuner-view.js';
import { MetronomeView } from './ui/metronome-view.js';
import { SettingsView } from './ui/settings.js';

const screens = {};
const tabs = {};
let activeScreen = 'songs';
let topbarTitle, topbarBack, topbarAdd;

async function init() {
  topbarTitle = document.querySelector('.topbar h1');
  topbarBack = document.querySelector('.topbar .back-btn');
  topbarAdd = document.querySelector('.topbar .add-btn');

  topbarBack.addEventListener('click', () => switchTo('songs'));
  topbarAdd.addEventListener('click', () => {
    screens.edit.reset();
    switchTo('edit');
  });

  screens.songs = new SongListView(document.getElementById('screen-songs'), {
    onOpen: (id) => openSong(id),
  });
  screens.player = new SongPlayerView(document.getElementById('screen-player'), {
    onBack: () => switchTo('songs'),
  });
  screens.edit = new SongEditView(document.getElementById('screen-edit'), {
    onSaved: () => { screens.songs.refresh(); switchTo('songs'); },
    onCancel: () => switchTo('songs'),
  });
  screens.tuner = new TunerView(document.getElementById('screen-tuner'));
  screens.metronome = new MetronomeView(document.getElementById('screen-metronome'));
  screens.settings = new SettingsView(document.getElementById('screen-settings'));

  document.querySelectorAll('.tabbar button').forEach(btn => {
    tabs[btn.dataset.tab] = btn;
    btn.addEventListener('click', () => switchTo(btn.dataset.tab));
  });

  await seedIfEmpty(SEED_SONGS);
  await screens.songs.refresh();

  // Share Target handling
  const params = new URLSearchParams(location.search);
  const shared = params.get('text') || params.get('title') || params.get('url');
  if (shared) {
    screens.edit.reset(shared);
    switchTo('edit');
    history.replaceState({}, '', location.pathname);
  }

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW register failed', err));
  }

  switchTo(activeScreen);
}

function switchTo(name) {
  // Hide player if leaving it
  if (activeScreen === 'player' && name !== 'player') screens.player.hide();
  if (activeScreen === 'tuner' && name !== 'tuner') screens.tuner.hide();
  if (activeScreen === 'metronome' && name !== 'metronome') screens.metronome.hide();

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screenEl = document.getElementById(`screen-${name}`);
  if (screenEl) screenEl.classList.add('active');
  if (name === 'player') screens.player.show();

  Object.values(tabs).forEach(b => b.classList.remove('active'));
  if (tabs[name]) tabs[name].classList.add('active');

  // Topbar
  const titles = {
    songs: 'Songs', player: '', edit: 'Edit Song',
    tuner: 'Tuner', metronome: 'Metronome', settings: 'Settings',
  };
  topbarTitle.textContent = titles[name] || '';
  topbarBack.classList.toggle('hidden', !['player', 'edit'].includes(name));
  topbarAdd.classList.toggle('hidden', name !== 'songs');

  // Refresh data on entry
  if (name === 'songs') screens.songs.refresh();
  if (name === 'settings') screens.settings.refresh();

  activeScreen = name;
}

async function openSong(id) {
  await screens.player.load(id);
  switchTo('player');
}

document.addEventListener('DOMContentLoaded', init);
