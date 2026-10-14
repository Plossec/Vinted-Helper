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

## 13/10/2026 — Prix vente minimum (issue #146)

**Décision (utilisateur)** : champ facultatif « Prix vente minimum (€) » sur chaque article, sous « Prix affiché sur
Vinted (€) », dans la fiche seulement. **Information seule pour l'instant** (aucun calcul) ; il servira aux tâches
automatisées de négociation (#149, #150). Vide = pas de minimum. Refusé s'il dépasse le prix affiché, à
l'enregistrement de la fiche comme au passage En ligne avec un nouveau prix. Colonne `prix_vente_minimum`
(centimes), migration `0010_prix_vente_minimum` (ajout d'une colonne vide, sans effet sur les données existantes).

## 13/10/2026 — Sécurité : connexion, mot de passe, quota de l'IA (issue #135)

**Décision (utilisateur)** :
- mot de passe : **12 caractères minimum** pour tout nouveau mot de passe (Réglages, réinitialisation, premier
  démarrage) ; le mot de passe actuel reste valable ;
- appels à Gemini (annonce, étiquette) : **30 par heure** et par utilisateur, message « Réessayez dans N min » ;
- connexion : le blocage (5 échecs en 15 minutes) compte par adresse IP **et** par identifiant ; les entrées
  expirées du limiteur sont purgées ;
- documentation : effacer `COMPTE_MOT_DE_PASSE_INITIAL` après le premier démarrage (README), confidentialité des
  photos envoyées à Gemini (offre gratuite, guide IA), `SECURITY.md` (signalement privé GitHub).
Point tranché par Claude (*à relire*) : pas de relecture de sécurité automatique des PR (C7), jugée superflue pour un
projet à un seul utilisateur déjà couvert par CodeQL et l'audit des dépendances.

## 14/10/2026 — Catégories recopiées de Vinted (issue #177)

**Décision (utilisateur)** : l'arbre rédigé de mémoire le 05/10/2026 est remplacé par celui de **vinted.fr**, lu par
Claude le 14/10/2026 (libellés et ordre exacts), **pour les rayons Femmes, Hommes, Sport, Loisirs et collections
seulement** (1 000 catégories choisissables) : « pour le reste on mettra "Autre" ». Une catégorie « Autre » (code
`autre`) couvre Enfants, Maison, Électronique, Livres et médias…

| Sujet | Décision |
|---|---|
| Publication | Un article « Autre » est **refusé** par la file de publication (« à publier à la main sur Vinted »), choix de l'utilisateur. |
| Articles existants | Migration 0015 : chaque ancienne catégorie va vers la plus proche du nouvel arbre (une seule instruction `UPDATE … CASE`, aucune reprise en chaîne) ; anciens rayons Enfants, Maison, Électronique, Animaux, Livres, Musique, Films et « Équipement moto » → « Autre ». Les correspondances approximatives (ex. « Jeans mom » → « Jeans taille haute ») sont listées dans la PR #177. |
| Codes | Toujours construits depuis le chemin ; « ¾ » devient « 3-4 » (« Blouses ¾ » ≠ « Blouses »). Renommer une feuille change son code : migration à prévoir. |
| Mise à jour | Si Vinted change un libellé, l'erreur « catégorie introuvable » de l'extension liste les choix de Vinted ; on corrige alors `categories.ts` (et une migration). |
