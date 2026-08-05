"""
Build the landing page: one self-contained HTML file.

    python3 web/build-landing.py            # writes dist/here-landing.html and dist/apple-steps.html

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


fonts = {key: b64(APP / 'node_modules' / rel) for key, rel in FONTS.items()}


def build(source: str, target: str, extra: dict | None = None) -> None:
    """Substitute the inlined assets into one page and write it out."""
    text = (WEB / source).read_text(encoding='utf-8')
    subs = {**fonts, **(extra or {})}
    for key, value in subs.items():
        if key not in text:
            sys.exit(f'placeholder {key} is missing from {source}')
        text = text.replace(key, value)
    out = APP / 'dist' / target
    out.parent.mkdir(exist_ok=True)
    out.write_text(text, encoding='utf-8')
    print(f'{out.relative_to(APP)}  {len(text.encode("utf-8")) // 1024} KB')


# Renamed from tended-landing.html once every other name had become Here. That
# does mint a new preview URL — an artifact's link is bound to its file path —
# but the old one was a marketing page nobody outside this repo was holding,
# and a file called `tended-` in a project called Here is the kind of loose end
# that outlives the reason for it.
build('landing.src.html', 'here-landing.html',
      {'__HERO_ART__': 'data:image/jpeg;base64,' + b64(WEB / 'hero.jpg')})

# The plain-language walkthrough for shipping to TestFlight. Shares the fonts
# and the app's tokens so it reads as part of Here rather than as a handout.
build('apple-steps.src.html', 'apple-steps.html')
