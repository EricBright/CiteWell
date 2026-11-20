# Keeping CiteWell in sync with Zotero

CiteWell tracks a stable upstream line and keeps one branch clean, so that "bring in Zotero's
fixes" is a fast-forward plus a merge, not a festival of conflicts.

## Branch model

| Branch | Tracks | Purpose | Rule |
|---|---|---|---|
| `main` | `upstream/main` | Reference mirror of Zotero's development line (11.0) | Fast-forward only; never commit |
| `citewell` | `upstream/10.0` | The product: CiteWell's changes live here | All work happens here; merge upstream into it |

`main` exists so you can read what upstream is doing without switching your working branch.
`citewell` is cut from the stable line because that is what you actually run; see
[decisions.md](decisions.md) D1.

## One-time setup

```bash
git remote add upstream https://github.com/zotero/zotero.git   # already configured in this clone
git fetch upstream 10.0 main
git switch -c citewell upstream/10.0
git submodule update --init --recursive
```

## Routine merge

```bash
git fetch upstream
git switch citewell
git merge upstream/10.0
git submodule update --init --recursive     # upstream moves submodule pointers constantly
npm i                                        # only if package.json or package-lock.json changed
node js-build/build.js
app/scripts/build_and_run -n                 # verify
test/runtests.sh -f item collections         # or the relevant subset
git push origin citewell
```

Merging (not rebasing) keeps published history intact. Do not force-push a branch that GitHub
Issues or a build reference.

## Submodules

Fourteen submodules, several with nested ones. Upstream updates their pinned commits often, and a
merge that changes a pointer without updating the checkout leaves the tree inconsistent in a way
that only fails at runtime.

```bash
git submodule status                        # entries starting with '-' are not initialized
git submodule update --init --recursive     # after every merge
```

Never edit files inside a submodule from this repo: commit there, or the change is invisible to
everyone else.

## CI on a fork

GitHub marks Zotero's `ci.yml` as `disabled_fork` on forked repositories, so it never runs
here and no longer needs to be defended against. What runs instead:

| Workflow | Trigger | What it proves |
|---|---|---|
| `docs.yml` | every push | README budget, index completeness, back-references (Rust gate) |
| `codeql.yml` | push to `main` or `citewell` | static analysis for actions, JS/TS and Python |

Workflows are taken from the branch being pushed, so configuration meant to run on
`citewell` must exist on `citewell` — not only on `main`. `main` stays a mirror; workflow
changes belong to the product branch.

## Conflict policy

| File | Resolution |
|---|---|
| `README.md`, `AGENTS.md`, `NOTICE`, `docs/**`, `roadmap.md` | Ours. They are CiteWell's; upstream has no equivalent. Re-check whether upstream's README gained a fact worth copying |
| `.gitmodules` | Ours for the connector entries; take upstream's changes to existing entries |
| `COPYING`, `CLAUDE.md`, `CONTRIBUTING.md` | Theirs, untouched. If upstream changes them, take upstream |
| `.github/workflows/**` | Decide per change. Upstream CI targets their infrastructure; keep only jobs that make sense here |
| Code | Resolve toward upstream function + our change, then run the tests. If a conflict is structural, record the reasoning in [decisions.md](decisions.md) |

## Push safety

`zotero/zotero` is a source of changes, never a destination. The clone is configured so that a
mistake fails loudly rather than silently aiming at upstream:

| Setting | Value | Why |
|---|---|---|
| `remote.upstream.pushurl` | `DISABLED` | `git push upstream` fails immediately; fetching still works |
| `remote.pushDefault` | `origin` | A bare `git push` can only reach the fork |
| `gh` default repository | `EricBright/CiteWell` | `gh pr create` cannot target upstream by accident |
| Branch tracking | `citewell` → `origin/citewell` | `git push` and `git pull` stay on the fork |

`tools/docs-check` reads `.git/config` and fails if any remote's effective push target points at
`zotero/zotero`. To restore a fetch-only upstream after a clone:

```bash
git remote add upstream https://github.com/zotero/zotero.git
git remote set-url --push upstream DISABLED
git config remote.pushDefault origin
gh repo set-default EricBright/CiteWell
```

### What configuration cannot stop

The remote settings above stop accidental *pushes*. They do not stop everything, and pretending
otherwise would be worse than saying so:

| Path | Reachable by accident? | Control |
|---|---|---|
| `git push upstream` | No — push URL is `DISABLED` | Repository config + docs-check |
| `gh pr create` / `gh issue create -R zotero/zotero` | Only if `-R` is typed explicitly | `gh` default is the fork |
| Browser "Contribute" / "New issue" on their repo | Yes, by clicking | Deliberate action only |
| `zotero/zotero#123` in a commit or issue title | Yes | Never write upstream issue numbers; link to zotero.org instead |
| `@`-mentioning a Zotero maintainer | Yes | Do not; mentions notify regardless of repository |

The durable control is credential scope, not discipline: a **fine-grained token limited to
`EricBright/CiteWell`** cannot push, open issues, or comment anywhere else, even if a command is
mistyped. `gh auth status` shows whether the current token is user-wide OAuth (`gho_…`) or scoped.

## Cadence

Monthly is enough for the 10.0 line — it receives fixes, not churn. Also merge immediately
before starting work that touches a file upstream is likely to touch, because an early merge
turns one large conflict into several small ones.

## When something goes wrong

```bash
git merge --abort            # before committing a merge
git reset --hard ORIG_HEAD   # undo a completed but unverified merge
git reflog                   # find the pre-merge state
```

Verify with a build before deleting the backup branch; a merge that compiles is not the same as a
merge that runs.

*For the full documentation index, see [../README.md](../README.md).*
