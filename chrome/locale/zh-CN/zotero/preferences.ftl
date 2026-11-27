preferences-window =
    .title = { -app-name } 设置
preferences-appearance-title = 外观和语言
preferences-auto-recognize-files =
    .label = 自动检索 PDF 和电子书的元数据
preferences-file-renaming-title = 文件重命名
preferences-file-renaming-intro = { -app-name } 可以根据上级条目的元数据（如标题、作者等）自动重命名文件，并在你进行更改时保持文件名同步。下载的文件始终会根据上级条目进行初始命名。
preferences-file-renaming-configure-button =
    .label = 配置文件重命名…
preferences-attachment-titles-title = 附件标题
preferences-attachment-titles-intro = 附件标题<label data-l10n-name="wiki-link">与文件名不同</label>。为了支持某些工作流，{ -app-name }  可以在条目列表中显示文件名而不是附件标题。
preferences-attachment-titles-show-filenames =
    .label = 在条目列表中显示附件文件名
preferences-reader-title = 阅读器
preferences-reader-open-epubs-using = EPUB 打开方式：
preferences-reader-open-snapshots-using = 网页快照打开方式：
preferences-reader-open-in-new-window =
    .label = 在新窗口而不是标签页中打开文件
preferences-reader-auto-disable-tool =
    .label = 每次使用后关闭注释、文本和图像注释工具
preferences-reader-ebook-font = 电子书字体：
preferences-reader-ebook-hyphenate =
    .label = 启用自动连字
preferences-read-aloud-title = 朗读
preferences-read-aloud-highlight-granularity = 高亮当前
preferences-read-aloud-highlight-granularity-paragraph =
    .label = 段落
preferences-read-aloud-highlight-granularity-sentence =
    .label = 句子
preferences-read-aloud-highlight-granularity-word =
    .label = 单词
preferences-note-title = 笔记
preferences-note-open-in-new-window =
    .label = 在新窗口而不是标签页中打开笔记
preferences-color-scheme = 配色方案：
preferences-color-scheme-auto =
    .label = 自动
preferences-color-scheme-light =
    .label = 浅色
preferences-color-scheme-dark =
    .label = 深色
preferences-item-pane-header = 条目窗格题头：
preferences-item-pane-header-style = 顶部参考文献样式：
preferences-item-pane-header-locale = 题头语言：
preferences-item-pane-header-missing-style = 缺少样式：<{ $shortName }>
preferences-locate-library-lookup-intro = 文库检索可以使用图书馆的 OpenURL 解析器在线查找资源。
preferences-locate-resolver = 解析器:
preferences-locate-base-url = 基准网址：
preferences-quickCopy-minus =
    .aria-label = { general-remove }
    .label = { $label }
preferences-quickCopy-plus =
    .aria-label = { general-add }
    .label = { $label }
preferences-styleManager-intro = { -app-name } 可以生成 10,000 多种引用样式的引注和参考书目。在此处添加样式以便在 { -app-name } 中选择样式时使用。
preferences-styleManager-get-additional-styles =
    .label = 获取更多样式…
preferences-styleManager-restore-default =
    .label = 恢复默认样式…
preferences-styleManager-add-from-file =
    .tooltiptext = 从文件添加一个样式
    .label = 从文件添加…
preferences-styleManager-remove = 按 { delete-or-backspace } 删除此样式。
preferences-citation-dialog = 引用对话框
preferences-citation-dialog-mode = 引注对话框模式：
preferences-citation-dialog-mode-last-used =
    .label = 上次使用
preferences-citation-dialog-mode-list =
    .label = 列表模式
preferences-citation-dialog-mode-library =
    .label = 文库模式
preferences-advanced-enable-local-api =
    .label = 允许此计算机上的其他应用程序与 { -app-name } 通讯
preferences-advanced-local-api-available = 可用于 <code data-l10n-name="url">{ $url }</span>
preferences-advanced-local-api-clear-authorizations =
    .label = 清除写入授权
preferences-advanced-server-disabled = { -app-name } HTTP 服务器已禁用。
preferences-advanced-server-enable-and-restart =
    .label = 启用并重启
preferences-advanced-language-and-region-title = 语言和区域
preferences-advanced-enable-bidi-ui =
    .label = 启用双向文本编辑工具
preferences-advanced-data-dir =
    .value = 数据目录：
preferences-advanced-reset-data-dir =
    .label = 恢复到默认位置...
preferences-advanced-custom-data-dir =
    .label = 使用自定义位置
preferences-advanced-default-data-dir =
    .value = (默认： { $directory })
    .aria-label = 默认位置
preferences-pane-account = 账户
-preferences-sync-data-syncing = 数据同步
preferences-sync-data-syncing-groupbox =
    .aria-label = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-heading = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-description = 登录你的 { -app-name } 账户以跨设备同步你的数据、与他人协作等。
