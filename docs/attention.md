# Attention and window presentation

**Status:** design draft, 2026-11-22. Not implemented.

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

Times are provisional and measured from the dialog's `load`/`pageshow`, not from command dispatch.

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
5. **LibreOffice InfoBar** when the action originated in Writer; a message box only if the
   InfoBar API is unavailable.

No global hooks, synthetic clicks, system-wide always-on-top, or focus-stealing loops. Capability
probes decide which step is available; failure degrades to the next step.

## LibreOffice fallback

The yellow/blue banner is the LibreOffice InfoBar. It is the preferred LO-local fallback because
it is non-modal and appears inside the window the user is already using. The OXT must probe for a
supported InfoBar provider; if unavailable, a native message box is the last resort.

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

### Instrumentation

Log the state transitions with the capability result, window type and elapsed time. Do not log
document content or personal data.

## Open questions

- Which desktop environments are required targets beyond the current Wayland session?
- Is a native desktop notification acceptable as the primary visible fallback, or should the
  LibreOffice InfoBar always come first for LO-originated actions?
- May citation and document-preferences dialogs be modal to the CiteWell main window?
- Are the 1/3/10 second thresholds acceptable, or should they be shorter/longer?
- Are we allowed to add a D-Bus application interface and a systemd user unit for activation?
- Is a test-only focus-denial hook acceptable in development builds to exercise the fallback?
- Who can run the manual KDE/Sway/notification-disabled checks?

## Acceptance

- No app-owned window waits for input without a parented, activated presentation or a visible,
  actionable fallback.
- The fallback is observable on a desktop that refuses focus stealing.
- Background operations do not steal focus.
- Removing a fallback makes a test fail.

*For the full documentation index, see [../README.md](../README.md).*
