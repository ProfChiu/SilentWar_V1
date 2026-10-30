#!/bin/bash
# PLAY Silent War — double-click to open this folder's game (it opens on the main menu).
#
# Why this file exists (borrowed from Ambush v2): it always opens THIS folder's page, so there is
# no hunting for the right index.html, and it prints the build so a report names what was played.
#
# Optional: SW_SEED=1234 replays patrol 1234 (the seed is also shown in the game's status strip).

set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAGE="$DIR/apps/game/index.html"
SEED="${SW_SEED:-}"

if [ ! -f "$PAGE" ]; then
  echo "Cannot find $PAGE"
  echo "This launcher must stay in the SIlentWar folder, beside apps/."
  read -r -p "Press Return to close."
  exit 1
fi

VERSION="$(sed -n "s/^window.SW_VERSION = '\(.*\)';/\1/p" "$DIR/apps/game/version.js" 2>/dev/null)"
echo "Silent War — v${VERSION:-unknown}"
echo "Folder : $DIR"
echo "Opening: apps/game/index.html${SEED:+?seed=$SEED}"
echo
echo "The main menu opens first (Play, The war, What you decide, How it teaches, About). The Menu button, top left, always brings you back."
echo "The build is named under the title, top left; the patrol's seed is in the status strip."
echo

open "file://$PAGE${SEED:+?seed=$SEED}"
sleep 4
