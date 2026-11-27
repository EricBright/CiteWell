preferences-window =
    .title = Ajustes de { -app-name }
preferences-appearance-title = Apariencia y idioma
preferences-auto-recognize-files =
    .label = Recuperación automática de metadatos de PDF y libros electrónicos
preferences-file-renaming-title = Renombrar archivos
preferences-file-renaming-intro = { -app-name } puede renombrar automáticamente los archivos basándose en los detalles del elemento principal (título, autor, etc.) y mantener los nombres de los archivos sincronizados a medida que realiza cambios. Los archivos descargados siempre se nombran inicialmente basándose en el elemento principal.
preferences-file-renaming-configure-button =
    .label = Configurar el cambio de nombre de archivos…
preferences-attachment-titles-title = Títulos de los archivos adjuntos
preferences-attachment-titles-intro = Los títulos de los archivos adjuntos son <label data-l10n-name="wiki-link">diferentes de los nombres de los archivos</label>. Para admitir algunos flujos de trabajo, { -app-name }  puede mostrar los nombres de los archivos en lugar de los títulos de los archivos adjuntos en la lista de elementos.
preferences-attachment-titles-show-filenames =
    .label = Mostrar los nombres de los archivos adjuntos en la lista de elementos
preferences-reader-title = Lector
preferences-reader-open-epubs-using = Abrir EPUB con
preferences-reader-open-snapshots-using = Abrir instantáneas con
preferences-reader-open-in-new-window =
    .label = Abrir archivos en ventanas nuevas en lugar de pestañas
preferences-reader-auto-disable-tool =
    .label = Desactivar las herramientas de anotación de notas, texto e imágenes después de cada uso.
preferences-reader-ebook-font = Fuente del libro electrónico:
preferences-reader-ebook-hyphenate =
    .label = Activar la separación silábica automática
preferences-read-aloud-title = Leer en voz alta
preferences-read-aloud-highlight-granularity = Resaltar actual
preferences-read-aloud-highlight-granularity-paragraph =
    .label = párrafo
preferences-read-aloud-highlight-granularity-sentence =
    .label = frase
preferences-read-aloud-highlight-granularity-word =
    .label = palabra
preferences-note-title = Notas
preferences-note-open-in-new-window =
    .label = Abrir notas en ventanas nuevas en lugar de pestañas
preferences-color-scheme = Esquema de color:
preferences-color-scheme-auto =
    .label = Automático
preferences-color-scheme-light =
    .label = Claro
preferences-color-scheme-dark =
    .label = Oscuro
preferences-item-pane-header = Encabezamiento del panel de elementos:
preferences-item-pane-header-style = Estilo de citación del encabezamiento:
preferences-item-pane-header-locale = Idioma del encabezamiento:
preferences-item-pane-header-missing-style = Falta estilo: <{ $shortName }>
preferences-locate-library-lookup-intro = Library Lookup puede encontrar un recurso en línea utilizando la resolución OpenURL de su biblioteca.
preferences-locate-resolver = Sistema de resolución:
preferences-locate-base-url = URL base:
preferences-quickCopy-minus =
    .aria-label = { general-remove }
    .label = { $label }
preferences-quickCopy-plus =
    .aria-label = { general-add }
    .label = { $label }
preferences-styleManager-intro = { -app-name } puede generar citas y bibliografías en más de 10 000 estilos de citas. Añada estilos aquí para que estén disponibles al seleccionar estilos en { -app-name }.
preferences-styleManager-get-additional-styles =
    .label = Obtener estilos adicionales...
preferences-styleManager-restore-default =
    .label = Restaurar estilos predeterminados...
preferences-styleManager-add-from-file =
    .tooltiptext = Añadir un estilo desde un archivo
    .label = Añadir desde archivo...
preferences-styleManager-remove = Presione { delete-or-backspace } para eliminar este estilo.
preferences-citation-dialog = Diálogo de citas
preferences-citation-dialog-mode = Modo de diálogo de citas:
preferences-citation-dialog-mode-last-used =
    .label = Último uso
preferences-citation-dialog-mode-list =
    .label = Modo lista
preferences-citation-dialog-mode-library =
    .label = Modo biblioteca
preferences-advanced-enable-local-api =
    .label = Permitir que otras aplicaciones de este equipo se comuniquen con { -app-name }
preferences-advanced-local-api-available = Disponible en <code data-l10n-name="url">{ $url }</span>
preferences-advanced-local-api-clear-authorizations =
    .label = Borrar autorizaciones de escritura
preferences-advanced-server-disabled = El servidor HTTP { -app-name } está desactivado.
preferences-advanced-server-enable-and-restart =
    .label = Habilitar y reiniciar
