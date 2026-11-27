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
