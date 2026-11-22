# Attention and window presentation

**Status:** accepted 2026-11-22; state machine, presenter and app adapter implemented; app dialogs and progress are integrated. LibreOffice InfoBar, system activation and the test hook are pending.

CiteWell must never leave a person waiting on a prompt that is behind another window. This page
defines the attention contract, the escalation ladder, the platform-specific fallbacks, and the
tests that must prove the behaviour. It applies to every CiteWell-owned window and to the
surfaces that can ask CiteWell to show one.

The originating failure: during teaching, a citation prompt opened behind the browser or
LibreOffice while the visible window said “Please wait…”. The student had no reason to press
Alt-Tab and no way to discover that the application was waiting for input. An invisible prompt is
a broken prompt.

## Invariants

1. A window that needs a person must be parented, activated, and discoverable.
2. If the compositor refuses activation, CiteWell must signal the user somewhere they are already
   looking: taskbar urgency, a native notification, or a LibreOffice surface.
3. “Please wait…” is never terminal. After a timeout it becomes an actionable message with a way
   to bring the window forward.
4. Background progress never steals focus. Interactive dialogs may request it.
5. Notifications are deduplicated and suppressed when the window already has focus.

## Decisions (2026-11-22)

- Required desktops: **KDE Plasma Wayland**, **GNOME Wayland**, and **XWayland** as the fallback.
  The current development machine is KDE Plasma.
- For LibreOffice-originated actions, the **InfoBar** is the first visible fallback at the 3 s
  escalation. A desktop notification is the fallback when the InfoBar provider is unavailable;
  a native message box is the last resort.
- Citation and document-preferences dialogs are **parented and modal** to the CiteWell main window.
- A **D-Bus application activation path and a systemd user unit** are allowed. The AppImage must
  install them automatically, document their paths, provide a clear removal command, and make the
  integration visible to installers/updaters rather than hiding it.
- A **test-only focus-denial hook** (environment-gated, absent from release behaviour) plus a fake
  clock, fake adapters, and a manual KDE/GNOME/XWayland matrix is the testing contract.
- The accepted floor when a compositor refuses activation and notifications are disabled is
  **taskbar urgency plus a changed title**, with the LibreOffice InfoBar when the action came from
  Writer. The owner accepts this limitation.

## Capability audit (2026-11-22)

On the current KDE Plasma Wayland session:

- `XDG_SESSION_TYPE=wayland`, `XDG_CURRENT_DESKTOP=KDE`.
- `XDG_ACTIVATION_TOKEN` is empty for a normally launched app.
- The session bus is available, and `org.freedesktop.portal.Desktop` exposes the
  `org.freedesktop.portal.Notification` interface.
- The portal does **not** expose an `Activation` interface here. D-Bus application activation
  therefore has to be designed around CiteWell's own activation entry point, not assumed from the
  portal.
- LibreOffice 26.8 does not expose `com.sun.star.frame.XInfoBarProvider` as a usable UNO type in
  the Python probe. The InfoBar remains a desired fallback, but the implementation must treat it as
  optional and fall back to a notification/message box.

These findings do not change the escalation ladder; they determine which surface is available at
the 3 s and 10 s steps.

## System integration

This is planned, not implemented yet.

The AppImage will install a user-scoped systemd unit and a D-Bus activation file on first run. The
exact unit type and D-Bus interface must follow the capability audit; systemd does not grant
window focus, so the D-Bus path is an **activation request**, not a guarantee.

Transparency requirements:

- a first-run notice naming every file written and how to remove it;
- an explicit `--remove-integration` command (and a documented `--no-integration` option);
- the files listed in [packaging.md](packaging.md) and this page;
- an AppImage updater that replaces the executable must not silently leave an old unit pointing at
  a removed path. Gear Lever/AppImageUpdate cannot run an uninstall hook, so the removal command
  and documentation are the explicit contract; the app rewrites stale paths on the next launch
  when possible.

## Scope

| Surface | Owns | Fallback |
|---|---|---|
| CiteWell app dialogs | `WindowPresenter`, focus watchdog | taskbar urgency, notification, title cue |
| CiteWell progress windows | presenter; preferably in-app status | timeout message, bring-to-front |
| LibreOffice OXT | app owns the dialog; OXT surfaces a Writer-local notice | InfoBar, else message box |
| Firefox/Google Docs connector | extension-owned progress and badge | `browser.notifications`, toolbar badge |

The app cannot raise a browser window, and the OXT cannot raise an app window. Each surface
implements the same contract with its own supported APIs.

## Attention state machine

```text
idle
  -> requesting   (open, parent, focus, activation attempt)
  -> focused      (document.hasFocus() or the platform reports activation)
  -> fallback     (activation refused; visible notification/urgency/InfoBar)
  -> acknowledged (user interacted or dismissed the fallback)
```

A focus event cancels all pending timers. Completion cancels the timers and closes transient
progress. A completed operation must never produce a notification.

## Escalation ladder

The 1 s / 3 s / 10 s thresholds are accepted. They are measured from the dialog's
`load`/`pageshow`, not from command dispatch.

