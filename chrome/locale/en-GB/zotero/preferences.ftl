preferences-window =
    .title = { -app-name } Settings
preferences-appearance-title = Appearance and Language
preferences-auto-recognize-files =
    .label = Automatically retrieve metadata for PDFs and ebooks
preferences-file-renaming-title = File Renaming
preferences-file-renaming-intro = { -app-name } can automatically rename files based on the details of the parent item (title, author, etc.) and keep the filenames in sync as you make changes. Downloaded files are always initially named based on the parent item.
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
preferences-pane-account = Account
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
preferences-sync-reset-restore-to-server-body = { -app-name } will replace “{ $libraryName }” on { $domain } with data from this computer.
preferences-sync-reset-restore-to-server-deleted-items-text =
    { $remoteItemsDeletedCount } { $remoteItemsDeletedCount ->
        [one] item
       *[other] items
    } in the online library will be permanently deleted.
preferences-sync-reset-restore-to-server-remaining-items-text =
    { general-sentence-separator }{ $localItemsCount ->
        [0] The library on this computer and the online library will be empty.
        [one] 1 item will remain on this computer and in the online library.
       *[other] { $localItemsCount } items will remain on this computer and in the online library.
    }
preferences-sync-reset-restore-to-server-checkbox-label =
    { $remoteItemsDeletedCount ->
        [one] Delete 1 item
       *[other] Delete { $remoteItemsDeletedCount } items
    }
preferences-sync-reset-restore-to-server-confirmation-text = delete online library
preferences-sync-reset-restore-to-server-yes = Replace Data in Online Library
preferences-account-log-in =
    .label = Log In
preferences-account-waiting-for-login =
    .value = Waiting for login…
preferences-account-cancel-button =
    .label = { general-cancel }
preferences-account-logged-out-status =
    .value = (logged out)
preferences-account-email-label =
    .value = Email:
preferences-account-switch-accounts =
    .label = Switch Accounts…
preferences-account-switch-text = Switching to a different account will remove all { -app-name } data on this computer. Before continuing, make sure all data and files you wish to keep have been synced with the “{ $username }” account or you have a backup of your { -app-name } data directory.
preferences-account-switch-confirmation-text = remove local data
preferences-account-switch-accept = Remove Data and Restart
fulltext-index-status-indexing = Indexing { $indexed } of { $total }…
fulltext-index-status-complete = Search index is up to date
fulltext-stats-attachments-indexed = Attachments indexed:
fulltext-stats-partially-indexed = Partially indexed:
fulltext-stats-not-available = Full-text content or file not available:
fulltext-stats-notes-indexed = Notes indexed:

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
