# Guitar Practice

A personal, offline-first PWA for guitar practice. Lyrics + chord diagrams + auto-scroll + tuner + metronome — all running locally on your iPhone with zero cost.

## Install on iPhone (two paths, both free)

### Path A: Download the prebuilt file (easiest, no tools needed)

A ready-to-use single-file build is checked into the repo at
[`apps/guitar-practice/install/guitar.html`](./install/guitar.html).

1. On your iPhone, open Safari and go to:
   `https://github.com/JOhnsonKC201/ruflo/raw/main/apps/guitar-practice/install/guitar.html`
2. Safari will render the app directly. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch from home screen — fullscreen, no Safari chrome, works offline.

### Path B: Build it yourself (latest sources)

1. `node tools/gen-icons.mjs && node tools/build-single-file.mjs` from this directory.
2. AirDrop `dist/guitar.html` from your computer to your iPhone (or email/iCloud Drive it).
3. Open in **Safari**, then Share → Add to Home Screen.

### Path C: GitHub Pages (always-on URL)

1. Repo Settings → Pages → enable Pages on the `main` branch root.
2. Open the resulting `https://johnsonkc201.github.io/ruflo/apps/guitar-practice/` URL in Safari → Add to Home Screen.

## Features

- **Songs**: library with search + favorite + delete (long-press to delete)
- **ChordPro support**: paste chord sheets in `[chord]lyric` format with directives like `{title}`, `{tempo}`, `{key}`, `{start_of_chorus}`
- **Chord cards**: SVG fretboard diagrams for ~40 common chords (open + barre)
- **Auto-scroll**: BPM-synced mode (musical timing) or px/s mode (manual speed)
- **Transpose** ±12 semitones, **Capo** position — chord names + diagrams update instantly
- **Loop A/B**: long-press a lyric line to set point A, long-press another for B, loops between with metronome
- **Tap-tempo**: tap 2+ times to set BPM by ear
- **Tuner**: mic-based pitch detection (YIN algorithm), shows note + cents-off
- **Reference tones**: tap any of 6 strings (E A D G B E) to hear standard tuning
- **Metronome**: drift-free Web Audio scheduler, 40–240 BPM, accent on beat 1, visual flash
- **Wake Lock**: screen stays on during practice
- **Offline-first**: service worker caches the app, your songs live in IndexedDB on the device
- **Export/Import**: dump or restore your library as JSON in Settings

## Adding a song

Tap **+ Add** on the Songs screen, paste ChordPro source, save. Example:

```
{title: My Song}
{artist: Me}
{key: G}
{tempo: 120}

{start_of_verse}
[G]This is a [D]line of lyrics
[Em]Another [C]line right here
{end_of_verse}

{start_of_chorus}
[C]Chorus [G]starts [D]here[Em]now
{end_of_chorus}
```

## Project layout

```
apps/guitar-practice/
├── index.html              # Dev entry
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (cache-first)
├── src/                    # ES modules (no build to run)
│   ├── app.js              # Bootstrap + router
│   ├── chordpro.js         # ChordPro parser
│   ├── chords.js           # Chord dict + SVG renderer
│   ├── transpose.js        # Semitone math
│   ├── scroll.js           # BPM/px-per-sec scroll engine + loop A/B
│   ├── db.js               # IndexedDB wrapper
│   ├── store.js            # Tiny Proxy-based reactive store
│   ├── songs-seed.js       # Starter songs
│   ├── audio/              # Metronome, tuner (YIN), reference tones
│   └── ui/                 # Screen views
├── styles/                 # base.css + components.css
├── assets/                 # PWA icons (generated)
├── tools/                  # gen-icons.mjs, build-single-file.mjs
├── tests/                  # node --test
└── dist/                   # Built single-file guitar.html
```

## Develop locally

```bash
# Generate icons (one-time)
node tools/gen-icons.mjs

# Serve locally
python3 -m http.server 8080
# open http://localhost:8080/

# Run tests
node --test tests/*.test.mjs

# Build single-file dist (AirDrop-able)
node tools/build-single-file.mjs
# Output: dist/guitar.html
```

## Notes

- No audio playback of copyrighted songs; this is a lyrics + chord visualizer.
- All data is local to your device. Use Settings → Export JSON to back up your library.
- Tested target: iOS 16.4+ Safari (for Wake Lock support).
