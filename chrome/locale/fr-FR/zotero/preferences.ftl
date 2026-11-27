preferences-window =
    .title = { -app-name } Paramètres
preferences-appearance-title = Apparence et langue
preferences-auto-recognize-files =
    .label = Récupérer automatiquement des métadonnées pour les PDFs et les livres numériques
preferences-file-renaming-title = Renommage des fichiers
preferences-file-renaming-intro = { -app-name } peut renommer automatiquement les fichiers à partir des informations de leur document parent (titre, auteur, etc.) et synchroniser les noms de fichiers à mesure que vous apportez des modifications. Initialement, les fichiers téléchargés sont toujours nommés en fonction de leur document parent.
preferences-file-renaming-configure-button =
    .label = Configurer le renommage des fichiers...
preferences-attachment-titles-title = Titres de pièces jointes
preferences-attachment-titles-intro = Les titres de pièces jointes <label data-l10n-name="wiki-link">sont différents des noms de fichiers</label>. Pour prendre en charge certains flux de travail, { -app-name } peut afficher les noms de fichiers au lieu des titres de pièces jointes dans la liste des documents.
preferences-attachment-titles-show-filenames =
    .label = Afficher les noms de fichiers des pièces jointes dans la liste des documents
preferences-reader-title = Lecteur
preferences-reader-open-epubs-using = Ouvrir les EPUBs avec
preferences-reader-open-snapshots-using = Ouvrir les captures avec
preferences-reader-open-in-new-window =
    .label = Ouvrir les fichiers dans une nouvelle fenêtre au lieu d'un onglet
preferences-reader-auto-disable-tool =
    .label = Désactiver les outils d'annotation de note, de texte et d'image après chaque utilisation
preferences-reader-ebook-font = Police de caractère des livres numériques :
preferences-reader-ebook-hyphenate =
    .label = Activer la césure automatique
preferences-read-aloud-title = Lire à haute voix
preferences-read-aloud-highlight-granularity = Surlignage du texte lu par
preferences-read-aloud-highlight-granularity-paragraph =
    .label = paragraphe
preferences-read-aloud-highlight-granularity-sentence =
    .label = phrase
preferences-read-aloud-highlight-granularity-word =
    .label = mot
preferences-note-title = Notes
preferences-note-open-in-new-window =
    .label = Ouvrir les notes dans de nouvelles fenêtres plutôt que dans des onglets
preferences-color-scheme = Schéma de couleurs :
preferences-color-scheme-auto =
    .label = Automatique
preferences-color-scheme-light =
    .label = Lumineux
preferences-color-scheme-dark =
    .label = Sombre
preferences-item-pane-header = En-tête du panneau de document :
preferences-item-pane-header-style = Style de citation de l'en-tête :
preferences-item-pane-header-locale = Langue de l'en-tête :
preferences-item-pane-header-missing-style = Style manquant : <{ $shortName }>
preferences-locate-library-lookup-intro = La recherche dans la bibliothèque peut trouver une ressource en ligne avec le résolveur OpenURL de votre bibliothèque.
preferences-locate-resolver = Résolveur de liens :
preferences-locate-base-url = URL de base :
preferences-quickCopy-minus =
    .aria-label = { general-remove }
    .label = { $label }
preferences-quickCopy-plus =
    .aria-label = { general-add }
    .label = { $label }
preferences-styleManager-intro = { -app-name } peut générer des citations et des bibliographies dans plus de 10'000 styles de citation. Ajouter ici les styles afin qu'ils soient disponibles pour la sélection de styles dans { -app-name }.
preferences-styleManager-get-additional-styles =
    .label = Obtenir d'autres styles…
preferences-styleManager-restore-default =
    .label = Rétablir les styles par défaut...
preferences-styleManager-add-from-file =
    .tooltiptext = Ajouter un style à partir d'un fichier
    .label = Ajouter à partir d'un fichier
preferences-styleManager-remove = Appuyer sur { delete-or-backspace } pour supprimer ce style.
preferences-citation-dialog = Fenêtre de citation
preferences-citation-dialog-mode = Mode de la fenêtre de citation :
preferences-citation-dialog-mode-last-used =
    .label = La dernière utilisée
