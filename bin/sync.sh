#!/usr/bin/env bash
# Copies the content folder from OneDrive and rebuilds the site if anything changed.
# Settings (all optional) are read from the environment, normally /etc/fog/fog.env:
#   FOG_RCLONE_CONF  rclone config holding the [onedrive] remote (must stay writable)
#   FOG_DATA         folder for the content copy, the built site and state
#   FOG_REMOTE       rclone remote name (default: onedrive)
set -euo pipefail

APP="$(cd "$(dirname "$0")/.." && pwd)"
DATA="${FOG_DATA:-$APP/data}"
CONF="${FOG_RCLONE_CONF:-$HOME/.fog-rclone.conf}"
REMOTE="${FOG_REMOTE:-onedrive}"
FOLDER="$(node -e 'import(process.argv[1]).then(m => console.log(m.default.oneDriveFolder))' "$APP/config.mjs")"

mkdir -p "$DATA/content" "$DATA/state"
exec 9>"$DATA/state/lock"
flock -n 9 || { echo "A sync is already running."; exit 0; }

# Filter rules are applied in order: drafts and lock files out, known file types in, the rest out.
rclone sync "$REMOTE:$FOLDER" "$DATA/content" \
  --config "$CONF" \
  --create-empty-src-dirs --ignore-case \
  --filter '- ~$*' --filter '- _*/**' --filter '- _*' --filter '- .*' \
  --filter '+ *.{docx,jpg,jpeg,png,webp,svg}' --filter '- *' \
  --retries 3 --low-level-retries 5 --timeout 60s --contimeout 30s \
  --log-level NOTICE

# Fingerprint of the content (names, sizes, contents, dates) and of the app itself.
fingerprint() {
  {
    cd "$DATA/content" && find . -type f -print0 | sort -z | xargs -0 -r sha256sum
    find . -print0 | sort -z | xargs -0 -r stat -c '%n %Y' | sha256sum
    cd "$APP" && cat config.mjs package-lock.json build/*.mjs src/* | sha256sum
  } | sha256sum | cut -d' ' -f1
}

NEW="$(fingerprint)"
OLD="$(cat "$DATA/state/fingerprint" 2>/dev/null || true)"
if [[ "$NEW" == "$OLD" && -f "$DATA/dist/index.html" && "${1:-}" != "--force" ]]; then
  echo "No changes."
  exit 0
fi

node "$APP/build/build.mjs" "$DATA/content" "$DATA/dist"
echo "$NEW" > "$DATA/state/fingerprint"
