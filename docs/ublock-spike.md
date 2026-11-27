# Content blocking in the Browse tab (R38 spike)

**Date:** 2026-11-25 · **Status:** spike complete; owner approved the recommendation on 2026-11-25 · **Companions:** D51 in [decisions.md](decisions.md), roadmap R38

R38 asked whether CiteWell should ship a curated security extension, with uBlock Origin as the
candidate, and demanded answers in writing about content-script injection, background pages,
`webRequest`, signing and GPL-3.0 vendoring. This page records what the runtime actually does.

## Method

All probes ran in an isolated test profile, no user data, no Google traffic.

1. Inspect the extension surface: `AddonManager`, `xpinstall.enabled`, signature enforcement,
   `extensions.webextensions.enabled`, extension scopes.
2. Install the official uBlock Origin 1.77.0 signed Firefox XPI
   (`uBlock0_1.77.0.firefox.signed.xpi`, GPL-3.0) through `AddonManager`.
3. Install a minimal hand-built MV2 WebExtension (storage + `webRequest` + `webRequestBlocking`,
   `<all_urls>`, background script) the same way, to separate "uBO is special" from "this runtime
   cannot install WebExtensions at all".
4. Ask the URL classifier whether tracking lists are present by classifying
   `https://www.google-analytics.com/analytics.js`.

## Results

| Probe | Result |
|---|---|
| `AddonManager` present | yes |
| `xpinstall.enabled` | `true` |
| `xpinstall.signatures.required` | `false` |
| `extensions.webextensions.enabled` | unset; setting it `true` at runtime changed nothing |
| uBO 1.77 signed XPI install | failed: install state DOWNLOAD_FAILED, `ERROR_CORRUPT_FILE` (-3) |
| Minimal MV2 XPI install (file and `file://` URL) | failed identically: `ERROR_CORRUPT_FILE` (-3) |
| URL classifier on a known tracking host | `result: 0`, empty list |
| Tracking pref state | normal browsing `false`; private browsing `true`; `urlclassifier.trackingTable` configured |

Two conclusions follow. First, **WebExtensions are not installable in this application as built**;
the failure is not uBO-specific and not a signature problem (`signatures.required` is already
false). Making it work would be a platform project, not a settings toggle. Second, **built-in
tracking protection has no list data here**: the classifier returns no match, so enabling the pref
alone would not block anything.

## Options

| Shape | Verdict |
|---|---|
| Vendored uBO preload | **Not viable now.** Install path fails for any WebExtension; a future Zotero/Gecko change would be required. Even then, `webRequest` is profile-wide, so it would filter CiteWell's own HTTP (translators, updates), and GPL-3.0 vendoring into an AGPL-3.0 app adds source-offer, signing and update obligations. |
| Settings suggestion to install uBO | Works only as advice, and only in Firefox. It does not protect the in-app tab. |
| Built-in content blocking for the tab | **Inert today** (no list data). Revisit only if the pin starts shipping classifier lists. |
| No in-app blocker | **Recommended.** Keep the sandbox, soft HTTPS and default-deny permissions; document that ads/trackers are not filtered in the Browse tab. |

## Recommendation

Ship no extension and no blocking toggle for the Browse tab. Record the limitation honestly, and
keep "use Firefox with uBlock Origin for general browsing" as documentation, not as an in-app
control. This is the only shape that adds no Google-facing code, no GPL vendoring, no signing
machinery and no app-wide request hooks.

What would reopen the question: a Zotero/Gecko release in which WebExtensions install and activate
in this app, or a pin that ships URL-classifier tracking lists. Either is a spike, not a guess.

*For the full documentation index, see [index.md](index.md).*
