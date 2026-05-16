#!/usr/bin/env node
// Builds a single self-contained HTML file with all CSS, JS modules, and icons inlined.
// Output: dist/guitar.html (AirDrop-able, openable directly from Files app).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'dist', 'guitar.html');
mkdirSync(dirname(OUT), { recursive: true });

const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const readB64 = (p) => readFileSync(resolve(ROOT, p)).toString('base64');

const baseCss = read('styles/base.css');
const componentsCss = read('styles/components.css');

// Inline modules: bundle by hand. Order matters: leaves first, then importers.
// We rewrite imports/exports to use a single global namespace.
function bundleModules() {
  const files = [
    'src/store.js',
    'src/db.js',
    'src/transpose.js',
    'src/chordpro.js',
    'src/chords.js',
    'src/scroll.js',
    'src/songs-seed.js',
    'src/audio/metronome.js',
    'src/audio/tuner.js',
    'src/audio/reference.js',
    'src/ui/song-list.js',
    'src/ui/song-player.js',
    'src/ui/song-edit.js',
    'src/ui/tuner-view.js',
    'src/ui/metronome-view.js',
    'src/ui/settings.js',
    'src/app.js',
  ];

  // Bundling strategy: keep imports/exports intact, but use blob URL trick.
  // Simpler: wrap each module in a function and use a fake module registry.
  // Even simpler: just concatenate as ES modules using blob URLs at runtime.
  // We use the "import map + inline modules" approach via data: URLs.

  const map = {};
  for (const f of files) map[f] = read(f);

  // Build an importmap that points each path to a data: URL of its source.
  // Each module's relative imports need to be rewritten to absolute paths.
  const rewritten = {};
  for (const f of files) {
    let src = map[f];
    const dir = dirname(f);
    src = src.replace(/from\s+(['"])([./][^'"]+)\1/g, (m, q, spec) => {
      const abs = resolve('/', dir, spec).slice(1); // POSIX-relative key
      return `from ${q}${abs}${q}`;
    });
    src = src.replace(/import\s*\(\s*(['"])([./][^'"]+)\1\s*\)/g, (m, q, spec) => {
      const abs = resolve('/', dir, spec).slice(1);
      return `import(${q}${abs}${q})`;
    });
    rewritten[f] = src;
  }

  // Build importmap entries: each file → blob URL
  const blobScript = `
    (function() {
      const files = ${JSON.stringify(rewritten)};
      const urlMap = {};
      // Two-pass: create blob URLs, then rewrite cross-refs to those URLs
      for (const path in files) urlMap[path] = '';
      function urlFor(path) {
        if (urlMap[path]) return urlMap[path];
        let src = files[path];
        src = src.replace(/from\\s+(['"])([^'"]+)\\1/g, (m, q, spec) => {
          if (urlMap[spec]) return 'from ' + q + urlMap[spec] + q;
          return m;
        });
        const blob = new Blob([src], { type: 'text/javascript' });
        urlMap[path] = URL.createObjectURL(blob);
        return urlMap[path];
      }
      // Build in dependency order (no deps first)
      const order = ${JSON.stringify(files)};
      for (const f of order) urlFor(f);
      // Re-create with cross-references resolved
      for (const f of order) {
        let src = files[f];
        src = src.replace(/from\\s+(['"])([^'"]+)\\1/g, (m, q, spec) => {
          if (urlMap[spec]) return 'from ' + q + urlMap[spec] + q;
          return m;
        });
        const blob = new Blob([src], { type: 'text/javascript' });
        URL.revokeObjectURL(urlMap[f]);
        urlMap[f] = URL.createObjectURL(blob);
      }
      // Boot the app entry
      const s = document.createElement('script');
      s.type = 'module';
      s.src = urlMap['src/app.js'];
      document.body.appendChild(s);
    })();
  `;
  return blobScript;
}

const moduleBoot = bundleModules();

// Inline icons as data URIs in the manifest
let manifestObj;
try {
  manifestObj = JSON.parse(read('manifest.json'));
  const icon192 = readB64('assets/icon-192.png');
  const icon512 = readB64('assets/icon-512.png');
  manifestObj.icons = [
    { src: `data:image/png;base64,${icon192}`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: `data:image/png;base64,${icon512}`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ];
  // start_url must be relative for inline; use current file
  manifestObj.start_url = './';
  manifestObj.scope = './';
  delete manifestObj.share_target; // not useful for file:// or AirDrop install
} catch (e) {
  console.warn('icons not found yet; run gen-icons first. Continuing without manifest icons.');
  manifestObj = { name: 'Guitar Practice', short_name: 'Guitar', display: 'standalone' };
}

const manifestB64 = Buffer.from(JSON.stringify(manifestObj)).toString('base64');
const manifestURL = `data:application/json;base64,${manifestB64}`;

let appleIcon = '';
try { appleIcon = `data:image/png;base64,${readB64('assets/apple-touch-icon.png')}`; } catch {}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
  <meta name="theme-color" content="#0e0f12" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Guitar" />
  <meta name="mobile-web-app-capable" content="yes" />
  <title>Guitar Practice</title>
  <link rel="manifest" href="${manifestURL}" />
  ${appleIcon ? `<link rel="apple-touch-icon" href="${appleIcon}" />` : ''}
  <style>
${baseCss}
${componentsCss}
  </style>
</head>
<body>
  <div id="app">
    <header class="topbar">
      <button class="back-btn ghost hidden" aria-label="Back">‹ Back</button>
      <h1>Guitar Practice</h1>
      <button class="add-btn ghost" aria-label="Add song">+ Add</button>
    </header>
    <main style="flex:1;position:relative;overflow:hidden;">
      <section id="screen-songs" class="screen active"></section>
      <section id="screen-player" class="screen" style="display:none"></section>
      <section id="screen-edit" class="screen"></section>
      <section id="screen-tuner" class="screen"></section>
      <section id="screen-metronome" class="screen"></section>
      <section id="screen-settings" class="screen"></section>
    </main>
    <nav class="tabbar">
      <button data-tab="songs"><span class="icon">♫</span>Songs</button>
      <button data-tab="tuner"><span class="icon">🎚</span>Tuner</button>
      <button data-tab="metronome"><span class="icon">𝅘𝅥</span>Metronome</button>
      <button data-tab="settings"><span class="icon">⚙</span>Settings</button>
    </nav>
  </div>
  <script>
${moduleBoot}
  </script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`Built ${OUT} (${html.length} bytes, ${(html.length / 1024).toFixed(1)} KB)`);
