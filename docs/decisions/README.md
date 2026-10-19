# Décisions (ADR)

Chaque décision prise en cours de développement est un **ADR** (*Architecture Decision Record*) : un fichier
numéroté `NNNN-titre.md`, rédigé d'après le modèle [`0000-modele.md`](0000-modele.md). Les décisions complètent
[`../cahier-des-charges.md`](../cahier-des-charges.md) et priment quand elles le précisent. Pour trouver vite la
règle en vigueur sur un sujet : [`../regles-en-vigueur.md`](../regles-en-vigueur.md).

**Règles**
- Une nouvelle décision = un **nouveau fichier**, numéro suivant, ajouté au tableau ci-dessous, **dans la section de
  son thème** (ordre des numéros).
- Une décision qui modifie le cahier des charges ou une règle en vigueur met à jour, **dans la même PR**, le
  cahier des charges et [`../regles-en-vigueur.md`](../regles-en-vigueur.md) ([ADR-0098](0098-cahier-des-charges-tenu-a-jour.md)).
- Une décision acceptée **ne se réécrit pas** : une décision qui la change est un nouvel ADR, et l'ancien prend
  le statut « Remplacé par ADR-NNNN » (ou « modifié / précisé par ADR-NNNN » si une partie seulement change) dans son
  en-tête ; dans le tableau, **Remplacé** ou **Modifié**.
- Statuts : **Proposé** (choix de Claude non relu), **Accepté**, **Remplacé par ADR-NNNN**, **Abandonné**. Dans le
  tableau, le statut tient en **un mot** ; **Modifié** = accepté, mais une partie est précisée ou remplacée par un ADR
  plus récent : le détail (« modifié par ADR-NNNN ») est **dans l'en-tête du fichier** (ADR-0101).
- Une décision de l'utilisateur qui contient des points tranchés par Claude porte « À relire : oui » (et « à relire »
  en fin de statut dans le tableau). Une fois relue : retirer cette mention (ou passer **Proposé** → **Accepté**) et
  mettre à jour le tableau.
- Avant le 14/10/2026 (#197), les décisions étaient regroupées par lot ou par sujet ; elles ont été reprises
  telles quelles, une par fichier (l'historique Git garde les anciens fichiers).

## Méthode

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0001](0001-outillage-claude-relecteur-et-hooks.md) | 05/10/2026 | Outillage Claude : relecteur et hooks | Modifié |
| [0002](0002-git-manipulations-faites-par-claude.md) | 05/10/2026 | Git : manipulations faites par Claude | Modifié |
| [0003](0003-travail-autonome-sur-les-lots-2-a-7.md) | 05/10/2026 | Travail autonome sur les lots 2 à 7 | Modifié |
| [0038](0038-calibrage-de-l-extension-sous-agent-et-skill.md) | 08/10/2026 | Calibrage de l'extension : sous-agent et skill | Modifié |
| [0039](0039-lot-en-mode-issues-pr.md) | 08/10/2026 | `/lot` en mode issues / PR | Modifié |
| [0045](0045-une-version-par-pr-tag-automatique.md) | 13/10/2026 | Une version par PR, tag automatique | Accepté |
| [0046](0046-securite-du-depot-reglages-hooks-fusions.md) | 13/10/2026 | Sécurité du dépôt : réglages, hooks, fusions | Modifié |
| [0047](0047-qualite-du-code-doublons-retires.md) | 13/10/2026 | Qualité du code : doublons retirés | Accepté |
| [0062](0062-tests-couverture-base-de-test-plus-rapide.md) | 14/10/2026 | Tests : couverture, base de test plus rapide | Accepté |
| [0063](0063-outillage-claude-allege-et-verification-unique.md) | 14/10/2026 | Outillage Claude allégé et vérification unique | Accepté |
| [0098](0098-cahier-des-charges-tenu-a-jour.md) | 19/10/2026 | Cahier des charges tenu à jour, règles en vigueur par thème | Accepté |
| [0099](0099-consignes-de-claude-autonomie-et-decisions.md) | 19/10/2026 | Consignes de Claude : autonomie, questions et décisions | Accepté · à relire |
| [0101](0101-index-des-decisions-allege.md) | 19/10/2026 | Index des décisions allégé : par thème, statut en un mot | Accepté |

## Socle

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0004](0004-lot-0-choix-techniques-de-mise-en-place.md) | 05/10/2026 | Lot 0 : choix techniques de mise en place | Accepté |
| [0006](0006-lot-1-decisions-de-cadrage.md) | 05/10/2026 | Lot 1 : décisions de cadrage | Modifié |
| [0007](0007-lot-1-choix-pendant-le-developpement.md) | 05/10/2026 | Lot 1 : choix pendant le développement | Accepté |
| [0008](0008-lot-1-categories-marques-etats-et-listes-deroulantes.md) | 05/10/2026 | Lot 1 : catégories, marques, états et listes déroulantes | Modifié |
| [0048](0048-prix-vente-minimum.md) | 13/10/2026 | Prix vente minimum | Modifié |
| [0049](0049-securite-connexion-mot-de-passe-quota-de-l-ia.md) | 13/10/2026 | Sécurité : connexion, mot de passe, quota de l'IA | Accepté |
| [0065](0065-categories-recopiees-de-vinted.md) | 14/10/2026 | Catégories recopiées de Vinted | Modifié |
| [0085](0085-code-de-categorie-construit-sur-le-chemin.md) | 14/10/2026 | Code de catégorie construit sur le chemin | Accepté |
| [0091](0091-verrou-prix-minimum-dans-la-base.md) | 15/10/2026 | Prix vente minimum : verrou dans la base | Accepté |

