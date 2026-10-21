# Règles en vigueur par thème

Point d'entrée pour savoir **ce qui s'applique aujourd'hui** sans relire toute la chaîne des décisions. Une ligne par
sujet : la règle en une phrase, la décision de référence (la plus récente qui fait foi) et l'état. Le détail reste
dans le [cahier des charges](cahier-des-charges.md) et les [décisions](decisions/README.md). Toute décision qui change
une de ces règles met cette page à jour dans la même PR ([ADR-0098](decisions/0098-cahier-des-charges-tenu-a-jour.md)).

État : **réalisé** (en production), **en cours** (issue ouverte, une partie livrée), **décidé** (rien de livré).

## Méthode et outillage

| Sujet | Règle en vigueur | Référence | État |
|---|---|---|---|
| Travail | Une issue → une branche → une PR `#N — …` (`Closes #N`) fusionnée quand la CI est verte ; une fusion dans `main` part en production | [0039](decisions/0039-lot-en-mode-issues-pr.md), [0022](decisions/0022-deploiement-a-chaque-fusion-dans-main.md) | réalisé |
| Fusions par Claude | Seul, CI verte ; accord de l'utilisateur si la PR touche une migration, `docker-compose*`, `Dockerfile`, `.github/` ou `.claude/` ; Dependabot : mineures fusionnées, majeures ensemble | [0081](decisions/0081-fusions-dans-main-par-claude-et-dependabot.md), [0044](decisions/0044-dependabot-typescript-7-ignore-pour-l-instant.md) | réalisé |
| Autonomie de Claude | Question → réponse directe, sans issue ; évolution → issue, puis « oui » de l'utilisateur = jusqu'à la fusion ; `/calibrer-vinted` lancé par Claude → accord avant la fusion ; plusieurs petites issues par PR si l'utilisateur l'accepte ; choix non écrit → ADR Proposé | [0099](decisions/0099-consignes-de-claude-autonomie-et-decisions.md) | réalisé |
| Versions | Une version par PR (règle 1.x), tag `vX.Y.Z` créé par GitHub après la mise en production | [0045](decisions/0045-une-version-par-pr-tag-automatique.md) | réalisé |
| Décisions | Un fichier par décision ; une décision acceptée ne se réécrit pas ; cahier et cette page mis à jour dans la même PR ; index par thème, statut en un mot (détail dans l'en-tête du fichier) | [0098](decisions/0098-cahier-des-charges-tenu-a-jour.md), [0101](decisions/0101-index-des-decisions-allege.md), [index](decisions/README.md) | réalisé |
| Vérification | `npm run verifier` = job « Vérifier » de la CI (types, lint, format, tests, construction) | [0063](decisions/0063-outillage-claude-allege-et-verification-unique.md) | réalisé |
| Sécurité du dépôt | Interdictions dans `.claude/settings.json` et ESLint ; `settings.json` et hooks modifiés par l'utilisateur seul | [0046](decisions/0046-securite-du-depot-reglages-hooks-fusions.md) | réalisé |
| Protection de `main` sur GitHub | Supposée par 0046, à mettre en place | #201 | décidé |

## Socle et calculs

| Sujet | Règle en vigueur | Référence | État |
|---|---|---|---|
| Arrondi des répartitions | Parts au centime inférieur, tout le reste sur le dernier ; jamais de part négative | [0005](decisions/0005-regle-d-arrondi-arrondi-vers-le-bas-le-reste-sur-le-dernier.md) | réalisé |
| Marge moyenne | Arrondie vers −∞ | [0084](decisions/0084-marge-moyenne-arrondie-vers.md) | réalisé |
| Catégories | Arbre recopié de vinted.fr (Femmes, Hommes, Sport, Loisirs et collections), « Autre » pour le reste ; codes construits sur le chemin | [0065](decisions/0065-categories-recopiees-de-vinted.md), [0085](decisions/0085-code-de-categorie-construit-sur-le-chemin.md) | réalisé |
| Prix vente minimum | Facultatif, jamais au-dessus du prix affiché (contrôle du serveur + verrou dans la base) | [0048](decisions/0048-prix-vente-minimum.md), [0091](decisions/0091-verrou-prix-minimum-dans-la-base.md) | réalisé |
| Connexion | Mot de passe de 12 caractères minimum ; blocage après 5 échecs en 15 min (par IP et par identifiant) | [0049](decisions/0049-securite-connexion-mot-de-passe-quota-de-l-ia.md) | réalisé |
| Import | Aucun import dans l'application ; seule exception : import unique du tableur de l'utilisateur | [0023](decisions/0023-import-du-tableur-compte-2026-vinted.md) | réalisé |

## Statuts, ventes, liste

| Sujet | Règle en vigueur | Référence | État |
|---|---|---|---|
| Statuts | 11 statuts (Brouillon, En stock, À publier, Erreur, En ligne, Invendu, À expédier, Envoyé, À récupérer, Finalisé, Sortie du stock), transitions du cahier §4.2 | [cahier §4](cahier-des-charges.md#4-statuts-et-transitions), [0086](decisions/0086-couleurs-des-badges-de-statut.md) | réalisé |
| Passage À publier | Refusé si l'article est incomplet (mêmes champs que la publication Vinted) | [0093](decisions/0093-completude-des-le-passage-a-publier.md) | réalisé |
| Retour d'un colis | Article renvoyé → À récupérer, puis « Récupéré » | [0028](decisions/0028-statut-a-recuperer-apres-un-retour.md) | réalisé |
| Sortie du stock d'un colis en cours | Autorisée depuis À expédier et Envoyé ; montant du colis gardé et réparti sur les articles restants ; dernier article → vente annulée | [0092](decisions/0092-sortie-du-stock-depuis-un-colis-en-cours.md) | réalisé |
| À vendre hors Vinted | Motif de sortie, l'article reste compté en stock ; masqué par défaut dans les filtres | [0066](decisions/0066-motif-de-sortie-a-vendre-hors-vinted.md), [0083](decisions/0083-filtres-a-vendre-hors-vinted-masque-par-defaut.md) | réalisé |
| Liens Vinted | Lien de l'annonce (saisi ou enregistré par l'extension) et de la conversation ; l'application n'interroge pas Vinted elle-même | [0031](decisions/0031-lien-de-l-annonce-vinted-saisi-a-la-main.md), [0026](decisions/0026-lien-de-la-conversation-vinted-a-la-vente.md) | réalisé |
| Liste | 4 modes d'affichage, filtres à choix multiples | [0029](decisions/0029-modes-d-affichage-de-la-liste.md), [0030](decisions/0030-filtres-a-choix-multiples.md) | réalisé |

## Tableau de bord

| Sujet | Règle en vigueur | Référence | État |
|---|---|---|---|
| Ventes en cours | CA et « bénéfice attendu » des ventes À expédier / Envoyé, à la date de vente ; théorique = réalisé + en cours | [0040](decisions/0040-ca-et-benefice-theoriques-ventes-en-cours.md), [0090](decisions/0090-un-seul-terme-benefice-attendu.md) | réalisé |
| Affichage | Libellé « Mois réalisé » au-dessus du gros chiffre, ligne « théorique » dessous ; barres empilées | [0041](decisions/0041-affichage-du-tableau-de-bord-revu.md), [0050](decisions/0050-graphique-et-api-du-tableau-de-bord-apres-la-revue-de-code.md), [0051](decisions/0051-tuiles-ca-et-benefice-montant-affiche-une-seule-fois.md) | réalisé |

## Interface

| Sujet | Règle en vigueur | Référence | État |
|---|---|---|---|
| Écran « À faire » | 1er onglet avec la pastille ; Urgent / À traiter / Pour info (« Vu » mémorisé sur le serveur) ; écran d'ouverture au choix par appareil (Terrain par défaut) | [0089](decisions/0089-ecran-a-faire-realisation-et-ecran-d-ouverture.md) | réalisé |
| Apparence | Design tokens « Techno », couleurs des badges, mise en page PC dès 1024 px | [0053](decisions/0053-refonte-de-l-interface-design-tokens-techno.md), [0086](decisions/0086-couleurs-des-badges-de-statut.md), [0058](decisions/0058-mise-en-page-pc-a-partir-de-1024-px.md) | réalisé |
| Accessibilité | Contrastes WCAG 2.2 AA, emojis masqués, boutons nommés en entier, messages annoncés ; `eslint-plugin-jsx-a11y-x` à chaque PR | [0102](decisions/0102-accessibilite-de-l-interface.md) | réalisé |
| Fiche article | Organisée autour du statut ; avertissement des saisies non enregistrées | [0061](decisions/0061-fiche-article-organisee-autour-du-statut.md), [0054](decisions/0054-fiche-article-avertissement-des-saisies-non-enregistrees.md) | réalisé |

## IA Gemini

| Sujet | Règle en vigueur | Référence | État |
|---|---|---|---|
| Appels | Côté serveur seulement, 30 par heure ; alias « latest » conservé ; modèle de secours | [0049](decisions/0049-securite-connexion-mot-de-passe-quota-de-l-ia.md), [0088](decisions/0088-gemini-alias-latest-conserve.md), [0033](decisions/0033-gemini-modele-de-secours.md) | réalisé |

## Photos, sauvegardes, serveur

| Sujet | Règle en vigueur | Référence | État |
|---|---|---|---|
| Photos | Enregistrées en JPEG sans métadonnées (position GPS…) ; rotation définitive d'un quart de tour ; réduction au passage Finalisé / Sortie du stock (cahier §5.10), sauf « À vendre hors Vinted » qui garde ses photos jusqu'au motif suivant | [0100](decisions/0100-donnees-personnelles-minimisation-et-non-indexation.md), [0024](decisions/0024-rotation-des-photos.md), [0080](decisions/0080-photos-d-un-article-revendu-hors-vinted.md) | réalisé |
| Données des acheteurs | Lien de la conversation et commandes Vinted effacés 6 mois après la finalisation ; aucun nom ni adresse d'acheteur | [0100](decisions/0100-donnees-personnelles-minimisation-et-non-indexation.md) | réalisé |
| Indexation, mentions légales | Application jamais indexée (`robots.txt`, `noindex`, `X-Robots-Tag`) ; page « Mentions légales » sans connexion | [0100](decisions/0100-donnees-personnelles-minimisation-et-non-indexation.md) | réalisé |
| Sauvegardes | Chaque jour sur le serveur (base 30 j ; photos 7 j + dimanches 30 j), rapatriées chaque jour sur le PC | [0018](decisions/0018-mise-en-ligne-ovh.md), [0019](decisions/0019-rapatriement-automatique-des-sauvegardes.md) | réalisé |
| Mise en production | À chaque fusion dans `main`, vérification puis retour automatique à la version précédente si elle ne répond pas ; la base n'est jamais restaurée automatiquement ; après une mise en ligne réussie, anciennes images et cache de construction Docker vidés | [0022](decisions/0022-deploiement-a-chaque-fusion-dans-main.md), [0042](decisions/0042-verification-apres-deploiement-et-retour-automatique.md), [0103](decisions/0103-cache-de-construction-vide-apres-mise-en-ligne.md) | réalisé |
| HTTPS | Local (Caddy, Wi-Fi de la maison) et sur OVH (Let's Encrypt) | [0009](decisions/0009-https-local-pour-le-telephone.md), [0018](decisions/0018-mise-en-ligne-ovh.md) | réalisé |
| Connexion SSH au serveur | Par clé, mot de passe désactivé | [0087](decisions/0087-serveur-ovh-connexion-ssh-par-cle.md), #127 | décidé |

## Publication Vinted et tâches automatisées

| Sujet | Règle en vigueur | Référence | État |
|---|---|---|---|
| Automatisation de Vinted | Autorisée (ancienne règle n° 4 retirée) ; risques CGU acceptés par l'utilisateur ; aucun contournement (captcha, blocage → pause) | [0068](decisions/0068-suppression-de-la-regle-n-4-automatisation-de-vinted.md), [0082](decisions/0082-extension-garde-fous-de-perimetre-supprimes.md) | réalisé |
| Publication | Extension Chrome dans le Chrome de l'utilisateur ; une annonce à la fois, 10 min entre deux, délais fixes | [0034](decisions/0034-publication-par-une-extension-chrome.md), [0036](decisions/0036-extension-validee-ancien-programme-retire.md), [0071](decisions/0071-delais-de-l-extension.md) | réalisé |
| Échec de publication | Statut Erreur (jamais en mode essai), retour par « Republier » | [0037](decisions/0037-statut-erreur-de-publication.md), [0052](decisions/0052-statut-erreur-precisions-apres-la-revue-de-code.md) | réalisé |
| Tâches : socle | Par l'extension, une action à la fois ; désactivées, en mode manuel et en mode essai par défaut ; plage horaire (8 h – 22 h) et mode essai propres à chaque tâche ; « Lancer maintenant » à toute heure, sans plafond, même désactivée ; une carte par tâche avec son état ; journal de toutes les tâches, filtrable, gardé 3 mois | [0072](decisions/0072-taches-automatisees-socle-commun.md), [0078](decisions/0078-rythme-des-taches-automatisees.md), [0104](decisions/0104-lancement-manuel-des-taches-automatisees.md), [0105](decisions/0105-taches-reglages-par-tache-et-journal.md) (proposé) | en cours (#190, refonte #230) |
| Articles dormants | Baisse (arrondie vers le haut au 0,50 €, plancher au prix vente minimum) ou republication (supprimer, puis recréer) ; Invendu après 3 republications ; mode réel vérifié après coup (prix relu, annonce disparue), rien modifié si le prix Vinted diffère | [0073](decisions/0073-tache-articles-dormants.md), [0094](decisions/0094-articles-dormants-realisation-cote-application.md), [0095](decisions/0095-articles-dormants-execution-en-mode-essai.md), [0106](decisions/0106-articles-dormants-mode-reel.md) (proposé) | mode réel à confirmer au premier essai (#147) |
| Ventes finalisées | Lues dans le Porte-monnaie ; finalisation à la date Vinted ; montant Vinted prioritaire | [0097](decisions/0097-ventes-finalisees-lues-dans-le-porte-monnaie.md), [0096](decisions/0096-ventes-finalisees-realisation-etape-1.md) | en cours (#148 : calibrage) |
| Négociation favoris | Une offre réduite unique, sans message | [0075](decisions/0075-tache-negociation-favoris.md) | décidé (#149) |
| Offres reçues | Acceptées ou contre-offre selon le minimum ; vente créée quand payée | [0076](decisions/0076-tache-validee-prix-propose.md) | décidé (#150) |
| Bon de livraison | Bordereau, code de dépôt, suivi, date limite d'envoi | [0077](decisions/0077-tache-recuperation-du-bon-de-livraison.md) | décidé (#151) |
