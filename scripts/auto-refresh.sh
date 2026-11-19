#!/usr/bin/env bash
# Auto-refresh for www.africavsthefuture.xyz (no agent involved).
# Fetches Medium, Substack, SoundCloud, Bluesky and Gumroad at build time, runs the
# SEO audit, and deploys to Firebase Hosting ONLY if the fetched data changed since
# the last successful deploy. A failed build or audit aborts with no deploy.
# Cron (box crontab): 15 */6 * * *  /workspace/avtf-site/scripts/auto-refresh.sh
set -uo pipefail
SITE=/workspace/avtf-site
LOG="$SITE/logs/auto-refresh.log"
STAMP="$SITE/logs/.last-deployed-data.sha256"
LOCK="$SITE/logs/.auto-refresh.lock"
export PATH="/usr/local/bin:/home/box/.local/bin:/usr/bin:/bin"
export HOME=/home/box
# The box is shared and memory is tight: keep image processing lean.
export VIPS_CONCURRENCY=1 UV_THREADPOOL_SIZE=2
mkdir -p "$SITE/logs"
exec >>"$LOG" 2>&1
ts() { date '+%Y-%m-%d %H:%M:%S %Z'; }
log() { echo "[$(ts)] $*"; }

exec 9>"$LOCK"
if ! flock -n 9; then log "another auto-refresh is running; exiting"; exit 0; fi

cd "$SITE" || exit 1
DATA_FILES=(src/data/medium.json src/data/substack.json src/data/soundcloud.json src/data/bluesky.json src/data/gumroad.json)
data_hash() { cat "${DATA_FILES[@]}" 2>/dev/null | sha256sum | cut -d' ' -f1; }

log "start"
if ! timeout 25m npm run build >"$SITE/logs/last-build.log" 2>&1; then
  log "BUILD FAILED; no deploy. Tail of logs/last-build.log:"; tail -n 20 "$SITE/logs/last-build.log"; exit 1
fi
grep '^\[fetch\]' "$SITE/logs/last-build.log"
if grep -q '^\[fetch\].*EMPTY' "$SITE/logs/last-build.log"; then log "a source returned EMPTY with no cache; no deploy"; exit 1; fi
if ! npm run audit >"$SITE/logs/last-audit.log" 2>&1; then
  log "AUDIT FAILED (broken links or JSON-LD errors); no deploy:"; grep -E 'BROKEN|parse error' "$SITE/logs/last-audit.log" | head -20; exit 1
fi
log "build + audit ok"

NEW=$(data_hash); OLD=$(cat "$STAMP" 2>/dev/null || echo none)
if [ "$NEW" = "$OLD" ]; then log "fetched data unchanged since last deploy; no deploy"; exit 0; fi

log "fetched data changed; deploying"
if timeout 15m firebase deploy --only hosting --project africavsthefuture --non-interactive -m "Auto-refresh $(date -u +%Y-%m-%dT%H:%MZ): feed data changed" >"$SITE/logs/last-deploy.log" 2>&1; then
  echo "$NEW" >"$STAMP"
  log "deployed: $(grep -o 'Hosting URL: .*' "$SITE/logs/last-deploy.log" | head -1)"
  node scripts/indexnow.mjs >>"$LOG" 2>&1 || log "indexnow ping failed (non-fatal)"
else
  log "DEPLOY FAILED:"; tail -n 20 "$SITE/logs/last-deploy.log"; exit 1
fi
log "done"
