preferences-window =
    .title = { -app-name } 設定
preferences-appearance-title = 外觀和語言
preferences-auto-recognize-files =
    .label = 自動為 PDF 檔與電子書取得屬性資料
preferences-file-renaming-title = 文件重新命名
preferences-file-renaming-intro = { -app-name } can automatically rename files based on the details of the parent item (title, author, etc.) and keep the filenames in sync as you make changes. Downloaded files are always initially named based on the parent item.
preferences-file-renaming-configure-button =
    .label = Configure File Renaming…
preferences-attachment-titles-title = Attachment Titles
preferences-attachment-titles-intro = Attachment titles are <label data-l10n-name="wiki-link">different from filenames</label>. To support some workflows, { -app-name } can show filenames instead of attachment titles in the items list.
preferences-attachment-titles-show-filenames =
    .label = Show attachment filenames in the items list
preferences-reader-title = 閱讀器
preferences-reader-open-epubs-using = 開啟 EPUBs 使用
preferences-reader-open-snapshots-using = 開啟網頁快照使用
preferences-reader-open-in-new-window =
    .label = 在新視窗而不是分頁中打開檔案
preferences-reader-auto-disable-tool =
    .label = Turn off note, text, and image annotation tools after each use
preferences-reader-ebook-font = Ebook字體:
preferences-reader-ebook-hyphenate =
    .label = 啟用自動連字
preferences-read-aloud-title = Read Aloud
preferences-read-aloud-highlight-granularity = Highlight current
preferences-read-aloud-highlight-granularity-paragraph =
    .label = paragraph
preferences-read-aloud-highlight-granularity-sentence =
    .label = sentence
preferences-read-aloud-highlight-granularity-word =
    .label = word
preferences-note-title = 筆記
preferences-note-open-in-new-window =
    .label = Open notes in new windows instead of tabs
preferences-color-scheme = 配色方案:
preferences-color-scheme-auto =
    .label = 自動
preferences-color-scheme-light =
    .label = 亮色
preferences-color-scheme-dark =
    .label = 暗色
preferences-item-pane-header = 項目窗格的標頭:
preferences-item-pane-header-style = 標頭引用文獻樣式:
preferences-item-pane-header-locale = 標頭語言:
preferences-item-pane-header-missing-style = 缺少樣式:<{ $shortName }>
preferences-locate-library-lookup-intro = 文獻庫檢索可以使用您文獻庫的OpenURL解析器來線上尋找資源。
preferences-locate-resolver = 解析器:
preferences-locate-base-url = 基礎網址:
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
    .tooltiptext = 從檔案新增一個樣式
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
    .label = 允許此電腦上的其他應用程式與 { -app-name } 通訊
preferences-advanced-local-api-available = Available at <code data-l10n-name="url">{ $url }</span>
preferences-advanced-local-api-clear-authorizations =
    .label = Clear Write Authorizations
preferences-advanced-server-disabled = { -app-name } 的 HTTP 伺服器已停止。
preferences-advanced-server-enable-and-restart =
    .label = 啟用並重新啟動
preferences-advanced-language-and-region-title = 語言與區域
preferences-advanced-enable-bidi-ui =
    .label = 啟用雙向文字編輯應用程式
preferences-advanced-data-dir =
    .value = Data Directory:
preferences-advanced-reset-data-dir =
    .label = Revert to Default Location…
preferences-advanced-custom-data-dir =
    .label = 使用自訂位置...
preferences-advanced-default-data-dir =
    .value = （預設： { $directory } ）
    .aria-label = 預設位置
preferences-pane-account = Account
-preferences-sync-data-syncing = 資料同步
preferences-sync-data-syncing-groupbox =
    .aria-label = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-heading = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-description = Log in with your { -app-name } account to sync your data between devices, collaborate with others, and more.
preferences-sync-settings-heading = 同步
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
preferences-sync-reset-restore-to-server-yes = 換掉線上文獻庫中的資料
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

