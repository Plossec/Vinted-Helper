# Journal des versions

Toutes les évolutions notables du projet. Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
numérotation [SemVer](https://semver.org/lang/fr/).

## [Non publié]

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

## [1.5.0] — 08/10/2026

### Modifié
- **Tableau de bord** plus lisible : seules les années d'activité ; tuiles « Octobre 2026 réalisé / théorique » ;
  calcul de la trésorerie détaillé ; frais généraux expliqués (ⓘ) avec bouton « Ajouter des frais divers » ;
  graphique réalisé + ventes en cours empilés ; stock par statut avec coût total et prix affiché (#88).

## [1.4.0] — 08/10/2026

### Ajouté
- Tableau de bord : sous le chiffre d'affaires et le bénéfice, ligne **« théorique … · dont en cours … »** qui
  ajoute les ventes À expédier et Envoyé (au mois de la vente), pour le mois et l'année (#85).

## [1.3.1] — 08/10/2026

### Modifié
- Outillage de Claude : `/verifier` fait les mêmes contrôles que la vérification automatique de GitHub (formatage et
  construction en plus, tests de l'extension si elle a changé) (#80) ; `/lot` réalise une issue de bout en bout,
  jusqu'à la PR fusionnée (#82). Aucun changement dans l'application.

## [1.3.0] — 08/10/2026

### Ajouté
- Statut **« Erreur »** : une vraie publication Vinted en échec y fait passer l'article (pas en mode essai), avec le
  message de l'échec sur la fiche et une alerte sur l'écran Articles ; on en sort en redemandant la publication ou
  en revenant à « À publier » (#72).
- Schéma d'architecture du projet (`docs/architecture.md`), tenu à jour à chaque version (#75).
- Outillage de Claude pour corriger l'extension Vinted à partir d'un relevé : sous-agent `analyste-releve` et
  commande `/calibrer-vinted` (#73, #74).

## [1.2.0] — 08/10/2026

### Ajouté
- **Publication automatique sur Vinted par une extension Chrome** (`outils/extension-vinted/`), dans le Chrome
  habituel : même file et même jeton, une annonce au plus toutes les 10 minutes, 5 secondes entre chaque étape du
  remplissage, pause automatique sur vérification, page « session bloquée » ou déconnexion (#54, #57, #63).
  - Formulaire calibré sur le vrai site : catégorie trouvée par la recherche de Vinted dans le bon rayon, champs
    déjà remplis par Vinted respectés, état, taille, couleurs et format du colis choisis à l'identique (#56).
  - Contrôle avant envoi (prix, photos, taille…) ; boutons **Diagnostic** et **Dernier relevé** pour corriger les
    repères si Vinted change (#56).
  - « Vérifier maintenant » indique toujours le résultat dans le journal (#61).
- Statut **« À récupérer »** après un retour de l'acheteur, puis « Récupéré » → À publier ou En ligne ; alerte sur
  l'écran Articles (#52).
- **Supprimer le dernier changement de statut** (erreur de saisie) depuis l'historique de la fiche, effets défaits
  (vente, colis, sortie du stock) (#50).
- **Lien de la conversation Vinted** saisi à la vente (« Vendu : à expédier »), gardé sur les articles du colis,
  modifiable sur la fiche, icône 💬 dans l'alerte « À expédier » (#48).
- **Lien de l'annonce Vinted** saisi sur la fiche (l'article passe En ligne s'il a un prix affiché) ; repère « ↗ »
  dans la liste des articles (#46).

### Modifié
- Ancien programme de publication du PC (bloqué par Vinted) **retiré** : seule l'extension Chrome publie (#68).

## [1.1.1] — 07/10/2026

### Ajouté
- IA Gemini : **modèle de secours** (`gemini-flash-lite-latest` par défaut) essayé automatiquement quand le modèle
  principal est saturé ou ne répond pas en 30 secondes (#43).

## [1.1.0] — 07/10/2026

### Ajouté
- **Rotation des photos** d'un article (↺ ↻, d'un quart de tour, définitive) (#35).
- **Modes d'affichage** de la liste des articles : vignettes, liste compacte, mosaïque, détaillé (tableau triable
  avec prix d'achat et bénéfice) (#31).
- **Déploiement continu** : vérification automatique (GitHub Actions) de chaque pull request, et mise à jour du
  serveur après chaque fusion dans `main` si tout est vert (`scripts/ovh/activer-deploiement-continu.sh`).
- **Import de l'ancien tableur** (`npm run import-tableur -w server`, mode `--essai`) : sorties, lots, mises en ligne
  et ventes recréés par les fonctions de l'application, en une seule transaction.

### Modifié
- Terrain : « Toutes les sorties » devient un bouton (#32).
- Liste des articles : **filtres à choix multiples** (statuts, catégories, marques, lieux, sorties) ; par défaut, tous
  les statuts sauf Finalisé et Sortie du stock (#30).

### Corrigé
- IA Gemini : modèle `gemini-flash-latest` conseillé (l'ancien `gemini-2.5-flash` a été retiré par Google) ;
  2 nouveaux essais automatiques quand Google est surchargé, avec un message clair (#38).
- Photo tournée : l'ancienne version restait affichée (liste, fiche, photo agrandie) ; rotation plus rapide (#39).

## [1.0.1] — 07/10/2026

### Ajouté
- **Rapatriement automatique des sauvegardes** sur le PC (`scripts/installer-sauvegarde-auto.ps1`) : clé SSH
  limitée à la lecture des sauvegardes, tâche planifiée Windows chaque jour, journal `rapatriement.log`.

## [1.0.0] — 06/10/2026

Mise en ligne sur le serveur OVH validée : l'application est utilisable partout (adresse du type `https://vps-1234abcd.vps.ovh.net`),
sauvegardée chaque nuit et rapatriée sur le PC.

> Publication automatique sur Vinted **en pause** : Vinted a bloqué la session au premier essai (activité
> automatisée détectée). Le programme du PC est arrêté ; la suite est à décider.

### Ajouté
- Terrain : bouton **Annuler la sortie**, avec confirmation ; les achats de la sortie vont à la corbeille
  (restaurables 30 jours, sans sortie), l'essence est effacée. Fonctionne sans réseau.

### Corrigé
- Serveur OVH : le dossier des sauvegardes était illisible pour l'utilisateur `ubuntu`, ce qui empêchait le
  rapatriement sur le PC (corrigé à l'installation et à la mise à jour).
- La file d'attente du téléphone tournait en boucle quand elle était vide (requêtes continues vers le serveur).

### Modifié
- Terrain → Démarrer une sortie : le **lieu se saisit librement** (lieux connus proposés) ; un lieu nouveau est
  ajouté à la liste, même saisi sans réseau.
- Publication Vinted : le programme du PC vérifie la file **toutes les 5 minutes** (au lieu de 10 s) et publie
  **un seul article toutes les 10 minutes** (les essais s'enchaînent).

## [0.8.0] — 06/10/2026

Publication sur Vinted depuis le PC (évolution demandée après le lot 7, à valider).

### Ajouté
- **Publication sur Vinted** : sélection d'articles « À publier » (liste ou fiche), file d'attente suivie dans
  Réglages → Publication Vinted ; un programme du PC (`outils/publication-vinted`, démarré avec Windows) remplit le
  formulaire Vinted, contrôle chaque champ puis clique « Ajouter » ; l'article passe En ligne avec le lien de
  l'annonce. **Mode essai** par défaut (rien n'est publié), articles incomplets refusés avec ce qui manque, arrêt en
  cas de vérification Vinted. Guide : `docs/guides/publication-vinted.md`.
- Fiche article : **couleur(s)** (2 au maximum) et **format du colis** ; format par défaut dans les Réglages.
- Jeton de publication personnel (seule son empreinte est gardée sur le serveur).
- Mise en ligne sur un VPS OVH (issue #2) : guide pas à pas `docs/mise-en-ligne-ovh.md`, installation en une
  commande (Docker, pare-feu, fail2ban, mises à jour de sécurité, `.env` par questions), HTTPS Let's Encrypt
  automatique, script de mise à jour, rapatriement des sauvegardes sur le PC (`scripts/rapatrier-sauvegardes.ps1`).

### Modifié
- Sauvegarde automatique : les archives de photos sont gardées 7 jours, sauf celles du dimanche (30 jours), pour
  limiter la place prise sur le disque ; la base reste gardée 30 jours.

## [0.7.0] — 06/10/2026

Lot 7 — alertes et sauvegarde (à valider). Tous les lots du cahier des charges sont livrés.

### Ajouté
- **Alertes** sur l'écran Articles et pastille sur l'onglet : articles à expédier, brouillons depuis 3 jours ou plus,
  articles dormants (En ligne depuis 7 jours ou plus, comptés depuis la dernière baisse de prix). Délais modifiables
  dans les Réglages.
- **Réduction des photos** au passage en Finalisé ou en Sortie du stock : seules la photo principale et la photo
  terrain sont gardées, réduites à ~1600 px ; la photo terrain d'un lot n'est réduite que lorsque tous ses articles
  sont finalisés ou sortis du stock.
- **Sauvegarde automatique quotidienne** (base + photos) dans `sauvegardes/auto`, conservée 30 jours ; procédure de
  **restauration** testée et documentée (README §6).

## [0.6.0] — 06/10/2026

Lot 6 — IA Gemini (à valider avec votre clé Gemini).

### Ajouté
- Fiche article, section **Annonce** : titre et description enregistrés et modifiables, **✨ Générer l'annonce**
  (Gemini, à partir de la fiche et de 3-4 photos ; titre ≤ 60 caractères ; « Réf. 127 » ajouté en dernière ligne),
  **Copier**, **Copier le prompt** (secours vers une IA gratuite si Gemini est indisponible).
- **🏷 Lire l'étiquette** : marque, taille, catégorie et matière proposées dans le formulaire, sans enregistrement
  avant validation.
- Réglages → **IA (Gemini)** : prompts modifiables, retour au prompt d'origine.
- Guide de configuration de la clé Gemini (README §11). La clé reste côté serveur.

## [0.5.0] — 06/10/2026

Lot 5 — tableau de bord (à valider).

### Ajouté
- Onglet **Tableau** : chiffre d'affaires, bénéfice réalisé et trésorerie du mois et de l'année (mois au choix),
  frais généraux du mois, **graphique mensuel** (une mesure à la fois, valeur au survol ou au doigt, tableau des
  valeurs).
- **Stock** : valeur au coût total et au prix affiché, nombre d'articles par statut.
- **Rentabilité** par sortie et par lieu : réalisé, provisoire, articles restants ; articles Maison à part.
- **Analyse** par catégorie (niveau de détail au choix), marque ou gamme : nombre de ventes, marge moyenne en € et
  en %, délais moyens mise en ligne → vente et achat → vente.
- Calculs : cas 7, 14, 17 à 20, 24, 25, 29 à 33 de l'annexe.

## [0.4.0] — 06/10/2026

Lot 4 — liste et recherche (à valider).

### Ajouté
- Écran Articles : **recherche** (nom, marque, gamme, taille, catégorie, n° de référence : « 127 » propose #0127 en
  premier), **filtres** (statut, catégorie avec ses sous-catégories, marque, gamme, lieu, sortie) et **tris** (date
  de saisie, d'achat, de mise en ligne, prix affiché, ancienneté dans le statut ; croissant ou décroissant). Les
  choix restent mémorisés en revenant d'une fiche.
- **Corbeille** : « Supprimer l'article » sur la fiche ; restauration pendant 30 jours ; suppression définitive
  (manuelle ou automatique après 30 jours) avec les photos propres de l'article ; la photo terrain d'un lot reste
  tant qu'un autre article l'utilise ; le numéro de référence n'est jamais réattribué.
- Réglages → **Marques et lieux** : nombre d'articles par valeur, **renommer**, **fusionner** (ex. « Levis » dans
  « Levi's »).

## [0.3.0] — 06/10/2026

Lot 3 — ventes et calculs (développé en autonomie, à valider).

### Ajouté
- **Vente** depuis un article En ligne (« Vendu : à expédier ») : montant crédité, emballage (0,08 € par défaut),
  date ; **vente groupée** en cochant les autres articles du colis (montant réparti au prorata des prix affichés).
- **Colis** : envoi et finalisation appliqués à tous les articles du colis avec la même date ; annulation par
  l'acheteur (retour En ligne, vente annulée) ; **retour** de l'acheteur, entier (vente annulée) ou **partiel**
  (articles renvoyés À publier, nouveau montant crédité pour les autres) ; écran « Colis » pour corriger les montants.
- **Sortie du stock** avec motif (Donné, Jeté, Revendu hors Vinted avec prix et canal, Gardé pour moi, Perdu) et
  annulation de la sortie.
- **Boosts** (montant + date) sur la fiche.
- Fiche article : **montants** détaillés (prix d'achat, essence, emballage, boosts, coût total, prix vendu,
  bénéfice réel ou provisoire), **historique du prix affiché**.
- Écran **Frais divers** (Réglages → Frais divers) : ajout, modification, suppression.
- Réglages : emballage par défaut, délais des alertes (utilisés au lot 7).
- Calculs : cas 8 à 18, 22, 25 à 27 de l'annexe.

### Modifié
- Toutes les transitions du §4.2 sont proposées ; les passages de vente, de colis et de sortie du stock ont leur
  propre formulaire. Corriger la date d'une vente, d'un envoi ou d'une finalisation l'applique à tout le colis.

### Corrigé
- Historique des statuts : les changements enregistrés à la même minute s'affichent dans l'ordre.

## [0.2.0] — 06/10/2026

Lot 2 — saisie terrain (développé en autonomie, à valider sur le téléphone).

### Ajouté
- Accès depuis le téléphone en **HTTPS** sur le Wi-Fi de la maison (relais Caddy, certificat local à installer une
  fois) — issue #3 ; guide pas à pas dans le README (§4).
- Application **installable** sur Android (PWA) et utilisable **sans réseau** ; bandeau « Nouvelle version disponible
  — Mettre à jour ».
- Onglet **Terrain** : démarrer une sortie (mémorisée sur le téléphone), gros bouton « + Achat » (photo → prix →
  Valider), achat sans photo, lots (prix total réparti, même photo terrain), essence de la sortie, article Maison.
- **File d'attente** sur le téléphone : sorties, achats, photos et essence sont gardés puis envoyés automatiquement
  (au retour du réseau, toutes les 30 secondes, après reconnexion) ; compteur « N éléments en attente d'envoi » ;
  « Réf. en attente » tant que le serveur n'a pas reçu l'achat ; éléments refusés à réessayer ou abandonner.
- **Sorties** : liste et fiche (date, lieu, essence, notes, articles) ; l'essence d'une sortie sans article compte en
  frais général.
- Fiche article : sortie, lot (articles du lot, prix total modifiable), prix d'achat et part d'essence calculés,
  **photos** (photo terrain + photos d'annonce depuis la galerie ou l'appareil photo, ordre, photo principale).
- Vignettes des photos dans les listes.
- Calculs : part de lot (§6.1), part d'essence et essence des sorties vides (§6.2) ; cas 1 à 7, 23 et 24 de l'annexe
  vérifiés à partir des données.

## [0.1.0] — 05/10/2026

Lot 1 — socle, validé sur le PC de l'utilisateur.

### Ajouté
- Lot 1 — socle : connexion avec le compte créé au premier démarrage (pas d'inscription), session de 30 jours
  prolongée à chaque usage, blocage 15 minutes après 5 mots de passe erronés, déconnexion.
- Réglages : version de l'application, changement du mot de passe (les autres appareils sont déconnectés).
- Commande de secours `reset-password` (saisie masquée) pour réinitialiser le mot de passe.
- Fiche article (sans photo) : nom, catégorie, marque, gamme, état, taille, matière, notes, lieu, prix d'achat, date
  d'achat, prix affiché ; référence automatique `#0001` jamais réutilisée ; lieu « Maison » → prix d'achat 0 € proposé.
- Listes de référence pré-remplies (lieux, catégories, marques, gammes, états), complétion automatique et ajout à la volée.
- Statuts : Brouillon ↔ À publier ↔ En ligne (prix affiché demandé), date modifiable, historique avec dates corrigeables.
  Toutes les règles du §4.2 sont en place et testées ; les autres passages arriveront au lot 3.
- Historique du prix affiché enregistré (affichage au lot 3).
- Liste simple des articles, la plus récente en premier ; navigation Articles / Réglages en bas de l'écran.
- Catégories calquées sur Vinted (arbre de 440 catégories, recherche par mots), marques courantes sur Vinted
  (≈ 360, dont « Sans marque », complétables) et 6 états Vinted + « Abîmé » ; catégorie, marque et état obligatoires.
- Listes déroulantes avec recherche, aussi larges que le champ, aux couleurs du site (clair / sombre), au doigt et au
  clavier ; option « Ajouter » pour une marque ou un lieu absent.

### Modifié
- Gamme : texte libre facultatif (au lieu d'une liste).
- Articles déjà saisis (migration) : gamme conservée en texte, états convertis (Bon → Bon état ; Abîmé, Taché, Cassé →
  Abîmé avec mention dans les notes), catégorie à rechoisir.

## [0.0.1] — 05/10/2026

Lot 0 — mise en place, validé sur le PC de l'utilisateur.

### Ajouté
- Lot 0 — mise en place : projet Node/TypeScript (serveur Fastify + interface React), base PostgreSQL et application
  lancées ensemble par Docker Compose, page d'accueil affichant la version et l'état de la base (clair / sombre).
- Module de calcul : fonction unique de répartition en centimes (règle d'arrondi), testée sur les cas 1 à 6, 9, 11, 12
  et 23 de l'annexe. Règle : parts arrondies vers le bas, le reste sur le dernier élément (jamais de part négative).
- Commandes `npm test`, `typecheck`, `lint`, `format`, `db:generate`, `db:migrate` et `db:sauvegarde` (copie datée
  de la base).
- Guide d'installation et d'utilisation pour Windows (`README.md`).
- Outillage Claude : sous-agent `relecteur` (relecture de fin de lot, à la demande), hook de formatage Prettier après
  chaque modification et hook de tests du module de calcul en fin de tour.
- Dépannage : port 5432 déjà utilisé (PostgreSQL installé sur le PC) → `POSTGRES_PORT=15432` dans `.env`.
