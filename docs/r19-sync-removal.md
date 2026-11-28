# R19 — Remove online sync and file sync; extract two local modules

**Approved 2026-11-28** · relates to D14 and R19 · execution in progress
· supersedes the deletion-only draft

## What changed from v1

The deletion boundary is the same. Three things are new:

- two **seam moves** leave the code named for what it does: `Zotero.RepositoryUpdates` (moved out of
  `schema.js` before deletion) and `Zotero.LibrarySettings` (renamed from `SyncedSettings` after
  deletion, when nothing calls its sync-only methods);
- the **streamer** is trimmed to a transport when the engine is deleted, not before;
- the stage order is explicit, and each stage leaves the full suite green.

## Goal

Remove the online-sync and file-sync subsystems so that no sync code is loaded, initialized or
reachable, while leaving the two local services that wore the sync name as small, named modules.
No user-visible change; no database migration.

## Why this shape

Deleting alone would leave two misleading pieces of plumbing:

- `SyncedSettings` is a local per-library settings store, but its public interface exposes sync
  metadata (`version`, `synced`), sync-only methods (`getUnsynced`, `markAsSynced`) and a
  sync-transaction event (`onSyncDownload`). Once the engine is gone, four methods remain.
- `schema.js` is the database schema module, yet it also owns the whole translator/style repository
  path: bundled-file installation, periodic and notification-driven checks, reset actions and their
  timers — about 800 lines. Update failures are therefore diagnosed inside the schema module.

The order matters. `LibrarySettings` cannot lose its sync-only API while `syncEngine` still calls
it, so that seam comes **after** deletion. `RepositoryUpdates` does not depend on sync at all, so it
moves **before** deletion, while its callers are being touched anyway.

## Boundary

| Area | Fate | Detail |
|---|---|---|
| `xpcom/sync/` (8 files, ~8.7k lines) | delete | engine, API client, runner, event listeners, full-text upload, local sync data, utilities, exceptions |
| `xpcom/sync.js` | delete | `Zotero.Sync` core and `Zotero.Sync.Server` |
| `xpcom/storage.js`, `xpcom/storage/` (11 files, ~6.5k lines) | delete | WebDAV, ZFS, upload/download queues, conflicts, download progress, file-change watcher, requests/results |
| `xpcom/osKeyStore.js` (234 lines) | delete | key-store encryption used only by WebDAV and the sync credentials |
| update block in `schema.js` (~800 lines) | move | becomes `repositoryUpdates.js` → `Zotero.RepositoryUpdates` |
| `syncedSettings.js` (356 lines) | rename and shrink | becomes `librarySettings.js` → `Zotero.LibrarySettings`, four methods |
| `streamer.js` (345 lines) | trim | transport only: connect, reconnect, topic callbacks; no API key, no sync subscriptions |
| Sync toolbar, menus, status icons, reminders, auto-sync-on-open | delete | `zoteroPane.js`, `zoteroPane.xhtml` |
| `sync.*` preference defaults and migrations | delete | no producer or reader remains |
| Sync strings in eight locales | prune | no UI references them |
| `recognizeDocument.js` API client | rewire | one `Zotero.HTTP.request`, as the same file already does for `report` |
| full-text sync processor in `fulltext.js` | delete | idle/queue path for downloaded content and the `sync.fulltext.enabled` gate; `setItemContent` indexes directly and the local API's flush stays |
| 7 sync suites + 5 storage suites | delete | listed under Verification |
| `synced` / `version` columns, `syncedSettings` table | keep | core data model; no migration |
| `syncCache`, `syncDeleteLog`, `syncQueue`, `syncObjectTypes` tables | keep, stop using | no rows converted or dropped |

The local attachment path (`Zotero.Attachments`, `Zotero.File`, `Zotero.getStorageDirectory()`) does
not go through `Zotero.Sync.Storage`; a grep of `attachments.js` finds no use. Stage 0 re-proves it.

Keeping `synced` and `version` is not a hidden sync path: `DataObject.save` writes them as item
metadata, and removing them would be a schema migration with no user-visible result.

## Seam 1 — `Zotero.RepositoryUpdates` (before deletion)

Moved out of `schema.js` as one block, unchanged in behaviour. Interface:

```
check(mode)                     // REPO_UPDATE_* constants
notify(delay)                   // schedule after a push notification
updateBundledFiles(mode)        // called by schema upgrade and resets
stopTimer()
resetTranslators()
resetStyles()
```

