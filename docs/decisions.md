# Décisions prises en cours de développement

Complète `docs/cahier-des-charges.md`. En cas de contradiction, la décision la plus récente fait foi.
Format : date, sujet, décision, raison.

---

## 05/10/2026 — Outillage Claude : relecteur et hooks

**Décision**
- **Sous-agent `relecteur`** (`.claude/agents/relecteur.md`) : lecture seule (Read, Grep, Glob), lancé **uniquement à la
  demande de l'utilisateur** en fin de lot. Reçoit le numéro du lot et les fichiers modifiés depuis `main`. Compare au
  cahier des charges (§9, §8, §6, §10) et à `CLAUDE.md`. Rapport Bloquant / À corriger / Remarque, avec fichier, ligne,
  règle et correction proposée, puis la liste des critères d'acceptation couverts / non couverts. Ne corrige rien.
- **Hook `PostToolUse` → `formater.mjs`** (Edit, Write) : Prettier sur le fichier modifié, seulement `.ts`, `.tsx`, `.js`,
  `.json`, `.css`, seulement dans le dossier du projet (hors `node_modules`). Non bloquant. Sans effet tant que Prettier
  n'est pas installé dans le projet (lot 0).
- **Hook `Stop` → `tests-calculs.mjs`** :
  - ne fait rien si aucun fichier de `server/src/calculs/` n'est touché : modifications non commitées, fichiers non suivis,
    **et fichiers modifiés sur la branche par rapport à `main`** (option 2 retenue : un changement commité dans le même
    tour est aussi couvert) ;
  - sinon lance **uniquement** `npm test -w server -- calculs` (commande de `CLAUDE.md`) ; la suite complète reste le
    rôle de `/verifier` ;
  - en cas d'échec : code de sortie 2, rapport renvoyé à Claude, qui doit corriger avant de rendre la main ;
  - anti-boucle : si `stop_hook_active` est vrai, ne bloque plus ; si les tests échouent encore, affiche un avertissement
    à l'utilisateur (`systemMessage`).
- Scripts en **Node** (pas de bash ni de jq) pour fonctionner pareil sous Windows (Git Bash) et Linux. Node est installé
  sur le PC de l'utilisateur.

**Raison** : relecture indépendante en fin de lot ; formatage homogène sans y penser ; impossible de rendre la main avec
un module de calcul cassé.

**Installation** : `.claude/settings.json` et `.claude/hooks/` sont protégés en écriture contre Claude. Les scripts ont
d'abord été déposés dans `.claude/a-installer/`. Sur **autorisation explicite et ponctuelle de l'utilisateur**, Claude
les a déplacés dans `.claude/hooks/` et a remplacé la section `hooks` de `settings.json` (permissions inchangées).
Cette autorisation ne vaut que pour cette fois : toute modification future de ces fichiers est faite par l'utilisateur.

**Vérification** : les deux scripts ont été testés à la main sur un projet factice hors du dépôt (formatage d'un `.ts`,
`.md` et fichier hors projet ignorés, entrée invalide sans effet ; tests lancés uniquement quand le calcul est touché,
y compris après commit ; échec → code 2 ; `stop_hook_active` → avertissement sans blocage).

---

## 05/10/2026 — Lot 0 : choix techniques de mise en place

