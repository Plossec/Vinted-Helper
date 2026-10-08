# Architecture de Vinted Helper

Trois vues : l'ensemble (qui parle à qui), le découpage du code, puis le modèle de données. Les schémas sont en
Mermaid : GitHub les affiche directement.

> À jour pour la version **1.5.0**. Ce document est relu et mis à jour à chaque nouvelle version (`/version`).

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
  gh["GitHub Actions<br/>vérification + déploiement"]

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

- **Seule** l'extension touche Vinted, et uniquement pour publier (règle n° 4) ; le serveur n'appelle jamais Vinted.
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
    routes["Routes par sujet<br/>articles, achats, sorties, ventes, frais,<br/>photos, ia, publication, alertes,<br/>corbeille, referentiels, compte, import"]
    metier["metier/<br/>statuts, alertes"]
    calculs["calculs/<br/>seul module d'argent :<br/>répartitions, coûts, bénéfice, indicateurs"]
    catalogue["catalogue/<br/>catégories, marques, états, couleurs Vinted"]
    base["base/<br/>schéma, migrations"]
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
  sw -- "jeton vh_…" --> routes
  base --> pg[("PostgreSQL")]
```

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
  utilisateur ||--o{ frais_general : paie
```

| Table | Rôle |
|---|---|
| `sortie`, `lieu` | Un vide-grenier (date, lieu, essence) |
| `lot_achat` | Plusieurs articles achetés ensemble pour un prix global |
| `article` | L'objet : prix d'achat, prix affiché, statut, annonce, catégorie Vinted |
| `photo`, `article_photo` | Photos (fichiers dans `data/photos`) et leur ordre sur l'article |
| `historique_statut`, `historique_prix`, `boost` | Suivi dans le temps |
| `vente`, `vente_article` | Une vente (simple ou groupée), retours compris |
| `frais_general` | Frais divers hors articles |
| `publication_vinted` | File d'attente de l'extension et résultat de chaque publication (échec d'une vraie publication → article au statut Erreur) |
| `reglages`, `session`, `marque` | Paramètres de calcul, connexions, marques |
