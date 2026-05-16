import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yinDetect, freqToNote } from '../src/audio/tuner.js';

function makeSine(freq, sampleRate, samples) {
  const buf = new Float32Array(samples);
  for (let i = 0; i < samples; i++) buf[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
  return buf;
}

test('yinDetect finds A4 (440 Hz)', () => {
  const sr = 44100;
  const buf = makeSine(440, sr, 4096);
  const detected = yinDetect(buf, sr);
  assert(Math.abs(detected - 440) < 2, `expected ~440, got ${detected}`);
});

test('yinDetect finds low E (82.41 Hz)', () => {
  const sr = 44100;
  const buf = makeSine(82.41, sr, 8192);
  const detected = yinDetect(buf, sr);
  assert(Math.abs(detected - 82.41) < 1, `expected ~82.41, got ${detected}`);
});

test('freqToNote computes note + cents correctly', () => {
  const a4 = freqToNote(440);
  assert.equal(a4.note, 'A');
  assert.equal(a4.octave, 4);
  assert.equal(a4.cents, 0);

  const a4Sharp = freqToNote(466.16); // A#4
  assert.equal(a4Sharp.note, 'A#');
  assert.equal(a4Sharp.octave, 4);
  assert(Math.abs(a4Sharp.cents) < 2);
});

test('freqToNote handles low E2 (82.41 Hz)', () => {
  const e2 = freqToNote(82.41);
  assert.equal(e2.note, 'E');
  assert.equal(e2.octave, 2);
  assert(Math.abs(e2.cents) < 2);
});

test('freqToNote returns null for invalid frequencies', () => {
  assert.equal(freqToNote(0), null);
  assert.equal(freqToNote(-100), null);
});
