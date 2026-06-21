#!/usr/bin/env bash
# Re-deploy after editing the game (e.g. js/content.js).
# Commits and pushes the static site to GitHub Pages.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

git -C "$DIR" add -A
if git -C "$DIR" diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi
git -C "$DIR" commit -m "Update Street Food Spies"
git -C "$DIR" push
echo ""
echo "Pushed. Your site rebuilds in ~1 minute:"
echo "  https://jimtindill.github.io/street-food-spies/"
