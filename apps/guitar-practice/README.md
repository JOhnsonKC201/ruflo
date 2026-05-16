# Guitar Practice

A personal, offline-first PWA for guitar practice. Lyrics + chord diagrams + auto-scroll + tuner + metronome — all running locally on your iPhone with zero cost.

## Install on iPhone (two paths, both free)

### Path A: AirDrop the single file (zero infrastructure)

1. Build the single-file dist: `node tools/gen-icons.mjs && node tools/build-single-file.mjs`
2. AirDrop `dist/guitar.html` from your Mac/PC to your iPhone (or email it to yourself, save to Files).
3. On iPhone, open the file in **Safari** (long-press → "Open in Safari" if it opens in another app).
4. Tap the Share button → **Add to Home Screen**.
5. Launch from home screen — fullscreen app, no Safari chrome.

### Path B: GitHub Pages (always-on URL)

1. Push the `apps/guitar-practice/` directory to a GitHub repo.
2. In repo Settings → Pages → enable Pages on the branch, source `/apps/guitar-practice` (or move files to repo root).
3. Open the GitHub Pages URL in Safari on iPhone → Share → Add to Home Screen.

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
