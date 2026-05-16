import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChordPro, extractInlineChords, serializeChordPro } from '../src/chordpro.js';

test('extractInlineChords parses inline brackets', () => {
  const { text, chords } = extractInlineChords('[Am]Hello [C]world');
  assert.equal(text, 'Hello world');
  assert.deepEqual(chords, [
    { chord: 'Am', pos: 0 },
    { chord: 'C',  pos: 6 },
  ]);
});

test('extractInlineChords handles no chords', () => {
  const { text, chords } = extractInlineChords('Just plain text');
  assert.equal(text, 'Just plain text');
  assert.equal(chords.length, 0);
});

test('extractInlineChords handles unclosed bracket gracefully', () => {
  const { text, chords } = extractInlineChords('Hello [Am world');
  assert.equal(text, 'Hello [Am world');
  assert.equal(chords.length, 0);
});

test('parseChordPro extracts directives', () => {
  const src = `{title: My Song}
{artist: Me}
{key: G}
{tempo: 120}
{capo: 2}

[G]Hello [D]world`;
  const song = parseChordPro(src);
  assert.equal(song.title, 'My Song');
  assert.equal(song.artist, 'Me');
  assert.equal(song.key, 'G');
  assert.equal(song.tempo, 120);
  assert.equal(song.capo, 2);
});

test('parseChordPro collects unique chord set', () => {
  const song = parseChordPro('[G]a [D]b [G]c [Em]d');
  assert.deepEqual(song.chords.sort(), ['D', 'Em', 'G'].sort());
});

test('parseChordPro tracks section markers', () => {
  const song = parseChordPro(`{soc}
[G]hi
{eoc}`);
  const types = song.lines.map(l => l.type);
  assert(types.includes('section_start'));
  assert(types.includes('section_end'));
});

test('serializeChordPro round-trips a simple song', () => {
  const src = `{title: Test}\n{artist: A}\n\n[G]Hello [D]world`;
  const song = parseChordPro(src);
  const out = serializeChordPro(song);
  const round = parseChordPro(out);
  assert.equal(round.title, 'Test');
  assert.equal(round.artist, 'A');
  const lyric = round.lines.find(l => l.type === 'lyric');
  assert.equal(lyric.text, 'Hello world');
});
