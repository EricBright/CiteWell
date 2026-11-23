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
- `cargo-deny` (licences, AGPL-compatible only) and `cargo-audit` (advisories) are the intended
  policy, but neither is configured yet: there is no `deny.toml`, no CI invocation, and no
  `rust-version` in the crates. Do not treat MSRV as fixed until the toolchain decision (R15) lands.

## UI exemption

R6 requires changing behaviour in a JavaScript UI. The rule is therefore:

- Editing existing JavaScript: **allowed** (minimal, in place).
- Adding a new JavaScript module or a new JS build target: **not allowed** without a recorded
  decision.
`repo-guard` enforces this on every commit: an added `.js`, `.jsx`, `.mjs`, `.cjs`, `.py` or `.sh`
file fails unless its exact path is listed in `tools/policy-exceptions.txt` under a decision record.
The failure tells the author to stop and ask. This is intentionally a gate, not a prose reminder.
- New user-visible functionality should ship as WASM or a sidecar, with JS reduced to a thin
  call site.

## R15 — the build toolchain

Status: **inventory and elimination audit, not started.** D41 governs the order: delete the need
before choosing a replacement.

Inventory of the legacy Node path (`js-build/`, `.babelrc`, `package.json`):

| Surface | Actual use | Candidate |
|---|---|---|
| Babel | JSX in 33 files, ESM→CommonJS in 28; no `preset-env`; special string patches for four vendored resources | Write JSX/ESM differently, or SWC/OXC |
| Browserify | Exactly three standalone bundles: `react-select`, `url`, test-only `sinon`; no app bundling, no transforms | Delete: upstream Sinon bundle, vendored `react-select`, remove `url` |
| Sass | 165 files, 304 `@import`s, 41 mixins, 10 functions, 24 `@if`, 27 `@each`, five `@use` built-in modules, compressed output and source maps | Native CSS migration, or grass/rsass |
| Node runner | glob, copy, symlink, signatures, watch, FTL conversion, compiler orchestration | xtask with small Rust crates |

This changes the plan: Browserify is not “Rust bundler” work; it is deletion work. `url` has two call
sites and should use the URL API. The Sinon bundle is test-only. Only Babel and Sass are real
compiler replacements, and both have a source-redesign alternative.

Phases:

1. **Audit and baseline.** Record golden outputs and test results; list the exact special patches;
   decide whether JSX removal and CSS migration are acceptable authoring costs.
2. **Deletion pass.** Remove Browserify, `url`, and the Sinon bundle; use upstream/vendored files.
3. **JS decision.** Either convert JSX/ESM and delete Babel, or adopt SWC/OXC. Keep the Node build
   as the oracle until parity.
4. **Sass decision.** Spike a real section against native CSS; if maintainable, migrate and remove
   Sass; otherwise adopt grass/rsass after checking `@use`, source maps and platform variants.
5. **Orchestration.** Port glob/copy/symlink/signatures/watch/FTL to xtask; delete `js-build/` and
   `node_modules` only when every output and test matches.

Exit: no Node runtime or npm tree is needed to build; bundles produced by Rust tools pass the same
tests. React/React DOM replacement is explicitly outside R15.

## Porting existing JavaScript

Turing completeness is not a migration plan. Rust can compute anything JavaScript computes, but a
faithful port must preserve observable behaviour, the runtime it depends on, performance and
maintainability. "Impossible" is usually "large, risky and under-specified": say which, and name
the seam, rather than refusing. Conversely, "Turing-complete, therefore portable" is true only in
the weak computability sense and is not a plan.

The unit of port is a **seam**: a cohesive module with a stable public interface and tests. Not a
function, and not a subsystem.

1. **Plan before code.** Record the module and seam, its public API, the behaviour contract, the
   JS oracle, the parity tests, the Rust types/errors/async/ownership, the interop mechanism, the
   risks, and the exit criteria. A port starts from that plan, not from "translate this file".
2. **One seam at a time.** Split a module that has more than one seam; batch pure utilities rather
   than porting functions one by one. For an application path that crosses modules, use a
   vertical slice only to prove the architecture, then return to seams.
3. **Tests before the rewrite.** Write characterization or golden tests first, then differential
   tests that feed the same inputs to the JS and Rust implementations. Keep the JS as the oracle
   until parity is proven.
4. **Design the Rust surface first.** Enums for unions, `Option` for null/undefined, `Result` for
   exceptions, explicit ownership and async. Do not translate JS mutation into `Rc<RefCell<_>>`
   everywhere, and do not line-by-line translate idioms.
5. **Interop while both exist.** Pure logic goes to WASM (the citeproc bridge is the precedent;
   there is no wasm-bindgen runtime here); file and process work goes to a sidecar over a
   versioned protocol. The app owns SQLite: a sidecar may read it read-only or work while the app
   is closed, never write it alongside Gecko.
6. **Stop at unclear behaviour.** If the JS depends on undocumented runtime behaviour, an
   unmaintained vendored library, or something the tests cannot pin down, stop and report it. A
   guessed semantic is worse than an unported module.
7. **Delete only after parity.** Parity tests, error behaviour, performance and the absence of a
   hidden JS dependency are the exit criteria; remove the JS in the same change, not "later".

Vendored JavaScript is not ported line by line. Replace it with a maintained crate only when that
dependency is approved; otherwise leave it on the JS side.

Common semantic traps: JS numbers are doubles, strings are UTF-16, `null` and `undefined` differ,
object key order and `Date`/regex/equality coercion are observable, exceptions must become
`Result`, async ordering and event-loop timing change, and GC/finalizer assumptions do not survive.

### Port plan

A plan is one page and answers:

- **Seam:** module, public API, callers.
- **Behaviour:** what is observable, and which JS tests or fixtures pin it down.
- **Parity:** characterization and differential tests, including error cases.
- **Rust surface:** types, ownership, errors, async, threading.
- **Interop:** WASM or sidecar, lifecycle, versioned protocol.
- **Risks:** semantics that cannot be pinned down; dependencies that must stay.
- **Exit:** tests, performance, deletion of the JS.

## Stages

| Stage | Content | State |
|---|---|---|
| S1 | Packaging and docs tooling in Rust | done — `xtask`, `docs-check` |
| S2 | Build toolchain in Rust (JS bundling, SCSS) | not started |
| S3 | Services and pure logic in Rust (WASM first) | in progress — `citewell-import` file engine (R24) |
| S4 | UI rewrite decision | deliberately undecided |

## What this does not promise

A pure-Rust CiteWell means replacing Gecko, XUL and the remaining translator/plugin surfaces that
reach into `Zotero.*`. That is a new product, not a refactor, and it would end plugin compatibility. If it is ever wanted, it gets its own decision record — not a
quiet assumption behind the word "migration".

*For the full documentation index, see [../README.md](../README.md).*
