# Rust policy

CiteWell is moving toward Rust, but the application is Gecko + XUL + 220k lines of
JavaScript. This page defines where Rust can actually land, so "move to Rust" stays a
plan rather than a slogan.

## The boundary

| Surface | Language | Rule |
|---|---|---|
| Build, packaging, release tooling | **Rust** | Required for anything new |
| New services and pure logic | **Rust** | As WASM or a sidecar process |
| Existing Zotero application code | JavaScript | Stays JS; edits allowed, new JS modules are not |
| The UI and engine themselves | Gecko/XUL | Out of scope; replacing them is a product rewrite, not a migration |

## Three doors Rust can come through

**1. Build tooling.** `tools/xtask` drives packaging; `tools/docs-check` enforces docs. These
are conflict-free additions that never touch upstream's build. AppImage packaging is the first
finished example ([packaging.md](packaging.md)).

**2. WASM.** Zotero already ships Rust-compiled WASM: `citeproc_rs_wasm` and
`csl-validator-wasm`, with `citeprocRsBridge.js` in front. This door is proven in this exact
application, so pure logic (parsing, formatting, validation) can move without a native ABI.

**3. Sidecar processes.** `Zotero.Utilities.Internal.subprocess` exists and is used by the app.
Rust binaries can serve indexing, extraction, file work or backups over stdio or a socket.
Hard rules: **the app owns the SQLite database** (a second writer corrupts it), each sidecar has
an explicit lifecycle, and both sides speak a versioned protocol.

## Crate policy

Rust **code**, not zero dependencies:

- Crates are allowed when they are maintained and audited. Prefer a small set.
- Standard library only for small, fully-understood work: CLI, file walking, config, text.
- Do not hand-roll PDF, SQLite, TLS, Unicode collation, ZIP or image codecs. That is where
  data loss and security bugs live, in a program whose database is someone's research library.
- `cargo-deny` for licences (AGPL-compatible only) and `cargo-audit` for advisories; the
  lockfile is committed; MSRV is stated per crate.

## UI exemption

R6 requires changing behaviour in a JavaScript UI. The rule is therefore:

- Editing existing JavaScript: **allowed** (minimal, in place).
- Adding a new JavaScript module or a new JS build target: **not allowed** without a recorded
  decision.
- New user-visible functionality should ship as WASM or a sidecar, with JS reduced to a thin
  call site.

## Stages

| Stage | Content | State |
|---|---|---|
| S1 | Packaging and docs tooling in Rust | done — `xtask`, `docs-check` |
| S2 | Build toolchain in Rust (JS bundling, SCSS) | not started |
| S3 | Services and pure logic in Rust (WASM first) | not started |
| S4 | UI rewrite decision | deliberately undecided |

## What this does not promise

A pure-Rust CiteWell means replacing Gecko, XUL, the PDF reader, the note editor and the plugin
API that plugins use to reach into `Zotero.*`. That is a new product, not a refactor, and it
would end plugin compatibility. If it is ever wanted, it gets its own decision record — not a
quiet assumption behind the word "migration".

*For the full documentation index, see [../README.md](../README.md).*
