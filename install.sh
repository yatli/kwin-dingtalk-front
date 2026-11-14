#!/usr/bin/env bash
# Install the KWin script package for the current user.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/kwin/scripts/ding-front"
ID=ding-front
STAMP="$(date +%Y%m%d-%H%M%S)"

if [ -e "$DEST" ]; then
    mv "$DEST" "$DEST.backup-$STAMP"
    echo "backed up existing install -> $(basename "$DEST").backup-$STAMP"
fi

mkdir -p "$DEST"
cp "$SRC/metadata.json" "$DEST/"
cp -a "$SRC/contents" "$DEST/"
echo "installed -> $DEST"

kwriteconfig6 --file kwinrc --group Plugins --key "${ID}Enabled" true
echo "enabled in kwinrc ([Plugins] ${ID}Enabled=true)"

cat <<EOF

Done. The script is loaded when KWin starts, and it is listed in
  System Settings -> Window Management -> KWin Scripts  ("DingTalk: bring popups to front")

To load it right now without logging out:
  busctl --user call org.kde.KWin /Scripting org.kde.kwin.Scripting \\
      loadScript s "$DEST/contents/code/main.js"
  busctl --user call org.kde.KWin /Scripting org.kde.kwin.Scripting start

Watch it work:
  journalctl --user -f | grep DINGFRONT
EOF
