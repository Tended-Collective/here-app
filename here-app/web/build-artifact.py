"""
Fold the Expo web export into one self-contained HTML file.

    npx expo export --platform web
    python3 web/build-artifact.py        # writes dist/here-app.html

The published preview runs under a content policy that blocks every external
origin — no separate script file, no separate image, no font request — so the
bundle, the fonts and the illustration all have to travel inside the page. That
is what this does and all it does: read `dist/index.html`, swap each `src` and
`url()` reference for the bytes it points at, and write one file.

Two things are worth knowing before changing it.

The bundle is inlined as a plain `<script>` body rather than a `data:` src.
A `data:` URL counts as its own origin under the policy and is refused; the
inline body is covered by the page itself.

Every reference is rewritten by exact filename, and a miss is fatal rather than
silent. A page that quietly ships with a missing font renders in Times and
looks like a bug in the app, which is a much more expensive thing to discover
than a failed build.
"""

import base64
import mimetypes
import pathlib
import re
import sys

APP = pathlib.Path(__file__).resolve().parent.parent
DIST = APP / 'dist'
OUT = DIST / 'here-app.html'


def read(rel: str) -> bytes:
    path = DIST / rel.lstrip('/')
    if not path.exists():
        sys.exit(f'missing {path} — run: npx expo export --platform web')
    return path.read_bytes()


def data_uri(rel: str) -> str:
    kind = mimetypes.guess_type(rel)[0] or 'application/octet-stream'
    return f'data:{kind};base64,{base64.b64encode(read(rel)).decode("ascii")}'


page = (DIST / 'index.html').read_text(encoding='utf-8')

# The JS bundle, inline. Everything else the app needs is reached from inside
# it, so this has to happen before the asset pass below.
script = re.search(r'<script src="([^"]+)" defer></script>', page)
if not script:
    sys.exit('no bundle <script> in dist/index.html')
bundle = read(script.group(1)).decode('utf-8')

# The bundle asks for its fonts and images by path. Rewrite each one to the
# bytes themselves. Sorted longest-first so no filename is a prefix of another.
refs = sorted(set(re.findall(r'"(/(?:assets|node_modules)/[^"]+?\.(?:ttf|otf|woff2?|jpg|jpeg|png|gif|svg))"', bundle)),
              key=len, reverse=True)
if not refs:
    sys.exit('no asset references found in the bundle — has the export layout changed?')
for rel in refs:
    bundle = bundle.replace(f'"{rel}"', f'"{data_uri(rel)}"')
print(f'inlined {len(refs)} assets')

# The favicon is a link, not a bundle reference.
page = page.replace('href="/favicon.ico"', f'href="{data_uri("/favicon.ico")}"')

# `</script>` anywhere in the source would close the tag early. It cannot appear
# in valid JS outside a string, and escaping the slash keeps the string equal.
page = page.replace(
    script.group(0),
    '<script>' + bundle.replace('</script>', '<\\/script>') + '</script>',
)

OUT.write_text(page, encoding='utf-8')
print(f'{OUT.relative_to(APP)}  {len(page.encode("utf-8")) // 1024} KB')