preferences-citation-dialog-mode-list =
    .label = Mode liste
preferences-citation-dialog-mode-library =
    .label = Mode bibliothèque
preferences-advanced-enable-local-api =
    .label = Autoriser d'autres applications sur cet ordinateur à communiquer avec { -app-name }
preferences-advanced-local-api-available = Disponible à l'adresse <code data-l10n-name="url">{ $url }</span>
preferences-advanced-local-api-clear-authorizations =
    .label = Révoquer les autorisations d'écriture
preferences-advanced-server-disabled = Le serveur HTTP { -app-name } est désactivé.
preferences-advanced-server-enable-and-restart =
    .label = Activer et redémarrer
preferences-advanced-language-and-region-title = Langue et zone géographique
preferences-advanced-enable-bidi-ui =
    .label = Activer les utilitaires d'édition de texte bidirectionnel
preferences-advanced-data-dir =
    .value = Répertoire de données :
preferences-advanced-reset-data-dir =
    .label = Revenir à l'emplacement par défaut...
preferences-advanced-custom-data-dir =
    .label = Utiliser un emplacement personnalisé…
preferences-advanced-default-data-dir =
    .value = (Par défaut : { $directory })
    .aria-label = Emplacement par défaut
preferences-pane-account = Compte
-preferences-sync-data-syncing = Synchronisation des données
preferences-sync-data-syncing-groupbox =
    .aria-label = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-heading = { -preferences-sync-data-syncing }
preferences-sync-data-syncing-description = Connectez-vous avec votre compte { -app-name } pour synchroniser vos données entre vos appareils, collaborer avec d'autres personnes, et bien plus encore.
preferences-sync-settings-heading = Synchronisation
preferences-sync-settings-intro = { -app-name } peut synchroniser les données et les fichiers de votre bibliothèque entre plusieurs appareils. <label data-l10n-name="sync-link">En savoir plus</label>
preferences-sync-reset-heading = Réinitialisation de la synchronisation
preferences-sync-fileSyncing-groups =
    .label = Synchroniser les fichiers joints dans les bibliothèques de groupe en utilisant le stockage de { -app-name }
preferences-sync-fileSyncing-tos = En utilisant le stockage de { -app-name }, vous acceptez d'être lié par ses <label data-l10n-name="terms-link">conditions générales</label>.
preferences-account-log-out =
    .label = Se déconnecter...
preferences-sync-reset-restore-to-server-body = { -app-name } remplacera “{ $libraryName }” sur { $domain } par les données de cet ordinateur.
preferences-sync-reset-restore-to-server-deleted-items-text =
    { $remoteItemsDeletedCount } { $remoteItemsDeletedCount ->
        [one] document
       *[other] documents
    } dans la bibliothèque en ligne seront définitivement supprimés.
preferences-sync-reset-restore-to-server-remaining-items-text =
    { general-sentence-separator }{ $localItemsCount ->
        [0] La bibliothèque sur cet ordinateur et la bibliothèque en ligne seront vides.
        [one] 1 document restera sur cet ordinateur et dans la bibliothèque en ligne.
       *[other] { $localItemsCount } documents resteront sur cet ordinateur et dans la bibliothèque en ligne.
    }
preferences-sync-reset-restore-to-server-checkbox-label =
    { $remoteItemsDeletedCount ->
        [one] Supprimer 1 document
        [many] Supprimer { $remoteItemsDeletedCount } documents
       *[other] Supprimer { $remoteItemsDeletedCount } documents
    }
preferences-sync-reset-restore-to-server-confirmation-text = Supprimer la bibliothèque en ligne
preferences-sync-reset-restore-to-server-yes = Remplacer les données dans la bibliothèque en ligne
preferences-account-log-in =
    .label = Se connecter
preferences-account-waiting-for-login =
    .value = En attente de connexion…
preferences-account-cancel-button =
    .label = { general-cancel }
preferences-account-logged-out-status =
    .value = (déconnecté)
preferences-account-email-label =
    .value = Courriel :
preferences-account-switch-accounts =
    .label = Changer de compte...
