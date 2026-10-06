# Journal des versions

Toutes les évolutions notables du projet. Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
numérotation [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Modifié
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
