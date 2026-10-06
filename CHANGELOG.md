# Journal des versions

Toutes les évolutions notables du projet. Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
numérotation [SemVer](https://semver.org/lang/fr/).

## [Non publié]

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
