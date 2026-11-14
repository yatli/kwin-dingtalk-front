# kwin-dingtalk-front

Two fixes for the Linux DingTalk client on KDE Plasma Wayland, as a KWin script.
No patches, no wrapper, no `LD_PRELOAD`; it only reacts to windows KWin already
knows about.

Written against **Plasma 6.8.2 / KWin 6.8.2**, DingTalk `9.0.0-Release.261105002`
(NW.js on CEF 109, running through XWayland), Arch Linux.

## What it fixes

**1. Windows that appear behind.** Dialogs (save / file picker) and popped-out
chats open without focus, behind whatever was active, and the previously active
window keeps focus. Clicking "save" therefore looks like nothing happened.

Cause, measured: DingTalk maps each of them as an independent toplevel with
`WM_TRANSIENT_FOR` unset, so KWin has no reason to stack it above anything and
its focus-stealing prevention declines to activate it.

**2. The tray menu appears at a random position.** Clicking the tray icon opens a
small message list; its screen position varies between invocations and can land
anywhere, including the opposite corner from the icon.

Cause: the client positions it itself, with a broken coordinate. Note that this
is *not* a Plasma popup: `plasmashell` is not involved, the window belongs to
DingTalk.

## What it does

* On every new DingTalk window: if it is a dialog or a popped-out chat, it is
  activated (`keepAbove` as well, for dialogs), so it cannot hide behind its own
  main window.
* If it is the tray menu, it is moved next to the pointer: on the inward side of
  whichever screen edge the pointer is on, aligned with the pointer along that
  edge, clamped on-screen. Panel position is derived from plasmashell's own dock
  windows, so a panel on any edge works.
* Windows appearing right after the application starts are left alone, so
  logging in does not steal focus.

## How the tray menu is identified

Not by size, and not by position — the position is random, so it carries no
information. A full `xprop` dump of the tray menu and of its siblings gives a
property fingerprint:

| window | `_NET_WM_WINDOW_TYPE` | `WM_TRANSIENT_FOR` |
|---|---|---|
| **tray menu** | `UTILITY, …_OVERRIDE, NORMAL` | group leader (`0x1400008`) |
| `Form` helpers (450×390, 300×255, …) | `UTILITY, …_OVERRIDE, NORMAL` | *none* |
| `150×45` · `150×60` · `398×72` · `ConvTabTopBar` | `…_OVERRIDE, NORMAL` | *none* |
| real context menu (153×392) | `POPUP_MENU, …` | its own parent |

Only the tray menu has **both** `UTILITY` and a `WM_TRANSIENT_FOR`. KWin exposes
exactly those two as `w.utility` and `w.transient`. The remaining condition is
contextual: it only ever appears while the pointer is on a panel, because that is
what triggers it.

So the predicate is:

```
pointer on a panel strip
  && w.utility        (_NET_WM_WINDOW_TYPE contains UTILITY)
  && w.transient      (WM_TRANSIENT_FOR set)
  && !w.normalWindow && !w.dialog
```

## Install

```sh
./install.sh          # copies to ~/.local/share/kwin/scripts/ding-front and enables it
./uninstall.sh
```

Or by hand — copy `metadata.json` and `contents/` into
`~/.local/share/kwin/scripts/ding-front/`, then enable it in
*System Settings → Window Management → KWin Scripts*.

Log out and back in (or restart KWin) for the package to be loaded.

**Do not also load it by hand while the package is enabled.** KWin then runs two
instances and every action happens twice. For testing without logging out, disable it
in the KWin Scripts page first, then:

```sh
busctl --user call org.kde.KWin /Scripting org.kde.kwin.Scripting \
        loadScript s ~/.local/share/kwin/scripts/ding-front/contents/code/main.js
busctl --user call org.kde.KWin /Scripting org.kde.kwin.Scripting start
```

## Verify

The script explains every decision it makes:

```sh
journalctl --user -f | grep DINGFRONT
```

| line | meaning |
|---|---|
| `MOVED\|edge=…\|was=…\|cursor=…\|to=…` | tray menu recognised, repositioned (all coordinates included) |
| `ACTIVATED` | dialog or popped-out chat brought forward |
| `SKIPPED-startup` | first window after app start, left alone on purpose |
| `move-failed` / `activate-failed` | the API refused; attach this line to a bug report |

## Known limits

* Tied to DingTalk's window classes (`com.alibabainc.dingtalk` and
  `Com.alibabainc.dingtalk` — the client uses both spellings).
* The tray menu is only repositioned when it is opened with the pointer (i.e. by
  clicking the icon). Opened some other way, it stays wherever the client put it.
* 30-second quiet period after the app starts is a heuristic: a DingTalk window
  created within 30 s of the previous one at startup is not activated.
* Wayland-native clients are not covered by any of this; the workarounds exist
  because DingTalk goes through XWayland.

## Licence

MIT. See `LICENSE`.
