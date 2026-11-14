# KDE Store submission — copy/paste sheet

Everything below is meant to be pasted into the *Add Product* form on
store.kde.org. Files to attach are in `dist/`.

## Category

**Kwin Scripts Plasma 6** — required. It is what `kwinscripts.knsrc` declares
(`Categories=Kwin Scripts Plasma 6`), i.e. the only category that *Get New
Scripts…* in System Settings reads.

## Title

DingTalk: bring popups to front

## Summary (one line)

Fixes DingTalk on Plasma Wayland: dialogs and popped-out chats open behind, and the tray menu appears at a random position.

## Description

DingTalk's Linux client does two annoying things on KDE Plasma Wayland, and both are
fixable from the compositor side. This script does exactly that — no patches, no
wrapper, no LD_PRELOAD.

**1. Windows that open behind the application.**

Save dialogs, file pickers and popped-out chats are created as independent toplevels
without a parent, so KWin's focus-stealing prevention leaves them behind whatever was
active, and the previously active window keeps the focus. Clicking *Save* looks like
nothing happened. This script activates those windows when they appear (and keeps
dialogs above their own main window).

**2. The tray menu appears at a random position.**

Clicking the DingTalk tray icon opens a small message list, positioned by the client
itself at coordinates that vary between invocations — often in a corner far from the
icon. This script moves it next to the pointer: on the inward side of whichever screen
edge the pointer is on, aligned with the pointer along that edge, clamped on-screen.
Panels on any edge are handled: the panel strip is derived from plasmashell's own dock
windows, not assumed to be at the bottom.

**How the tray menu is recognised.** Not by size and not by position (the position is
random, so it carries no information). A full `xprop` dump gives a property
fingerprint — `_NET_WM_WINDOW_TYPE` containing `UTILITY` *and* a `WM_TRANSIENT_FOR`
set. DingTalk's other auxiliary windows have one or the other, never both. The
remaining condition is contextual: the menu only ever appears while the pointer is on
a panel.

**Requirements.** Plasma 6 with KWin. Written and tested on Plasma 6.8.2 / Arch Linux
with DingTalk 9.0.0 running through XWayland.

**Verify it is working:**

    journalctl --user -f | grep DINGFRONT

Every decision is logged (`MOVED`, `ACTIVATED`, `SKIPPED-startup`).

**Limits, stated plainly.** The script is tied to DingTalk's window classes. The tray
menu is only repositioned when it is opened with the pointer (clicking the icon); if
it is opened some other way it keeps the position the client chose. Windows that appear
within 30 seconds of the previous DingTalk window at start-up are left alone so logging
in does not steal focus.

Source and issue tracker: <!-- add the repository URL here once published -->

## Changelog — 1.1

* Identify the tray menu by window properties (`utility` + `transient`) instead of any
  size or position heuristic.
* Place it relative to the pointer, supporting panels on any screen edge.
* Activate dialogs and popped-out chats so they cannot open behind the main window.

## Licence

MIT

## Files to attach

| file | what it is |
|---|---|
| `dist/kwin-dingtalk-front-1.1.tar.gz` | the package (`ding-front/` + `metadata.json` + `contents/`) |
| `dist/preview.png` | 1280×720 preview, before/after |
