/**
 * Bundles the exported web build into a single self-contained HTML file for
 * publishing as an Artifact.
 *
 * Artifacts are served under a strict CSP with no external hosts and no sibling
 * files, so the JS bundle and the four bundled font files all have to travel
 * inside the one document:
 *
 *   1. each font's asset path in the bundle becomes a data: URI, which `font-src`
 *      allows, and
 *   2. the bundle goes into a genuinely inline <script>. A `data:` URI script is
 *      still a fetch as far as `script-src` is concerned and the CSP drops it,
 *      which renders as a blank page — inline is the only thing that survives.
 *
 * Run `npx expo export --platform web` first, then `node scripts/build-artifact.mjs`.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
/**
 * The live preview's URL belongs to this exact path — republishing anything
 * else mints a new link and leaves the one people hold frozen on whatever it
 * last had, looking fine the whole time. Default here so a build cannot
 * accidentally target the wrong file. See the README.
 *
 * `dist/artifact.html` is deliberately not the default any more: that path owns
 * a retired link and now serves a "this preview has moved" notice.
 */
const OUT = process.argv[2] ?? 'dist/tended-2026-07-31.html';

const bundleDir = join(DIST, '_expo/static/js/web');
const bundleName = readdirSync(bundleDir).find((f) => f.endsWith('.js'));
if (!bundleName) throw new Error(`no web bundle in ${bundleDir} — run expo export first`);

let bundle = readFileSync(join(bundleDir, bundleName), 'utf8');

// The bundle refers to each font as an absolute path ("/assets/node_modules/….ttf")
// in its own tiny module. Swap each for the font itself.
const FONT_RE = /"(\/assets\/[^"]*\.ttf)"/g;
const fonts = [...new Set([...bundle.matchAll(FONT_RE)].map((m) => m[1]))];
if (fonts.length === 0) throw new Error('no font assets found in bundle — did the export change?');

for (const path of fonts) {
  const bytes = readFileSync(join(DIST, path.replace(/^\//, '')));
  const uri = `data:font/ttf;base64,${bytes.toString('base64')}`;
  bundle = bundle.split(`"${path}"`).join(JSON.stringify(uri));
}

// Neutralise the only two sequences that could close the inline script early.
// Both are inside string literals, so the escapes are semantically identical.
const inlined = bundle.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// No <!doctype>/<html>/<head>/<body> — the Artifact host supplies that skeleton.
//
// #root gets a fixed pixel height, NOT a viewport-relative one: the host sizes
// the iframe from the content's scrollHeight, so a `vh`/`svh` height is circular
// and settles at zero. PhoneFrame also scales the device by window height, so a
// collapsed box would shrink the mock to nothing even if the page were painted.
const PAGE_HEIGHT = 920; //  402×874 device + bezel (894) + breathing room
const PHONE_HEIGHT = 680; // a real phone, where there is no device mock to fit

// The narrow case is a media query rather than a viewport unit for the same
// reason the base height is fixed: `svh` would depend on the frame the frame is
// being sized from. On a phone the device mock is not drawn at all, so 920px
// only bought a screenful of empty space above the content.
const html = `<title>Tended</title>
<style>
  body { margin: 0; }
  #root { display: flex; height: ${PAGE_HEIGHT}px; overflow: hidden; }
  @media (max-width: 500px) {
    #root { height: ${PHONE_HEIGHT}px; }
  }
</style>
<div id="root"></div>
<script>${inlined}</script>
`;

writeFileSync(OUT, html);
const mb = (html.length / 1024 / 1024).toFixed(2);
console.log(`wrote ${OUT} (${mb} MB, ${fonts.length} fonts inlined)`);
