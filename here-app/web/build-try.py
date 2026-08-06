"""
Build the browser demo: the app as one file, with no server behind it.

    python3 web/build-try.py                  # writes try/index.html
    python3 web/build-try.py --skip-export    # reuse the last export

Why this exists: testers were failing to get through TestFlight. Apple's invite
flow asks a teacher to install a second app, accept an invitation from an email
that often lands in junk, and trust a build labelled as unreleased. Some never
arrived, and a tester who cannot open the app has no opinion to give us. So
there is a link.

The output is one file, `try/index.html`, around 2.4MB — the app, its bundle,
its fonts and its illustrations, all inside it. It is named index.html so the
host serves it at the bare address rather than at `/app.html`. Drop the folder
on any static host and the URL is the demo.

The page it sits inside — the intro, the survey — is built in Squarespace, not
here. See docs/try.md, which has the copy and the code block to paste.

─── The part worth being careful about ─────────────────────────────────────────

The demo must not touch the real backend. If it did, a stranger poking at a
public page would need a real emailed code to get past the door, and anything
they wrote would land in the same database as the pilot's actual posts.

So the export runs with the Supabase variables stripped from the environment.
`BACKEND_CONFIGURED` then comes out false and the app falls back to what it did
before the server existed: any six digits opens it, posts stay in the browser,
the feed is the sample one. There is a check afterwards that refuses to write
anything if a project URL or a key made it into the bundle regardless — a build
that silently kept the backend is the one failure here that would matter, so it
is a hard stop rather than a warning.
"""

import os
import pathlib
import re
import shutil
import subprocess
import sys

WEB = pathlib.Path(__file__).resolve().parent
APP = WEB.parent
OUT = APP / 'try'

# Everything that switches the app on to a server. Cleared for the export, and
# checked for afterwards.
BACKEND_VARS = (
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
)

# ─────────────────────────────────────────────────────────────────────────────
# Two things the demo needs that the app does not, injected here rather than
# added to the source. Neither should ever ship to a phone.
#
# `?reset` — the page framing this lives on another domain, so its "start
# again" button cannot reach in and clear storage; that is a security rule, not
# a bug. What it can do is point the frame at a new address, so the demo reads
# one.
#
# The storage fallback — Safari refuses storage to a frame from another domain
# under settings a lot of people have on, and iPhone teachers are most of this
# audience. Without this the app throws on boot and they get a white rectangle.
# With it they get a demo that forgets on refresh, which is a demo.
# ─────────────────────────────────────────────────────────────────────────────
DEMO_SHIM = """<script>
(function () {
  try {
    window.localStorage.setItem('__probe__', '1');
    window.localStorage.removeItem('__probe__');
  } catch (e) {
    var mem = {};
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: function (k) { return k in mem ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; },
        clear: function () { mem = {}; },
        key: function (i) { var ks = Object.keys(mem); return i < ks.length ? ks[i] : null; },
        get length() { return Object.keys(mem).length; }
      }
    });
  }
  if (/[?&]reset\\b/.test(window.location.search)) {
    try { window.localStorage.clear(); } catch (e) {}
  }
})();
</script>
"""


def run(command: list[str], env: dict) -> None:
    print('$ ' + ' '.join(command))
    if subprocess.run(command, cwd=APP, env=env).returncode != 0:
        sys.exit(f'{command[0]} failed')


# ─── 1. Export the app with no backend ───────────────────────────────────────

env = {k: v for k, v in os.environ.items() if k not in BACKEND_VARS}
if '--skip-export' in sys.argv:
    # For iterating on the shim, which is the only thing here worth iterating
    # on. The check below still runs, so this cannot be how a backend sneaks in.
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

# ─── 2. Prove there is no backend in it ──────────────────────────────────────

# Patterns for a *value*, not a mention. The Supabase library itself contains
# the string `supabase.co` in its wildcard list and both key prefixes in a
# comparison, so a plain substring search fails every build — and a check that
# fails every build is a check somebody deletes.
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

# ─── 3. Add the shim and write it out ────────────────────────────────────────

# Before everything else in the head, so it is in place by the time the bundle
# reads storage. `<head>` is the export's own, not something this file writes.
if '<head>' not in app:
    sys.exit('no <head> in the export — has the layout changed?')
app = app.replace('<head>', '<head>\n' + DEMO_SHIM, 1)

# A demo is not a page to be found by searching. It is for people holding the
# link, and an indexed copy of a fake feed is not what should come up for Here.
app = app.replace('<head>', '<head>\n<meta name="robots" content="noindex" />', 1)

OUT.mkdir(exist_ok=True)
(OUT / 'index.html').write_text(app, encoding='utf-8')

# There was a second file here once: a standalone page with the intro and the
# survey on it, posting to a Supabase table. The survey moved to a Squarespace
# form, which the site owner can edit without a build, so the page went with it.
# Clear the old one out rather than leaving a stale copy to be uploaded.
stale = OUT / 'app.html'
if stale.exists():
    stale.unlink()

print(f'try/index.html  {(OUT / "index.html").stat().st_size // 1024} KB')
print('upload the try/ folder — see docs/try.md')