Inside: the two timers, the in-progress guards, the repository fetch, bundled-file installation and
the version bookkeeping. `Zotero.Schema.getDBVersion()` stays in the schema module and is called
across the seam; no other schema behaviour moves.

Callers: `schema.js` (upgrade path, two calls), `streamer.js`, `prefs.js` (pref change),
`preferences_advanced.js` (manual check), `preferences.js` and `preferences_cite.js` (reset
actions), and the update cases moved from `schemaTest` to `repositoryUpdatesTest`.

Because the new module must exist before a schema upgrade can call it, its loader entry is added in
the same commit as the move. `getDBVersion` is called when a check runs, not when the module loads,
so the entry has no ordering requirement; the upgrade test exercises the call with both modules
loaded.

This seam is **separable**: its own commit, revertible alone, with no effect on deletion.

## Seam 2 — `Zotero.LibrarySettings` (after deletion)

Interface, and nothing else:

```
loadAll(libraryID)        // called once per library
get(libraryID, setting)   // deep copy or null
set(libraryID, setting, value)
clear(libraryID, setting)
```

Inside: the allow-list of known settings, the JSON encoding, the per-library cache, and the
`syncedSettings` table. `set` and `clear` keep emitting the existing `setting` notifier events.

The shrunken interface lands only after the engine is deleted. Until then the module keeps its full
API, including the `version`/`synced` parameters and `getMetadata`/`getUnsynced`/`markAsSynced`/
`markAllAsUnsynced`/`onSyncDownload`, because `syncEngine` still calls them. In the rename commit
those members go, in the same change that updates the ten local callers and renames the test to
`librarySettingsTest`. A grep finds the sync-only members called only from `syncEngine` and the sync
tests, so after stage 3 there is no caller left; stage 0 records the full list. The `feeds`
listener on `onSyncDownload` goes, and `Zotero.Feeds.restoreFromJSON`, whose only production caller
it was, goes with it (its feed-test cases go too).

Callers: `fileRenamingDialog.js`, `data/feed.js`, `data/feeds.js`, `data/item.js`, `data/library.js`,
`data/tags.js`, `attachmentReadObserver.js`, `prefs.js`, plus the test.

## Seam 3 — Streamer becomes a transport (with deletion)

Remove the API key, the API-key observer, the `sync.autoSync` observer, `removeSyncSubscription`,
subscription entries carrying an API key, the `Runner.sync()` calls for library topics, and the
skipped-library filter. Keep the socket, reconnect/backoff, `subscribe`/`unsubscribe`, topic
callbacks, and one policy call: `translators`/`styles` notifications go to
`Zotero.RepositoryUpdates.notify(delay)`.

Result: about 150 lines, with no knowledge of sync or accounts. `removeSyncSubscription` disappears
only when its caller, `syncRunner.js`, is deleted, so this trim belongs to the deletion stage.

## Stages

**Stage 0 — Inventory and baseline (no code).** Walk every `Zotero.Sync` reference and every
`sync.*` preference; run the current suite and record the result. Prove:

- attachments and stored/linked-file paths never call `Zotero.Sync.Storage`;
- every call site in the boundary table has a named replacement;
- the upgrade path runs against a copy of a current data directory without `resetSyncQueueTries()`;
- the loader list in `zotero.mjs`, including the platform watcher selection, is in the checklist;
- tests that use sync helpers (`test/content/support.js`, collection, data-object, storage-local,
  undo-history) have direct replacements.

**Stage 1 — Move `RepositoryUpdates` (one commit, behaviour-preserving).** Add the module and its
loader entry, move the block out of `schema.js`, point the six call sites and the moved tests at it.
The full suite stays green; the commit can be reverted alone.

**Stage 2 — Unwire the engine.** Remove the sync UI (toolbar, menu items, status icons, reminders,
auto-sync-on-open, keyboard entries) and rewire the remaining call sites: `zotero.js` startup,
`data/notes.js`, `fulltext.js`, `itemTreeRow.js`, `data/dataObject.js`, `data/item.js` delete log,
`schema.js` reset call, `server_connector.js`, Mendeley import, `recognizeDocument.js`, the
`Zotero.Sync.EventListeners` registration in `prefs.js`, the sync status popup in `zoteroPane.xhtml`,
and the full-text sync processor with its `sync.fulltext.enabled` gate. Removing the processor is
safe because its only remaining producer, the local API's full-text write, already indexes inline;
that path gets a test before the processor goes. This is behaviour-preserving: the UI entry points
are already removed at runtime today, and the engine stays gated by `ONLINE_SYNC=false` until
stage 3. The engine files still exist but nothing calls them.