browser-connector-title = 瀏覽器連接器
browser-connector-body1 = CiteWell 不包含瀏覽器連接器。從網頁儲存項目以及在 Google 文件中插入引用，使用的是 Zotero 的官方連接器。它是另一個專案的獨立擴充功能。
browser-connector-body2 = CiteWell 僅在本機的 127.0.0.1:23119 上等待它，而且沒有 Zotero 帳戶、同步或雲端儲存。此擴充功能遵循 Zotero 自己的隱私權政策。目前還沒有 CiteWell 連接器，因此只保留這一個連結。
browser-connector-download =
    .label = 開啟連接器下載頁面

local-api-title =
    本機 API
local-api-description =
    允許本機指令碼透過 HTTP 讀取和寫入文獻庫。只有這台電腦可以連線，寫入需要授權，可在此清除。

database-maintenance-title = 資料庫維護
database-maintenance-check-integrity =
    .label = 檢查資料庫完整性
database-maintenance-reset-translators =
    .label = 重設轉譯器……

dns-title = DNS
dns-description =
    選擇 CiteWell 如何將網址轉換為連線。無論是瀏覽分頁還是應用程式，每次查詢都使用此解析器。
dns-cloudflare-label =
    .label = Cloudflare 惡意軟體封鎖（1.1.1.2 / 1.0.0.2），推薦
dns-system-label =
    .label = 系統預設（這台電腦自帶的 DNS）
dns-detail =
    預設會將加密的 DNS-over-HTTPS 查詢直接傳送到 https://1.1.1.2/dns-query，藉此封鎖已知的惡意網域。加密 DNS 會對本機網路隱藏查詢，但它不是 VPN：造訪的網站仍會看到您的位址。
dns-planned =
    適用於 NextDNS 和其他自訂解析器的 DNS-over-TLS 尚在規劃中；此引擎目前使用 DNS-over-HTTPS。

keyboard-shortcuts-title =
    快捷鍵

keyboard-shortcuts-new-item =
    新增項目

keyboard-shortcuts-new-note =
    新增筆記

keyboard-shortcuts-focus-libraries =
    聚焦到文獻庫窗格

keyboard-shortcuts-quick-search =
    快速搜尋

keyboard-shortcuts-copy-item-citations =
    複製所選項目的引用文獻到剪貼簿

keyboard-shortcuts-copy-items =
    複製所選項目到剪貼簿

keyboard-shortcuts-toggle-all-read =
    將所有新聞來源項目標示成已讀/未讀

keyboard-shortcuts-changes-take-effect =
    重新啟動後改變才會生效

feeds-title =
    新聞來源

feeds-sort-label =
    排序：

feeds-sort-newest =
    新的項目在前

feeds-sort-oldest =
    舊的項目在前

feeds-defaults-title =
    預設新聞來源

search-title =
    搜尋

search-fulltext-cache =
    全文快取

search-max-length =
    每個檔案的索引最大字元數：

search-default =
    預設：

search-index-stats =
    索引量統計

feeds-refresh-before =
    更新新聞來源內容，每

feeds-refresh-after =
    小時(可能為複數)

feeds-read-before =
    移除已讀的新聞來源項目，當超過

feeds-read-after =
    日(可能為複數)

feeds-unread-before =
    移除未讀的新聞來源項目，當超過

feeds-unread-after =
    日(可能為複數)

search-default-note =
    (預設： 500000)

integrations-libreoffice-title = LibreOffice
integrations-libreoffice-description =
    使用 CiteWell 擴充功能在 LibreOffice 中加入引用。安裝前請關閉 LibreOffice，安裝後重新啟動。
integrations-libreoffice-install =
    .label = 安裝 / 修復 LibreOffice 擴充功能…
integrations-libreoffice-backups =
    .label = 開啟修復備份…
integrations-system-title =
    系統整合
integrations-system-description =
    CiteWell 可透過使用者層級的 systemd 單元與 D-Bus 啟用檔案要求桌面注意。不會在系統範圍內安裝任何內容。這些檔案與您的文獻庫和 LibreOffice 設定檔各自獨立。
integrations-system-repair =
    .label = 修復系統整合…
integrations-system-remove =
    .label = 移除系統整合…
integrations-installed = 使用者層級的啟用整合已安裝。
integrations-not-installed = 使用者層級的啟用整合尚未安裝。
integrations-manifest = 清單：{ $path }