preferences-advanced-language-and-region-title = Idioma y región
preferences-advanced-enable-bidi-ui =
    .label = Habilitar utilidades bidireccionales de edición de texto
preferences-advanced-data-dir =
    .value = Directoria de datos:
preferences-advanced-reset-data-dir =
    .label = Volver a la ubicación predeterminada…
preferences-advanced-custom-data-dir =
    .label = Usar ubicación personalizada…
preferences-advanced-default-data-dir =
    .value = (Predeterminado: { $directory })
    .aria-label = Ubicación predeterminada
preferences-pane-account = Cuenta
-preferences-sync-data-syncing = Sincronizando datos
preferences-sync-data-syncing-groupbox =
    .aria-label = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-heading = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-description = Inicie sesión con su cuenta de { -app-name } para sincronizar sus datos entre dispositivos, colaborar con otras personas y mucho más.
preferences-sync-settings-heading = Sincronizar
preferences-sync-settings-intro = { -app-name } puede sincronizar los datos y archivos de tu biblioteca entre dispositivos.  <label data-l10n-name="sync-link">Más información</label>
preferences-sync-reset-heading = Restablecer sincronización
preferences-sync-fileSyncing-groups =
    .label = Sincronizar los archivos adjuntos en las bibliotecas de grupo mediante { -app-name } Storage
preferences-sync-fileSyncing-tos = Al utilizar { -app-name } Storage, aceptas quedar sujeto a sus  <label data-l10n-name="terms-link">términos y condiciones</label>.
preferences-account-log-out =
    .label = Cerrar sesión…
preferences-sync-reset-restore-to-server-body = { -app-name } reemplazará “{ $libraryName }” en { $domain } con datos de este equipo.
preferences-sync-reset-restore-to-server-deleted-items-text =
    { $remoteItemsDeletedCount } { $remoteItemsDeletedCount ->
        [one] elemento
       *[other] elementos
    } en la biblioteca en línea se eliminará de forma permanente.
preferences-sync-reset-restore-to-server-remaining-items-text =
    { general-sentence-separator }{ $localItemsCount ->
        [0] La biblioteca de este equipo y la biblioteca en línea estarán vacías.
        [one] 1 elemento permanecerá en este equipo y en la biblioteca en línea.
       *[other] { $localItemsCount } Los elementos permanecerán en este equipo y en la biblioteca en línea.
    }
preferences-sync-reset-restore-to-server-checkbox-label =
    { $remoteItemsDeletedCount ->
        [one] Eliminar 1 elemento
        [many] Eliminar { $remoteItemsDeletedCount } elementos
       *[other] Eliminar { $remoteItemsDeletedCount } elementos
    }
preferences-sync-reset-restore-to-server-confirmation-text = Eliminar biblioteca en línea
preferences-sync-reset-restore-to-server-yes = Reemplazar datos en la biblioteca en línea.
preferences-account-log-in =
    .label = Iniciar sesión
preferences-account-waiting-for-login =
    .value = Esperando a que se inicie sesión…
preferences-account-cancel-button =
    .label = { general-cancel }
preferences-account-logged-out-status =
    .value = (ha cerrado sesión)
preferences-account-email-label =
    .value = Correo electrónico:
preferences-account-switch-accounts =
    .label = Cambiar de cuenta…
preferences-account-switch-text = Si cambia a otra cuenta, se eliminarán todos los datos de { -app-name } de este equipo. Antes de continuar, asegúrese de que todos los datos y archivos que desea conservar se hayan sincronizado con la cuenta «{ $username }» o de que tenga una copia de seguridad del directorio de datos de { -app-name }.
preferences-account-switch-confirmation-text = borrar los datos locales
preferences-account-switch-accept = Borrar datos y reiniciar
fulltext-index-status-indexing = Indexación de { $indexed } de { $total }…
fulltext-index-status-complete = El índice de búsqueda está actualizado
fulltext-stats-attachments-indexed = Archivos adjuntos indexados:
fulltext-stats-partially-indexed = Indexado parcialmente:
fulltext-stats-not-available = Contenido completo o archivo no disponible:
fulltext-stats-notes-indexed = Notas indexadas:

browser-connector-title = Conector del navegador
browser-connector-body1 = CiteWell no incluye un conector de navegador. Para guardar elementos desde una página web y para las citas en Google Docs se usa el conector oficial de Zotero. Es una extensión independiente, procedente de otro proyecto.
browser-connector-body2 = CiteWell lo espera solo en este equipo, en 127.0.0.1:23119, y no tiene cuenta de Zotero, sincronización ni almacenamiento en la nube. La extensión sigue la política de privacidad de Zotero. Todavía no existe un conector de CiteWell, por eso se mantiene este único enlace.
browser-connector-download =
    .label = Abrir la página de descarga del conector