**Stage 3 — Delete the engine and its tests (one atomic commit).** Remove `xpcom/sync/`, `sync.js`,
`storage.js`, `xpcom/storage/`, `osKeyStore.js`, the twelve suites, the loader entries and the
platform watcher selection, plus `sync.*` defaults and migrations, and trim the streamer. The streamer trim and the
`syncRunner` deletion are in the same commit, so there is no build in which the module is gone and
its consumer still calls it. Grep gates must return zero `Zotero.Sync` references.

**Stage 4 — Rename and prune.** Rename `SyncedSettings` to `LibrarySettings` and drop its sync-only
API and event, update the nine callers, remove the dead feeds listener and `restoreFromJSON` (and
its test cases), delete
the dead sync strings from the eight locales, and update D14, R19, `status.md`,
`ui-architecture.md` and the roadmap. Run the docs gate.

**Stage 5 — Verify and release.** Full suite, smoke list, AppImage build, a release with no
user-visible change, R19 closed.

## Verification

- **Keep green:** `librarySettingsTest` (renamed), `fileRenamingDialogTest`, `feedTest`, `tagsTest`,
  `attachmentReadObserverTest`, `importTest`, `notesMigrationTest`, `fulltextTest`, `repositoryUpdatesTest`
  (new), `settingsTabTest`, `preferences_advancedTest`, `agentTest`, `bibliographyTest`, plus the
  full run.
- **Delete (12):** `syncAPIClientTest`, `syncEngineTest`, `syncEventListenersTest`,
  `syncFullTextEngineTest`, `syncLocalTest`, `syncRunnerTest`, `syncReminderTest`,
  `storageLocalTest`, `storageRequestTest`, `fileChangeWatcherTest`, `zfsTest`, `webdavTest`.
- **Grep gates:** no `Zotero.Sync`, no `ONLINE_SYNC`, no `sync.` preference reads, no `OS.File` in
  the new modules.
- **Failure gate:** no new failure against the Stage 0 baseline (309/326; 10 FullText, 7
  Attachments), recorded in Appendix A.
- **Smoke:** launch; add by DOI; attach a stored PDF; attach a linked file; add a Markdown note;
  export; insert a citation in LibreOffice; save a page from Browse; run a manual translator update;
  open Preferences; restart and check the debug log.
- **Upgrade:** start against a copy of a `.006` data directory and a fresh profile.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Removing `SyncedSettings` API while `syncEngine` still calls it | The API survives until stage 4, after the engine is deleted; the rename is its own commit |
| `RepositoryUpdates` is not loaded when a schema upgrade calls it | Its only schema call is at check time, not load time; the entry lands in the same commit and the upgrade test exercises it |
| Behaviour-preserving move hides a change | Move-only commit, separate from deletion; tests run before and after |
| Attachment storage accidentally depends on the file-sync layer | Stage 0 grep plus stored/linked-file smoke before deletion |
| Streamer loses translator updates | Keep the `automaticScraperUpdates` path; manual update smoke with no account |
| Rename churn hides a real change | Rename is its own commit, no behaviour edits |
| Tests depend on sync helpers for unrelated setups | Stage 0 lists them; replace with direct helpers, do not delete coverage |
| The full-text processor serves the local API, not only sync | The path that remains is the local API's inline flush; the PUT `/fulltext` test in `server_localAPITest` must pass before the processor is removed |
| Stage 3 mixes deletion and consumer trim | One commit, so no intermediate build exists; reverting it restores both sides together |
| A hidden caller uses the sync-only settings API after stage 3 | Stage 0 greps the full list; today it is only `syncEngine` and the sync tests, both deleted in stage 3 |

## Rollback

Each stage and each seam is a separate commit, reverted in reverse order. No schema migration and
no data conversion, so reverting the deletion restores the gated code and the database is untouched;
a downgrade to `.006` remains safe. Reverting stage 4 restores the full `SyncedSettings` API;
reverting stage 3 restores the engine and the streamer's sync calls; no cross-stage combination
leaves the engine without the API it uses. `LibrarySettings` keeps the `syncedSettings` table and
rows, so the rename cannot orphan data; reverting stage 1 restores the schema module unchanged.

