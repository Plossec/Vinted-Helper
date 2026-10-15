# Décisions (ADR)

Chaque décision prise en cours de développement est un **ADR** (*Architecture Decision Record*) : un fichier
numéroté `NNNN-titre.md`, rédigé d'après le modèle [`0000-modele.md`](0000-modele.md). Les décisions complètent
[`../cahier-des-charges.md`](../cahier-des-charges.md) et priment quand elles le précisent.

**Règles**
- Une nouvelle décision = un **nouveau fichier**, numéro suivant, ajouté au tableau ci-dessous.
- Une décision acceptée **ne se réécrit pas** : une décision qui la change est un nouvel ADR, et l'ancien prend
  le statut « Remplacé par ADR-NNNN » (ou « modifié / précisé par ADR-NNNN » si une partie seulement change).
- Statuts : **Proposé** (choix de Claude non relu), **Accepté**, **Remplacé par ADR-NNNN**, **Abandonné**.
- Une décision de l'utilisateur qui contient des points tranchés par Claude porte « À relire : oui ». Une fois
  relue : retirer cette ligne (ou passer **Proposé** → **Accepté**) et mettre à jour le tableau.
- Avant le 14/10/2026 (#197), les décisions étaient regroupées par lot ou par sujet ; elles ont été reprises
  telles quelles, une par fichier (l'historique Git garde les anciens fichiers).

| N° | Date | Décision | Thème | Statut | À relire |
|---|---|---|---|---|---|
| [0001](0001-outillage-claude-relecteur-et-hooks.md) | 05/10/2026 | Outillage Claude : relecteur et hooks | Méthode | Accepté · modifié par [ADR-0046](0046-securite-du-depot-reglages-hooks-fusions.md) et [ADR-0063](0063-outillage-claude-allege-et-verification-unique.md) |  |
| [0002](0002-git-manipulations-faites-par-claude.md) | 05/10/2026 | Git : manipulations faites par Claude | Méthode | Accepté · fusions précisées par [ADR-0046](0046-securite-du-depot-reglages-hooks-fusions.md) et [ADR-0081](0081-fusions-dans-main-par-claude-et-dependabot.md) |  |
| [0003](0003-travail-autonome-sur-les-lots-2-a-7.md) | 05/10/2026 | Travail autonome sur les lots 2 à 7 | Méthode | Accepté · ponctuel (nuit du 05 au 06/10/2026), puis [ADR-0039](0039-lot-en-mode-issues-pr.md) |  |
| [0004](0004-lot-0-choix-techniques-de-mise-en-place.md) | 05/10/2026 | Lot 0 : choix techniques de mise en place | Socle | Accepté |  |
| [0005](0005-regle-d-arrondi-arrondi-vers-le-bas-le-reste-sur-le-dernier.md) | 05/10/2026 | Règle d'arrondi : arrondi vers le bas, le reste sur le dernier | Calculs | Accepté |  |
| [0006](0006-lot-1-decisions-de-cadrage.md) | 05/10/2026 | Lot 1 : décisions de cadrage | Socle | Accepté · « À publier » sans contrôle : remplacé par [ADR-0093](0093-completude-des-le-passage-a-publier.md) |  |
| [0007](0007-lot-1-choix-pendant-le-developpement.md) | 05/10/2026 | Lot 1 : choix pendant le développement | Socle | Accepté |  |
| [0008](0008-lot-1-categories-marques-etats-et-listes-deroulantes.md) | 05/10/2026 | Lot 1 : catégories, marques, états et listes déroulantes | Socle | Accepté · catégories remplacées par [ADR-0065](0065-categories-recopiees-de-vinted.md) |  |
| [0009](0009-https-local-pour-le-telephone.md) | 05/10/2026 | HTTPS local pour le téléphone | Serveur | Accepté |  |
| [0010](0010-lot-2-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 2 : choix pris en autonomie | Saisie terrain | Accepté · ligne « Sortie » remplacée par [ADR-0011](0011-lieu-de-la-sortie-en-saisie-libre.md) |  |
| [0011](0011-lieu-de-la-sortie-en-saisie-libre.md) | 06/10/2026 | Lieu de la sortie en saisie libre | Saisie terrain | Accepté |  |
| [0012](0012-annuler-la-sortie.md) | 06/10/2026 | Annuler la sortie | Saisie terrain | Accepté |  |
| [0013](0013-lot-3-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 3 : choix pris en autonomie | Ventes | Accepté · sortie du stock dans un colis en cours : remplacée par [ADR-0092](0092-sortie-du-stock-depuis-un-colis-en-cours.md) |  |
| [0014](0014-lot-4-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 4 : choix pris en autonomie | Liste | Accepté |  |
| [0015](0015-lot-5-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 5 : choix pris en autonomie | Tableau de bord | Accepté · arrondi de la marge précisé par [ADR-0084](0084-marge-moyenne-arrondie-vers.md) |  |
| [0016](0016-lot-6-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 6 : choix pris en autonomie | IA Gemini | Accepté |  |
| [0017](0017-lot-7-choix-pris-en-autonomie.md) | 06/10/2026 | Lot 7 : choix pris en autonomie | Photos et sauvegardes | Accepté · sauvegardes remplacées par [ADR-0018](0018-mise-en-ligne-ovh.md) et [ADR-0019](0019-rapatriement-automatique-des-sauvegardes.md) |  |
| [0018](0018-mise-en-ligne-ovh.md) | 06/10/2026 | Mise en ligne OVH | Serveur | Accepté · connexion SSH remplacée par [ADR-0087](0087-serveur-ovh-connexion-ssh-par-cle.md) |  |
| [0019](0019-rapatriement-automatique-des-sauvegardes.md) | 06/10/2026 | Rapatriement automatique des sauvegardes | Serveur | Accepté |  |
| [0020](0020-publication-des-annonces-par-un-programme-sur-le-pc.md) | 06/10/2026 | Publication des annonces par un programme sur le PC | Publication Vinted | Remplacé par [ADR-0034](0034-publication-par-une-extension-chrome.md) et [ADR-0036](0036-extension-validee-ancien-programme-retire.md) |  |
| [0021](0021-blocage-par-vinted-publication-en-pause.md) | 06/10/2026 | Blocage par Vinted : publication en pause | Publication Vinted | Remplacé par [ADR-0034](0034-publication-par-une-extension-chrome.md) |  |
| [0022](0022-deploiement-a-chaque-fusion-dans-main.md) | 07/10/2026 | Déploiement à chaque fusion dans main | Serveur | Accepté · « Risque accepté » précisé par [ADR-0081](0081-fusions-dans-main-par-claude-et-dependabot.md) |  |
| [0023](0023-import-du-tableur-compte-2026-vinted.md) | 07/10/2026 | Import du tableur « compte 2026 - Vinted » | Import | Accepté |  |
| [0024](0024-rotation-des-photos.md) | 07/10/2026 | Rotation des photos | Photos et sauvegardes | Accepté |  |
| [0025](0025-photo-tournee-pas-a-jour-rotation-lente.md) | 07/10/2026 | Photo tournée pas à jour, rotation lente | Photos et sauvegardes | Accepté |  |
| [0026](0026-lien-de-la-conversation-vinted-a-la-vente.md) | 07/10/2026 | Lien de la conversation Vinted à la vente | Ventes | Accepté |  |
| [0027](0027-supprimer-le-dernier-changement-de-statut.md) | 07/10/2026 | Supprimer le dernier changement de statut | Ventes | Accepté |  |
| [0028](0028-statut-a-recuperer-apres-un-retour.md) | 07/10/2026 | Statut « À récupérer » après un retour | Ventes | Accepté |  |
| [0029](0029-modes-d-affichage-de-la-liste.md) | 07/10/2026 | Modes d'affichage de la liste | Liste | Accepté |  |
| [0030](0030-filtres-a-choix-multiples.md) | 07/10/2026 | Filtres à choix multiples | Liste | Accepté · statuts par défaut complétés par [ADR-0028](0028-statut-a-recuperer-apres-un-retour.md), [ADR-0037](0037-statut-erreur-de-publication.md), [ADR-0067](0067-statut-en-stock.md) et [ADR-0083](0083-filtres-a-vendre-hors-vinted-masque-par-defaut.md) |  |
| [0031](0031-lien-de-l-annonce-vinted-saisi-a-la-main.md) | 07/10/2026 | Lien de l'annonce Vinted saisi à la main | Liste | Accepté |  |
| [0032](0032-gemini-modele-retire-et-serveurs-surcharges.md) | 07/10/2026 | Gemini : modèle retiré et serveurs surchargés | IA Gemini | Accepté · complété par [ADR-0033](0033-gemini-modele-de-secours.md) et [ADR-0088](0088-gemini-alias-latest-conserve.md) |  |
| [0033](0033-gemini-modele-de-secours.md) | 07/10/2026 | Gemini : modèle de secours | IA Gemini | Accepté |  |
| [0034](0034-publication-par-une-extension-chrome.md) | 07/10/2026 | Publication par une extension Chrome | Publication Vinted | Accepté · garde-fous de périmètre remplacés par [ADR-0082](0082-extension-garde-fous-de-perimetre-supprimes.md) ; rythme aléatoire retiré par [ADR-0071](0071-delais-de-l-extension.md) |  |
| [0035](0035-premiers-essais-et-calibrage-de-l-extension.md) | 07/10/2026 | Premiers essais et calibrage de l'extension | Publication Vinted | Accepté · délais remplacés par [ADR-0071](0071-delais-de-l-extension.md) |  |
| [0036](0036-extension-validee-ancien-programme-retire.md) | 08/10/2026 | Extension validée, ancien programme retiré | Publication Vinted | Accepté |  |
| [0037](0037-statut-erreur-de-publication.md) | 08/10/2026 | Statut « Erreur » de publication | Publication Vinted | Accepté · précisé par [ADR-0052](0052-statut-erreur-precisions-apres-la-revue-de-code.md) |  |
| [0038](0038-calibrage-de-l-extension-sous-agent-et-skill.md) | 08/10/2026 | Calibrage de l'extension : sous-agent et skill | Méthode | Accepté |  |
| [0039](0039-lot-en-mode-issues-pr.md) | 08/10/2026 | `/lot` en mode issues / PR | Méthode | Accepté |  |
| [0040](0040-ca-et-benefice-theoriques-ventes-en-cours.md) | 08/10/2026 | CA et bénéfice théoriques (ventes en cours) | Tableau de bord | Accepté · affichage remplacé par [ADR-0041](0041-affichage-du-tableau-de-bord-revu.md) ; terme « bénéfice en cours » remplacé par « bénéfice attendu » ([ADR-0090](0090-un-seul-terme-benefice-attendu.md)) |  |
| [0041](0041-affichage-du-tableau-de-bord-revu.md) | 08/10/2026 | Affichage du tableau de bord revu | Tableau de bord | Accepté · graphique et tuiles précisés par [ADR-0050](0050-graphique-et-api-du-tableau-de-bord-apres-la-revue-de-code.md) et [ADR-0051](0051-tuiles-ca-et-benefice-montant-affiche-une-seule-fois.md) |  |
| [0042](0042-verification-apres-deploiement-et-retour-automatique.md) | 13/10/2026 | Vérification après déploiement et retour automatique | Serveur | Accepté |  |
| [0043](0043-ci-completee.md) | 13/10/2026 | CI complétée | Serveur | Accepté |  |
| [0044](0044-dependabot-typescript-7-ignore-pour-l-instant.md) | 13/10/2026 | Dependabot : TypeScript 7 ignoré pour l'instant | Serveur | Accepté |  |
| [0045](0045-une-version-par-pr-tag-automatique.md) | 13/10/2026 | Une version par PR, tag automatique | Méthode | Accepté |  |
| [0046](0046-securite-du-depot-reglages-hooks-fusions.md) | 13/10/2026 | Sécurité du dépôt : réglages, hooks, fusions | Méthode | Accepté · fusions précisées par [ADR-0081](0081-fusions-dans-main-par-claude-et-dependabot.md) |  |
| [0047](0047-qualite-du-code-doublons-retires.md) | 13/10/2026 | Qualité du code : doublons retirés | Méthode | Accepté |  |
| [0048](0048-prix-vente-minimum.md) | 13/10/2026 | Prix vente minimum | Socle | Accepté · verrou dans la base : voir [ADR-0091](0091-verrou-prix-minimum-dans-la-base.md) |  |
| [0049](0049-securite-connexion-mot-de-passe-quota-de-l-ia.md) | 13/10/2026 | Sécurité : connexion, mot de passe, quota de l'IA | Socle | Accepté |  |
| [0050](0050-graphique-et-api-du-tableau-de-bord-apres-la-revue-de-code.md) | 13/10/2026 | Graphique et API du tableau de bord après la revue de code | Tableau de bord | Accepté |  |
| [0051](0051-tuiles-ca-et-benefice-montant-affiche-une-seule-fois.md) | 13/10/2026 | Tuiles CA et bénéfice : montant affiché une seule fois | Tableau de bord | Accepté |  |
| [0052](0052-statut-erreur-precisions-apres-la-revue-de-code.md) | 13/10/2026 | Statut « Erreur » : précisions après la revue de code | Publication Vinted | Accepté |  |
| [0053](0053-refonte-de-l-interface-design-tokens-techno.md) | 13/10/2026 | Refonte de l'interface : design tokens « Techno » | Interface | Accepté · couleurs des badges complétées par [ADR-0086](0086-couleurs-des-badges-de-statut.md) |  |
| [0054](0054-fiche-article-avertissement-des-saisies-non-enregistrees.md) | 13/10/2026 | Fiche article : avertissement des saisies non enregistrées | Interface | Accepté |  |
| [0055](0055-barre-de-navigation-icones-pastille-onglet-parent.md) | 13/10/2026 | Barre de navigation : icônes, pastille, onglet parent | Interface | Accepté |  |
| [0056](0056-liste-des-articles-haut-d-ecran-allege.md) | 13/10/2026 | Liste des articles : haut d'écran allégé | Interface | Accepté |  |
| [0057](0057-statuts-distincts-montants-homogenes-benefice-attendu.md) | 13/10/2026 | Statuts distincts, montants homogènes, bénéfice attendu | Interface | Accepté · couleurs détaillées par [ADR-0086](0086-couleurs-des-badges-de-statut.md) |  |
| [0058](0058-mise-en-page-pc-a-partir-de-1024-px.md) | 13/10/2026 | Mise en page PC à partir de 1024 px | Interface | Accepté |  |
| [0059](0059-boites-de-dialogue-titre-d-onglet-et-focus.md) | 13/10/2026 | Boîtes de dialogue, titre d'onglet et focus | Interface | Accepté |  |
| [0060](0060-terrain-en-sortie-active.md) | 13/10/2026 | Terrain en sortie active | Interface | Accepté |  |
| [0061](0061-fiche-article-organisee-autour-du-statut.md) | 13/10/2026 | Fiche article organisée autour du statut | Interface | Accepté |  |
| [0062](0062-tests-couverture-base-de-test-plus-rapide.md) | 14/10/2026 | Tests : couverture, base de test plus rapide | Méthode | Accepté |  |
| [0063](0063-outillage-claude-allege-et-verification-unique.md) | 14/10/2026 | Outillage Claude allégé et vérification unique | Méthode | Accepté |  |
| [0064](0064-performance.md) | 14/10/2026 | Performance | Tableau de bord | Accepté |  |
| [0065](0065-categories-recopiees-de-vinted.md) | 14/10/2026 | Catégories recopiées de Vinted | Socle | Accepté · construction des codes confirmée par [ADR-0085](0085-code-de-categorie-construit-sur-le-chemin.md) |  |
| [0066](0066-motif-de-sortie-a-vendre-hors-vinted.md) | 14/10/2026 | Motif de sortie « À vendre hors Vinted » | Ventes | Accepté |  |
| [0067](0067-statut-en-stock.md) | 14/10/2026 | Statut « En stock » | Ventes | Accepté |  |
| [0068](0068-suppression-de-la-regle-n-4-automatisation-de-vinted.md) | 14/10/2026 | Suppression de la règle n° 4 (automatisation de Vinted) | Publication Vinted | Accepté |  |
| [0069](0069-logo-et-design-de-l-extension.md) | 14/10/2026 | Logo et design de l'extension | Publication Vinted | Accepté |  |
| [0070](0070-essais-du-14-10-2026-prix-et-categories.md) | 14/10/2026 | Essais du 14/10/2026 : prix et catégories | Publication Vinted | Accepté |  |
| [0071](0071-delais-de-l-extension.md) | 14/10/2026 | Délais de l'extension | Publication Vinted | Accepté |  |
| [0072](0072-taches-automatisees-socle-commun.md) | 14/10/2026 | Tâches automatisées : socle commun | Tâches automatisées | Accepté |  |
| [0073](0073-tache-articles-dormants.md) | 14/10/2026 | Tâche « Articles dormants » | Tâches automatisées | Accepté |  |
| [0074](0074-tache-verification-vente-finalisee.md) | 14/10/2026 | Tâche « Vérification vente finalisée » | Tâches automatisées | Accepté |  |
| [0075](0075-tache-negociation-favoris.md) | 14/10/2026 | Tâche « Négociation favoris » | Tâches automatisées | Accepté |  |
| [0076](0076-tache-validee-prix-propose.md) | 14/10/2026 | Tâche « Validée prix proposé » | Tâches automatisées | Accepté |  |
| [0077](0077-tache-recuperation-du-bon-de-livraison.md) | 14/10/2026 | Tâche « Récupération du bon de livraison » | Tâches automatisées | Accepté |  |
| [0078](0078-rythme-des-taches-automatisees.md) | 14/10/2026 | Rythme des tâches automatisées | Tâches automatisées | Accepté |  |
| [0079](0079-ecran-d-accueil-a-faire.md) | 14/10/2026 | Écran d'accueil « À faire » | Tâches automatisées | Accepté · réalisation précisée par [ADR-0089](0089-ecran-a-faire-realisation-et-ecran-d-ouverture.md) |  |
| [0080](0080-photos-d-un-article-revendu-hors-vinted.md) | 14/10/2026 | Photos d'un article revendu hors Vinted | Photos et sauvegardes | Accepté |  |
| [0081](0081-fusions-dans-main-par-claude-et-dependabot.md) | 14/10/2026 | Fusions dans main par Claude et Dependabot | Serveur | Accepté |  |
| [0082](0082-extension-garde-fous-de-perimetre-supprimes.md) | 14/10/2026 | Extension : garde-fous de périmètre supprimés | Publication Vinted | Accepté |  |
| [0083](0083-filtres-a-vendre-hors-vinted-masque-par-defaut.md) | 14/10/2026 | Filtres : « À vendre hors Vinted » masqué par défaut | Liste | Accepté |  |
| [0084](0084-marge-moyenne-arrondie-vers.md) | 14/10/2026 | Marge moyenne arrondie vers −∞ | Calculs | Accepté |  |
| [0085](0085-code-de-categorie-construit-sur-le-chemin.md) | 14/10/2026 | Code de catégorie construit sur le chemin | Socle | Accepté |  |
| [0086](0086-couleurs-des-badges-de-statut.md) | 14/10/2026 | Couleurs des badges de statut | Interface | Accepté |  |
| [0087](0087-serveur-ovh-connexion-ssh-par-cle.md) | 14/10/2026 | Serveur OVH : connexion SSH par clé | Serveur | Accepté |  |
| [0088](0088-gemini-alias-latest-conserve.md) | 14/10/2026 | Gemini : alias « latest » conservé | IA Gemini | Accepté |  |
| [0089](0089-ecran-a-faire-realisation-et-ecran-d-ouverture.md) | 14/10/2026 | Écran « À faire » : réalisation et écran d'ouverture | Interface | Accepté |  |
| [0090](0090-un-seul-terme-benefice-attendu.md) | 15/10/2026 | Un seul terme : « bénéfice attendu » | Tableau de bord | Accepté |  |
| [0091](0091-verrou-prix-minimum-dans-la-base.md) | 15/10/2026 | Prix vente minimum : verrou dans la base | Socle | Accepté |  |
| [0092](0092-sortie-du-stock-depuis-un-colis-en-cours.md) | 15/10/2026 | Sortie du stock depuis un colis en cours | Ventes | Accepté |  |
| [0093](0093-completude-des-le-passage-a-publier.md) | 15/10/2026 | Complétude contrôlée dès le passage « À publier » | Publication Vinted | Accepté |  |
| [0094](0094-articles-dormants-realisation-cote-application.md) | 15/10/2026 | Articles dormants : réalisation côté application (étape 1 sur 3) | Tâches automatisées | Accepté |  |