local-api-title =
    API local
local-api-description =
    Permite que los scripts locales lean y escriban la biblioteca por HTTP. Solo este equipo puede conectarse, y la escritura requiere una autorización que puede borrar aquí.

database-maintenance-title = Mantenimiento de la base de datos
database-maintenance-check-integrity =
    .label = Comprobar la integridad de la base de datos
database-maintenance-reset-translators =
    .label = Reiniciar traductores...

dns-title = DNS
dns-description =
    Elige cómo CiteWell convierte las direcciones web en conexiones. Cada consulta, desde la pestaña Navegar o la aplicación, usa este resolutor.
dns-cloudflare-label =
    .label = Bloqueo de malware de Cloudflare (1.1.1.2 / 1.0.0.2), recomendado
dns-system-label =
    .label = Predeterminado del sistema (el DNS de este equipo)
dns-detail =
    La opción predeterminada envía consultas DNS-over-HTTPS cifradas directamente a https://1.1.1.2/dns-query, que bloquea dominios maliciosos conocidos. El DNS cifrado oculta las consultas a la red local, pero no es una VPN: los sitios que visita siguen viendo su dirección.
dns-planned =
    DNS-over-TLS para NextDNS y otros resolutores personalizados está previsto; este motor usa DNS-over-HTTPS por ahora.

keyboard-shortcuts-title =
    Atajos

keyboard-shortcuts-new-item =
    Crear un nuevo elemento

keyboard-shortcuts-new-note =
    Crear una nota nueva

keyboard-shortcuts-focus-libraries =
    Enfocar el panel de bibliotecas

keyboard-shortcuts-quick-search =
    Búsqueda rápida

keyboard-shortcuts-copy-item-citations =
    Copiar las citas de los elementos seleccionados al portapapeles

keyboard-shortcuts-copy-items =
    Copiar los elementos seleccionados al portapapeles

keyboard-shortcuts-toggle-all-read =
    Marcar todos los elementos del canal como leídos/no leídos

keyboard-shortcuts-changes-take-effect =
    Los cambios tendrán efecto después de reiniciar

feeds-title =
    Canales

feeds-sort-label =
    Ordenación:

feeds-sort-newest =
    Elementos más nuevos primero

feeds-sort-oldest =
    Elementos más antiguos primero

feeds-defaults-title =
    Valores predeterminados del canal

search-title =
    Buscar

search-fulltext-cache =
    Caché de texto completo

search-max-length =
    Máximo de caracteres a indexar por archivo:

search-default =
    Predeterminado:

search-index-stats =
    Estadísticas de indexación

feeds-refresh-before =
    Actualizar canal cada

feeds-refresh-after =
    hora(s)

feeds-read-before =
    Eliminar elementos del canal leídos después de

feeds-read-after =
    día(s)

feeds-unread-before =
    Eliminar elementos del canal no leídos después de

feeds-unread-after =
    día(s)

search-default-note =
    (Predeterminado: 500000)

integrations-libreoffice-title = LibreOffice
integrations-libreoffice-description =
    Añade citas en LibreOffice con la extensión de CiteWell. Cierre LibreOffice antes de instalar y vuelva a abrirlo después.
integrations-libreoffice-install =
    .label = Instalar / reparar la extensión de LibreOffice…
integrations-libreoffice-backups =
    .label = Abrir copias de reparación…
integrations-system-title =
    Integración con el sistema
integrations-system-description =
    CiteWell puede solicitar la atención del escritorio mediante una unidad systemd del usuario y un archivo de activación D-Bus. No se instala nada en todo el sistema. Estos archivos son independientes de su biblioteca y de su perfil de LibreOffice.
integrations-system-repair =
    .label = Reparar la integración con el sistema…
integrations-system-remove =
    .label = Eliminar la integración con el sistema…
integrations-installed = La integración de activación a nivel de usuario está instalada.
integrations-not-installed = La integración de activación a nivel de usuario no está instalada.
integrations-manifest = Manifiesto: { $path }

notes-title = Notes
notes-description =
    Las notas son archivos Markdown que abre su editor. Las notas heredadas guardadas en la base de datos se pueden convertir una vez; cada archivo convertido se verifica antes de que la nota antigua pase a la papelera, y la base de datos se respalda primero.
notes-migrate =
    .label = Migrar notas a archivos Markdown…
annotations-title =
    Anotaciones PDF
