# Code pass — settings tab (D48)

Harvested 2026-11-25 UTC from Strata (`q2_0`) trailer; the worker ran out of hops before
writing this file, so the table is copied verbatim and `LOCATED` is the lead agent's own.

PASS: code
QUESTION: Is settingsTab.js sound — can the iframe host leak or outlive its tab, can the
keydown bridge close the wrong thing, does the openPreferences reroute break callers?
STATUS: blocked (worker's alternation greps silently matched nothing — the pass scripts' grep
lacked `-E`; fixed in all three templates after this run)

## Findings

| Tier | Citation | Claim | Resolution |
|---|---|---|---|
| high | settingsTab.js:137 | readiness `setInterval` never cleared by `_teardown` — live timer probes a detached frame per open/close cycle | **FIXED** — `state.timer` stored, cleared in teardown |
| high | settingsTab.js:150 | timeout path never settles `state.ready` → `_navigate` awaits forever | **FIXED** — always resolve (`ready` or `null`); teardown also settles awaiters |
| medium | settingsTab.js:166-180 | Ctrl+W bridge bound once; a frame reload would leave the new window unbound | **DOCUMENTED** — the preferences doc never navigates itself (panes inject into the same doc); comment records the re-bind trigger if that changes |
| medium | settingsTab.js:57-61 | `_findTab` could return a stale id if a close path skipped `onClose` | **FIXED** — defensive: drop state whose tab container is gone from the document |
| high | utilities_internal.js:0 | "reroute absent from repo" (greps found nothing) | **DISCARDED** — false: BRE grep treated `|` literally; the reroute is committed (c2e0e819b) and locatable. Wrapper fixed (`grep -rEn`) |

KEEP: teardown must own everything `_build` creates (timer, listeners, iframe, ready promise) —
that invariant is what makes tab-hosted frames safe to create and destroy at will.