## Calculs

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0005](0005-regle-d-arrondi-arrondi-vers-le-bas-le-reste-sur-le-dernier.md) | 05/10/2026 | Règle d'arrondi : arrondi vers le bas, le reste sur le dernier | Accepté |
| [0084](0084-marge-moyenne-arrondie-vers.md) | 14/10/2026 | Marge moyenne arrondie vers −∞ | Accepté |

## Saisie terrain

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0010](0010-lot-2-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 2 : choix pris en autonomie | Modifié |
| [0011](0011-lieu-de-la-sortie-en-saisie-libre.md) | 06/10/2026 | Lieu de la sortie en saisie libre | Accepté |
| [0012](0012-annuler-la-sortie.md) | 06/10/2026 | Annuler la sortie | Accepté |

## Ventes

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0013](0013-lot-3-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 3 : choix pris en autonomie | Modifié |
| [0026](0026-lien-de-la-conversation-vinted-a-la-vente.md) | 07/10/2026 | Lien de la conversation Vinted à la vente | Accepté |
| [0027](0027-supprimer-le-dernier-changement-de-statut.md) | 07/10/2026 | Supprimer le dernier changement de statut | Accepté |
| [0028](0028-statut-a-recuperer-apres-un-retour.md) | 07/10/2026 | Statut « À récupérer » après un retour | Modifié |
| [0066](0066-motif-de-sortie-a-vendre-hors-vinted.md) | 14/10/2026 | Motif de sortie « À vendre hors Vinted » | Accepté |
| [0067](0067-statut-en-stock.md) | 14/10/2026 | Statut « En stock » | Accepté |
| [0092](0092-sortie-du-stock-depuis-un-colis-en-cours.md) | 15/10/2026 | Sortie du stock depuis un colis en cours | Accepté |

## Liste

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0014](0014-lot-4-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 4 : choix pris en autonomie | Accepté |
| [0029](0029-modes-d-affichage-de-la-liste.md) | 07/10/2026 | Modes d'affichage de la liste | Accepté |
| [0030](0030-filtres-a-choix-multiples.md) | 07/10/2026 | Filtres à choix multiples | Modifié |
| [0031](0031-lien-de-l-annonce-vinted-saisi-a-la-main.md) | 07/10/2026 | Lien de l'annonce Vinted saisi à la main | Accepté |
| [0083](0083-filtres-a-vendre-hors-vinted-masque-par-defaut.md) | 14/10/2026 | Filtres : « À vendre hors Vinted » masqué par défaut | Accepté |

## Tableau de bord

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0015](0015-lot-5-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 5 : choix pris en autonomie | Modifié |
| [0040](0040-ca-et-benefice-theoriques-ventes-en-cours.md) | 08/10/2026 | CA et bénéfice théoriques (ventes en cours) | Modifié |
| [0041](0041-affichage-du-tableau-de-bord-revu.md) | 08/10/2026 | Affichage du tableau de bord revu | Modifié |
| [0050](0050-graphique-et-api-du-tableau-de-bord-apres-la-revue-de-code.md) | 13/10/2026 | Graphique et API du tableau de bord après la revue de code | Accepté |
| [0051](0051-tuiles-ca-et-benefice-montant-affiche-une-seule-fois.md) | 13/10/2026 | Tuiles CA et bénéfice : montant affiché une seule fois | Accepté |
| [0064](0064-performance.md) | 14/10/2026 | Performance | Accepté |
| [0090](0090-un-seul-terme-benefice-attendu.md) | 15/10/2026 | Un seul terme : « bénéfice attendu » | Accepté |

## IA Gemini

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0016](0016-lot-6-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 6 : choix pris en autonomie | Accepté |
| [0032](0032-gemini-modele-retire-et-serveurs-surcharges.md) | 07/10/2026 | Gemini : modèle retiré et serveurs surchargés | Modifié |
| [0033](0033-gemini-modele-de-secours.md) | 07/10/2026 | Gemini : modèle de secours | Accepté |
| [0088](0088-gemini-alias-latest-conserve.md) | 14/10/2026 | Gemini : alias « latest » conservé | Accepté |

## Photos et sauvegardes

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0017](0017-lot-7-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 7 : choix pris en autonomie | Modifié |
| [0024](0024-rotation-des-photos.md) | 07/10/2026 | Rotation des photos | Accepté |
| [0025](0025-photo-tournee-pas-a-jour-rotation-lente.md) | 07/10/2026 | Photo tournée pas à jour, rotation lente | Accepté |
| [0080](0080-photos-d-un-article-revendu-hors-vinted.md) | 14/10/2026 | Photos d'un article revendu hors Vinted | Accepté |
| [0100](0100-donnees-personnelles-minimisation-et-non-indexation.md) | 19/10/2026 | Données personnelles : minimisation, conservation et non-indexation | Accepté |

## Serveur

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0009](0009-https-local-pour-le-telephone.md) | 05/10/2026 | HTTPS local pour le téléphone | Accepté |
| [0018](0018-mise-en-ligne-ovh.md) | 06/10/2026 | Mise en ligne OVH | Modifié |
| [0019](0019-rapatriement-automatique-des-sauvegardes.md) | 06/10/2026 | Rapatriement automatique des sauvegardes | Modifié |
| [0022](0022-deploiement-a-chaque-fusion-dans-main.md) | 07/10/2026 | Déploiement à chaque fusion dans main | Modifié |
| [0042](0042-verification-apres-deploiement-et-retour-automatique.md) | 13/10/2026 | Vérification après déploiement et retour automatique | Accepté |
| [0043](0043-ci-completee.md) | 13/10/2026 | CI complétée | Modifié |
| [0044](0044-dependabot-typescript-7-ignore-pour-l-instant.md) | 13/10/2026 | Dependabot : TypeScript 7 ignoré pour l'instant | Accepté |
| [0081](0081-fusions-dans-main-par-claude-et-dependabot.md) | 14/10/2026 | Fusions dans main par Claude et Dependabot | Modifié |
| [0087](0087-serveur-ovh-connexion-ssh-par-cle.md) | 14/10/2026 | Serveur OVH : connexion SSH par clé | Accepté |

