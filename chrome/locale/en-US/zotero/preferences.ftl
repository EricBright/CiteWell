preferences-window =
    .title = { -app-name } Settings

preferences-appearance-title = Appearance and Language

preferences-auto-recognize-files =
    .label = Automatically retrieve metadata for PDFs and ebooks

preferences-file-renaming-title = File Renaming
preferences-file-renaming-intro =
    { -app-name } can automatically rename files based on the details of the parent item (title, author, etc.) and keep the filenames in sync as you make changes. Downloaded files are always initially named based on the parent item.
preferences-file-renaming-configure-button =
    .label = Configure File Renaming…

preferences-attachment-titles-title = Attachment Titles
preferences-attachment-titles-intro = Attachment titles are <label data-l10n-name="wiki-link">different from filenames</label>. To support some workflows, { -app-name } can show filenames instead of attachment titles in the items list.
preferences-attachment-titles-show-filenames =
    .label = Show attachment filenames in the items list

preferences-reader-title = Reader
preferences-reader-open-epubs-using = Open EPUBs using
preferences-reader-open-snapshots-using = Open snapshots using
preferences-reader-open-in-new-window =
    .label = Open files in new windows instead of tabs
preferences-reader-auto-disable-tool =
    .label = Turn off note, text, and image annotation tools after each use
preferences-reader-ebook-font = Ebook font:
preferences-reader-ebook-hyphenate =
    .label = Enable automatic hyphenation

preferences-read-aloud-title = Read Aloud
preferences-read-aloud-highlight-granularity = Highlight current
preferences-read-aloud-highlight-granularity-paragraph =
    .label = paragraph
preferences-read-aloud-highlight-granularity-sentence =
    .label = sentence
preferences-read-aloud-highlight-granularity-word =
    .label = word

preferences-note-title = Notes
preferences-note-open-in-new-window =
    .label = Open notes in new windows instead of tabs

preferences-color-scheme = Color Scheme:
preferences-color-scheme-auto =
    .label = Automatic
preferences-color-scheme-light =
    .label = Light
preferences-color-scheme-dark =
    .label = Dark

preferences-item-pane-header = Item Pane Header:
preferences-item-pane-header-style = Header Citation Style:
preferences-item-pane-header-locale = Header Language:
preferences-item-pane-header-missing-style = Missing style: <{ $shortName }>

preferences-locate-library-lookup-intro = Library Lookup can find a resource online using your library’s OpenURL resolver.
preferences-locate-resolver = Resolver:
preferences-locate-base-url = Base URL:

preferences-quickCopy-minus =
    .aria-label = { general-remove }
    .label = { $label }
preferences-quickCopy-plus =
    .aria-label = { general-add }
    .label = { $label }

preferences-styleManager-intro = { -app-name } can generate citations and bibliographies in over 10,000 citation styles. Add styles here to make them available when selecting styles throughout { -app-name }.
preferences-styleManager-get-additional-styles =
    .label = Get Additional Styles…
preferences-styleManager-restore-default =
    .label = Restore Default Styles…
preferences-styleManager-add-from-file =
    .tooltiptext = Add a style from a file
    .label = Add from File…
preferences-styleManager-remove = Press { delete-or-backspace } to remove this style.
preferences-citation-dialog = Citation Dialog
preferences-citation-dialog-mode = Citation Dialog Mode:
preferences-citation-dialog-mode-last-used =
    .label = Last Used
preferences-citation-dialog-mode-list =
    .label = List Mode
preferences-citation-dialog-mode-library =
    .label = Library Mode

preferences-advanced-enable-local-api =
    .label = Allow other applications on this computer to communicate with { -app-name }
preferences-advanced-local-api-available = Available at <code data-l10n-name="url">{ $url }</span>
preferences-advanced-local-api-clear-authorizations =
    .label = Clear Write Authorizations
preferences-advanced-server-disabled = The { -app-name } HTTP server is disabled.
preferences-advanced-server-enable-and-restart =
    .label = Enable and Restart
preferences-advanced-language-and-region-title = Language and Region
preferences-advanced-enable-bidi-ui =
    .label = Enable bidirectional text editing utilities
preferences-advanced-data-dir =
    .value = Data Directory:
preferences-advanced-reset-data-dir =
    .label = Revert to Default Location…
preferences-advanced-custom-data-dir =
    .label = Use Custom Location…
preferences-advanced-default-data-dir =
    .value = (Default: { $directory })
    .aria-label = Default location