## Exit criteria

- `Zotero.Sync` and `ONLINE_SYNC` do not appear in shipped code or tests.
- No `sync.` preference has a producer or reader.
- `LibrarySettings` and `RepositoryUpdates` have interface tests and no sync-only API.
- Full suite and smoke pass; import and attachments unaffected.
- A release ships with no user-visible change; R19 is closed in the roadmap and status.

## After R19 — plumbing charter (separate)

Not part of this plan. A short charter, to be approved on its own, ranks three workstreams:

1. **Agent verb manifest** — one JSON description per verb (protocol name, MCP name, schema, docs);
   the JS dispatcher, the Rust MCP server and `docs/agent.md` consume it, and a parity test fails on
   drift. Today the three lists disagree (18 capabilities, 17 MCP tools, and `citation.preview` in
   only one), so adding a verb is a three-file, two-language edit.
2. **File plumbing** — keep `Zotero.File` as the deep interface and migrate `OS.File`/`OS.Path` call
   sites to `IOUtils`/`PathUtils` in waves. Five file APIs are in use today; one dialect makes
   repairs local.
3. **Dependency rules** — new and refactored code uses explicit imports (no new globals); UI code
   does not issue SQL; one module owns path resolution. Enforced by a grep gate.

Explicitly out of scope: splitting `zoteroPane.js` or `item.js`, merging the HTTP servers (their
protocols and auth models differ), and any DI container or event bus.

## Resolved decisions

1. **Recognize Document stays.** Rewire it to a plain HTTP request; no account is needed and the
   change is one call.
2. **`RepositoryUpdates` is extracted inside R19**, as one revertible commit; the update path is
   already being touched for the streamer.
3. **The unused tables and columns stay.** No migration; they are inert.
4. **R19 runs now.** Screenshots and the next release wait; the removal is the more fundamental work.

## Estimate

Stage 0: 2–3 h. Stage 1 move: 2–3 h. Unwire: 3–4 h. Delete and streamer trim: 2 h. Rename and
prune: 1–2 h. Verification and release: 2 h. One long session or two; stage 1 is timeboxed and
revertible alone.

## Second-opinion status

Three Strata passes on the revised order.

- **Pass 1 — blocked.** It caught two real ordering hazards: shrinking the settings API while
  `syncEngine` still calls it, and trimming the streamer before `syncRunner` is deleted. The plan
  now moves `LibrarySettings` after deletion and makes stage 3 one atomic commit.
- **Pass 2 — blocked.** It pressed on loader ordering, the same-stage deletion/trim, and
  cross-stage rollback. Those were addressed by stating that `getDBVersion` is called at check time
  rather than load time, that stage 3 is atomic, and that reverts are reverse-order and
  self-consistent.
- **Pass 3 — pass.** It agreed with the sequence and boundary; its remaining findings are
  code-verification items that stage 0 owns: no dangling references after the move, the upgrade
  test, and the full caller inventory.

It was wrong once along the way: it placed `SyncedSettings` inside `sync.js`; it is a separate
file. The convergence is on the stage boundaries and the two atomicity rules, not on its citations.

*For the full documentation index, see [index.md](index.md).*

## Appendix A — Stage 0 inventory (2026-11-28)

This is the file-by-file map the plan calls for. It is a snapshot; each stage re-runs the grep.

### Production code