preferences-account-switch-text = Le passage à un autre compte entraînera la suppression de toutes les données de { -app-name } sur cet ordinateur. Avant de continuer, assurez-vous que toutes les données et tous les fichiers que vous souhaitez conserver ont été synchronisés avec le compte "{ $username }" ou que vous disposez d'une sauvegarde du répertoire de données de { -app-name }.
preferences-account-switch-confirmation-text = supprimer les données locales
preferences-account-switch-accept = Supprimer les données et redémarrer
fulltext-index-status-indexing = Indexation de { $indexed } sur { $total }…
fulltext-index-status-complete = L'index de recherche est à jour,
fulltext-stats-attachments-indexed = Pièces jointes indexées :
fulltext-stats-partially-indexed = Partiellement indexées :
fulltext-stats-not-available = Texte intégral ou fichier indisponible
fulltext-stats-notes-indexed = Notes indexées :

browser-connector-title = Connecteur de navigateur
browser-connector-body1 = CiteWell n'inclut pas de connecteur de navigateur. L'enregistrement d'éléments depuis une page web et les citations dans Google Docs utilisent le connecteur officiel de Zotero. Il s'agit d'une extension distincte, issue d'un autre projet.
browser-connector-body2 = CiteWell l'attend uniquement sur cet ordinateur, à l'adresse 127.0.0.1:23119, et ne dispose pas de compte Zotero, de synchronisation ni de stockage cloud. L'extension suit la politique de confidentialité de Zotero. Il n'existe pas encore de connecteur CiteWell, c'est pourquoi ce seul lien est conservé.
browser-connector-download =
    .label = Ouvrir la page de téléchargement du connecteur

local-api-title =
    API locale
local-api-description =
    Permet à des scripts locaux de lire et d’écrire la bibliothèque via HTTP. Seul cet ordinateur peut se connecter, et l’écriture nécessite une autorisation que vous pouvez révoquer ici.

database-maintenance-title = Maintenance de la base de données
database-maintenance-check-integrity =
    .label = Vérifier l'intégrité de la base de données
database-maintenance-reset-translators =
    .label = Réinitialiser les convertisseurs…

dns-title = DNS
dns-description =
    Choisissez comment CiteWell transforme les adresses web en connexions. Chaque résolution, depuis l’onglet Navigateur ou l’application, utilise ce résolveur.
dns-cloudflare-label =
    .label = Blocage des domaines malveillants par Cloudflare (1.1.1.2 / 1.0.0.2), recommandé
dns-system-label =
    .label = Valeur par défaut du système (le DNS de cet ordinateur)
dns-detail =
    Par défaut, les requêtes DNS-over-HTTPS chiffrées sont envoyées directement à https://1.1.1.2/dns-query, qui bloque les domaines malveillants connus. Le DNS chiffré cache les requêtes au réseau local, mais ce n’est pas un VPN : les sites visités voient toujours votre adresse.
dns-planned =
    DNS-over-TLS pour NextDNS et d’autres résolveurs personnalisés est prévu ; ce moteur utilise DNS-over-HTTPS aujourd’hui.

keyboard-shortcuts-title =
    Raccourcis clavier

keyboard-shortcuts-new-item =
    Créer un nouveau document

keyboard-shortcuts-new-note =
    Créer une nouvelle note

keyboard-shortcuts-focus-libraries =
    Placer le curseur dans le volet de gauche (bibliothèques)

keyboard-shortcuts-quick-search =
    Recherche rapide

keyboard-shortcuts-copy-item-citations =
    Copier dans le presse-papiers les documents sélectionnés, comme des citations

keyboard-shortcuts-copy-items =
    Copier dans le presse-papiers les documents sélectionnés, comme une bibliographie

keyboard-shortcuts-toggle-all-read =
    Marquer tous les documents du flux comme lus / non lus

keyboard-shortcuts-changes-take-effect =
    Les modifications prennent effet au prochain démarrage de Zotero

feeds-title =
    Flux

feeds-sort-label =
    Classement :

feeds-sort-newest =
    Les documents les plus récents en premier

feeds-sort-oldest =
    Les plus anciens documents en premier

feeds-defaults-title =
    Paramètres par défaut des flux

search-title =
    Recherche

search-fulltext-cache =
    Index du texte intégral

search-max-length =
    Nombre maximum de caractères à indexer par fichier :

search-default =
    Par défaut :

