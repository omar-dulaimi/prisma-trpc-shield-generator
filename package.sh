#!/bin/bash
# Builds the directory that gets published to npm.
#
# `set -euo pipefail` is load-bearing. This used to call a bare `tsc` with no `set -e`, so when
# tsc was not on PATH the compile failed, the script carried on, `cp -r lib package/lib` failed
# too, and it printed "Done" and exited 0 having assembled a package/ with no lib/ in it. That is
# publishable: `npm publish` will ship a package whose `bin` points at a file that is not there.
set -euo pipefail

START_TIME=$SECONDS
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "Building package..."
rm -rf lib package
# The repo's own TypeScript, not whatever happens to be on PATH, so this works the same whether
# the script is run by pnpm, by CI, or directly from a shell.
./node_modules/.bin/tsc
mkdir package

echo "Copying files..."
cp -r lib package/lib
cp package.json README.md LICENSE package

echo "Making package.json public..."
sed -i 's/"private": true/"private": false/' ./package/package.json

# Post-conditions. `npm publish` does not check any of this, so it is checked here: the bin entry
# point and the modules it pulls in have to exist before the package is worth publishing.
test -f package/lib/generator.js
test -f package/lib/index.js
test -f package/lib/prisma-generator.js
test -f package/lib/helpers.js
test -f package/lib/config.js
test -f package/lib/utils/writeFileSafely.js
grep -q '"private": false' package/package.json

ELAPSED_TIME=$(($SECONDS - $START_TIME))
echo "Done in $ELAPSED_TIME seconds, $(find package -type f | wc -l) files."
