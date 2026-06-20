#!/usr/bin/env bash
# Re-deploy after editing the game (e.g. js/content.js).
# Bumps the service-worker cache version so phones pick up your changes,
# then commits and pushes to GitHub Pages.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

NEW="munch-spies-$(date +%Y%m%d%H%M%S)"
python3 - "$DIR/service-worker.js" "$NEW" <<'PY'
import sys, re
path, new = sys.argv[1], sys.argv[2]
s = open(path).read()
s = re.sub(r'var CACHE = "[^"]*";', 'var CACHE = "%s";' % new, s)
open(path, 'w').write(s)
print("service-worker cache ->", new)
PY

git -C "$DIR" add -A
if git -C "$DIR" diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi
git -C "$DIR" commit -m "Update game content (deploy $NEW)"
git -C "$DIR" push
echo ""
echo "Pushed. Your site rebuilds in ~1 minute:"
echo "  https://jimtindill.github.io/street-food-spies/"
