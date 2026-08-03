"""
Build the landing page: one self-contained HTML file.

    python3 web/build-landing.py            # writes dist/tended-landing.html

The page is hosted somewhere that blocks every external origin, so the fonts and
the illustration have to travel inside the file. That makes the built page about
950KB, which is not a thing anyone wants to edit — hence `landing.src.html`,
which keeps four placeholders and stays around 35KB.

The fonts are read out of node_modules rather than checked in as base64, so the
page cannot drift from the faces the app itself loads in `App.tsx`.
"""

import base64
import pathlib
import sys

WEB = pathlib.Path(__file__).resolve().parent
APP = WEB.parent

FONTS = {
    '__NEWSREADER_300__': '@expo-google-fonts/newsreader/300Light/Newsreader_300Light.ttf',
    '__NEWSREADER_400__': '@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf',
    '__PLEXMONO_500__': '@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf',
}


def b64(path: pathlib.Path) -> str:
    if not path.exists():
        sys.exit(f'missing {path} — run npm install first')
    return base64.b64encode(path.read_bytes()).decode('ascii')


src = (WEB / 'landing.src.html').read_text(encoding='utf-8')

subs = {key: b64(APP / 'node_modules' / rel) for key, rel in FONTS.items()}
subs['__HERO_ART__'] = 'data:image/jpeg;base64,' + b64(WEB / 'hero.jpg')

for key, value in subs.items():
    if key not in src:
        sys.exit(f'placeholder {key} is missing from landing.src.html')
    src = src.replace(key, value)

# Still the old filename on purpose. The published artifact's URL is bound to
# this path — renaming the file mints a new link and orphans the one people
# already have. The page itself says Here everywhere.
out = APP / 'dist' / 'tended-landing.html'
out.parent.mkdir(exist_ok=True)
out.write_text(src, encoding='utf-8')
print(f'{out.relative_to(APP)}  {len(src.encode("utf-8")) // 1024} KB')