## Publication Vinted

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0020](0020-publication-des-annonces-par-un-programme-sur-le-pc.md) | 06/10/2026 | Publication des annonces par un programme sur le PC | Remplacé |
| [0021](0021-blocage-par-vinted-publication-en-pause.md) | 06/10/2026 | Blocage par Vinted : publication en pause | Remplacé |
| [0034](0034-publication-par-une-extension-chrome.md) | 07/10/2026 | Publication par une extension Chrome | Modifié |
| [0035](0035-premiers-essais-et-calibrage-de-l-extension.md) | 07/10/2026 | Premiers essais et calibrage de l'extension | Modifié |
| [0036](0036-extension-validee-ancien-programme-retire.md) | 08/10/2026 | Extension validée, ancien programme retiré | Accepté |
| [0037](0037-statut-erreur-de-publication.md) | 08/10/2026 | Statut « Erreur » de publication | Modifié |
| [0052](0052-statut-erreur-precisions-apres-la-revue-de-code.md) | 13/10/2026 | Statut « Erreur » : précisions après la revue de code | Accepté |
| [0068](0068-suppression-de-la-regle-n-4-automatisation-de-vinted.md) | 14/10/2026 | Suppression de la règle n° 4 (automatisation de Vinted) | Accepté |
| [0069](0069-logo-et-design-de-l-extension.md) | 14/10/2026 | Logo et design de l'extension | Accepté |
| [0070](0070-essais-du-14-10-2026-prix-et-categories.md) | 14/10/2026 | Essais du 14/10/2026 : prix et catégories | Accepté |
| [0071](0071-delais-de-l-extension.md) | 14/10/2026 | Délais de l'extension | Accepté |
| [0082](0082-extension-garde-fous-de-perimetre-supprimes.md) | 14/10/2026 | Extension : garde-fous de périmètre supprimés | Accepté |
| [0093](0093-completude-des-le-passage-a-publier.md) | 15/10/2026 | Complétude contrôlée dès le passage « À publier » | Accepté |