notes-title = Notes
notes-description =
    筆記是由您的編輯器開啟的 Markdown 檔案。資料庫中的舊式筆記可以轉換一次；每個轉換後的檔案都會先驗證，然後舊筆記移入垃圾桶，資料庫會事先備份。
notes-migrate =
    .label = 將筆記移轉為 Markdown 檔案…
annotations-title =
    PDF 註解
annotations-description =
    CiteWell 不再顯示 PDF 註解。現有註解可以一次性匯出為每個 PDF 旁的可讀 annotations.md。現有附屬檔案絕不會被覆寫。
annotations-export =
    .label = 將 PDF 註解匯出為 Markdown…

agent-access-title = Agent access
agent-access-description =
    允許本機代理程式（DeepSeek、MiMo、指令碼或 MCP 用戶端）透過 /agent/v1 橋接使用此文獻庫。
agent-enabled-label =
    .label = 允許本機代理程式使用此文獻庫
agent-bridge-note =
    橋接僅監聽 127.0.0.1。讀取和寫入都需要下方權杖。刪除項目會將其移入垃圾桶；沒有「清空垃圾桶」命令。
agent-connection-title =
    連線
agent-token-label =
    .value = 權杖
agent-copy =
    .label = 複製
agent-regenerate =
    .label = 重新產生
agent-token-note =
    任何能讀取此檔案的本機程序都可以操控本應用程式。請保持私密；若可能已外洩，請重新產生，然後更新代理程式的副本。
agent-token-path = 權杖檔案：{ $path }

agent-setup-title =
    設定代理程式
agent-setup-description =
    CLI 是此橋接的輕量用戶端。從 CiteWell 原始碼檢出安裝它，然後將其指向此資料目錄：
agent-copy-setup =
    .label = 複製設定
agent-open-audit =
    .label = 開啟稽核記錄
agent-mcp-note =
    MCP 用戶端可以使用此資料目錄啟動 citewell mcp；它透過 stdio 以工具形式提供相同的 verb。上方的 CLI 與 HTTP 形式仍可用於其他所有操作。
agent-capabilities-title =
    代理程式可以做什麼
agent-capabilities-description =
    此版本中：ping、search、item.get/create/update/addNote、item.attachFile/attachURL、用於 DOI/ISBN/PMID/URL 的 translate.save、用於 Markdown 的 annotation.list/create 與 export.note、collection.list/create/addItems，以及 ui.status/select/open/notify。
agent-protocol-note =
    完整的 verb 清單與協定位於 docs/agent.md。
agent-setup-step1 = 從 CiteWell 原始碼檢出安裝 CLI
agent-setup-step2 = 將其指向此文獻庫的資料目錄
agent-setup-step3 = 檢查橋接
agent-setup-step4 = 使用 MCP 用戶端時使用此命令
agent-setup-http = HTTP 等效方式（CLI 會為您讀取權杖）

agent-skill-title =
    代理程式技能
agent-skill-description =
    為代理程式提供現成的 SKILL.md，說明本應用程式、MCP 工具與安全規則。將其儲存為代理程式技能目錄中的 citewell/SKILL.md。
agent-skill-copy =
    .label = 複製下載連結
agent-skill-open =
    .label = 在瀏覽器中開啟
agent-audit-title =
    稽核
agent-audit-description =
    每次代理程式呼叫都會在稽核路徑中附加一行，記錄方法、物件鍵與結果，不記錄筆記內文或欄位值。

bibliography-locale-label =
    .value = 語言：

library-current-title =
    目前文獻庫
library-current-description =
    這是存放文獻庫及其檔案的資料夾。
library-open =
    .label = 開啟資料夾
library-move =
    .label = 移動…
library-locations-title =
    位置
library-locations-description =
    CiteWell 在這台電腦上使用的其他資料夾。每個路徑都會顯示其用途。

attachment-base-title =
    連結的附加檔來源目錄
attachment-base-message =
    CiteWell 會使用連到的附加檔來源目錄內的相對路徑，讓您可在不同電腦存取檔案，只要來源目錄內的檔案結構保持不變即可。
attachment-base-path-label =
    .value = 來源目錄：
attachment-base-choose =
    .label = 選擇……
attachment-base-revert =
    .label = 還原成絕對路徑……
