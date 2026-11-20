# Decisions and dead ends

Why the project is shaped this way. Each record is written when the choice is made, not
reconstructed later; a decision without its rejected alternatives is just a description.

## D1 — Base CiteWell on upstream `10.0`, not `main`

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes, at rising cost

`main` is the 11.0 development line; `10.0` is the stable line that receives fixes without UI
churn, and it matches the Zotero version the author actually runs.

Rejected: `main` — newer features, but it rewrites the exact UI surfaces this fork changes, so
every merge becomes a negotiation. Rejected: plugin-only — no rebranding or deep UI edits.

## D2 — `main` stays a pristine mirror; work happens on `citewell`

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

GitHub's "Sync fork" and `git merge --ff-only` only work on a branch with no unique commits. A
clean `main` also gives every merge a known base. See [sync.md](sync.md).

Rejected: working directly on `main` — kills fast-forward sync and turns merges into rebases.

## D3 — Internal identifiers keep saying `zotero`

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** no

Renaming `chrome://zotero/…`, `Zotero.*`, `APP_ID`, `extensions.zotero.*`, or the sync identity
breaks plugins, user settings, data directories, and sync accounts. None of it is user-visible.
Full boundary in [naming.md](naming.md).

Rejected: full mechanical rename — high churn, silent breakage, no user-visible gain.

## D4 — New code in this repository is Rust

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** with effort

One compiled toolchain for tooling, no second runtime shipped or installed, memory safety by
default, and a single `cargo` invocation in CI. Applies to *new* code; the inherited Zotero
codebase is JavaScript and is not being rewritten. Markdown, YAML, JSON, CSS, and HTML are
configuration and documentation, not code.

Rejected: Node.js — would add a second runtime and dependency tree beside a codebase that
already ships one; shell — untestable and unportable for the checks we need; Python — same
runtime objection with weaker typing.

Consequence: CI and contributors need a Rust toolchain. First consumer is
[docs-check](../tools/docs-check).

## D5 — Documentation is split into always-tier and on-demand, and enforced

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

`README.md` is read at the start of every session and must stay small; everything else is opened
to answer one question. A budget with no failing check is decoration, so `tools/docs-check`
verifies the cap, the completeness of the index, and the back-reference line.

Rejected: conventions-only — observed to decay; the rule lives inside the file it governs.

## D6 — Rewrite `README.md`, leave `COPYING` untouched, add `NOTICE`

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

Upstream last changed `README.md` in April 2023 and `COPYING` in 2018, so a README rewrite costs
almost no merge risk. `COPYING` is the license text plus Zotero's notice; editing it creates a
diff against upstream for no legal gain. AGPLv3 §5(a) instead requires a modification notice,
which `NOTICE` supplies.

Rejected: editing `COPYING` to add CiteWell — diff noise, and no one benefits from a modified
license file.

## D7 — License CiteWell as AGPL-3.0-or-later

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** no (for released versions)

Zotero's per-file headers already grant "version 3 of the License, or (at your option) any later
version", so or-later is exactly the permission already granted; choosing `-only` would be more
restrictive than the upstream grant for no reason.

Rejected: AGPL-3.0-only — gratuitously narrower than what the code was given under.

## D8 — CiteWell issues live on the fork; upstream bugs go to Zotero's forums

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

Zotero does not use GitHub Issues, and their maintainers should not triage fork questions. A real
destination also means `README.md` can answer "where do I report this?" in one line.

Rejected: no tracker — leaves the README's reporting section empty.

## D9 — CiteWell is a personal tool, not a distribution

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

> CiteWell is my Zotero. Same library, same sync, same plugins; an interface I don't have to
> fight, and behaviour that matches how I actually work.

The author is the only user: no support obligation, no compatibility promise beyond the author's
own machines, and no release cadence. License obligations still apply because the repository is
public — modifications are stated in [NOTICE](../NOTICE) and the source *is* the distribution.

Rejected: a craft-focused product statement — it implies a quality bar and promises to users this
project does not intend to keep. Rejected: "conservative interface fork" — accurate, but it makes
promises to users who do not exist.

Consequence: roadmap R11 (distribution) stays Later, and plugin compatibility matters only as far
as the author's own plugins.

## D10 — Mark: owner's CW + quill, with a schematic quill for the toolbar

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

The mark is the owner's CW + quill artwork, converted to outlines so it carries no font
dependency, and kept at `#cc2936`. The About panel and launcher use the full mark. The
toolbar (16–32px) uses a schematic quill drawn for that size, because the fine plume
reduces to an unreadable leaf below ~48px; a two-tier mark is the only way to keep the
toolbar legible without abandoning the motif.

Rejected: shrinking the full mark to 16px — it reads as a red smudge. Rejected: a bold "C"
for the toolbar — legible, but drops the quill exactly where users look most.

## D11 — CI lives on `citewell`; `main` stays a mirror

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

GitHub disables a forked repository's inherited workflows (`disabled_fork`), so Zotero's
`ci.yml` is inert here. The two workflows that matter — the Rust docs gate and CodeQL — are
kept on the product branch, because Actions reads workflow files from the pushed branch.
CodeQL analyses only languages that exist in this repository; the generated matrix included
c-cpp and java-kotlin, whose jobs failed with "no code found" and reddened every run.

Rejected: leaving CodeQL on `main` — it would only scan mirror pushes, never the branch where
work happens, and would keep `main` divergent from upstream.

## Dead ends

Failed experiments and abandoned approaches go here, each with *why* it was abandoned, so it is
not repeated. None yet.

*For the full documentation index, see [../README.md](../README.md).*
