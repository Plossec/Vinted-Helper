# Décisions — Lot 1 — socle

[← Index des décisions](README.md)

## 05/10/2026 — Lot 1 : décisions de cadrage

| Sujet | Décision |
|---|---|
| Statuts | Le tableau complet des transitions (§4.2) est codé et testé côté serveur dès le lot 1 ; l'interface et l'API ne proposent que Brouillon ↔ À publier ↔ En ligne. Les autres passages (vente, colis, sortie du stock) arrivent au lot 3. |
| Photos d'annonce | Au lot 2, avec les photos terrain. La fiche du lot 1 est sans photo. |
| Listes de référence | Pré-remplies au premier démarrage avec les valeurs du tableur de l'utilisateur ; modifiables ; nouvelles valeurs créées à la volée. Unicité sans tenir compte des majuscules. |
| Session | 30 jours sans utilisation, prolongée à chaque usage ; déconnexion dans les Réglages. |
| Prix affiché | Historique enregistré dès le lot 1 (chaque saisie ou modification datée) ; affichage de l'historique sur la fiche au lot 3. |
| Champs obligatoires (création manuelle) | Nom, lieu, prix d'achat, date d'achat (aujourd'hui par défaut). Lieu « Maison » : prix d'achat proposé à 0 €. |
| À publier | Aucun contrôle de complétude (non défini au cahier des charges). Seul « En ligne » exige un prix affiché. |
| Dépendances ajoutées | `@fastify/cookie` (cookie de session), `react-router` (navigation), `@electric-sql/pglite` en dév. (PostgreSQL en mémoire pour les tests, sans Docker). |

---

## 05/10/2026 — Lot 1 : choix pendant le développement

- **Tests sans Docker** : les tests de l'API tournent sur une vraie base PostgreSQL en mémoire (PGlite) avec les
  migrations du projet ; `npm test` ne touche jamais la base de l'utilisateur.
- **`vitest` déclaré aussi dans le client** (même outil que le serveur, pas de nouvelle bibliothèque) pour tester la
  lecture des montants saisis (virgule ou point → centimes entiers, sans calcul à virgule).
- **Mot de passe** : haché avec scrypt (intégré à Node). Jeton de session aléatoire dans un cookie inaccessible au
  JavaScript ; seule son empreinte est stockée. Changer le mot de passe déconnecte les autres appareils.
- **Dates de statut** : une date dans le futur est refusée (tolérance 5 minutes pour l'écart d'horloge). Aucune autre
  contrainte (une date antérieure à la création est acceptée ; l'historique est trié par date).
- **API** : les transitions proposées sont calculées par le serveur (source unique) ; l'interface ne les recopie pas.
- **Audit npm** : 4 alertes « modérées » sur une ancienne version d'`esbuild` utilisée en interne par `drizzle-kit`
  (outil de développement, absent de l'application livrée). La « correction » proposée (`npm audit fix --force`)
  rétrograderait `drizzle-kit` : non appliquée. À revoir quand `drizzle-kit` publiera une mise à jour.
- **Génération de migration** : lancer `npx drizzle-kit generate --name <nom>` dans `server/`
  (`npm run db:generate -- --name …` perd l'option à travers les sous-projets).
- **Correction** : la commande `reset-password` lisait mal deux réponses envoyées d'un coup sans terminal interactif ;
  corrigé et testé (mode interactif avec saisie masquée, et mode non interactif).

---

## 05/10/2026 — Lot 1 : catégories, marques, états et listes déroulantes (retours de l'utilisateur)

| Sujet | Décision |
|---|---|
| Listes déroulantes | Composant maison avec recherche : aussi large que le champ, couleurs du site, clair / sombre, doigt et clavier (aucune option présélectionnée : la 1re flèche ↓ sélectionne la 1re). |
| Catégories | Arbre calqué sur Vinted, **rédigé de mémoire** (aucune requête vers Vinted), relu et validé par l'utilisateur : `docs/categories-vinted.md`, code `server/src/catalogue/categories.ts`. Fixe, seules les feuilles sont sélectionnables, stocké sur l'article sous forme de code (ex. `hommes/vetements/jeans/jeans-slim`). Obligatoire. |
| Marques | Liste de départ des marques courantes sur Vinted (358 dont « Sans marque ») + ajout à la volée. Obligatoire. Les comptes existants reçoivent les marques manquantes par la migration 0002 (sans doublon). |
| États | Liste fixe : Neuf avec étiquette, Neuf sans étiquette, Très bon état, Bon état, Satisfaisant, Abîmé. Obligatoire. |
| Obligatoire quand | À chaque enregistrement de la fiche ; seule la future saisie terrain (lot 2) pourra créer un brouillon sans. |
| Gamme | Texte libre facultatif ; sujet à approfondir : [issue #6](https://github.com/Plossec/Vinted-Helper/issues/6). |
| Lieu d'achat | Inchangé (liste + ajout) ; écran de gestion et création automatique : [issue #7](https://github.com/Plossec/Vinted-Helper/issues/7). |
| Migration 0001 | Écrite à la main dans un ordre sûr (copie des données avant suppression des anciennes tables) ; conversion testée. |
| Résultats de recherche | Les options qui commencent par le texte tapé s'affichent en premier. |
