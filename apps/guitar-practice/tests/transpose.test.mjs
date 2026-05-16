import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transposeChord, transposeNote, parseChord, displayChord } from '../src/transpose.js';

test('parseChord splits root, quality, bass', () => {
  assert.deepEqual(parseChord('C'),       { root: 'C',  quality: '',     bass: null });
  assert.deepEqual(parseChord('Am'),      { root: 'A',  quality: 'm',    bass: null });
  assert.deepEqual(parseChord('F#m7'),    { root: 'F#', quality: 'm7',   bass: null });
  assert.deepEqual(parseChord('Cmaj7/G'), { root: 'C',  quality: 'maj7', bass: 'G' });
  assert.deepEqual(parseChord('Bb6/9'),   { root: 'Bb', quality: '6/9',  bass: null });
});

test('transposeNote handles sharps and flats', () => {
  assert.equal(transposeNote('C', 2), 'D');
  assert.equal(transposeNote('C', 1), 'C#');
  assert.equal(transposeNote('B', 1), 'C');
  assert.equal(transposeNote('Bb', 2), 'C');
  assert.equal(transposeNote('A', -1), 'G#');
  assert.equal(transposeNote('C', 12), 'C');
});

test('transposeChord preserves quality', () => {
  assert.equal(transposeChord('Am', 2), 'Bm');
  assert.equal(transposeChord('Cmaj7', 5), 'Fmaj7');
  assert.equal(transposeChord('F#m7', 1), 'Gm7');
});

test('transposeChord handles slash chords', () => {
  assert.equal(transposeChord('C/G', 2), 'D/A');
  assert.equal(transposeChord('Am/E', 3), 'Cm/G');
});

test('transposeChord with 0 semitones is identity', () => {
  assert.equal(transposeChord('Bb6/9', 0), 'Bb6/9');
});

test('displayChord combines transpose + capo (capo subtracts)', () => {
  // Transpose +2, capo at 2 → display unchanged
  assert.equal(displayChord('C', 2, 2), 'C');
  // Transpose 0, capo at 2 → display 2 semitones lower
  assert.equal(displayChord('D', 0, 2), 'C');
});

test('unknown chord returned as-is', () => {
  assert.equal(transposeChord('XYZ', 2), 'XYZ');
});
