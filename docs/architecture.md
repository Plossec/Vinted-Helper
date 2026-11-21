# Architecture de Vinted Helper

Trois vues : l'ensemble (qui parle à qui), le découpage du code, puis le modèle de données. Les schémas sont en
Mermaid : GitHub les affiche directement.

> À jour pour la version **1.31.1**. Ce document est relu et mis à jour à chaque nouvelle version (`/version`).

## 1. Vue d'ensemble

```mermaid
flowchart LR
  subgraph Utilisateur
    tel["📱 Téléphone<br/>PWA (hors ligne : IndexedDB)"]
    pc["💻 PC Windows<br/>PWA dans Chrome"]
    ext["🧩 Extension Chrome<br/>outils/extension-vinted"]
  end

  subgraph OVH["Serveur OVH (Docker Compose)"]
    caddy["Caddy<br/>HTTPS, certificats"]
    app["app : Fastify + client React<br/>API /api/*, port 3000"]
    db[("PostgreSQL 17<br/>volume base-donnees")]
    photos[/"data/photos"/]
    sauv["sauvegarde<br/>pg_dump chaque nuit"]
  end

  gemini["Google Gemini<br/>(annonces, étiquettes)"]
  vinted["vinted.fr"]
  gh["GitHub Actions<br/>vérification, déploiement,<br/>tag de version, CodeQL,<br/>audit hebdomadaire"]

  tel -- HTTPS --> caddy
  pc -- HTTPS --> caddy
  ext -- "HTTPS + jeton<br/>/api/programme/*" --> caddy
  caddy --> app
  app --> db
  app --> photos
  sauv --> db
  sauv --> photos
  app -- "clé côté serveur" --> gemini
  ext -- "remplit le formulaire<br/>dans l'onglet de l'utilisateur" --> vinted
  gh -- "SSH : commande imposée<br/>(fusion dans main)" --> OVH
```