## Interface

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0053](0053-refonte-de-l-interface-design-tokens-techno.md) | 13/10/2026 | Refonte de l'interface : design tokens « Techno » | Modifié |
| [0054](0054-fiche-article-avertissement-des-saisies-non-enregistrees.md) | 13/10/2026 | Fiche article : avertissement des saisies non enregistrées | Accepté |
| [0055](0055-barre-de-navigation-icones-pastille-onglet-parent.md) | 13/10/2026 | Barre de navigation : icônes, pastille, onglet parent | Modifié |
| [0056](0056-liste-des-articles-haut-d-ecran-allege.md) | 13/10/2026 | Liste des articles : haut d'écran allégé | Modifié |
| [0057](0057-statuts-distincts-montants-homogenes-benefice-attendu.md) | 13/10/2026 | Statuts distincts, montants homogènes, bénéfice attendu | Modifié |
| [0058](0058-mise-en-page-pc-a-partir-de-1024-px.md) | 13/10/2026 | Mise en page PC à partir de 1024 px | Accepté |
| [0059](0059-boites-de-dialogue-titre-d-onglet-et-focus.md) | 13/10/2026 | Boîtes de dialogue, titre d'onglet et focus | Accepté |
| [0060](0060-terrain-en-sortie-active.md) | 13/10/2026 | Terrain en sortie active | Accepté |
| [0061](0061-fiche-article-organisee-autour-du-statut.md) | 13/10/2026 | Fiche article organisée autour du statut | Accepté |
| [0086](0086-couleurs-des-badges-de-statut.md) | 14/10/2026 | Couleurs des badges de statut | Modifié |
| [0089](0089-ecran-a-faire-realisation-et-ecran-d-ouverture.md) | 14/10/2026 | Écran « À faire » : réalisation et écran d'ouverture | Accepté |
| [0102](0102-accessibilite-de-l-interface.md) | 19/10/2026 | Accessibilité de l'interface : contrastes, lecteurs d'écran, contrôle automatique | Accepté |

## Tâches automatisées

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0072](0072-taches-automatisees-socle-commun.md) | 14/10/2026 | Tâches automatisées : socle commun | Accepté |
| [0073](0073-tache-articles-dormants.md) | 14/10/2026 | Tâche « Articles dormants » | Accepté |
| [0074](0074-tache-verification-vente-finalisee.md) | 14/10/2026 | Tâche « Vérification vente finalisée » | Modifié |
| [0075](0075-tache-negociation-favoris.md) | 14/10/2026 | Tâche « Négociation favoris » | Accepté |
| [0076](0076-tache-validee-prix-propose.md) | 14/10/2026 | Tâche « Validée prix proposé » | Accepté |
| [0077](0077-tache-recuperation-du-bon-de-livraison.md) | 14/10/2026 | Tâche « Récupération du bon de livraison » | Accepté |
| [0078](0078-rythme-des-taches-automatisees.md) | 14/10/2026 | Rythme des tâches automatisées | Accepté |
| [0079](0079-ecran-d-accueil-a-faire.md) | 14/10/2026 | Écran d'accueil « À faire » | Modifié |
| [0094](0094-articles-dormants-realisation-cote-application.md) | 15/10/2026 | Articles dormants : réalisation côté application (étape 1 sur 3) | Accepté |
| [0095](0095-articles-dormants-execution-en-mode-essai.md) | 15/10/2026 | Articles dormants : exécution par l'extension, en mode essai (étape 2 sur 3) | Accepté |
| [0096](0096-ventes-finalisees-realisation-etape-1.md) | 16/10/2026 | Vérification vente finalisée : réalisation, étape 1 sur 2 | Modifié |
| [0097](0097-ventes-finalisees-lues-dans-le-porte-monnaie.md) | 18/10/2026 | Ventes finalisées : lues dans le « Porte-monnaie » | Accepté |

## Import

| N° | Date | Décision | Statut |
|---|---|---|---|
| [0023](0023-import-du-tableur-compte-2026-vinted.md) | 07/10/2026 | Import du tableur « compte 2026 - Vinted » | Accepté |
