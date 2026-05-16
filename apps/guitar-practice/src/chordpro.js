// ChordPro parser. Handles directives like {title}, {key}, sections, and inline [chord] markers.
// Returns a structured AST that the UI renders.

/**
 * @typedef {{type: 'lyric', chords: {chord: string, pos: number}[], text: string}} LyricLine
 * @typedef {{type: 'directive', name: string, value: string}} DirectiveLine
 * @typedef {{type: 'section_start' | 'section_end', section: string}} SectionLine
 * @typedef {{type: 'comment', text: string}} CommentLine
 * @typedef {{type: 'blank'}} BlankLine
 * @typedef {LyricLine | DirectiveLine | SectionLine | CommentLine | BlankLine} Line
 * @typedef {{
 *   title: string, artist: string, key: string, capo: number, tempo: number,
 *   timeSig: string, lines: Line[], chords: string[]
 * }} Song
 */

const DIRECTIVE_ALIASES = {
  t: 'title', st: 'subtitle', a: 'artist', su: 'subtitle',
  c: 'comment', ci: 'comment_italic', cb: 'comment_box',
  soc: 'start_of_chorus', eoc: 'end_of_chorus',
  sov: 'start_of_verse', eov: 'end_of_verse',
  sob: 'start_of_bridge', eob: 'end_of_bridge',
};

/**
 * Parse ChordPro source into a Song.
 * @param {string} src
 * @returns {Song}
 */
export function parseChordPro(src) {
  const song = {
    title: '', artist: '', key: '', capo: 0, tempo: 0, timeSig: '4/4',
    lines: [], chords: [],
  };
  const chordSet = new Set();
  const rawLines = String(src).replace(/\r\n?/g, '\n').split('\n');

  for (const raw of rawLines) {
    const line = raw.trimEnd();
    if (line === '') { song.lines.push({ type: 'blank' }); continue; }

    const directive = line.match(/^\{([^}]+)\}$/);
    if (directive) {
      const [nameRaw, ...rest] = directive[1].split(':');
      const name = (DIRECTIVE_ALIASES[nameRaw.trim().toLowerCase()] || nameRaw.trim().toLowerCase());
      const value = rest.join(':').trim();
      handleDirective(song, name, value);
      song.lines.push({ type: 'directive', name, value });
      continue;
    }

    if (line.startsWith('#')) {
      song.lines.push({ type: 'comment', text: line.slice(1).trim() });
      continue;
    }

    const { text, chords } = extractInlineChords(line);
    for (const c of chords) chordSet.add(c.chord);
    song.lines.push({ type: 'lyric', chords, text });
  }

  song.chords = Array.from(chordSet);
  return song;
}

function handleDirective(song, name, value) {
  switch (name) {
    case 'title': case 'subtitle': song.title = song.title || value; break;
    case 'artist': song.artist = value; break;
    case 'key': song.key = value; break;
    case 'capo': song.capo = parseInt(value, 10) || 0; break;
    case 'tempo': song.tempo = parseInt(value, 10) || 0; break;
    case 'time': song.timeSig = value || '4/4'; break;
    case 'start_of_chorus': song.lines.push({ type: 'section_start', section: 'chorus' }); break;
    case 'end_of_chorus': song.lines.push({ type: 'section_end', section: 'chorus' }); break;
    case 'start_of_verse': song.lines.push({ type: 'section_start', section: 'verse' }); break;
    case 'end_of_verse': song.lines.push({ type: 'section_end', section: 'verse' }); break;
    case 'start_of_bridge': song.lines.push({ type: 'section_start', section: 'bridge' }); break;
    case 'end_of_bridge': song.lines.push({ type: 'section_end', section: 'bridge' }); break;
  }
}

/**
 * Extract inline [chord] markers from a line of mixed chords + lyrics.
 * @param {string} line
 * @returns {{text: string, chords: {chord: string, pos: number}[]}}
 */
export function extractInlineChords(line) {
  const chords = [];
  let text = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '[') {
      const close = line.indexOf(']', i);
      if (close === -1) { text += line.slice(i); break; }
      const chord = line.slice(i + 1, close).trim();
      if (chord) chords.push({ chord, pos: text.length });
      i = close + 1;
    } else {
      text += line[i++];
    }
  }
  return { text, chords };
}

/**
 * Re-serialize a Song back to ChordPro text (for export).
 * @param {Song} song
 * @returns {string}
 */
export function serializeChordPro(song) {
  const out = [];
  if (song.title) out.push(`{title: ${song.title}}`);
  if (song.artist) out.push(`{artist: ${song.artist}}`);
  if (song.key) out.push(`{key: ${song.key}}`);
  if (song.capo) out.push(`{capo: ${song.capo}}`);
  if (song.tempo) out.push(`{tempo: ${song.tempo}}`);
  if (song.timeSig && song.timeSig !== '4/4') out.push(`{time: ${song.timeSig}}`);
  if (out.length) out.push('');

  for (const line of song.lines) {
    if (line.type === 'directive') continue; // already written from header
    if (line.type === 'blank') { out.push(''); continue; }
    if (line.type === 'comment') { out.push(`# ${line.text}`); continue; }
    if (line.type === 'section_start') { out.push(`{start_of_${line.section}}`); continue; }
    if (line.type === 'section_end') { out.push(`{end_of_${line.section}}`); continue; }
    if (line.type === 'lyric') {
      let s = '', cur = 0;
      const sorted = [...line.chords].sort((a, b) => a.pos - b.pos);
      for (const c of sorted) {
        s += line.text.slice(cur, c.pos) + `[${c.chord}]`;
        cur = c.pos;
      }
      s += line.text.slice(cur);
      out.push(s);
    }
  }
  return out.join('\n');
}
