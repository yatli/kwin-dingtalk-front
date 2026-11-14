// ding-front v3
//
//  1. DingTalk's auxiliary windows (dialogs, popped-out chats) are independent
//     toplevels with no activation token, so KWin's focus-stealing prevention
//     leaves them behind -> activate them when they appear.
//
//  2. Its tray popup is an ordinary utility window positioned with a broken y
//     (x lines up with the tray icon, y lands near the top). No window-type
//     flag distinguishes it from DingTalk's other popups, so the discriminator
//     is semantic: it only appears while the pointer is on a panel.
//
// Placement is derived from the pointer, never from an assumed panel edge:
// the popup goes on the inward side of whichever edge the pointer is on, and
// the axis along that edge is aligned with the pointer so the menu is reachable
// without moving the mouse sideways. Everything is clamped on-screen.

var DING = /alibabainc\.dingtalk/i;
var QUIET_MS = 30000;
var MARGIN = 8;

var LAST_ADD_MS = 0;

function now() { return Date.now(); }
function isDing(w) {
    return DING.test(w.resourceClass || "") || DING.test(w.resourceName || "");
}
function isMenuish(w) {
    return w.popupMenu || w.menu || w.tooltip || w.dropdownMenu
        || w.comboBox || w.splash || w.onScreenDisplay;
}
function geo(w) { return w.frameGeometry; }

// Panel strips: plasmashell's layer-3 windows that are thin in one dimension.
function panelStrips() {
    var out = [];
    for (var i = 0; i < workspace.stackingOrder.length; ++i) {
        var w = workspace.stackingOrder[i];
        if (w.resourceClass !== "plasmashell" || !w.specialWindow || w.layer !== 3) continue;
        var g = geo(w);
        if (g.width <= 0 || g.height <= 0) continue;
        var thin = Math.min(g.width, g.height);
        var long = Math.max(g.width, g.height);
        if (thin > 80 || long < 200) continue;
        out.push({g: g, horizontal: g.width >= g.height});
    }
    return out;
}

function contains(g, p, pad) {
    return p.x >= g.x - pad && p.x < g.x + g.width + pad
        && p.y >= g.y - pad && p.y < g.y + g.height + pad;
}

function screenUnder(p, fallback) {
    try {
        var outs = workspace.outputs;
        for (var i = 0; i < outs.length; ++i) {
            var g = outs[i].geometry;
            if (contains(g, p, 0)) return g;
        }
    } catch (e) {}
    try { return fallback.output.geometry; } catch (e) {}
    return fallback.frameGeometry;
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }


// Where to put a W x H popup so it sits beside the pointer, on the inward side
// of the edge the pointer is on.
function placeNearCursor(w) {
    var c = workspace.cursorPos;
    var W = geo(w).width, H = geo(w).height;
    var g = screenUnder(c, w);
    var strips = panelStrips();

    var strip = null;
    for (var i = 0; i < strips.length; ++i) {
        if (contains(strips[i].g, c, 4)) { strip = strips[i]; break; }
    }

    var edge;
    if (strip) {
        var sg = strip.g;
        if (strip.horizontal) {
            edge = (sg.y + sg.height / 2 < g.y + g.height / 2) ? "top" : "bottom";
        } else {
            edge = (sg.x + sg.width / 2 < g.x + g.width / 2) ? "left" : "right";
        }
    } else {
        // no strip under the pointer: fall back to the nearest screen edge
        var d = {top: c.y - g.y, bottom: g.y + g.height - c.y,
                 left: c.x - g.x, right: g.x + g.width - c.x};
        edge = "bottom";
        var best = d.bottom;
        ["top", "left", "right"].forEach(function (e) { if (d[e] < best) { best = d[e]; edge = e; } });
    }

    var x, y;
    if (edge === "bottom") {
        x = clamp(c.x - W / 2, g.x + MARGIN, g.x + g.width - W - MARGIN);
        y = (strip ? strip.g.y : g.y + g.height) - H - MARGIN;
    } else if (edge === "top") {
        x = clamp(c.x - W / 2, g.x + MARGIN, g.x + g.width - W - MARGIN);
        y = (strip ? strip.g.y + strip.g.height : g.y) + MARGIN;
    } else if (edge === "left") {
        y = clamp(c.y - H / 2, g.y + MARGIN, g.y + g.height - H - MARGIN);
        x = (strip ? strip.g.x + strip.g.width : g.x) + MARGIN;
    } else {
        y = clamp(c.y - H / 2, g.y + MARGIN, g.y + g.height - H - MARGIN);
        x = (strip ? strip.g.x : g.x + g.width) - W - MARGIN;
    }

    // never leave the screen
    x = clamp(x, g.x + MARGIN, g.x + g.width - W - MARGIN);
    y = clamp(y, g.y + MARGIN, g.y + g.height - H - MARGIN);
    return {x: x, y: y, width: W, height: H, edge: edge};
}

function describe(w, what) {
    var g = geo(w);
    console.log("DINGFRONT|" + what
        + "|class=" + (w.resourceClass || "-")
        + "|caption=" + (w.caption || "-")
        + "|normal=" + w.normalWindow + "|dialog=" + w.dialog
        + "|utility=" + w.utility + "|transient=" + w.transient
        + "|geo=" + g.x + "," + g.y + " " + g.width + "x" + g.height);
}

workspace.windowAdded.connect(function (w) {
    if (!isDing(w) || isMenuish(w)) return;

    var t = now();
    var quiet = (LAST_ADD_MS === 0) || (t - LAST_ADD_MS > QUIET_MS);
    LAST_ADD_MS = t;
    describe(w, "added");

    // --- tray popup: non-normal window created while the pointer is on a panel
    var onPanel = false;
    var c = workspace.cursorPos;
    var strips = panelStrips();
    for (var i = 0; i < strips.length; ++i) {
        if (contains(strips[i].g, c, 4)) { onPanel = true; break; }
    }
    // Property fingerprint of the tray menu, from a full xprop dump:
    //   _NET_WM_WINDOW_TYPE_UTILITY  ->  w.utility
    //       (its 150x45 / 150x60 / 398x72 siblings have no UTILITY)
    //   WM_TRANSIENT_FOR = group leader  ->  w.transient
    //       (the always-present "Form" helpers have no TRANSIENT_FOR)
    // Only the tray menu has both. Position is never consulted: it is random.
    if (onPanel && w.utility && w.transient && !w.normalWindow && !w.dialog) {
        var r = placeNearCursor(w);
        var g0 = geo(w);
        try {
            w.frameGeometry = {x: r.x, y: r.y, width: r.width, height: r.height};
            console.log("DINGFRONT|MOVED|edge=" + r.edge
                + "|was=" + Math.round(g0.x) + "," + Math.round(g0.y)
                + "|cursor=" + c.x + "," + c.y
                + "|to=" + r.x + "," + r.y);
        } catch (e) {
            console.log("DINGFRONT|move-failed|" + e);
        }
        return;   // a tray menu should not take focus
    }

    // --- everything else: bring it forward
    if (quiet && w.normalWindow) {
        describe(w, "SKIPPED-startup");
        return;
    }
    try { w.keepAbove = !!(w.dialog || !w.normalWindow); } catch (e) {}
    try {
        workspace.activeWindow = w;
        describe(w, "ACTIVATED");
    } catch (e) {
        console.log("DINGFRONT|activate-failed|" + e);
    }
});

console.log("DINGFRONT|=== v6 loaded, panels=" + panelStrips().length);