preferences-sync-settings-heading = 同步
preferences-sync-settings-intro = { -app-name } 可以跨设备同步文库数据和文件。<label data-l10n-name="sync-link">了解更多</label>
preferences-sync-reset-heading = 同步重置
preferences-sync-fileSyncing-groups =
    .label = 使用 { -app-name } 存储同步群组文库中的附件
preferences-sync-fileSyncing-tos = 使用 { -app-name } 存储即代表您接受其 <label data-l10n-name="terms-link">条款和条件</label>.
preferences-account-log-out =
    .label = 退出登录…
preferences-sync-reset-restore-to-server-body = { -app-name } 将用此计算机中的数据替换 { $domain } 中 “{ $libraryName }” 中的数据。
preferences-sync-reset-restore-to-server-deleted-items-text =
    在线文库中 { $remoteItemsDeletedCount } 个 { $remoteItemsDeletedCount ->
        [one] 条目
       *[other] 条目
    } 将被永久删除。
preferences-sync-reset-restore-to-server-remaining-items-text =
    { general-sentence-separator }{ $localItemsCount ->
        [0] 本地文库和在线文库将被清空。
        [one] 本地文库和在线文库中的1个条目将被保留。
       *[other] 本地文库和在线文库中的{ $localItemsCount } 个条目将被保留。
    }
preferences-sync-reset-restore-to-server-checkbox-label =
    { $remoteItemsDeletedCount ->
       *[other] 删除 { $remoteItemsDeletedCount } 个条目
    }
preferences-sync-reset-restore-to-server-confirmation-text = 删除在线文献库
preferences-sync-reset-restore-to-server-yes = 替换在线图书馆中的数据
preferences-account-log-in =
    .label = 登录
preferences-account-waiting-for-login =
    .value = 等待登录…
preferences-account-cancel-button =
    .label = { general-cancel }
preferences-account-logged-out-status =
    .value = （已退出登录）
preferences-account-email-label =
    .value = 邮箱:
preferences-account-switch-accounts =
    .label = 切换账户…
preferences-account-switch-text = 切换到其他账户将删除此计算机中所有的 { -app-name } 数据。在继续之前，请确保您想要保留的所有数据和文件都已与 “{ $username }” 账户同步，或者您已经备份 { -app-name } 数据目录。
preferences-account-switch-confirmation-text = 删除本地数据
preferences-account-switch-accept = 删除数据并重新启动
fulltext-index-status-indexing = 索引 { $indexed } / { $total }…
fulltext-index-status-complete = 搜索索引已更新
fulltext-stats-attachments-indexed = 已索引附件:
fulltext-stats-partially-indexed = 部分索引:
fulltext-stats-not-available = 全文内容或文件不可用:
fulltext-stats-notes-indexed = 已索引笔记:

browser-connector-title = 浏览器连接器
browser-connector-body1 = CiteWell 不包含浏览器连接器。从网页保存条目以及在 Google 文档中插入引注，使用的是 Zotero 的官方连接器。它是另一个项目的独立扩展。
browser-connector-body2 = CiteWell 仅在本机的 127.0.0.1:23119 上等待它，并且没有 Zotero 账户、同步或云存储。该扩展遵循 Zotero 自己的隐私政策。目前还没有 CiteWell 连接器，因此只保留这一个链接。
browser-connector-download =
    .label = 打开连接器下载页面

local-api-title =
    本地 API
local-api-description =
    允许本地脚本通过 HTTP 读取和写入文献库。只有这台计算机可以连接，写入需要授权，可在此清除。

database-maintenance-title = 数据库维护
database-maintenance-check-integrity =
    .label = 检查数据库完整性
database-maintenance-reset-translators =
    .label = 重置转换器…

dns-title = DNS
dns-description =
    选择 CiteWell 如何将网址转换为连接。无论是浏览标签页还是应用，每次查询都使用此解析器。
dns-cloudflare-label =
    .label = Cloudflare 恶意软件拦截（1.1.1.2 / 1.0.0.2），推荐
dns-system-label =
    .label = 系统默认（此计算机自带的 DNS）
dns-detail =
    默认情况下，加密的 DNS-over-HTTPS 查询会直接发送到 https://1.1.1.2/dns-query，从而拦截已知的恶意域名。加密 DNS 会对本地网络隐藏查询，但它不是 VPN：访问的网站仍会看到您的地址。
dns-planned =
    面向 NextDNS 和其他自定义解析器的 DNS-over-TLS 尚在计划中；此引擎目前使用 DNS-over-HTTPS。

keyboard-shortcuts-title =
    快捷键

keyboard-shortcuts-new-item =
    新建条目

keyboard-shortcuts-new-note =
    新建笔记

keyboard-shortcuts-focus-libraries =
    聚焦文库窗格

keyboard-shortcuts-quick-search =
    快速搜索

keyboard-shortcuts-copy-item-citations =
    复制选定条目的引注到剪贴板

keyboard-shortcuts-copy-items =
    复制选定的条目到剪贴板

keyboard-shortcuts-toggle-all-read =
    订阅条目全部标为已读/未读

