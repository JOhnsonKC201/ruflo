#!/usr/bin/env node
// Generates app icons (PNG) using pure Node (no deps). Solid color + simple glyph.
// Output: assets/icon-192.png, assets/icon-512.png, assets/apple-touch-icon.png

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'assets');
mkdirSync(OUT_DIR, { recursive: true });

const BG = [14, 15, 18];        // #0e0f12 (matches theme)
const FG = [255, 183, 77];      // #ffb74d (accent orange)

// CRC32 for PNG chunks
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = data.length;
  const out = Buffer.alloc(4 + 4 + len + 4);
  out.writeUInt32BE(len, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crcInput = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  out.writeUInt32BE(crc32(crcInput), 8 + len);
  return out;
}

/** Draws a guitar pick silhouette + small fretboard lines. */
function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  // Fill background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      pixels[o] = BG[0]; pixels[o+1] = BG[1]; pixels[o+2] = BG[2]; pixels[o+3] = 255;
    }
  }

  // Draw a rounded square plate (padding ~10%)
  const pad = Math.floor(size * 0.12);
  const r = Math.floor(size * 0.18);
  for (let y = pad; y < size - pad; y++) {
    for (let x = pad; x < size - pad; x++) {
      // Rounded corners
      const dx = Math.max(0, pad + r - x, x - (size - pad - r - 1));
      const dy = Math.max(0, pad + r - y, y - (size - pad - r - 1));
      if (Math.sqrt(dx * dx + dy * dy) > r) continue;
      const o = (y * size + x) * 4;
      pixels[o] = FG[0]; pixels[o+1] = FG[1]; pixels[o+2] = FG[2]; pixels[o+3] = 255;
    }
  }

  // Draw 6 horizontal "strings" across the middle (dark on light plate)
  const stringStart = Math.floor(size * 0.28);
  const stringEnd = size - stringStart;
  const stringTop = Math.floor(size * 0.35);
  const stringBot = size - Math.floor(size * 0.30);
  for (let i = 0; i < 6; i++) {
    const y = stringTop + Math.round(i * (stringBot - stringTop) / 5);
    const thickness = Math.max(1, Math.floor(size / 96) + (i > 2 ? 1 : 0));
    for (let t = 0; t < thickness; t++) {
      for (let x = stringStart; x < stringEnd; x++) {
        const o = ((y + t) * size + x) * 4;
        pixels[o] = BG[0]; pixels[o+1] = BG[1]; pixels[o+2] = BG[2]; pixels[o+3] = 255;
      }
    }
  }

  return pixels;
}

function makePNG(size, pixels) {
  // Add filter byte (0=None) per scanline
  const filtered = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    filtered[y * (size * 4 + 1)] = 0;
    pixels.copy(filtered, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const compressed = deflateSync(filtered);

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const pixels = drawIcon(size);
  const png = makePNG(size, pixels);
  writeFileSync(resolve(OUT_DIR, `icon-${size}.png`), png);
  console.log(`Wrote icon-${size}.png (${png.length} bytes)`);
}

// Apple touch icon = 180x180
const aptouch = drawIcon(180);
const aptouchPng = makePNG(180, aptouch);
writeFileSync(resolve(OUT_DIR, 'apple-touch-icon.png'), aptouchPng);
console.log(`Wrote apple-touch-icon.png (${aptouchPng.length} bytes)`);