search-index-stats =
    Statistiques d'indexation

feeds-refresh-before =
    Mettre à jour le flux toutes les

feeds-refresh-after =
    heure(s)

feeds-read-before =
    Retirer les documents lus après

feeds-read-after =
    jour(s)

feeds-unread-before =
    Retirer les documents non lus après

feeds-unread-after =
    jour(s)

search-default-note =
    (Par défaut : 500000)

integrations-libreoffice-title = LibreOffice
integrations-libreoffice-description =
    Ajoutez des citations dans LibreOffice avec l’extension CiteWell. Fermez LibreOffice avant l’installation, puis redémarrez-le ensuite.
integrations-libreoffice-install =
    .label = Installer / réparer l’extension LibreOffice…
integrations-libreoffice-backups =
    .label = Ouvrir les sauvegardes de réparation…
integrations-system-title =
    Intégration système
integrations-system-description =
    CiteWell peut demander l’attention du bureau au moyen d’une unité systemd propre à l’utilisateur et d’un fichier d’activation D-Bus. Rien n’est installé à l’échelle du système. Ces fichiers sont distincts de votre bibliothèque et de votre profil LibreOffice.
integrations-system-repair =
    .label = Réparer l’intégration système…
integrations-system-remove =
    .label = Supprimer l’intégration système…
integrations-installed = L’intégration d’activation au niveau utilisateur est installée.
integrations-not-installed = L’intégration d’activation au niveau utilisateur n’est pas installée.
integrations-manifest = Manifeste : { $path }

notes-title = Notes
notes-description =
    Les notes sont des fichiers Markdown ouverts par votre éditeur. Les notes héritées stockées dans la base peuvent être converties une fois ; chaque fichier converti est vérifié avant que l’ancienne note ne passe à la corbeille, et la base est sauvegardée au préalable.
notes-migrate =
    .label = Migrer les notes vers des fichiers Markdown…
annotations-title =
    Annotations PDF
annotations-description =
    CiteWell n’affiche plus les annotations PDF. Les annotations existantes peuvent être exportées une fois dans un fichier annotations.md lisible à côté de chaque PDF. Les fichiers sidecar existants ne sont jamais écrasés.
annotations-export =
    .label = Exporter les annotations PDF vers Markdown…

agent-access-title = Agent access
agent-access-description =
    Autoriser un agent local, qu’il s’agisse de DeepSeek, MiMo, d’un script ou d’un client MCP, à travailler avec cette bibliothèque via le pont /agent/v1.
agent-enabled-label =
    .label = Autoriser les agents locaux à utiliser cette bibliothèque
agent-bridge-note =
    Le pont n’écoute que sur 127.0.0.1. La lecture et l’écriture exigent le jeton ci-dessous. Supprimer un élément le place dans la corbeille ; il n’existe pas de commande « vider la corbeille ».
agent-connection-title =
    Connexion
agent-token-label =
    .value = Jeton
agent-copy =
    .label = Copier
agent-regenerate =
    .label = Régénérer
agent-token-note =
    Tout processus local pouvant lire ce fichier peut piloter l’application. Gardez-le privé ; régénérez-le s’il a pu être exposé, puis mettez à jour la copie de l’agent.
agent-token-path = Fichier du jeton : { $path }

agent-setup-title =
    Configurer un agent
agent-setup-description =
    La CLI est un client léger pour ce pont. Installez-la depuis une copie des sources de CiteWell, puis pointez-la vers ce répertoire de données :
agent-copy-setup =
    .label = Copier la configuration
agent-open-audit =
    .label = Ouvrir le journal d’audit
agent-mcp-note =
    Les clients MCP peuvent lancer citewell mcp avec ce répertoire de données ; il expose les mêmes verbes sous forme d’outils via stdio. La CLI et la forme HTTP ci-dessus restent disponibles pour le reste.
agent-capabilities-title =
    Ce que les agents peuvent faire
agent-capabilities-description =
    Dans cette version : ping, search, item.get/create/update/addNote, item.attachFile/attachURL, translate.save pour DOI/ISBN/PMID/URL, annotation.list/create et export.note pour Markdown, collection.list/create/addItems, et ui.status/select/open/notify.