-preferences-sync-data-syncing = Data Syncing
preferences-sync-data-syncing-groupbox =
    .aria-label = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-heading = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-description = Log in with your { -app-name } account to sync your data between devices, collaborate with others, and more.
preferences-sync-settings-heading = Sync
preferences-sync-settings-intro = { -app-name } can sync your library data and files across devices. <label data-l10n-name="sync-link">Learn more</label>
preferences-sync-reset-heading = Sync Reset
preferences-sync-fileSyncing-groups =
    .label = Sync attachment files in group libraries using { -app-name } Storage
preferences-sync-fileSyncing-tos = By using { -app-name } Storage, you agree to become bound by its <label data-l10n-name="terms-link">terms and conditions</label>.
preferences-account-log-out =
    .label = Log Out…

fulltext-index-status-indexing = Indexing { $indexed } of { $total }…
fulltext-index-status-complete = Search index is up to date
fulltext-stats-attachments-indexed = Attachments indexed:
fulltext-stats-partially-indexed = Partially indexed:
fulltext-stats-not-available = Full-text content or file not available:
fulltext-stats-notes-indexed = Notes indexed:

preferences-translator-updates =
    Translator updates

browser-connector-title = Browser Connector
browser-connector-body1 = CiteWell does not include a browser connector. Saving items from a web page, and citations in Google Docs, use Zotero's official connector. It is a separate extension from another project.
browser-connector-body2 = CiteWell listens for it only on this computer, at 127.0.0.1:23119, and has no Zotero account, sync, or cloud storage. The extension follows Zotero's own privacy policy. There is no CiteWell connector yet, which is why this one link remains.
browser-connector-download =
    .label = Open the connector download page

local-api-title =
    Local API
local-api-description =
    Lets local scripts read and write the library over HTTP. Only this computer can connect, and write access needs an authorization you can clear here.

database-maintenance-title = Database Maintenance
database-maintenance-check-integrity =
    .label = Check Database Integrity
database-maintenance-reset-translators =
    .label = Reset Translators…

dns-title = DNS
dns-description =
    Choose how CiteWell turns web addresses into connections. Every lookup, from the Browse tab or the app, uses this resolver.
dns-cloudflare-label =
    .label = Cloudflare malware blocking (1.1.1.2 / 1.0.0.2), recommended
