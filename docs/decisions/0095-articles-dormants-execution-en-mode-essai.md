# ADR-0095 — Articles dormants : exécution par l'extension, en mode essai (étape 2 sur 3)

- **Date** : 15/10/2026
- **Statut** : Accepté
- **Décideurs** : Claude, dans le cadre validé par l'utilisateur ([ADR-0073](0073-tache-articles-dormants.md), [ADR-0078](0078-rythme-des-taches-automatisees.md), [ADR-0094](0094-articles-dormants-realisation-cote-application.md))
- **Issue** : #147
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Décision

| Sujet | Décision |
|---|---|
| Priorité | La **publication passe d'abord** ; sans annonce à publier, l'extension demande l'action suivante. |
| Une à la fois | Le serveur ne confie une action que si aucune n'est en cours, dans la plage horaire, après la **pause** du même type (baisse 2 min, republication 10 min par défaut), la plus ancienne d'abord. Une action restée en cours plus de 15 minutes passe en erreur (« interrompue »), jamais relancée seule. |
| Mode essai | Celui des réglages **au moment où l'action est confiée**. En essai : baisse → l'annonce et « Modifier l'annonce » sont ouvertes, le prix est **seulement lu** (rien n'est saisi, pour ne pas laisser un formulaire modifié) ; republication → l'annonce est ouverte (« Supprimer » repéré, jamais cliqué), puis « Vendre un article » est rempli sans « Ajouter ». |
| Relevés | Chaque essai enregistre les pages relevées (« Dernier relevé ») pour calibrer le mode réel (étape 3). |
| Mode réel | **Refusé par l'extension 1.10** (erreur « Mode réel pas encore disponible ») tant que le calibrage n'est pas fait. Le serveur sait déjà l'enregistrer : baisse faite → nouveau prix et historique (relance le délai dormant) ; republication faite → nouveau lien ; échec après suppression de l'ancienne annonce → article « Erreur », à republier d'un clic. |
| Republication | L'annonce recréée reprend les données de l'article (mêmes champs que la publication) ; article incomplet → action en erreur, sans rien ouvrir. |
| Repères | Boutons « Modifier l'annonce » et « Supprimer » rédigés sans relevé (`selecteurs.js`), à calibrer. |

## Conséquences

- Extension **1.10.0** : `git pull` puis ↻ dans `chrome://extensions`.
- Étape 3 : calibrage d'après le relevé de l'utilisateur, puis enregistrement du prix, suppression et recréation réelles.
