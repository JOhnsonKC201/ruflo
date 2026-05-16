// Chord fingerings + SVG diagram renderer.
// Fingering format: array of 6 ints (low E → high E). -1 = mute, 0 = open, >0 = fret.
// Optional 'fingers' parallel array indicates which finger (1-4) plays each note.

import { parseChord } from './transpose.js';

/** @type {Record<string, {frets: number[], fingers?: number[], baseFret?: number}>} */
export const CHORD_LIBRARY = {
  // Open major
  C:    { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  D:    { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  E:    { frets: [0, 2, 2, 1, 0, 0],  fingers: [0, 2, 3, 1, 0, 0] },
  F:    { frets: [1, 3, 3, 2, 1, 1],  fingers: [1, 3, 4, 2, 1, 1] },
  G:    { frets: [3, 2, 0, 0, 0, 3],  fingers: [3, 2, 0, 0, 0, 4] },
  A:    { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  B:    { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 3, 4, 4, 1] },
  // Open minor
  Am:   { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  Dm:   { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  Em:   { frets: [0, 2, 2, 0, 0, 0],  fingers: [0, 2, 3, 0, 0, 0] },
  Fm:   { frets: [1, 3, 3, 1, 1, 1],  fingers: [1, 3, 4, 1, 1, 1] },
  Gm:   { frets: [3, 5, 5, 3, 3, 3],  fingers: [1, 3, 4, 1, 1, 1] },
  Bm:   { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1] },
  Cm:   { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1] },
  // 7ths
  'C7': { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  'D7': { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  'E7': { frets: [0, 2, 0, 1, 0, 0],  fingers: [0, 2, 0, 1, 0, 0] },
  'G7': { frets: [3, 2, 0, 0, 0, 1],  fingers: [3, 2, 0, 0, 0, 1] },
  'A7': { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  'B7': { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  'Am7':{ frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  'Dm7':{ frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  'Em7':{ frets: [0, 2, 2, 0, 3, 0],  fingers: [0, 1, 2, 0, 3, 0] },
  // Maj7
  'Cmaj7': { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  'Dmaj7': { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 1, 1] },
  'Fmaj7': { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  'Gmaj7': { frets: [3, 2, 0, 0, 0, 2], fingers: [3, 2, 0, 0, 0, 1] },
  'Amaj7': { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  // Sus
  'Dsus4': { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3] },
  'Asus4': { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'Esus4': { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0] },
  'Dsus2': { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0] },
  'Asus2': { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  // Common barre
  'F#m':   { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1] },
  'C#m':   { frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1] },
  // Sharps/flats handled by lookup table below
};

// Alias flats to sharps so "Bb" finds "A#" etc.
const FLAT_ALIASES = { Bb: 'A#', Eb: 'D#', Ab: 'G#', Db: 'C#', Gb: 'F#' };

/**
 * Look up a chord's fingering. Returns null if unknown.
 * @param {string} chord
 */
export function lookupChord(chord) {
  if (CHORD_LIBRARY[chord]) return CHORD_LIBRARY[chord];
  const parsed = parseChord(chord);
  if (!parsed) return null;
  const root = FLAT_ALIASES[parsed.root] || parsed.root;
  const norm = root + parsed.quality;
  return CHORD_LIBRARY[norm] || null;
}

/**
 * Render an SVG chord diagram. Returns an SVGElement.
 * Designed for ~80×100 px display.
 * @param {string} chordName
 * @param {{width?: number, height?: number}} [opts]
 */
export function renderChordSVG(chordName, opts = {}) {
  const W = opts.width || 80;
  const H = opts.height || 100;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chord-diagram');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${chordName} chord diagram`);

  const fingering = lookupChord(chordName);

  // Title
  const title = document.createElementNS(NS, 'text');
  title.setAttribute('x', W / 2);
  title.setAttribute('y', 14);
  title.setAttribute('text-anchor', 'middle');
  title.setAttribute('class', 'chord-name');
  title.textContent = chordName;
  svg.appendChild(title);

  if (!fingering) {
    const note = document.createElementNS(NS, 'text');
    note.setAttribute('x', W / 2);
    note.setAttribute('y', H / 2 + 10);
    note.setAttribute('text-anchor', 'middle');
    note.setAttribute('class', 'chord-unknown');
    note.textContent = '?';
    svg.appendChild(note);
    return svg;
  }

  // Geometry
  const padX = 10;
  const padTop = 22;
  const padBot = 12;
  const gridW = W - padX * 2;
  const gridH = H - padTop - padBot;
  const strings = 6;
  const frets = 5;
  const stringSpace = gridW / (strings - 1);
  const fretSpace = gridH / frets;

  const minFret = Math.max(...fingering.frets);
  const baseFret = minFret > 4 ? Math.min(...fingering.frets.filter(f => f > 0)) : 1;
  const showBase = baseFret > 1;

  // Nut (thick line if base fret 1)
  if (!showBase) {
    const nut = document.createElementNS(NS, 'line');
    nut.setAttribute('x1', padX); nut.setAttribute('y1', padTop);
    nut.setAttribute('x2', padX + gridW); nut.setAttribute('y2', padTop);
    nut.setAttribute('class', 'chord-nut');
    svg.appendChild(nut);
  } else {
    const baseLabel = document.createElementNS(NS, 'text');
    baseLabel.setAttribute('x', padX - 4);
    baseLabel.setAttribute('y', padTop + fretSpace / 2 + 3);
    baseLabel.setAttribute('text-anchor', 'end');
    baseLabel.setAttribute('class', 'chord-fret-label');
    baseLabel.textContent = baseFret + 'fr';
    svg.appendChild(baseLabel);
  }

  // Frets (horizontal)
  for (let f = 0; f <= frets; f++) {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', padX); line.setAttribute('y1', padTop + f * fretSpace);
    line.setAttribute('x2', padX + gridW); line.setAttribute('y2', padTop + f * fretSpace);
    line.setAttribute('class', 'chord-fret');
    svg.appendChild(line);
  }

  // Strings (vertical)
  for (let s = 0; s < strings; s++) {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', padX + s * stringSpace); line.setAttribute('y1', padTop);
    line.setAttribute('x2', padX + s * stringSpace); line.setAttribute('y2', padTop + gridH);
    line.setAttribute('class', 'chord-string');
    svg.appendChild(line);
  }

  // Markers
  for (let s = 0; s < strings; s++) {
    const fret = fingering.frets[s];
    const x = padX + s * stringSpace;

    if (fret === -1) {
      const mute = document.createElementNS(NS, 'text');
      mute.setAttribute('x', x); mute.setAttribute('y', padTop - 5);
      mute.setAttribute('text-anchor', 'middle'); mute.setAttribute('class', 'chord-mark');
      mute.textContent = '×';
      svg.appendChild(mute);
    } else if (fret === 0) {
      const open = document.createElementNS(NS, 'circle');
      open.setAttribute('cx', x); open.setAttribute('cy', padTop - 6);
      open.setAttribute('r', 2.5); open.setAttribute('class', 'chord-open');
      svg.appendChild(open);
    } else {
      const displayFret = fret - baseFret + 1;
      if (displayFret < 1 || displayFret > frets) continue;
      const y = padTop + (displayFret - 0.5) * fretSpace;
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      dot.setAttribute('r', 4.5); dot.setAttribute('class', 'chord-dot');
      svg.appendChild(dot);
    }
  }

  return svg;
}
