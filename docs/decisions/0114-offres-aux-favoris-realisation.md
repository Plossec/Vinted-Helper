# ADR-0114 — Offres aux favoris : précisions et réalisation (étape 1 sur 2)

- **Date** : 18/11/2026
- **Statut** : Accepté · à relire
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #149
- **Thème** : Tâches automatisées
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

[ADR-0075](0075-tache-negociation-favoris.md) a défini la tâche « Négociation favoris » (offre réduite unique, sans
message, remise selon la règle de baisse, jamais sans prix vente minimum). Les réponses de l'utilisateur du 17 et du
18/11/2026 (commentaires de #149) la complètent ; la page Vinted à utiliser reste à relever.

## Décision

| Sujet | Décision |
|---|---|
| Chemin sur Vinted | Celui de l'utilisateur : **notifications** → « … a marqué ton article … comme favori » → bouton **« Faire une offre »** (choix de l'utilisateur). |
| Une offre par personne et par article | Mémorisée par une **empreinte SHA-256** de l'identifiant Vinted de la personne, jamais son nom ([ADR-0100](0100-donnees-personnelles-minimisation-et-non-indexation.md)) ; ligne et empreinte effacées **6 mois** après l'offre (choix de l'utilisateur). |
| Articles concernés | **En ligne** et **Invendu** (choix de l'utilisateur). |
| Article dormant | La **republication** ([ADR-0113](0113-dormants-republication-avec-baisse.md)) est **prioritaire** (choix de l'utilisateur). |
| Réglages par défaut | Désactivée, **manuel**, **essai** ; offre **2 jours** après le favori ; **10 offres par jour** ; **5 minutes** entre deux offres ; plage **8 h – 22 h** ; lecture des favoris toutes les **24 h** (choix de l'utilisateur, sauf la fréquence : choix de Claude, *à relire*). |
| Limites contre le spam | Délai 1 à 30 jours, 1 à 20 offres par jour, pause de 2 à 60 minutes, lecture toutes les 6 à 168 heures (choix de Claude, *à relire*, sur le modèle d'[ADR-0078](0078-rythme-des-taches-automatisees.md)). |
| Méthode | Pas de version « essai seulement » : l'utilisateur relève lui-même les deux pages Vinted (« Relever cet onglet ») ; la tâche est écrite d'après ces relevés (choix de l'utilisateur). |
| Découpage | **Étape 1** (cette décision) : réglages, table `offre_favori`, état de la tâche, carte « Offres aux favoris » (marquée « en préparation »), purge à 6 mois. **Étape 2** : lecture des notifications et envoi des offres par l'extension, liste à valider, journal, « Lancer maintenant », d'après les relevés (choix de Claude, *à relire*). |

## Conséquences

- Migration `0023_taches_favoris` : colonnes `favoris_*` de `reglages`, table `offre_favori` (état comme
  `action_vinted`, unique par article et personne).
- Tant que l'étape 2 n'est pas livrée, activer la tâche ne fait rien (la carte le dit).
