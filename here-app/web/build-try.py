"""
Build the public browser version: the app plus the pilot survey, two files.

    python3 web/build-try.py                      # writes try/
    python3 web/build-try.py --key=sb_publish...  # …with the form connected

Why this exists at all: testers were failing to get through TestFlight. Apple's
invite flow asks a teacher to install a second app, accept an invitation from an
email that often lands in junk, and trust a build labelled as unreleased. A link
is one tap, so this makes one.

The output is a folder of two ordinary files with no server behind them:

    try/index.html   the page — intro, the app in a phone frame, the survey
    try/app.html     the app itself, self-contained, ~2.4MB

They are relative to each other and to nothing else, so the folder can be
dropped on any static host and it works.

─── The part worth being careful about ─────────────────────────────────────────

The demo must not touch the real backend. If it did, a stranger poking at a
public page would need a real emailed code to get past the door, and anything
they wrote would land in the same database as the pilot's actual posts.

So the export below runs with the Supabase variables stripped from the
environment. `BACKEND_CONFIGURED` then comes out false and the app falls back to
what it did before the server existed: any six digits opens it, posts stay in
the browser, the feed is the sample one. There is a check after the export that
refuses to write anything if a project URL made it into the bundle regardless —
a build that silently kept the backend is the one failure here that would matter,
so it is a hard stop rather than a warning.
"""

import base64
import os
import pathlib
import re
import shutil
import subprocess
import sys

WEB = pathlib.Path(__file__).resolve().parent
APP = WEB.parent
OUT = APP / 'try'

FONTS = {
    '__NEWSREADER_300__': '@expo-google-fonts/newsreader/300Light/Newsreader_300Light.ttf',
    '__NEWSREADER_400__': '@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf',
    '__PLEXMONO_500__': '@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf',
}

# Everything that switches the app on to a server. Cleared for the export, and
# checked for afterwards.
BACKEND_VARS = (
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
)


def publishable_key() -> str:
    """
    The key the survey posts with, from the command line, the environment or
    `.env` — in that order, first one wins.

    It is safe in a public page. A publishable key names the project and grants
    nothing by itself; what keeps the answers private is the database, where the
    feedback table allows an insert from anyone and a read from nobody. The one
    that must never appear here is the secret key, so anything shaped like one
    is refused rather than pasted into a file the whole internet can read.
    """
    found = ''
    for arg in sys.argv[1:]:
        if arg.startswith('--key='):
            found = arg[len('--key=') :].strip()
    if not found:
        found = (os.environ.get('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') or '').strip()
    if not found:
        env = APP / '.env'
        if env.exists():
            for line in env.read_text(encoding='utf-8').splitlines():
                name, _, value = line.partition('=')
                if name.strip() == 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY':
                    found = value.strip().strip('"').strip("'")

    if found.startswith('sb_secret_') or found.startswith('service_role'):
        sys.exit('that is the secret key — it must never go in a public page')
    return found


def b64(rel: str) -> str:
    path = APP / 'node_modules' / rel
    if not path.exists():
        sys.exit(f'missing {path} — run npm install first')
    return base64.b64encode(path.read_bytes()).decode('ascii')


def run(command: list[str], env: dict) -> None:
    print('$ ' + ' '.join(command))
    if subprocess.run(command, cwd=APP, env=env).returncode != 0:
        sys.exit(f'{command[0]} failed')


# ─── 1. Export the app with no backend ───────────────────────────────────────

env = {k: v for k, v in os.environ.items() if k not in BACKEND_VARS}
if '--skip-export' in sys.argv:
    # For editing the page around the app, which is most of the editing. The
    # check below still runs, so this cannot be the way a backend sneaks in.
    print('skipping the export — reusing dist/here-app.html')
else:
    # Metro caches transformed modules, and the cache is keyed on the file
    # rather than on the environment it was read with. Without --clear, a
    # machine that has built the app normally hands back the modules that
    # closed over the real keys.
    run(['npx', 'expo', 'export', '--platform', 'web', '--clear'], env)
    run([sys.executable, str(WEB / 'build-artifact.py')], env)

built = APP / 'dist' / 'here-app.html'
if not built.exists():
    sys.exit(f'{built} is not there — run without --skip-export')
app = built.read_text(encoding='utf-8')

# Patterns for a *value*, not a mention. The Supabase library itself contains
# the string `supabase.co` in its wildcard list and both key prefixes in a
# comparison, so a plain substring search fails every build. What must not be
# here is a project host or a key that somebody could actually use.
LEAKS = {
    'a project URL': r'https://[a-z0-9]{16,}\.supabase\.(?:co|in)',
    'a publishable key': r'sb_publishable_[A-Za-z0-9_-]{12,}',
    'a secret key': r'sb_secret_[A-Za-z0-9_-]{12,}',
    'a legacy anon key': r'eyJ[A-Za-z0-9_-]{30,}\.eyJ[A-Za-z0-9_-]{30,}',
}
leaked = [what for what, pattern in LEAKS.items() if re.search(pattern, app)]
if leaked:
    sys.exit(
        'refusing to write: the export still carries the backend — found '
        f'{", ".join(leaked)}. Nothing has been written to try/.'
    )
print('checked: no project URL and no key in the demo build')

# ─── 2. The page around it ───────────────────────────────────────────────────

page = (WEB / 'try.src.html').read_text(encoding='utf-8')
for placeholder, rel in FONTS.items():
    if placeholder not in page:
        sys.exit(f'placeholder {placeholder} is missing from try.src.html')
    page = page.replace(placeholder, b64(rel))

key = publishable_key()
if key:
    page = page.replace('PASTE_YOUR_PUBLISHABLE_KEY_HERE', key)
    print('the survey is connected — answers will reach Supabase')
else:
    print('no publishable key found — the survey will say it is not connected')

# The sources here are fragments, the way the preview pages are. A file served
# off a real host needs the document around it — and it needs the viewport tag,
# or a phone lays the page out at desktop width and then shrinks the lot.
title, _, rest = page.partition('\n')
if not title.startswith('<title>'):
    sys.exit('try.src.html should start with its <title>')
page = (
    '<!doctype html>\n<html lang="en">\n<head>\n'
    '<meta charset="utf-8" />\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1" />\n'
    # Not a page to be found by searching. It is for people holding the link.
    '<meta name="robots" content="noindex" />\n'
    f'{title}\n</head>\n<body>\n'
    + rest.strip()
    + '\n</body>\n</html>\n'
)

# ─── 3. Write the folder ─────────────────────────────────────────────────────

OUT.mkdir(exist_ok=True)
(OUT / 'index.html').write_text(page, encoding='utf-8')
shutil.copyfile(APP / 'dist' / 'here-app.html', OUT / 'app.html')

for name in ('index.html', 'app.html'):
    size = (OUT / name).stat().st_size
    print(f'try/{name}  {size // 1024} KB')