agent-protocol-note =
    La liste complète des verbes et le protocole se trouvent dans docs/agent.md.
agent-setup-step1 = Installer la CLI depuis une copie des sources de CiteWell
agent-setup-step2 = La pointer vers le répertoire de données de cette bibliothèque
agent-setup-step3 = Vérifier le pont
agent-setup-step4 = Pour un client MCP, utiliser cette commande
agent-setup-http = Équivalent HTTP (la CLI lit le jeton pour vous)

agent-skill-title =
    Compétence d’agent
agent-skill-description =
    Donnez à un agent un SKILL.md prêt à l’emploi qui explique l’application, les outils MCP et les règles de sécurité. Enregistrez-le sous citewell/SKILL.md dans le répertoire de compétences de l’agent.
agent-skill-copy =
    .label = Copier le lien de téléchargement
agent-skill-open =
    .label = Ouvrir dans le navigateur
agent-audit-title =
    Audit
agent-audit-description =
    Chaque appel d’agent ajoute une ligne au chemin d’audit, enregistrant la méthode, les clés d’objet et le résultat, pas le texte des notes ni les valeurs des champs.

bibliography-locale-label =
    .value = Langue :

library-current-title =
    Bibliothèque actuelle
library-current-description =
    Il s’agit du dossier qui contient votre bibliothèque et ses fichiers.
library-open =
    .label = Ouvrir le dossier
library-move =
    .label = Déplacer…
library-locations-title =
    Emplacements
library-locations-description =
    Autres dossiers utilisés par CiteWell sur cet ordinateur. Chaque chemin est affiché avec sa fonction.

attachment-base-title =
    Répertoire de base pour les pièces jointes liées
attachment-base-message =
    CiteWell utilisera un chemin relatif pour l'emplacement des pièces jointes liées - uniquement celles-ci - à l'intérieur du répertoire de base. Cela vous permet d'accéder à ces fichiers depuis différents ordinateurs dès lors que la structure des dossiers et fichiers dans ce répertoire de base reste la même.
attachment-base-path-label =
    .value = Répertoire de base :
attachment-base-choose =
    .label = Choisir…
attachment-base-revert =
    .label = Revenir à des chemins absolus…

locate-title =
    Localiser

data-dir-title =
    Emplacement du répertoire de données
data-dir-via-command-line =
    .value = (spécifié en ligne de commande)
data-dir-reveal =
    .label = Ouvrir le répertoire de données
data-dir-migrate =
    .label = Migrer vers le nouvel emplacement par défaut…

cite-styles-title =
    Gestionnaire de styles
cite-tools-title =
    Outils
cite-style-editor =
    .label = Éditeur de style
cite-style-preview =
    .label = Aperçu des styles
cite-word-processors-title =
    Traitements de texte

quick-copy-title =
    Copie rapide
quick-copy-item-format =
    .value = Format pour les documents :
quick-copy-note-format =
    .value = Format pour les notes :
quick-copy-copy-as-html =
    .label = Copier en HTML
quick-copy-site-settings =
    .value = Paramètres spécifiques au site :
quick-copy-drag-limit =
    .value = Désactiver la copie rapide lorsqu'on fait glisser plus de
quick-copy-edit =
    .label = Modifier
quick-copy-loading =
    .label = Chargement…
quick-copy-items =
    .value = documents

import-library-title =
    Importer depuis Zotero
import-library-description =
    Choisissez la bibliothèque Zotero à copier. CiteWell a sa propre bibliothèque et ne modifie jamais Zotero ; ses réglages, extensions et identifiants de synchronisation ne sont jamais copiés.
import-library-merge-note =
    Importer construit la bibliothèque CiteWell à partir de la bibliothèque sélectionnée lorsque CiteWell est vide. Fusionner ajoute les éléments, collections et notes de la bibliothèque sélectionnée à la bibliothèque actuelle. Remplacer échange la bibliothèque actuelle contre la sélectionnée et conserve la précédente comme point de restauration. Chaque action demande confirmation.
import-rescan =
    .label = Rescanner
import-choose =
    .label = Choisir un autre dossier…
import-check =
    .label = Vérifier
import-into-empty =
    .label = Importer dans une bibliothèque vide…
import-merge =
    .label = Fusionner dans la bibliothèque actuelle…
