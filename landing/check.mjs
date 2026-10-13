import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const root = new URL('.', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('styles.css', root), 'utf8');
const heritage = await readFile(new URL('heritage.js', root), 'utf8');
const base = process.env.LANDING_URL || 'http://127.0.0.1:4173/';
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Exactly one primary heading');
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `Missing destination: ${match[1]}`);
for (const match of html.matchAll(/<img\b[^>]*>/g)) {
  assert.match(match[0], /alt="[^"]+"/, 'Missing image description');
  assert.match(match[0], /width="\d+"/, 'Missing reserved image width');
  assert.match(match[0], /height="\d+"/, 'Missing reserved image height');
}
assert.ok(!html.includes('\u2014'), 'Em dash in page copy');
assert.ok(!html.includes('fonts.googleapis.com'), 'Fonts must be self-contained');

const assets = new Set([
  'index.html', 'heritage.js',
  ...[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(value => !/^(?:#|https?:)/.test(value)),
  ...[...css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(match => match[1]),
  'assets/models/ngo-mon-preview.glb',
  'assets/vendor/three/three.module.js',
  'assets/vendor/three/three.core.js',
  'assets/vendor/three/loaders/GLTFLoader.js',
  'assets/vendor/three/controls/OrbitControls.js',
  'assets/vendor/three/utils/BufferGeometryUtils.js',
  'assets/vendor/three/utils/SkeletonUtils.js',
  'assets/vendor/three/libs/meshopt_decoder.module.js',
]);
assert.match(heritage, /AbortSignal\.timeout/, '3D asset download must have a timeout');
assert.match(html, /preload="none"/, 'Audio must not autoplay or preload');
assert.ok(!html.includes('autoplay'), 'Audio must wait for a user action');
for (const asset of assets) {
  await access(new URL(asset, root));
  const response = await fetch(new URL(asset, base));
  assert.equal(response.status, 200, `Asset failed: ${asset}`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok((await response.arrayBuffer()).byteLength > 0, `Empty asset: ${asset}`);
}
const home = await fetch(base);
assert.equal(home.status, 200, 'Root URL must open the landing');
assert.match(home.headers.get('content-type'), /text\/html/);
const head = await fetch(base, { method: 'HEAD' });
assert.equal(head.status, 200);
assert.equal((await head.arrayBuffer()).byteLength, 0);
const missing = await fetch(new URL('does-not-exist.html', base));
assert.equal(missing.status, 404);
const outside = await fetch(new URL('%2e%2e%5cpackage.json', base));
assert.equal(outside.status, 403, 'Preview must not expose the parent app');
const method = await fetch(base, { method: 'POST' });
assert.equal(method.status, 405);
console.log(`PASS: ${assets.size} HTML/CSS/JS/image/font resources, local anchors, image descriptions, HTTP root/HEAD/404/405 and parent-path protection.`);
