#!/usr/bin/env bash
# Remove the script package and disable it.
set -uo pipefail
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/kwin/scripts/ding-front"
ID=ding-front

kwriteconfig6 --file kwinrc --group Plugins --key "${ID}Enabled" false
echo "disabled in kwinrc"

if [ -e "$DEST" ]; then
    rm -rf "$DEST"
    echo "removed $DEST"
fi

busctl --user call org.kde.KWin /Scripting org.kde.kwin.Scripting \
       unloadScript s "$ID" >/dev/null 2>&1 || true
busctl --user call org.kde.KWin /Scripting org.kde.kwin.Scripting \
       unloadScript s "$DEST/contents/code/main.js" >/dev/null 2>&1 || true

echo "done. (backups made by install.sh, if any, are left in place)"
