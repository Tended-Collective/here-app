"""
Build the standalone HTML pages: one self-contained file each.

    python3 web/build-pages.py            # writes dist/apple-steps.html

The pages are published as previews under a strict content policy that blocks
every external origin, so the fonts have to travel inside the file. That makes
a built page around 500KB, which is not a thing anyone wants to edit — hence
the `.src.html` sources, which keep placeholders and stay small.

Fonts are read out of node_modules rather than checked in as base64, so a page
cannot drift from the faces the app itself loads in `App.tsx`.

There used to be a second page here: a marketing site with its own copy of the
check-in and the feed. It was written before the app's first screen looked like
anything, and once that screen became the same illustration and the same words,
the two were one thing described twice — and the wrong one kept being the thing
people opened. It is in the history if the website is ever wanted back.
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


def build(source: str, target: str) -> None:
    """Substitute the inlined fonts into one page and write it out."""
    text = (WEB / source).read_text(encoding='utf-8')
    for key, value in fonts.items():
        if key not in text:
            sys.exit(f'placeholder {key} is missing from {source}')
        text = text.replace(key, value)
    out = APP / 'dist' / target
    out.parent.mkdir(exist_ok=True)
    out.write_text(text, encoding='utf-8')
    print(f'{out.relative_to(APP)}  {len(text.encode("utf-8")) // 1024} KB')


# The plain-language walkthrough for getting the app onto TestFlight. Uses the
# app's own tokens so it reads as part of Here rather than as a handout.
build('apple-steps.src.html', 'apple-steps.html')