keyboard-shortcuts-changes-take-effect =
    所做更改会在重启后生效

feeds-title =
    订阅

feeds-sort-label =
    排序:

feeds-sort-newest =
    最新条目在先

feeds-sort-oldest =
    最早条目在先

feeds-defaults-title =
    订阅默认

search-title =
    搜索

search-fulltext-cache =
    全文缓存

search-max-length =
    单个文件最多索引字符数:

search-default =
    默认:

search-index-stats =
    索引统计

feeds-refresh-before =
    更新订阅 每

feeds-refresh-after =
    小时

feeds-read-before =
    删除已读提要条目于之后

feeds-read-after =
    天

feeds-unread-before =
    删除未读提要条目于之后

feeds-unread-after =
    天

search-default-note =
    (默认: 500000)

integrations-libreoffice-title = LibreOffice
integrations-libreoffice-description =
    使用 CiteWell 扩展在 LibreOffice 中添加引用。安装前请关闭 LibreOffice，安装后重新启动。
integrations-libreoffice-install =
    .label = 安装 / 修复 LibreOffice 扩展…
integrations-libreoffice-backups =
    .label = 打开修复备份…
integrations-system-title =
    系统集成
integrations-system-description =
    CiteWell 可通过用户级 systemd 单元和 D-Bus 激活文件请求桌面注意。不会在系统范围内安装任何内容。这些文件与您的文献库和 LibreOffice 配置文件相互独立。
integrations-system-repair =
    .label = 修复系统集成…
integrations-system-remove =
    .label = 移除系统集成…
integrations-installed = 用户级激活集成已安装。
integrations-not-installed = 用户级激活集成未安装。
integrations-manifest = 清单：{ $path }

notes-title = Notes
notes-description =
    笔记是由您的编辑器打开的 Markdown 文件。数据库中的旧式笔记可以转换一次；每个转换后的文件都会先验证，然后旧笔记移入回收站，数据库会事先备份。
notes-migrate =
    .label = 将笔记迁移为 Markdown 文件…
annotations-title =
    PDF 注释
annotations-description =
    CiteWell 不再显示 PDF 注释。现有注释可以一次性导出为每个 PDF 旁的可读 annotations.md。现有附属文件绝不会被覆盖。
annotations-export =
    .label = 将 PDF 注释导出为 Markdown…

agent-access-title = Agent access
agent-access-description =
    允许本地智能体（DeepSeek、MiMo、脚本或 MCP 客户端）通过 /agent/v1 桥接使用此文献库。
agent-enabled-label =
    .label = 允许本地智能体使用此文献库
agent-bridge-note =
    桥接仅监听 127.0.0.1。读取和写入都需要下方令牌。删除条目会将其移入回收站；没有“清空回收站”命令。
agent-connection-title =
    连接
agent-token-label =
    .value = 令牌
agent-copy =
    .label = 复制
agent-regenerate =
    .label = 重新生成
agent-token-note =
    任何能读取此文件的本地进程都可以操控本应用。请保持私密；如果可能已泄露，请重新生成，然后更新智能体的副本。
agent-token-path = 令牌文件：{ $path }

agent-setup-title =
    设置智能体
agent-setup-description =
    CLI 是此桥接的轻量客户端。从 CiteWell 源代码检出安装它，然后将其指向此数据目录：
agent-copy-setup =
    .label = 复制设置
agent-open-audit =
    .label = 打开审计日志
agent-mcp-note =
    MCP 客户端可以使用此数据目录启动 citewell mcp；它通过 stdio 以工具形式提供相同的 verb。上方的 CLI 和 HTTP 形式仍可用于其他所有操作。
agent-capabilities-title =
    智能体可以做什么
agent-capabilities-description =
    此版本中：ping、search、item.get/create/update/addNote、item.attachFile/attachURL、用于 DOI/ISBN/PMID/URL 的 translate.save、用于 Markdown 的 annotation.list/create 和 export.note、collection.list/create/addItems，以及 ui.status/select/open/notify。
agent-protocol-note =
    完整的 verb 列表和协议位于 docs/agent.md。
agent-setup-step1 = 从 CiteWell 源代码检出安装 CLI
agent-setup-step2 = 将其指向此文献库的数据目录
agent-setup-step3 = 检查桥接
agent-setup-step4 = 使用 MCP 客户端时使用此命令
agent-setup-http = HTTP 等效方式（CLI 会为您读取令牌）

agent-skill-title =
    智能体技能
agent-skill-description =
    为智能体提供一个现成的 SKILL.md，说明本应用、MCP 工具和安全规则。将其保存为智能体技能目录中的 citewell/SKILL.md。
agent-skill-copy =
    .label = 复制下载链接
agent-skill-open =
    .label = 在浏览器中打开
agent-audit-title =
    审计
agent-audit-description =
    每次智能体调用都会在审计路径中追加一行，记录方法、对象键和结果，不记录笔记正文或字段值。