import-replace =
    .label = Remplacer la bibliothèque actuelle…
import-cancel =
    .label = Annuler l’import préparé
import-cancel-restore =
    .label = Annuler la restauration préparée
import-open-backups =
    .label = Ouvrir le dossier des sauvegardes
import-scan-duplicates =
    .label = Rechercher les doublons…
import-open-duplicates =
    .label = Ouvrir les doublons
import-skip-exact =
    .label = Ignorer les éléments qui correspondent exactement à un DOI/ISBN/PMID existant
restore-points-title =
    Points de restauration
restore-points-description =
    Sauvegardes créées par import, remplacement ou restauration. Restaurer échange la bibliothèque active et conserve l’actuelle comme nouveau point de restauration.
duplicate-review-title =
    Examen des doublons
duplicate-review-description =
    Trouve les groupes d’éléments que le détecteur de doublons de Zotero considère comme la même œuvre. Cela écrit seulement un rapport ; la fusion se fait à la main dans Doublons.
last-import-title =
    Dernier import

quick-copy-site-domain =
    .value = Domaine/Chemin (par ex. wikipedia.org)
quick-copy-site-format =
    .value = Format
quick-copy-site-locale =
    .value = Langue

zotero-preferences-update-error =
    Erreur

zotero-preferences-update-updated =
    Mis à jour

zotero-preferences-update-upToDate =
    À jour

zotero-preferences-chooseApplication =
    Choisir l'application

zotero-preferences-locale-automatic =
    Automatique

zotero-preferences-advanced-migrateDataDir-title =
    Migration du répertoire de données

zotero-preferences-advanced-migrateDataDir-directoryExists1 =
    Un répertoire existe déjà : { $arg1 }

zotero-preferences-advanced-migrateDataDir-directoryExists2 =
    Veuillez le déplacer ou le renommer et essayer à nouveau.

zotero-preferences-advanced-resetStyles =
    Réinitialiser les styles

zotero-preferences-advanced-resetStyles-changesLost =
    Tous les styles nouveaux ou modifiés seront perdus.

zotero-preferences-advanced-resetTranslators =
    Réinitialiser les convertisseurs

zotero-preferences-advanced-resetTranslators-changesLost =
    Tous les convertisseurs nouveaux ou modifiés seront perdus.

attachmentBasePath-selectDir =
    Choisir le répertoire de base

db-integrityCheck-passed =
    Aucune erreur trouvée dans la base de données.

db-integrityCheck-failed =
    Des erreurs ont été trouvées dans votre base de données CiteWell.

db-integrityCheck-appRestartNeeded =
    { $arg1 } devra être redémarré.

db-integrityCheck-errorsFixed =
    Les erreurs de votre base de données CiteWell ont été corrigées.

db-integrityCheck-errorsNotFixed =
    CiteWell n'a pas pu corriger toutes les erreurs dans votre base de données.

db-integrityCheck-fixAndRestart =
    Corriger les erreurs et redémarrer { $arg1 }

db-integrityCheck-repairAttempt =
    CiteWell peut essayer de corriger ces erreurs.

db-integrityCheck-reportInForums =
    Vous pouvez signaler ce problème dans le suivi des issues de CiteWell.

styles-deleteStyle =
    Voulez-vous vraiment supprimer le style "{ $arg1 }" ?

styles-deleteStyles =
    Voulez-vous vraiment supprimer les styles sélectionnés ?

styles-installError =
    { $arg1 } n'est pas un fichier de style valide.

zotero-preferences-export-quickCopy-citationStyles =
    Styles de citation

zotero-preferences-export-quickCopy-exportFormats =
    Formats d'exportation

zotero-preferences-export-quickCopy-instructions =
    La Copie rapide vous permet d'exporter en un geste des documents dans le format choisi ci-dessous. Vous pouvez copier les documents sélectionnés en appuyant sur { $arg1 } ou les glisser-déposer directement dans la zone de texte d'un autre logiciel.

zotero-preferences-export-quickCopy-note-htmlOptions-label =
    Texte riche / HTML

zotero-preferences-styles-addStyle =
    Ajouter un style

exportOptions-includeAppLinks =
    Inclure les liens { $arg1 }