| File | What it uses today | Action |
|---|---|---|
| `import/mendeley/mendeleyImport.mjs` | `Sync.Runner.delayIndefinite()` | remove the pause wrapper |
| `itemTreeRow.js` | `Sync.Storage.getItemDownloadProgress()` | drop the progress cell |
| `xpcom/data/item.js` | `Sync.Data.Local.isSyncItem()`, `Storage.Local` sync states, an `EventListeners` comment | drop the delete-log branch, remove the sync-state property, fix the comment |
| `xpcom/data/dataObject.js` | `Sync.Data.Local.deleteCacheObjectVersions()` | remove the call |
| `xpcom/data/notes.js` | `Sync.Runner.downloadFile()`, `Storage.Local.getEnabledForLibrary()` | remove the download branch |
| `xpcom/fulltext.js` | six `Runner.syncInProgress` checks, the sync content processor, `sync.fulltext.enabled` | remove the checks and the processor; keep the local API flush |
| `xpcom/server/server_connector.js` | `Sync.Runner.delaySync()` | remove |
| `xpcom/prefs.js` | `Sync.EventListeners` registration, `sync.*` migrations | remove the registration and migrations; keep the settings-store migration |
| `xpcom/recognizeDocument.js` | `Sync.Runner.getAPIClient()` | plain `Zotero.HTTP.request` |
| `xpcom/schema.js` | `Sync.Data.Local.resetSyncQueueTries()`, the repository block | remove the call; move the block in stage 1 |
| `xpcom/streamer.js` | `Sync.Data.Local.getAPIKey()`, `Runner.sync()`, `sync.autoSync`, `removeSyncSubscription()` | trim to a transport |
| `xpcom/zotero.js` | startup init of `Sync.Data.Local`, `Data.Utilities`, `Storage.Local`, `Storage.FileChangeWatcher`, `Sync.Runner`, `Sync.EventListeners`; `sync.*.username` in data-dir cleanup | remove |
| `zoteroPane.js` | `Sync.Runner`, `Sync.Server`, `Sync.Storage`; toolbar, menus, status, reminders, auto-sync | remove |
| `zoteroPane.xhtml` | `Sync.Runner.registerSyncStatus()` popup | remove |
| `xpcom/attachments.js` | `SyncedSettings` for the rename template and file types | rename caller only |
| `xpcom/osKeyStore.js` | used only by WebDAV and the sync credentials | delete |

### Library settings callers (rename in stage 4)

`fileRenamingDialog.js`, `attachments.js`, `attachmentReadObserver.js`, `data/feed.js`,
`data/feeds.js`, `data/item.js`, `data/library.js`, `data/tags.js`, `prefs.js`, `zotero.js`.
Tests: `attachmentReadObserverTest`, `attachmentsTest`, `collectionViewItemTreeTest`, `feedTest`,
`fileRenamingDialogTest`, `itemTest`, `libraryTest`, `readerTest`, `tagsTest`, and the renamed
`librarySettingsTest`.

### Preferences

21 defaults in `defaults/preferences/zotero.js` (`sync.autoSync` through
`sync.keyStoreMigrateAlertLastShown`). Readers outside the deleted trees: `zoteroPane.js` (reminders,
auto-sync), `prefs.js` (reminder pref), `streamer.js` (auto-sync), `fulltext.js`
(`sync.fulltext.enabled`), `osKeyStore.js` (migration alert). All go.

### Loader and build

`zotero.mjs` lists `sync` plus eight `sync/*` modules, nine `storage/*` modules and
`syncedSettings`; line 304 selects the platform file-change watcher. All entries and the selection
go in the stage that deletes their files.

### Strings

138 `sync.*` keys in the en-US `zotero.properties` (status, conflicts, storage errors, reminders,
key-store alert). Prune by reference after the code is gone; the other seven locales follow the same
corpus.

### Database

Kept: `syncedSettings` table, `synced`/`version` columns, `syncCache`, `syncDeleteLog`, `syncQueue`,
`syncObjectTypes`, `fulltextItems.synced`. `schema.js` keeps `getDBVersion()` for
`RepositoryUpdates`; the upgrade test runs against a copy of the current data directory.

### Tests

Delete: the seven sync suites plus `storageLocalTest`, `storageRequestTest`, `fileChangeWatcherTest`,
`zfsTest`, `webdavTest` (12). Update rather than delete: `support.js`, `collectionTest`,
`dataObjectTest`, `itemTest`, `undoHistoryTest`, `zoteroPaneTest` (they use sync helpers for setup),
and the settings-caller tests above.

### Baseline

Command: `CI=1 GDK_BACKEND=x11 MOZ_ENABLE_WAYLAND=0 test/runtests.sh` over the keep-list and the
attachment/full-text suites. Result: **309/326**, with 17 failures that exist before any code change
— 10 in `fulltextTest` (PDF indexing and the sync-content cache) and 7 in `attachmentsTest`
(linked-file paths and copy-to-stored). The gate for every stage is therefore "no new failure
against this list", not "zero failures". The full-text sync-processor cases disappear with the
processor in stage 2.
