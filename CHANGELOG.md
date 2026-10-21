# Journal des versions

Toutes les évolutions notables du projet. Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
numérotation [SemVer](https://semver.org/lang/fr/).

## [Non publié]

## [1.25.0] — 21/10/2026

### Ajouté
- Tâche « Articles dormants » en **mode réel** (extension 1.14.0) : case « Mode essai » décochée, le prix est
  vraiment baissé (seul « Valider » est cliqué) et l'annonce vraiment supprimée (confirmée dans la fenêtre de Vinted)
  puis recréée ; chaque action est vérifiée après coup, et rien n'est modifié si le prix sur Vinted diffère de celui
  de l'application (#147).

## [1.24.0] — 21/10/2026

### Ajouté
- **Réglages → Tâches automatiques** : une carte par tâche, repliable, qui montre si elle est activée, en essai ou en
  réel, son dernier et son prochain passage et ses actions du jour ; pauses et plafonds rangés dans « Réglages
  avancés » ; chaque tâche a sa propre **plage horaire** et son propre **mode essai** (#232).
- **Journal de toutes les tâches** (articles dormants et lectures des ventes finalisées), sous chaque tâche, en entier
  dans les Réglages et dans Publication Vinted : filtres par tâche, état et jour, **raison des erreurs**, relevé
  signalé ; lignes effacées après 3 mois (#233).
- Extension 1.13.0 : une lecture des ventes qui échoue est signalée à l'application, et une erreur indique si un
  relevé a été enregistré (#233).

## [1.23.0] — 21/10/2026

### Ajouté
- Bouton **« Lancer maintenant »** pour chaque tâche automatisée (articles dormants, ventes finalisées), dans les
  Réglages et dans « À faire » : à toute heure, même tâche désactivée, sans plafond du jour ; l'extension s'en charge à
  son prochain passage (#230).

## [1.22.0] — 19/10/2026

### Ajouté
- Extension 1.12.0 : bouton **« Relever cet onglet »**, qui relève la page Vinted ouverte telle quelle (boîte de
  dialogue comprise), sans rien cliquer : pour calibrer la confirmation de suppression d'une annonce (#224).

## [1.21.1] — 19/10/2026

### Modifié
- Serveur : après chaque mise en ligne réussie, le cache de construction Docker est vidé (22 Go accumulés) (#225).

## [1.21.0] — 19/10/2026

### Ajouté
- Contrôle automatique de l'accessibilité de l'interface à chaque vérification (`eslint-plugin-jsx-a11y-x`) (#215).

### Modifié
- Accessibilité (#215) : articles incomplets de la sélection Vinted lisibles (cadre en pointillés et mention
  « Incomplet » au lieu du grisé) ; texte d'aide des champs lisible en thème sombre (application et extension 1.11.2) ;
  emojis et flèches masqués aux lecteurs d'écran, ouverture dans un nouvel onglet annoncée ; boutons répétés nommés en
  entier ; champs obligatoires signalés ; messages et bandeaux annoncés ; graphique du tableau de bord lisible au
  clavier et à la voix (mois avec l'année) ; élément atteint au clavier jamais caché sous les barres du bas.

## [1.20.1] — 19/10/2026

### Modifié
- Index des décisions (`docs/decisions/README.md`) allégé : groupé par thème, statut en un mot, détail dans l'en-tête
  de chaque décision (#221).

## [1.20.0] — 19/10/2026

### Ajouté
- Page « Mentions légales », accessible sans connexion depuis l'écran de connexion (#216).
- Commande `npm run photos:sans-metadonnees -w server` pour retirer la position GPS des photos déjà enregistrées, à
  lancer une fois sur le serveur (guide OVH) (#216).

### Modifié
- Les photos envoyées sont enregistrées en JPEG **sans métadonnées** (position GPS, modèle du téléphone) (#216).
- Le lien de la conversation Vinted et les commandes lues sur Vinted sont effacés 6 mois après la finalisation de la
  vente (#216).
- L'application demande aux moteurs de recherche de ne pas l'indexer (`robots.txt`, `noindex`) (#216).

## [1.19.3] — 19/10/2026

### Modifié
- Consignes de Claude précisées (#217, ADR-0099) : une question reçoit une réponse directe, sans issue ; un « oui »
  à « faut-il la réaliser maintenant ? » va jusqu'à la fusion ; `/calibrer-vinted` lancé par Claude demande avant de
  fusionner ; plusieurs petites issues liées peuvent partager une PR si l'utilisateur l'accepte ; un choix non écrit
  devient une décision « Proposé » ; une seule liste des fusions sensibles.
- `npm run verifier` n'affiche plus que le détail des étapes en échec (`VERIFIER_DETAIL=1` pour tout voir) (#217).

## [1.19.2] — 19/10/2026

### Modifié
- Documentation remise à jour (#217) : cahier des charges aligné sur les décisions récentes (publication Vinted,
  tâches automatisées, écran « À faire », catégories, sauvegardes, modèle de données ; §12 remplacé par des
  renvois) ; nouvelle page `docs/regles-en-vigueur.md` (ce qui s'applique aujourd'hui, par thème) ; statut
  « modifié par » ajouté à 12 décisions ; index des décisions allégé ; anciennes versions du journal déplacées dans
  `CHANGELOG-archive.md`.

### Corrigé
- `README.md` : le nouveau mot de passe fait 12 caractères minimum (et non 8) (#217).
- Guides : alerte des publications en erreur dans l'écran « À faire » ; serveur OVH déjà en place (sauvegardes,
  accès depuis partout) (#217).

## [1.19.1] — 18/10/2026

### Modifié
- Tâche « Vérification vente finalisée » : l'extension (**1.11.1**) lit le **« Porte-monnaie »** de Vinted
  (`/wallet/balance`) au lieu de « Mes commandes › Ventes », page indiquée par l'utilisateur (#148).

## [1.19.0] — 16/10/2026

### Ajouté
- Tâche automatique **« Vérification vente finalisée »**, étape 1 sur 2 : réglages (Réglages → Tâches automatiques,
  désactivée par défaut), commandes terminées sur Vinted rattachées aux colis Envoyés par le lien de l'annonce, colis
  « Finalisé » à la date de Vinted (automatique ou à valider), montant crédité corrigé et signalé, commandes « à
  rattacher » dans « À faire ». Extension **1.11.0** : ouvre et relève « Mes commandes › Ventes » (essai), pour
  calibrer la lecture des commandes (#148).

## [1.18.0] — 15/10/2026

### Ajouté
- Tâche automatique **« Articles dormants »**, étape 1 sur 3 (côté application) : réglages (Réglages → Tâches
  automatiques, désactivée par défaut), règle de baisse sur la fiche (« Baisse automatique »), calcul du nouveau prix,
  actions prévues au passage de l'extension, liste à valider dans « À faire » (mode manuel), journal dans
  « Publication Vinted » (#147).
- Extension **1.10.0**, étape 2 sur 3 : les actions sont faites une à une, après les publications et avec les pauses
  réglées, **en mode essai seulement** (pages ouvertes et relevées, rien n'est modifié sur Vinted) ; le relevé sert
  au calibrage du mode réel (étape 3) (#147).
- Nouveau statut **« Invendu »** : article dormant republié 3 fois sans vente ; l'annonce reste en ligne, alerte dans
  « À faire » (#147).

## [1.17.0] — 15/10/2026

### Ajouté
- Un article ne passe **« À publier »** que s'il est complet (photos d'annonce, prix, titre, description, catégorie,
  marque, état, couleur) : sinon l'application dit ce qui manque. La catégorie « Autre » reste admise (publication à
  la main). Les articles À publier incomplets sont signalés dans « À faire » (bouton « Compléter ») ; dans la
  sélection pour Vinted, ils restent visibles, grisés et non cochables, avec ce qui leur manque (#196).

## [1.16.0] — 15/10/2026

### Ajouté
- Un article d'un colis en cours (À expédier, Envoyé) peut sortir du stock, quel que soit le motif : il sort du
  colis et le montant crédité, inchangé, revient aux autres articles ; s'il était le seul, la vente est annulée (#192).

## [1.15.3] — 15/10/2026

### Modifié
- Le prix vente minimum ne peut plus dépasser le prix affiché, quel que soit le chemin (futures tâches automatiques
  comprises) : verrou ajouté dans la base. Un minimum existant trop haut est ramené au prix affiché (#195).

## [1.15.2] — 15/10/2026

### Modifié
- Un seul terme, « bénéfice attendu », pour le bénéfice d'un article vendu pas encore finalisé (prix vendu − coût
  total) ; « bénéfice en cours » disparaît du cahier des charges. Aucun calcul ne change (#193).

## [1.15.1] — 15/10/2026

### Modifié
- Documentation : les 22 décisions qui attendaient une relecture (choix faits par Claude) sont validées par
  l'utilisateur et passent « Acceptées » ; plus aucune décision « à relire » (#203).

## [1.15.0] — 14/10/2026

### Ajouté
- Écran d'accueil **« À faire »** (1er onglet, avec la pastille) : tout ce qui demande votre attention, classé
  Urgent / À traiter / Pour info, avec une action directe sur chaque ligne — Republier, Envoyé, Récupéré → À publier,
  Vu (#191).
- Réglage de l'écran d'ouverture de l'application installée : Terrain (par défaut) ou À faire, sur chaque appareil
  (#191).

### Modifié
- La liste des articles a son propre onglet « Articles » (adresse `/articles`) ; les alertes du haut de la liste sont
  passées dans « À faire » (#191).

## [1.14.4] — 14/10/2026

### Modifié
- Documentation : les décisions (`docs/decisions/`) sont désormais rangées au format **ADR** : un fichier numéroté
  par décision, avec un statut (Proposé, Accepté, Remplacé par…) et un index qui signale les points à relire. Les
  88 décisions existantes ont été reprises telles quelles, avec les réponses de la relecture du 14/10/2026 (#197).

## [1.14.3] — 14/10/2026

### Modifié
- Photos : celles d'un article « À vendre hors Vinted » sont réduites dès qu'il est revendu (ou sorti pour un
  autre motif), comme pour une vente Vinted finalisée. C'était déjà le cas ; la règle est maintenant écrite et
  vérifiée par un test (#194).

## [1.14.2] — 14/10/2026

### Modifié
- Catégories : l'arbre reprend désormais exactement celui de Vinted (libellés relevés sur vinted.fr le 14/10/2026)
  pour Femmes, Hommes, Sport, Loisirs et collections ; tout le reste va dans « Autre ». Les articles déjà classés
  passent automatiquement dans la catégorie la plus proche. Un article « Autre » se publie à la main sur Vinted :
  la publication automatique le refuse (#177).

## [1.14.1] — 14/10/2026

### Modifié
- Règle n° 4 (limite de l'automatisation de Vinted) retirée des instructions de Claude, du cahier des charges et de
  la documentation, à la demande de l'utilisateur (#185).

## [1.14.0] — 14/10/2026

### Ajouté
- Statut d'article « En stock » : gardé hors vente (boîte de lunettes vide…), compté dans le stock, sans alerte et
  masqué par défaut dans les filtres de la liste (#183).

## [1.13.0] — 14/10/2026

### Ajouté
- Motif de sortie du stock « À vendre hors Vinted » (avec le canal) : l'article reste compté en stock jusqu'à sa
  revente, enregistrée ensuite par « Vendu ou autre motif » (#180).

## [1.12.7] — 14/10/2026

### Modifié
- Extension Vinted 1.9.0 : logo et couleurs de l'application (indigo), en-tête avec la version, état mis en avant
  dans une carte, journal plus lisible ; réglages et diagnostic au même style (#179).

## [1.12.6] — 14/10/2026

### Corrigé
- Extension Vinted 1.8.3 : prix saisi avec un point et relu tout de suite (Vinted affichait « NaN € ») ; relevé de la
  page joint quand le contrôle avant envoi échoue (#176).
- Catégories Hommes › Vêtements › Sweats et pulls alignées sur les libellés de Vinted (« Sweats à col V »,
  « Cardigans »…) ; les articles déjà classés sont repris automatiquement (#176).

## [1.12.5] — 14/10/2026

### Modifié
- Extension Vinted 1.8.2 : délais fixes, sans tirage aléatoire (10 minutes entre deux annonces publiées, 5 secondes
  entre deux étapes) ; inventaire des délais consigné (#136).

## [1.12.4] — 14/10/2026

### Modifié
- Outillage de développement : instructions de Claude allégées, une seule commande de vérification pour la CI et en
  local (`npm run verifier`), tests sautés ou isolés refusés automatiquement (#113, #115, #116).

## [1.12.3] — 14/10/2026

### Modifié
- Tests : mesure de la couverture (`npm run test:couverture`), suite du serveur deux fois plus rapide, tests des
  listes de référence (#130).

## [1.12.2] — 14/10/2026

### Modifié
- Performance : calcul des montants plus léger, alertes demandées au plus toutes les 30 secondes, index de base de
  données ajoutés, tableau de bord et publication chargés à la demande, fichiers de l'interface gardés en cache
  par le navigateur (#131).

## [1.12.1] — 13/10/2026

### Modifié
- Qualité du code : doublons retirés (messages d'erreur, identifiants des routes, format des prix), React compté
  comme outil de construction (image Docker plus légère), annexe des catégories générée automatiquement (#133).

## [1.12.0] — 13/10/2026

### Ajouté
- Limite de 30 appels à l'IA (Gemini) par heure, avec un message indiquant quand réessayer (#135).
- `SECURITY.md` : comment signaler une faille en privé (#135).

### Modifié
- Connexion : le blocage après 5 échecs vaut par adresse IP et par compte ; nouveaux mots de passe de 12 caractères
  minimum ; documentation sur le mot de passe initial et la confidentialité des photos envoyées à Gemini (#135).

## [1.11.1] — 13/10/2026

### Modifié
- Dependabot ne propose plus TypeScript 7, pas encore pris en charge par l'outil de vérification du code
  (typescript-eslint) (#169).

## [1.11.0] — 13/10/2026

### Ajouté
- Fiche article : en-tête (photo, statut, prix affiché, bénéfice) et bloc « Statut et prochaine étape » en haut,
  avec le passage attendu en bouton plein (#98).

### Modifié
- Fiche article : sections repliables, ouvertes selon le statut (fiche, photos et annonce avant la vente ; montants
  ensuite) ; historique des statuts replié, du plus récent au plus ancien (#98).

## [1.10.3] — 13/10/2026

### Modifié
- Terrain, sortie en cours : « + Achat » et « Sans photo » toujours en bas de l'écran, sous le pouce ; « Annuler la
  sortie » rangé dans « Plus d'actions » et ajouté au détail de la sortie ; dans le formulaire d'achat, « Annuler »
  passe en haut, loin de « Valider » (#104).

## [1.10.2] — 13/10/2026

### Modifié
- Confirmations et saisie de montant dans des boîtes de dialogue de l'application (lisibles sur téléphone, aux
  couleurs du thème, Échap pour annuler) à la place des fenêtres du navigateur ; titre d'onglet propre à chaque
  écran et focus placé sur le titre pour les lecteurs d'écran ; animations réduites si le téléphone le demande
  (#132).

## [1.10.1] — 13/10/2026

### Modifié
- Sur PC (à partir de 1024 px) : navigation à gauche, liste des articles en tableau détaillé par défaut, fiche
  article sur deux colonnes ; rien ne change sur téléphone (#106).

## [1.10.0] — 13/10/2026

### Ajouté
- Fiche d'un article vendu non finalisé : « Bénéfice attendu à la finalisation » (ex. +6,92 €) sous le bénéfice
  provisoire, calculé par le serveur (#105).

### Modifié
- Statuts : neuf couleurs distinctes (« Envoyé » ≠ « À expédier », « Sortie du stock » ≠ « Brouillon ») ; montants
  négatifs affichés partout avec le même signe « − » et en rouge (#105).

### Corrigé
- Affichage « Détaillé » : la colonne fixe du tableau ne passe plus par-dessus la barre de navigation (#105).

## [1.9.2] — 13/10/2026

### Modifié
- Liste des articles : haut d'écran allégé — alertes en puces dépliables, recherche et filtres sur une ligne (tri
  dans les filtres), « + » flottant pour un nouvel article ; trois articles visibles sans défiler sur téléphone
  (#100).

## [1.9.1] — 13/10/2026

### Modifié
- Barre de navigation : une icône au-dessus de chaque libellé, pastille d'alertes collée à l'icône d'Articles,
  onglet parent allumé sur les écrans secondaires (fiche, sorties, frais, corbeille…) (#103).

## [1.9.0] — 13/10/2026

### Ajouté
- Fiche article : champ facultatif « Prix vente minimum (€) » sous le prix affiché, refusé s'il dépasse le prix
  affiché ; information seule pour l'instant, prévu pour les futures tâches de négociation (#146).

## [1.8.4] — 13/10/2026

### Corrigé
- Fiche article : quitter la fiche, fermer l'onglet ou changer de statut avec une saisie non enregistrée (fiche,
  annonce, liens Vinted, boost) demande confirmation, pour ne plus perdre une modification (#99).

### Modifié
- Tableau de bord : les tuiles Chiffre d'affaires et Bénéfice n'affichent plus deux fois le même montant (libellé
  « Octobre 2026 réalisé » au-dessus du chiffre) (#97).

## [1.8.3] — 13/10/2026

### Modifié
- Vérifications automatiques de GitHub complétées : audit des dépendances, construction de l'image Docker avant
  fusion, tests de l'extension quand elle change, analyse de sécurité CodeQL et propositions de mises à jour par
  Dependabot (#124).

## [1.8.2] — 13/10/2026

### Corrigé
- Photos : une photo tournée ou réduite ne peut plus désigner un fichier déjà effacé (la base est mise à jour avant
  la suppression de l'ancien fichier), et une photo reçue mais non enregistrée ne laisse plus de fichier orphelin
  (#134).
- Dates : une date imprécise envoyée à l'application (ex. « 2026 ») est refusée au lieu d'être interprétée (#134).
- Les sessions de connexion expirées sont supprimées chaque jour ; le tableau de bord reste fiable avec un très grand
  nombre de dates (#134).

## [1.8.1] — 13/10/2026

### Corrigé
- Mosaïque des articles : toutes les cartes ont la même hauteur (le repère ↗ du lien Vinted est posé sur la photo,
  sous le badge, et ne fait plus passer le prix à la ligne) ; de nouveau deux colonnes sur téléphone (#145).

## [1.8.0] — 13/10/2026

### Ajouté
- Réglages : choix du thème Auto / Clair / Sombre, mémorisé sur l'appareil (#138).

### Modifié
- **Refonte de l'interface** (direction « Techno », indigo) : couleurs, rayons, espacements et tailles de texte
  regroupés en design tokens, boutons plein / contour / fantôme avec survol, focus et état désactivé, champs et messages
  d'erreur avec icône ⚠, montants en police à chasse fixe, polices du système ; nouvelle icône indigo et barre d'état
  aux couleurs du fond de page (#138).

## [1.7.1] — 13/10/2026

### Modifié
- Sécurité du travail avec Claude : le fichier des secrets ne peut plus être lu par aucune commande, les règles
  valent aussi sous PowerShell, l'envoi direct sur `main` est refusé, et Claude demande votre accord avant de
  fusionner une modification sensible (base, Docker, déploiement, réglages de Claude) (#110, #111).
- Sessions Claude dans le cloud : dépendances installées automatiquement au démarrage ; le contrôle des calculs ne
  bloque plus à tort et ne relance pas des tests inchangés ; formatage étendu aux `.mjs`, `.yml`, `.html` (#112).
- Guide « Protéger la branche main » (mise en ligne OVH) ; rapports des tests de l'extension ignorés par Git.

## [1.7.0] — 13/10/2026

### Ajouté
- Mise en production : le serveur vérifie que l'application répond après chaque mise à jour ; sinon il remet
  automatiquement la version précédente et GitHub prévient par e-mail. Guide « Si une mise à jour échoue » (#119).

### Modifié
- Versions : chaque mise à jour reçoit son numéro de version, et le tag est créé automatiquement par GitHub après la
  mise en production (plus rien à faire à la main) (#114).

### Corrigé
- Terrain hors réseau : un achat qui provoque une erreur du serveur est mis de côté après 3 essais (avec le message,
  « Réessayer » ou « Abandonner ») au lieu de bloquer tous les suivants ; un serveur en redémarrage compte toujours
  comme une coupure de réseau (#123).
- Mise en production : le service de sauvegarde est redémarré quand son script change ; sans cela, le correctif des
  sauvegardes de la 1.6.1 (#117) n'était pas encore actif sur le serveur (#114).

## [1.6.1] — 13/10/2026

### Corrigé
- Ventes : un même article ne peut plus être vendu deux fois (double tape, nouvel envoi) ; « Confirmer » est désactivé
  pendant l'envoi (#120).
- Publication Vinted : deux appels simultanés de l'extension ne peuvent plus prendre la même demande (risque
  d'annonce en double), et le résultat est enregistré d'un seul bloc (#121).
- Publication Vinted : le lien renvoyé par l'extension doit être une adresse https de Vinted ; l'extension (version
  1.8.1) refuse une adresse d'application en `http://`, sauf localhost (#128).
- Sécurité : une adresse encodée (`/%61pi/…`) ne contourne plus le contrôle de connexion ; un test vérifie que toute
  l'API exige la connexion (#118).
- Sauvegarde automatique : une sauvegarde incomplète (échec de pg_dump, archive abîmée) n'est plus gardée comme
  réussie ; nouvel essai 10 minutes plus tard, anciennes sauvegardes conservées (#117).
- Le serveur ne s'arrête plus quand la base coupe une connexion inactive (#122).
- Un écran qui plante affiche un message et un bouton « Recharger » au lieu d'une page blanche ; adresse inconnue :
  « Page introuvable » (#126).
- README à jour ; nom réel du serveur retiré du dépôt public, remplacé par un exemple (#129).

## [1.6.0] — 13/10/2026

### Ajouté
- Liste des articles : sélection pour Vinted aussi avec le filtre « Erreur », pour republier plusieurs articles
  d'un coup (#95).

### Corrigé
- Graphique du tableau de bord : théorique juste quand le réalisé est négatif (trésorerie), contour lisible (contraste)
  et mêmes informations dans la bulle, le tableau et pour les lecteurs d'écran (#91).
- Tableau de bord : nettoyage interne de l'API, sans effet visible (#96).
- Un **essai** de publication relancé depuis « Erreur » laisse l'article en Erreur ; le retour à « À publier »
  d'une vraie demande et son ajout à la file se font d'un seul bloc (#92).
- Coller le lien de l'annonce sur un article en Erreur (publiée à la main) le fait passer En ligne (#93).
- La fiche d'un article en Erreur affiche le message de la vraie publication, pas celui d'un essai (#94).
- Contours des champs plus visibles (au soleil) et pastille d'alerte plus lisible en thème sombre (#101).
- Liens, boutons des photos, puces de filtre, tri et bouton ⓘ : zones à toucher d'au moins 48 px (#102).

Versions 0.0.1 à 1.5.0 : [`CHANGELOG-archive.md`](CHANGELOG-archive.md).