annotations-description =
    CiteWell ya no muestra anotaciones PDF. Las anotaciones existentes se pueden exportar una vez a un archivo annotations.md legible junto a cada PDF. Los archivos sidecar existentes nunca se sobrescriben.
annotations-export =
    .label = Exportar anotaciones PDF a Markdown…

agent-access-title = Agent access
agent-access-description =
    Permite que un agente local, ya sea DeepSeek, MiMo, un script o un cliente MCP, trabaje con esta biblioteca mediante el puente /agent/v1.
agent-enabled-label =
    .label = Permitir que los agentes locales usen esta biblioteca
agent-bridge-note =
    El puente solo escucha en 127.0.0.1. La lectura y la escritura requieren el token de abajo. Eliminar un elemento lo mueve a la papelera; no existe el comando «vaciar papelera».
agent-connection-title =
    Conexión
agent-token-label =
    .value = Token
agent-copy =
    .label = Copiar
agent-regenerate =
    .label = Regenerar
agent-token-note =
    Cualquier proceso local que pueda leer este archivo puede controlar la aplicación. Manténgalo privado; regenérelo si pudo haberse expuesto y actualice después la copia del agente.
agent-token-path = Archivo de token: { $path }

agent-setup-title =
    Configurar un agente
agent-setup-description =
    La CLI es un cliente ligero para este puente. Instálela desde una copia del código fuente de CiteWell y apúntela a este directorio de datos:
agent-copy-setup =
    .label = Copiar configuración
agent-open-audit =
    .label = Abrir registro de auditoría
agent-mcp-note =
    Los clientes MCP pueden iniciar citewell mcp con este directorio de datos; expone los mismos verbos como herramientas por stdio. La CLI y la forma HTTP de arriba siguen disponibles para todo lo demás.
agent-capabilities-title =
    Qué pueden hacer los agentes
agent-capabilities-description =
    En esta compilación: ping, search, item.get/create/update/addNote, item.attachFile/attachURL, translate.save para DOI/ISBN/PMID/URL, annotation.list/create y export.note para Markdown, collection.list/create/addItems, y ui.status/select/open/notify.
agent-protocol-note =
    La lista completa de verbos y el protocolo están en docs/agent.md.
agent-setup-step1 = Instalar la CLI desde una copia del código fuente de CiteWell
agent-setup-step2 = Apuntarla al directorio de datos de esta biblioteca
agent-setup-step3 = Comprobar el puente
agent-setup-step4 = Para un cliente MCP, use este comando
agent-setup-http = Equivalente HTTP (la CLI lee el token por usted)

agent-skill-title =
    Habilidad del agente
agent-skill-description =
    Dé al agente un SKILL.md listo que explique la aplicación, las herramientas MCP y las reglas de seguridad. Guárdelo como citewell/SKILL.md en el directorio de habilidades del agente.
agent-skill-copy =
    .label = Copiar enlace de descarga
agent-skill-open =
    .label = Abrir en el navegador
agent-audit-title =
    Auditoría
agent-audit-description =
    Cada llamada de un agente añade una línea a la ruta de auditoría, registrando el método, las claves del objeto y el resultado, no el texto de las notas ni los valores de los campos.

bibliography-locale-label =
    .value = Idioma:

library-current-title =
    Biblioteca actual
library-current-description =
    Esta es la carpeta que contiene su biblioteca y sus archivos.
library-open =
    .label = Abrir carpeta
library-move =
    .label = Mover…
library-locations-title =
    Ubicaciones
library-locations-description =
    Otras carpetas que CiteWell usa en este equipo. Cada ruta se muestra con su finalidad.

attachment-base-title =
    Directorio base de adjuntos enlazados
attachment-base-message =
    CiteWell usará rutas relativas para los archivos adjuntos enlazados dentro del directorio base, permitiéndole acceder a los archivos desde diferentes ordenadores, siempre que la estructura de archivos dentro del directorio base se mantenga igual.
attachment-base-path-label =
    .value = Directorio base:
attachment-base-choose =
    .label = Elegir...
attachment-base-revert =
    .label = Revertir a rutas absolutas...

locate-title =
    Buscar

data-dir-title =
    Ubicación del directorio de datos
data-dir-via-command-line =
    .value = (especificado a través de línea de comandos)
data-dir-reveal =
    .label = Mostrar el directorio de datos
data-dir-migrate =
    .label = Migrar a una nueva ubicación predeterminada...

cite-styles-title =
    Gestor de estilos
cite-tools-title =
    Herramientas
cite-style-editor =
    .label = Editor de estilos
cite-style-preview =
    .label = Vista previa de estilos
cite-word-processors-title =
    Procesadores de texto
