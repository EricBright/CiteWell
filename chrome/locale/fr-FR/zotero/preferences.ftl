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