**Dépendances** (validées par l'utilisateur avant installation)
| Paquet | Où | Raison |
|---|---|---|
| `fastify` 5, `@fastify/static` | serveur | Serveur web léger et bien typé ; sert aussi l'interface compilée |
| `drizzle-orm`, `pg` | serveur | Accès à PostgreSQL (choix validé) |
| `drizzle-kit` (dév.) | serveur | Génération des migrations (jamais `push`) |
| `tsx` (dév.) | serveur | Exécuter le TypeScript en développement et pour `db:migrate` |
| `vitest` (dév.) | serveur | Tests, dont ceux de l'annexe §11 |
| `@types/pg` (dév.) | serveur | Types de `pg` |
| `react`, `react-dom` 19 | client | Interface (choix validé) |
| `vite` 8, `@vitejs/plugin-react` (dév.) | client | Construction de l'interface |
| `@types/react`, `@types/react-dom` (dév.) | client | Types React |
| `typescript`, `@types/node` 22 (dév.) | racine | Vérification des types ; `@types/node` aligné sur Node 22 (version réellement utilisée) |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals` (dév.) | racine | Lint |
| `prettier` (dév.) | racine | Formatage (utilisé par le hook) |

Écart mineur au plan : les définitions de types `@types/pg` et `@types/react*` sont rangées dans le sous-projet qui les
utilise (serveur / client) plutôt qu'à la racine. Aucun effet pour l'utilisateur.

**Organisation**
- Un `package.json` racine (version de référence) avec deux sous-projets npm : `server` et `client`.
- Le serveur sert l'API (`/api/…`) et l'interface compilée ; toute autre adresse renvoie l'interface (application d'une page).
- Configuration par variables d'environnement : `.env` à la racine (lu par Docker Compose, et par Node avec
  `--env-file-if-exists` pour les scripts locaux). Pas de `dotenv`.
- L'adresse de la base est construite à partir de `POSTGRES_*` : hôte `db` dans Docker, `localhost` sur le PC.

**Docker**
- Deux services : `app` (Node 22 alpine, image en deux étapes, utilisateur non-root) et `db` (PostgreSQL 17 alpine).
- Base dans un **volume Docker nommé** (`base-donnees`) : plus fiable et plus rapide sous Windows qu'un dossier partagé.
- Photos dans `./data/photos` (dossier visible sous Windows, ignoré par Git, protégé contre Claude).
- Ports ouverts **uniquement sur 127.0.0.1** (PC local). L'accès téléphone sera ouvert avec le HTTPS (issue #3).
- Migrations appliquées automatiquement au démarrage du serveur.

**Fins de ligne** : `.gitattributes` impose LF, pour que les scripts fonctionnent dans les conteneurs même depuis Windows.

**Formatage** : Prettier ignore les fichiers `.md` (documents rédigés à la main, dont le cahier des charges).

**Vérifications faites dans l'environnement cloud** : `npm test` (27 tests), `typecheck`, `lint`, `build`, construction
de l'image et démarrage des deux conteneurs, `/api/sante` → `{"version":"0.0.1","base":"connectée"}`, page affichée en
clair et sombre (360 px), `db:sauvegarde`, `db:migrate`, `db:generate`.
Particularité de l'environnement cloud uniquement : les conteneurs n'y ont pas accès à internet sans proxy ; le test de
construction a utilisé une copie temporaire du Dockerfile avec le proxy et son certificat. Le `Dockerfile` du projet,
lui, n'en dépend pas (pas de proxy sur le PC).

**Question — règle d'arrondi (§6)** *(tranchée, voir décision suivante)* : appliquée à la lettre, la règle peut donner une part **négative** au
dernier élément quand le montant est très petit par rapport au nombre d'éléments (ex. 5 centimes sur 8 articles →
1, 1, 1, 1, 1, 1, 1, −2) ou une part très déséquilibrée (65 centimes sur 10 → 7 × 9 puis 2). Le code applique la règle
telle qu'écrite ; décision à prendre par l'utilisateur.

---

## 05/10/2026 — Règle d'arrondi : arrondi vers le bas, le reste sur le dernier

**Décision (utilisateur)** : dans toute répartition (lot, essence, emballage, vente groupée), chaque part est
**arrondie au centime inférieur** et le **dernier élément reçoit tout le reste**.

**Raison** : l'arrondi au plus proche pouvait donner une part négative au dernier élément (5 centimes sur 8 articles →
1 × 7 puis −2). Avec l'arrondi vers le bas, aucune part n'est jamais négative (5 centimes sur 8 → 0 × 7 puis 5).

**Conséquences**
- Cahier des charges §6 et annexe §11 mis à jour. Trois cas changent :

| Cas | Avant | Après |
|---|---|---|
| 2 — lot de 3 articles pour 5 € | 1,67 / 1,67 / 1,66 | 1,66 / 1,66 / 1,68 |
| 5 — essence 2 € sur 3 articles | 0,67 / 0,67 / 0,66 | 0,66 / 0,66 / 0,68 |
| 12 — emballage 0,08 € sur 3 articles | 0,03 / 0,03 / 0,02 | 0,02 / 0,02 / 0,04 |

- Les cas 1, 3, 4, 6, 8, 9, 10, 11, 23 et 31 sont inchangés (vérifié).
- Tests de l'annexe modifiés **sur décision explicite de l'utilisateur** (seule raison admise de modifier un résultat
  attendu). Ajout de tests garantissant qu'aucune part n'est négative.

---

## 05/10/2026 — Git : manipulations faites par Claude

**Décision (utilisateur)** : Claude effectue lui-même les manipulations Git (branches, commits, push, fusions, pull
requests) sans demander à l'utilisateur de lancer les commandes. Restent soumises aux interdictions de
`.claude/settings.json` (pas de réécriture d'historique, pas de `--force`, etc.). Limite technique : la session cloud ne
peut pas pousser de tags (refus réseau 403) ; les tags de version sont alors poussés depuis le PC.

---

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

---

## 05/10/2026 — Travail autonome sur les lots 2 à 7

**Décision (utilisateur)** : Claude enchaîne les lots 2 à 7 sans validation intermédiaire (« d'ici demain »), en mode
Auto, y compris pour Git (checkout…), npm, Docker et les commandes Windows (hors interdictions de `.claude/settings.json`).
Les points flous sont **tranchés par Claude et notés ici** (marqués « *à relire* ») ; chaque lot est livré par
une pull request fusionnée dans `main` dès que les vérifications sont vertes. Remplace, pour cette nuit, la règle « un
lot validé sur le téléphone avant le suivant ». Les tags de version restent à pousser depuis le PC.

---

## 05/10/2026 — HTTPS local pour le téléphone (issue #3) *à relire*

**Décision** : relais **Caddy** (image Docker officielle `caddy:2-alpine`, service `https` du `docker-compose.yml`)
avec son **autorité de certification locale** (équivalent de mkcert, sans rien installer sous Windows).
- Application : `https://<IP du PC>:8443` ; certificat racine téléchargeable sur `http://<IP du PC>:8080/certificat.crt`
  (seul ce fichier est servi, jamais la clé). L'adresse IP est indiquée dans `.env` (`IP_PC`).
- Le certificat racine est conservé dans un volume Docker (`certificats`) : installé une seule fois sur le téléphone.
- Le serveur fait confiance au relais (`trustProxy`) pour poser le cookie de session en mode sécurisé.

**Raison** : gratuit, tout reste à la maison, adresse stable (indispensable : la file d'attente hors réseau et
l'installation PWA sont liées à l'adresse). Le tunnel Cloudflare gratuit change d'adresse à chaque démarrage (file
d'attente perdue) et exposerait le PC sur internet. Limite : hors Wi-Fi de la maison, les achats restent en attente
sur le téléphone jusqu'au retour (accès depuis partout : OVH, issue #2).

---

## 06/10/2026 — Lot 2 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Dépendance | `sharp` (serveur) : vignettes 400 px des photos (listes légères sur le téléphone) et, au lot 7, réduction à ~1600 px. Fonctionne sous Windows, Linux et dans l'image Docker (versions précompilées, aucun outil à installer). |
| Photo terrain | Facultative (« Achat sans photo ») pour ne jamais bloquer une saisie ; l'original est gardé en pleine qualité (§5.10). |
| Lot | Un achat de N > 1 articles crée un lot : le prix d'achat de chaque article n'est pas stocké, il est calculé (part du prix total). On corrige le **prix total du lot** depuis la fiche. |
| Ordre de répartition | Les articles d'un lot ou d'une sortie sont ordonnés par référence croissante : le « dernier » (qui reçoit le reste) est celui de plus grande référence. |
| Article Maison | Bouton « Article de la maison » sur l'écran Terrain : photo, sans prix, sans sortie, lieu « Maison », 0 €. Plusieurs articles Maison d'un coup = articles séparés (pas de lot). |
| Sortie | Lieu choisi dans la liste existante (pas de création hors ligne, issue #7). Changer la date ou le lieu d'une sortie les reporte sur ses articles. « Terminer la sortie » ne fait qu'oublier la sortie en cours sur le téléphone. |
| File d'attente | Ordre d'envoi = ordre de saisie ; arrêt au premier problème de réseau ; session expirée → tout est gardé jusqu'à la reconnexion ; un élément refusé par le serveur est mis de côté avec son message (Réessayer / Abandonner). |
| Photos d'annonce | Envoyées directement depuis la fiche (réseau nécessaire) : elles se font à la maison. |
| PWA | Service worker écrit à la main (pas de nouvelle dépendance) : l'application est gardée sur le téléphone, l'API n'est jamais mise en cache. Ouverture sur l'écran Terrain. |

---

## 06/10/2026 — Lot 3 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Actions dédiées | Les passages qui touchent une vente (Vendu, envoi, finalisation, annulation, retour) ou la sortie du stock ont leur propre formulaire ; le changement simple ne sert qu'entre Brouillon, À publier et En ligne. |
| Vente groupée | Créée depuis la fiche d'un article : on coche les autres articles En ligne du même colis. |
| Retour | « Retour de l'acheteur » depuis Envoyé : on coche les articles renvoyés. Tous cochés = retour du colis entier (vente annulée) ; sinon le nouveau montant crédité est obligatoire. Un litige perdu se saisit comme un retour. |
| Sortie du stock d'un article dans un colis en cours | Refusée (À expédier / Envoyé) : annuler la vente ou enregistrer un retour d'abord, pour ne jamais fausser les montants du colis. |
| Bénéfice des articles À expédier / Envoyé | Provisoire (= − coût total, §6.5) même si le prix vendu est connu ; il devient réel à la finalisation. Le prix vendu est affiché à part. |
| Dates de vente | Vente, envoi et finalisation sont des dates-heures (comme les changements de statut). Corriger l'une d'elles dans l'historique corrige la vente et tout le colis. |
| Article à la corbeille dans un colis | Il ne compte plus : le montant du colis est réparti sur les articles restants (lot 4). |

---

## 06/10/2026 — Lot 4 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Recherche et filtres | Calculés sur le téléphone / PC à partir de la liste complète (quelques centaines d'articles : instantané, fonctionne aussi pour les filtres combinés). Recherche par mots, sans accents ni majuscules. |
| Filtre catégorie | On peut choisir une branche (ex. « Hommes › Vêtements ») : tous les articles de ses sous-catégories sont retenus. |
| Tri par défaut | Date de saisie, la plus récente d'abord (comme avant). |
| Renommer vers un nom existant | Refusé avec le conseil d'utiliser « Fusionner » (évite deux valeurs identiques). |
| Lieu « Maison » | Ne peut pas être fusionné dans un autre lieu (il porte la règle « prix d'achat 0 € »). |
| Corbeille | Purge automatique au démarrage du serveur puis chaque jour. Un article d'un colis peut aller à la corbeille : il sort des calculs et le montant du colis est réparti sur les articles restants. |

---

## 06/10/2026 — Lot 5 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Mois | Tous les rattachements au mois se font à l'heure de Paris (une vente finalisée le 31 à 23 h compte dans ce mois). |
| Trésorerie | Achats = prix d'achat des articles (part de lot comprise) à leur date d'achat ; essence de **toutes** les sorties à leur date (les sorties sans article ne sont pas comptées deux fois) ; emballage à la date d'envoi ; crédit à la date de finalisation. |
| Marge moyenne | Arrondie au centime inférieur. Taux = Σ bénéfices / Σ coûts totaux ; « — » si les coûts sont nuls. |
| Délais de vente | En jours calendaires (heure de Paris) entre la dernière mise en ligne avant la vente (ou la date d'achat) et la date de vente. |
| Analyse par catégorie | Regroupée au niveau 3 par défaut (ex. « Hommes › Vêtements › Jeans »), modifiable. Articles sans valeur : « (non renseigné) ». |
| Graphique | Une seule mesure à la fois (une seule échelle), choisie par boutons ; couleur vérifiée (contraste, lisibilité). |
| Rentabilité | Classement par bénéfice provisoire décroissant. Une sortie sans article n'apparaît pas (son essence est en frais généraux). |

---

## 06/10/2026 — Lot 6 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Accès à Gemini | Requête HTTPS directe depuis le serveur (pas de bibliothèque Google) ; clé dans l'en-tête, jamais dans l'adresse ni dans les journaux. Délai maximal 60 s. Réponse demandée en JSON. |
| Photos envoyées | 4 au plus (principale, autres photos d'annonce, puis photo terrain), réduites à 1024 px pour économiser le quota gratuit. |
| Génération | Le résultat est enregistré directement (il reste modifiable) ; confirmation demandée s'il remplace un texte existant. Titre coupé à 60 caractères au dernier mot ; toute ligne « Réf. … » proposée par l'IA est retirée puis « Réf. 127 » est ajouté. |
| Lecture d'étiquette | La catégorie libre de l'IA est rapprochée de l'arbre Vinted par mots-clés ; si rien ne correspond, elle est seulement affichée. Une marque inconnue est proposée telle quelle (ajoutée à la liste à l'enregistrement de la fiche). |
| Prompts | Un prompt identique au prompt d'origine n'est pas enregistré, pour profiter des futures améliorations. |

---

## 06/10/2026 — Lot 7 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Alertes | Calculées à chaque affichage (rien n'est stocké). Brouillon : depuis la dernière arrivée en Brouillon. Dormant : depuis la dernière baisse du prix affiché après la mise en ligne (une hausse ne relance pas le décompte). Jours comptés en dates de Paris. |
| Réduction des photos | Faite tout de suite au passage Finalisé / Sortie du stock (colis entier à la finalisation). Irréversible : annuler une sortie du stock ne fait pas revenir les photos supprimées. JPEG qualité 85, 1600 px au plus. |
| Sauvegarde automatique | Service Docker `sauvegarde` (image PostgreSQL déjà utilisée, rien à installer) : une fois par jour à partir de 3 h, ou au démarrage du PC si l'heure est passée ; base compressée + archive complète des photos ; 30 jours gardés. |
| Copie hors serveur | En attente de l'issue #2 (OVH) : en local, copie manuelle du dossier `sauvegardes/auto` (clé USB, cloud), expliquée dans le README. |
| Restauration | Script lancé dans le service `sauvegarde`, application arrêtée ; base remplacée (`pg_dump --clean`), photos remises sans effacer les plus récentes. Testée le 06/10/2026 sur la base de test. |

---

## 06/10/2026 — Mise en ligne OVH (issue #2)

**Choix de l'utilisateur** : VPS d'entrée de gamme ; adresse OVH gratuite pour commencer (nom de domaine possible
plus tard) ; sauvegardes rapatriées sur le PC ; le serveur démarre vide ; connexion SSH par mot de passe.

**Choix techniques** *à relire*
| Sujet | Décision |
|---|---|
| Système | Ubuntu 24.04 ; Docker installé depuis les paquets Ubuntu (`docker.io`, `docker-compose-v2`), sans script téléchargé. |
| Réglages serveur | `docker-compose.ovh.yml` ajouté à `docker-compose.yml` via `COMPOSE_FILE` dans le `.env` du serveur : les commandes `docker compose` habituelles fonctionnent telles quelles. Base et application sans port ouvert ; seul Caddy écoute (80, 443) avec un certificat Let's Encrypt automatique. |
| Sécurité | Pare-feu ufw (22, 80, 443), fail2ban (protection du mot de passe SSH), mises à jour de sécurité automatiques, swap de 2 Go pour la construction, `.env` lisible par l'administrateur seulement, mot de passe PostgreSQL aléatoire. |
| Adresse OVH gratuite | Risque : Let's Encrypt peut refuser un certificat si la limite hebdomadaire du domaine `ovh.net` est atteinte. Solution de repli documentée : un nom de domaine (≈ 10 €/an). |
| Sauvegardes | Archives de photos réduites à 7 jours + dimanches 30 jours (une archive complète par jour pendant 30 jours remplirait le disque du VPS). Rapatriement : `sftp get -a` (une seule demande de mot de passe, seuls les fichiers nouveaux sont téléchargés), testé ; automatique seulement avec une clé SSH. |
| Mise à jour | `scripts/ovh/mettre-a-jour.sh` : sauvegarde de la base, `git pull --ff-only`, reconstruction. |
| Version | 1.0.0 après validation de la mise en ligne par l'utilisateur. |
