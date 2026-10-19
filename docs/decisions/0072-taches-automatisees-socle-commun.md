# ADR-0072 — Tâches automatisées : socle commun

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur (cadrage)
- **Issue** : #147 à #151
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

Décisions sur les tâches que l'extension exécute seule sur le compte Vinted de l'utilisateur. Possibles depuis la
suppression de la règle n° 4 (#185, [ADR-0068](0068-suppression-de-la-regle-n-4-automatisation-de-vinted.md)) ; les risques déjà acceptés (CGU de Vinted : suspension
possible du compte) valent pour chacune.

## Décision

**Décision (cadrage avec l'utilisateur)** :

| Sujet | Décision |
|---|---|
| Qui agit sur Vinted | **L'extension Chrome** seule, déjà connectée au compte Vinted de l'utilisateur. Le serveur OVH ne se connecte jamais à Vinted (aucun mot de passe Vinted stocké). |
| Quand | Pendant les passages réguliers de l'extension (alarme existante), donc **seulement quand Chrome est ouvert** ; rattrapage au démarrage suivant. |
| Rythme | Voir [ADR-0078](0078-rythme-des-taches-automatisees.md). Publication inchangée : une annonce à la fois, 10 minutes entre deux annonces publiées, 5 secondes entre deux étapes (#63). Toute tâche s'arrête sur captcha ou erreur d'accès. |
| Résultats | Remontés au serveur par les routes du programme (jeton), comme la publication ; journal visible dans l'application. |
| Ordre de réalisation | À fixer une fois les 5 issues définies (définies le 14/10/2026). Dépendances : #149 → #150 (offre acceptée), #150 → #151 (ventes créées), alertes → #191 ; #147 est la plus simple. |
| Développement | **Aucun développement tant que les 5 issues ne sont pas toutes définies** (demande de l'utilisateur, 14/10/2026). |
| Mode | **Chaque tâche : automatique ou manuel, au choix dans les réglages du compte** ; manuel = liste des actions prévues à valider (cocher puis « Appliquer »). |
| Signalements | Centralisés dans un écran d'accueil « À faire » : #191. |