- L'extension publie les annonces sur Vinted ; le serveur n'appelle pas Vinted (la règle n° 4 qui limitait
  l'automatisation de Vinted a été retirée le 14/10/2026, #185).
- La clé Gemini ne quitte pas le serveur (règle n° 3).
- Sur le PC de développement, le même `docker-compose.yml` tourne avec Caddy en HTTPS local (Wi-Fi de la maison).

## 2. Découpage du code

```mermaid
flowchart TB
  subgraph client["client/ — React 19 + Vite (PWA)"]
    ecrans["ecrans/<br/>Terrain, Articles, Fiche, Ventes,<br/>Tableau de bord, Réglages, Publication…"]
    composants["composants/"]
    api["api.ts<br/>appels /api"]
    hl["hors-ligne/<br/>file d'attente terrain + cache"]
    ecrans --> composants
    ecrans --> api
    ecrans --> hl
    hl --> api
  end

  subgraph serveur["server/ — Fastify + Drizzle (TypeScript strict)"]
    routes["Routes par sujet<br/>articles, achats, sorties, ventes, frais,<br/>photos, ia, publication, alertes,<br/>taches, corbeille, referentiels, points-relais,<br/>compte, import"]
    metier["metier/<br/>statuts, alertes, complétude, tâches"]
    calculs["calculs/<br/>seul module d'argent :<br/>répartitions, coûts, bénéfice, indicateurs, baisse"]
    catalogue["catalogue/<br/>catégories, marques, états, couleurs Vinted"]
    base["base/<br/>schéma, migrations"]
    contrat["api/<br/>types des réponses (source unique)<br/>+ conforme()"]
    routes --> contrat
    routes --> metier
    routes --> calculs
    routes --> catalogue
    routes --> base
  end

  subgraph extension["outils/extension-vinted/ — JavaScript MV3"]
    sw["service-worker.js<br/>file, rythme, pauses"]
    contenu["contenu.js + selecteurs.js<br/>remplissage du formulaire"]
    sw --> contenu
  end

  api -- "cookie de session" --> routes
  api -. "import type seulement" .-> contrat
  sw -- "jeton vh_…" --> routes
  base --> pg[("PostgreSQL")]
```

Noms des dossiers (#246) :

| Dossier | Contenu |
|---|---|
| `outils/extension-vinted/` | L'extension Chrome (chargée dans Chrome depuis ce dossier : son nom ne change pas) |
| `server/src/utilitaires/`, `client/src/utilitaires/` | Fonctions utilitaires (erreurs, validation, formats, montants, dates…) |
| `server/src/commandes/` | Commandes lancées à la main (`npm run reset-password`, `import-tableur`, `photos:sans-metadonnees`, `doc:categories`) |
| `server/src/test/`, `server/navigateur/` | Outils des tests (base en mémoire, parcours dans Chromium) |

« Extension » est le seul nom du logiciel de publication ; les routes qu'elle appelle gardent leur ancien nom
`/api/programme/*` (programme du PC retiré, ADR-0036) pour ne pas casser la publication entre deux mises à jour.

## 3. Modèle de données

Chaque table (sauf `utilisateur`) porte un `utilisateur_id`, omis ici pour la lisibilité. Les montants sont en
centimes ; les parts calculées ne sont jamais stockées (règle n° 2).

```mermaid
erDiagram
  utilisateur ||--o{ session : ouvre
  utilisateur ||--|| reglages : possede
  lieu ||--o{ sortie : accueille
  sortie ||--o{ lot_achat : regroupe
  sortie ||--o{ article : "achete pendant"
  lot_achat ||--o{ article : contient
  lieu ||--o{ article : "achete a"
  marque ||--o{ article : decrit
  article ||--o{ article_photo : montre
  photo ||--o{ article_photo : "utilisee par"
  article ||--o{ historique_statut : trace
  article ||--o{ historique_prix : trace
  article ||--o{ boost : "boosté par"
  vente ||--o{ vente_article : comprend
  article ||--o{ vente_article : "vendu dans"
  article ||--o{ publication_vinted : "publié via"
  article ||--o{ signalement_vu : "alerte vue"
  article ||--o{ action_vinted : "baissé / republié"
  vente ||--o{ commande_vinted : "finalisée par"
  utilisateur ||--o{ lecture_commandes : "journal des lectures"
  article ||--o{ offre_favori : "offre aux favoris"
  utilisateur ||--o{ frais_general : paie
  point_relais ||--o{ vente : "dépôt / retrait"
```

| Table | Rôle |
|---|---|
| `sortie`, `lieu` | Un vide-grenier (date, lieu, essence) |
| `lot_achat` | Plusieurs articles achetés ensemble pour un prix global |
| `article` | L'objet : prix d'achat, prix affiché, statut, annonce, catégorie Vinted ; créé par photos : état du remplissage par l'IA (#276) |
| `photo`, `article_photo` | Photos (fichiers dans `data/photos`) et leur ordre sur l'article |
| `historique_statut`, `historique_prix`, `boost` | Suivi dans le temps |
| `vente`, `vente_article` | Une vente (simple ou groupée), retours compris |
| `point_relais` | Points relais saisis par l'utilisateur (#210) : horaires, page officielle ; point de dépôt et de retrait d'une vente |
| `frais_general` | Frais divers hors articles |
| `publication_vinted` | File d'attente de l'extension et résultat de chaque publication (échec d'une vraie publication → article au statut Erreur) |
| `signalement_vu` | Alertes « Pour info » de l'écran « À faire » marquées « Vu » (#191), avec leur date de départ |
| `action_vinted` | Actions des tâches automatiques (#147) : baisse de prix ou republication d'un article dormant, à valider, puis faites par l'extension |
| `commande_vinted` | Commandes terminées lues sur Vinted (#148), rattachées à une vente (à valider, à rattacher, appliquées) |
| `offre_favori` | Offres réduites aux personnes qui ont mis un article en favori (#149) : une par personne (empreinte, jamais le nom) et par article ; effacées après 6 mois |
| `lecture_commandes` | Journal des lectures du « Porte-monnaie » (#233) : nombres lus et traités, ou raison de l'erreur ; effacé après 3 mois |
| `reglages`, `session`, `marque` | Paramètres de calcul et des tâches automatiques, connexions, marques |
