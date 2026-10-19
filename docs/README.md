# Documentation de Vinted Helper

| Document | Pour qui | Contenu |
|---|---|---|
| [`cahier-des-charges.md`](cahier-des-charges.md) | tous | Le besoin complet : **fait foi**. Statuts, fonctionnalités, règles de calcul, critères d'acceptation, cas chiffrés |
| [`regles-en-vigueur.md`](regles-en-vigueur.md) | tous | **Ce qui s'applique aujourd'hui**, par thème : règle, décision de référence, état (décidé, en cours, réalisé) |
| [`architecture.md`](architecture.md) | tous | Schémas : vue d'ensemble (application, API, base, extension, serveur), découpage du code, modèle de données |
| [`categories-vinted.md`](categories-vinted.md) | tous | Annexe : l'arbre des catégories recopié de Vinted, **générée** depuis `server/src/catalogue/categories.ts` (`npm run doc:categories -w server`) |
| [`decisions/`](decisions/README.md) | tous | Décisions prises en cours de route : **un fichier numéroté par décision** (ADR), index avec statut et points « à relire » |
| [`guides/`](#guides) | utilisateur | Modes d'emploi pas à pas |

## Guides

| Guide | Quand l'utiliser |
|---|---|
| [`guides/utilisation.md`](guides/utilisation.md) | Au quotidien : terrain, fiches, ventes |
| [`guides/telephone-https.md`](guides/telephone-https.md) | Ouvrir l'application sur le téléphone, sur le Wi-Fi de la maison |
| [`guides/sauvegarde-restauration.md`](guides/sauvegarde-restauration.md) | Sauvegarder et restaurer les données sur le PC |
| [`guides/ia-gemini.md`](guides/ia-gemini.md) | Configurer et utiliser l'IA (annonces, étiquettes) |
| [`guides/mise-en-ligne-ovh.md`](guides/mise-en-ligne-ovh.md) | Installer, sauvegarder et mettre à jour l'application sur le serveur OVH |
| [`guides/publication-vinted.md`](guides/publication-vinted.md) | Publier automatiquement les articles « À publier » sur Vinted depuis le PC |

L'installation sur le PC, le démarrage et le dépannage sont dans le [`README.md`](../README.md) à la racine ; les
nouveautés de chaque version dans le [`CHANGELOG.md`](../CHANGELOG.md) (versions 0.0.1 à 1.5.0 :
[`CHANGELOG-archive.md`](../CHANGELOG-archive.md)).

## Où écrire quoi

- Une **décision** (choix, compromis, règle précisée) → un nouvel ADR `decisions/NNNN-titre.md` (modèle
  `decisions/0000-modele.md`), ajouté à l'index `decisions/README.md`. Si elle change le besoin ou une règle en
  vigueur : **dans la même PR**, mettre à jour `cahier-des-charges.md` et `regles-en-vigueur.md` ; l'ADR remplacé ou
  modifié reçoit « Remplacé / modifié par ADR-NNNN » dans son statut et dans l'index.
- Un **changement d'architecture** (table, module, service, outil externe) → `architecture.md`, relu à chaque
  nouvelle version.
- Une **procédure pour l'utilisateur** → un guide dans `guides/`, lié depuis ce sommaire.
- Une **consigne pour Claude** valable partout → `CLAUDE.md` (court) ; valable pour certains fichiers seulement →
  `.claude/rules/` (chargée uniquement quand Claude touche ces fichiers).
