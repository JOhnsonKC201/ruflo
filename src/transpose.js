// Chord transposition + capo math.
// Handles complex chords like "Cmaj7/G", "F#m7b5", "Bb6/9".

export const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

/**
 * Normalize a single root note (e.g., "Bb" → "A#") to the sharp set.
 * @param {string} note
 */
function normalizeRoot(note) {
  if (note.length === 2 && note[1] === 'b' && FLAT_TO_SHARP[note]) return FLAT_TO_SHARP[note];
  return note;
}

/**
 * Split a chord into [root, quality, bass?].
 * "Cmaj7/G" → ["C", "maj7", "G"]
 * "F#m" → ["F#", "m", null]
 * "Bb6/9" → ["Bb", "6/9", null]  (slash only treated as bass if followed by a note letter)
 * @param {string} chord
 * @returns {{root: string, quality: string, bass: string | null} | null}
 */
export function parseChord(chord) {
  const rootMatch = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!rootMatch) return null;
  const root = rootMatch[1];
  let rest = rootMatch[2];
  let bass = null;
  const bassMatch = rest.match(/\/([A-G][#b]?)$/);
  if (bassMatch) {
    bass = bassMatch[1];
    rest = rest.slice(0, rest.length - bassMatch[0].length);
  }
  return { root, quality: rest, bass };
}

/**
 * Transpose a single note by N semitones.
 * @param {string} note
 * @param {number} semitones
 * @param {boolean} preferFlats
 */
export function transposeNote(note, semitones, preferFlats = false) {
  const norm = normalizeRoot(note);
  const idx = NOTES_SHARP.indexOf(norm);
  if (idx === -1) return note;
  const out = ((idx + semitones) % 12 + 12) % 12;
  return preferFlats ? NOTES_FLAT[out] : NOTES_SHARP[out];
}

/**
 * Transpose a chord by N semitones.
 * @param {string} chord
 * @param {number} semitones
 * @param {boolean} preferFlats
 */
export function transposeChord(chord, semitones, preferFlats = false) {
  if (semitones === 0) return chord;
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  const newRoot = transposeNote(parsed.root, semitones, preferFlats);
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, preferFlats) : null;
  return newRoot + parsed.quality + (newBass ? '/' + newBass : '');
}

/**
 * Combine transpose + capo. Capo at fret N means chords played are -N semitones from sounded.
 * For display, "transpose +2 capo +3" displays chord at +2 (capo handled by the player's left hand).
 * Here we treat capo as a separate display offset that subtracts from the displayed shape.
 * Effective display semitones = transposeSemitones - capoFret.
 * @param {string} chord
 * @param {number} transposeSemitones
 * @param {number} capoFret
 */
export function displayChord(chord, transposeSemitones = 0, capoFret = 0) {
  const effective = transposeSemitones - capoFret;
  return transposeChord(chord, effective);
}