dns-system-label =
    .label = System default (this computer's own DNS)
dns-detail =
    The default sends encrypted DNS-over-HTTPS queries straight to https://1.1.1.2/dns-query, which blocks known malware domains. Encrypted DNS hides lookups from the local network, but it is not a VPN: sites you visit still see your address.
dns-planned =
    DNS-over-TLS for NextDNS and other custom resolvers is a planned feature; this engine speaks DNS-over-HTTPS today.

keyboard-shortcuts-title =
    Shortcuts

keyboard-shortcuts-new-item =
    Create a New Item

keyboard-shortcuts-new-note =
    Create a New Note

keyboard-shortcuts-focus-libraries =
    Focus Libraries Pane

keyboard-shortcuts-quick-search =
    Quick Search

keyboard-shortcuts-copy-item-citations =
    Copy Selected Item Citations to Clipboard

keyboard-shortcuts-copy-items =
    Copy Selected Items to Clipboard

keyboard-shortcuts-toggle-all-read =
    Mark All Feed Items As Read/Unread

keyboard-shortcuts-changes-take-effect =
    Changes take effect after restart

feeds-title =
    Feeds

feeds-sort-label =
    Sorting:

feeds-sort-newest =
    Newest items first

feeds-sort-oldest =
    Oldest items first

feeds-defaults-title =
    Feed Defaults

search-title =
    Search

search-fulltext-cache =
    Full-Text Cache

search-max-length =
    Maximum characters to index per file:

search-default =
    Default:

search-index-stats =
    Index Statistics

feeds-refresh-before =
    Update feed every

feeds-refresh-after =
    hour(s)

feeds-read-before =
    Remove read feed items after

feeds-read-after =
    day(s)

feeds-unread-before =
    Remove unread feed items after

feeds-unread-after =
    day(s)

search-default-note =
    (Default: 500000)

integrations-libreoffice-title = LibreOffice
integrations-libreoffice-description =
    Add citations to LibreOffice with the CiteWell extension. Close LibreOffice before installing, then restart it afterward.
integrations-libreoffice-install =
    .label = Install / repair LibreOffice extension…
integrations-libreoffice-backups =
    .label = Open repair backups…
integrations-system-title =
    System integration
integrations-system-description =
    CiteWell can request attention from the desktop through a user-scoped systemd unit and D-Bus activation file. Nothing is installed system-wide. These files are separate from your library and LibreOffice profile.
integrations-system-repair =
    .label = Repair system integration…
integrations-system-remove =
    .label = Remove system integration…
integrations-installed = User-level activation integration is installed.
integrations-not-installed = User-level activation integration is not installed.
integrations-manifest = Manifest: { $path }

notes-title = Notes
notes-description =
    Notes are Markdown files opened by your editor. Legacy notes stored inside the database can be converted once; each converted file is verified before the old note moves to Trash, and the database is backed up first.
notes-migrate =
    .label = Migrate notes to Markdown files…
annotations-title =
    PDF annotations
annotations-description =
    CiteWell no longer displays PDF annotations. Existing annotations can be exported once to a human-readable annotations.md beside each PDF. Existing sidecar files are never overwritten.
annotations-export =
    .label = Export PDF annotations to Markdown…

agent-access-title = Agent access
agent-access-description =
    Allow a local agent, whether DeepSeek, MiMo, a script, or an MCP client, to work with this library through the /agent/v1 bridge.
agent-enabled-label =
    .label = Allow local agents to use this library
agent-bridge-note =
    The bridge listens on 127.0.0.1 only. Reads and writes both require the token below. Deleting an item moves it to the trash; there is no "empty trash" verb.
agent-connection-title =
    Connection
agent-token-label =
    .value = Token
agent-copy =
    .label = Copy
agent-regenerate =
    .label = Regenerate
agent-token-note =
    Any local process that can read this file can drive the app. Keep it private; regenerate it if it may have been exposed, then update the agent's copy.
agent-token-path = Token file: { $path }

agent-setup-title =
    Set up an agent
agent-setup-description =
    The CLI is a thin client for this bridge. Install it from a CiteWell source checkout, then point it at this data directory:
agent-copy-setup =
    .label = Copy setup
agent-open-audit =
    .label = Open audit log
agent-mcp-note =
    MCP clients can start citewell mcp with this data directory; it exposes the same verbs as tools over stdio. The CLI and the HTTP form above remain available for everything else.
agent-capabilities-title =
    What agents can do
agent-capabilities-description =
    In this build: ping, search, item.get/create/update/addNote, item.attachFile/attachURL, translate.save for DOI/ISBN/PMID/URL, annotation.list/create and export.note for Markdown, collection.list/create/addItems, and ui.status/select/open/notify.
agent-protocol-note =
    The full verb list and protocol are in docs/agent.md.
agent-setup-step1 = Install the CLI from a CiteWell source checkout
agent-setup-step2 = Point it at this library's data directory
agent-setup-step3 = Check the bridge
agent-setup-step4 = For an MCP client, use this command
agent-setup-http = HTTP equivalent (the CLI reads the token for you)

agent-skill-title =
    Agent skill
agent-skill-description =
    Give an agent a ready-made SKILL.md that explains the app, the MCP tools and the safety rules. Save it as citewell/SKILL.md in the agent's skill directory.
agent-skill-copy =
    .label = Copy download link
agent-skill-open =
    .label = Open in browser
agent-audit-title =
    Audit
agent-audit-description =
    Every agent call appends one line to the audit path, recording the method, object keys and outcome, not note text or field values.

bibliography-locale-label =
    .value = Language:

library-current-title =
    Current library
library-current-description =
    This is the folder that holds your library and its files.
library-open =
    .label = Open folder
library-move =
    .label = Move…
library-locations-title =
    Locations
library-locations-description =
    Other folders CiteWell uses on this computer. Each path is shown with what it is for.

attachment-base-title =
    Linked Attachment Base Directory
attachment-base-message =
    CiteWell will use relative paths for linked file attachments within the base directory, allowing you to access files on different computers as long as the file structure within the base directory remains the same.
attachment-base-path-label =
    .value = Base directory:
attachment-base-choose =
    .label = Choose…
attachment-base-revert =
    .label = Revert to Absolute Paths…

locate-title =
    Locate

data-dir-title =
    Data Directory Location
data-dir-via-command-line =
    .value = (specified via command line)
data-dir-reveal =
    .label = Show Data Directory
data-dir-migrate =
    .label = Migrate To New Default Location…

cite-styles-title =
    Style Manager
cite-tools-title =
    Tools
cite-style-editor =
    .label = Style Editor
cite-style-preview =
    .label = Style Preview
cite-word-processors-title =
    Word Processors

quick-copy-title =
    Quick Copy
quick-copy-item-format =
    .value = Item Format:
quick-copy-note-format =
    .value = Note Format:
quick-copy-copy-as-html =
    .label = Copy as HTML
quick-copy-site-settings =
    .value = Site-Specific Settings:
quick-copy-drag-limit =
    .value = Disable Quick Copy when dragging more than
quick-copy-edit =
    .label = Edit
quick-copy-loading =
    .label = Loading…
quick-copy-items =
    .value = items

import-library-title =
    Import from Zotero
import-library-description =
    Choose the Zotero library to copy from. CiteWell has its own library and never modifies Zotero; its settings, plugins and sync credentials are never copied.
import-library-merge-note =
    Import builds the CiteWell library from the selected library when CiteWell is empty. Merge adds the selected library's items, collections and notes to the current one. Replace swaps the current library for the selected one and keeps the previous library as a restore point. Every action asks for confirmation.
import-rescan =
    .label = Rescan
import-choose =
    .label = Choose another folder…
import-check =
    .label = Check
import-into-empty =
    .label = Import into empty library…
import-merge =
    .label = Merge into current library…
import-replace =
    .label = Replace current library…
import-cancel =
    .label = Cancel staged import
import-cancel-restore =
    .label = Cancel staged restore
import-open-backups =
    .label = Open backup folder
import-scan-duplicates =
    .label = Scan library for duplicates…
import-open-duplicates =
    .label = Open Duplicate Items
import-skip-exact =
    .label = Skip items that exactly match an existing DOI/ISBN/PMID
restore-points-title =
    Restore points
restore-points-description =
    Backups made by import, replace or restore. Restoring swaps the active library and keeps the current one as a new restore point.
duplicate-review-title =
    Duplicate review
duplicate-review-description =
    Finds groups of items that Zotero's duplicate detector considers the same work. This only writes a review report; merging is done by hand in Duplicate Items.
last-import-title =
    Last import

quick-copy-site-domain =
    .value = Domain/Path (e.g., wikipedia.org)
quick-copy-site-format =
    .value = Format
quick-copy-site-locale =
    .value = Language

zotero-preferences-update-error =
    Error

zotero-preferences-update-updated =
    Updated

zotero-preferences-update-upToDate =
    Up to date

zotero-preferences-chooseApplication =
    Choose Application

zotero-preferences-locale-automatic =
    Automatic

zotero-preferences-advanced-migrateDataDir-title =
    Migrate Data Directory

zotero-preferences-advanced-migrateDataDir-directoryExists1 =
    A directory already exists at { $arg1 }.

zotero-preferences-advanced-migrateDataDir-directoryExists2 =
    Please move or rename it and try again.

zotero-preferences-advanced-resetStyles =
    Reset Styles

zotero-preferences-advanced-resetStyles-changesLost =
    Any new or modified styles will be lost.

zotero-preferences-advanced-resetTranslators =
    Reset Translators

zotero-preferences-advanced-resetTranslators-changesLost =
    Any new or modified translators will be lost.

attachmentBasePath-selectDir =
    Choose Base Directory

db-integrityCheck-passed =
    No errors were found in the database.

db-integrityCheck-failed =
    Errors were found in your CiteWell database.

db-integrityCheck-appRestartNeeded =
    { $arg1 } will need to be restarted.

db-integrityCheck-errorsFixed =
    The errors in your CiteWell database have been corrected.

db-integrityCheck-errorsNotFixed =
    CiteWell was unable to correct all the errors in your database.

db-integrityCheck-fixAndRestart =
    Fix Errors and Restart { $arg1 }

db-integrityCheck-repairAttempt =
    CiteWell can attempt to correct these errors.

db-integrityCheck-reportInForums =
    You can report this problem on CiteWell's issue tracker.

styles-deleteStyle =
    Are you sure you want to delete the style "{ $arg1 }"?

styles-deleteStyles =
    Are you sure you want to delete the selected styles?

styles-installError =
    "{ $arg1 }" is not a valid style file.

zotero-preferences-export-quickCopy-citationStyles =
    Citation Styles

zotero-preferences-export-quickCopy-exportFormats =
    Export Formats

zotero-preferences-export-quickCopy-instructions =
    Quick Copy allows you to quickly export items in a given format. You can copy selected items to the clipboard by pressing { $arg1 } or drag items directly into a text box in another program.

zotero-preferences-export-quickCopy-note-htmlOptions-label =
    Rich Text/HTML

zotero-preferences-styles-addStyle =
    Add Style

exportOptions-includeAppLinks =
    Include { $arg1 } Links