| Time | Interactive dialog | Progress window |
|---|---|---|
| 0 | open parented; focus/raise request | open without stealing focus |
| ~1 s | if unfocused: taskbar urgency + title cue | no escalation yet |
| ~3 s | native notification, once, click-to-focus | notification only if the operation needs a decision |
| ~10 s | in-dialog banner: “This window may be behind another application”; LO InfoBar | replace “Please wait…” with a “Bring to front / Continue in background” message |

The first check should be at roughly 0.8–1.0 s so a slow window load does not trigger a false
alarm. The notification is deliberately later; urgency is cheap, a notification is intrusive.
Values belong in one constants module and must be adjustable for testing.

## Platform path

Preferred order on Linux:

1. **Wayland-native activation**: XDG activation token / desktop portal, where Gecko exposes it.
2. **D-Bus application activation** with a CiteWell application ID and `Raise`/`Activate` method;
   a systemd user unit may provide activation-on-demand, but systemd does not grant focus.
3. **XDG portal / `nsIAlertsService` notification** with a click-to-focus action.
4. **X11/XWayland `_NET_ACTIVE_WINDOW`** only as a legacy fallback.
5. **LibreOffice InfoBar at the 3 s escalation**, when the action originated in Writer; a desktop
   notification if the InfoBar provider is unavailable, and a message box only as a last resort.

No global hooks, synthetic clicks, system-wide always-on-top, or focus-stealing loops. Capability
probes decide which step is available; failure degrades to the next step.

## LibreOffice fallback

The yellow/blue banner is the LibreOffice InfoBar. For LO-originated actions it is the **first**
visible fallback, at the 3 s escalation, because it is non-modal and appears inside the window the
user is already using. A desktop notification is the fallback when the InfoBar provider is not
available; a native message box is the last resort. The OXT must probe the provider before using
it.

## Test strategy

Tests must be able to fail for the reason they claim to test. Avoid tests that only assert that a
function was called or that a window object exists.

### Deterministic state-machine tests

Inject a fake clock, fake window adapter, fake notification service and fake InfoBar provider.
Assert observable transitions:

- focused before 1 s: no urgency, notification, or banner;
- unfocused at 1 s: urgency/title, no notification yet;
- focused at 2 s after urgency: no notification;
- unfocused at 3 s: exactly one notification;
- notification click: activation requested, state acknowledged;
- unfocused at 10 s: banner/InfoBar, progress text changes;
- completion at 2 s: all timers cancelled;
- notification unavailable: title/urgency only, no exception;
- duplicate requests: one notification, one banner.

A mutation check is part of the work: remove the focus request or the fallback and the relevant
tests must fail. A green suite alone is not evidence.

### Adapter contract tests

- window presenter: parent/modal/dependent flags and focus-result reporting;
- notification adapter: supported, unavailable, click callback;
- LO InfoBar adapter: available, unavailable, message/fallback;
- capability probes: portal absent, D-Bus absent, XWayland only.

### Manual matrix

Native Wayland (GNOME, KDE, Sway if available), XWayland, app focused/unfocused/minimised/on
another workspace, LibreOffice fullscreen, notification service disabled, and a focus-follows-mouse
desktop. Record the observed escalation. Real compositor focus cannot be asserted reliably in CI;
the manual matrix is the complement, not a replacement, for the state-machine tests.

### Real-window integration

`Zotero.Integration.displayDialog()` opens citation, document-preferences, bibliography and
selection dialogs through the presenter as parented modal windows. `Zotero.Integration.Progress`
uses the same presenter with `kind: "progress"` and `focusOnOpen: false`, so background progress
never steals focus and gets the 10 s banner instead of immediate urgency. The LibreOffice adapter,
system activation and the test hook remain.

### Instrumentation

Log the state transitions with the capability result, window type and elapsed time. Do not log
document content or personal data.

## Open questions

- Gecko activation remains unresolved: there is no token on this session and no portal Activation
  interface. The D-Bus/local activation entry point must be proven before promising native raise.
- LibreOffice InfoBar is not exposed in this build; the notification/message-box fallback is the
  realistic path until a supported interface is found.
- The current KDE Wayland session is the primary manual target; GNOME Wayland and XWayland still
  need a pass.
- Does the AppImage's first-run installer have a stable writable path for the unit when the
  AppImage is moved? The unit must be rewritten or clearly reported as stale.
- Can Gear Lever/AppImageUpdate be given a documented removal step without pretending they run
  uninstall hooks? They cannot remove user units themselves.

## Implemented so far

`chrome/content/zotero/xpcom/attention.js` holds the platform-free scheduler, the
`AppAdapter` (focus, title cue, urgency, one notification) and the `Presenter` (parented modal
opening and focus/unload wiring):
`Zotero.Attention.Controller` with a fake-clock-friendly adapter contract. The deterministic
tests in `test/tests/attentionTest.js` cover the 1/3/10 second sequence, focus cancellation,
completion, progress windows, surface selection, adapter failure, duplicate watches, a second
focus check at each stage, modal/parent features, title cues and notification deduplication. Removing focus cancellation makes the cancellation test fail; that
mutation check is part of validating the tests, not a coverage claim.

## Acceptance

- No app-owned window waits for input without a parented, activated presentation or a visible,
  actionable fallback.
- The fallback is observable on a desktop that refuses focus stealing.
- Background operations do not steal focus.
- Removing a fallback makes a test fail.

*For the full documentation index, see [../README.md](../README.md).*
