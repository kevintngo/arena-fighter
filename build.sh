#!/bin/sh
# Builds the game from src/.   sh build.sh      -> index.html (minified, packed, self-extracting)
#                              sh build.sh dev  -> dev.html   (readable, with window.__vd test hooks)
set -e
cd "$(dirname "$0")"
T="${TMPDIR:-/tmp}/voidlight-duel-build"; mkdir -p "$T"
cat src/01_core.js src/01b_engine.js src/02_tex.js src/03_geom.js src/04_gx.js src/05_fx.js src/07_props.js src/07b_props2.js src/08_themes.js src/08b_themes2.js src/09_arena.js src/10_rigs.js src/11_fighter.js src/11b_anim.js src/12_stage.js src/13_roster.js src/14_ai.js src/15_audio.js src/16_duel.js src/17_touch.js > "$T/all.mjs"
node --check "$T/all.mjs"
if [ "$1" = "dev" ]; then cat src/00_head.html "$T/all.mjs" src/99_tail.html > dev.html; echo "wrote dev.html"; exit 0; fi
python3 tools/minify.py "$T/all.mjs" "$T/min.mjs" --platform tools/platform.txt --strip-hook
node --check "$T/min.mjs"
python3 tools/pack.py "$T/min.mjs" src/00_head.html index.html
