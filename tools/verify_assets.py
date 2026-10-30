#!/usr/bin/env python3
"""verify_assets.py — every image path referenced by apps/game/ must exist.

Scans the data, rules, tape and UI files for '../../Source/...' paths and
resolves each one against the repo. Exits nonzero on the first missing file.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "apps", "game")
PATH_RE = re.compile(r"['\"](\.\./\.\./Source/[^'\"]+)['\"]")

def scan():
    refs = []
    for dirpath, _dirs, files in os.walk(GAME):
        for fn in files:
            if not fn.endswith((".js", ".html", ".css")):
                continue
            full = os.path.join(dirpath, fn)
            with open(full, encoding="utf-8") as fh:
                for lineno, line in enumerate(fh, 1):
                    for m in PATH_RE.finditer(line):
                        refs.append((os.path.relpath(full, ROOT), lineno, m.group(1)))
    return refs

def main():
    refs = scan()
    if not refs:
        print("verify_assets: no asset references found — did the scan path change?")
        return 1
    missing, prefixes = [], set()
    for src, lineno, rel in refs:
        # Paths are resolved by the BROWSER, relative to apps/game/index.html,
        # not relative to the .js file that contains the string.
        if not os.path.splitext(rel)[1]:
            prefixes.add(rel)   # a path fragment joined at runtime, not a file.
            continue            # node tools/test_sw_data.js checks those with fs.
        resolved = os.path.normpath(os.path.join(GAME, rel))
        if not os.path.isfile(resolved):
            missing.append((src, lineno, rel))
    unique = {r[2] for r in refs if os.path.splitext(r[2])[1]}
    for src, lineno, rel in missing:
        print(f"  MISSING {rel}  ({src}:{lineno})")
    if prefixes:
        print(f"  {len(prefixes)} runtime-built path prefix(es) skipped "
              f"(checked by node tools/test_sw_data.js): {', '.join(sorted(prefixes))}")
    print(f"verify_assets: {len(unique)} unique assets referenced, {len(missing)} missing")
    return 1 if missing else 0

if __name__ == "__main__":
    sys.exit(main())
