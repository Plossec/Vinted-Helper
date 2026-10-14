# ADR-0073 — Tâche « Articles dormants »

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #147
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : sur un article dormant (alerte existante, §5.8 : En ligne depuis `delai_dormant` jours,
7 par défaut, comptés depuis la dernière baisse de prix ou la mise en ligne), la tâche **baisse le prix, puis
republie** l'annonce une fois au prix minimum.

| Sujet | Décision |
|---|---|
| Activation | Case « Tâche Articles dormants activée » dans les réglages du compte, **décochée par défaut**. |
| Règle de baisse (compte) | Choix entre un **pourcentage** et un **montant** fixe, valable pour tous les articles (défaut : 10 %). |
| Règle de baisse (article) | Sous « Prix vente minimum » : *selon le réglage du compte* (défaut), *pourcentage*, *montant* ou **« ne pas baisser le prix »**. Le réglage de l'article prime ; « ne pas baisser » = aucune baisse. |
| Arrondi | Prix baissé arrondi **vers le haut au 0,50 €** (11 € − 10 % = 9,90 € → 10 €). Si l'arrondi redonne le prix actuel (10 € − 2 % = 9,80 € → 10 €), baisse de **0,50 €** (→ 9,50 €). Calcul dans `server/src/calculs/` (règle n° 1). |
| Plancher | Jamais sous le **prix vente minimum** (#146) : un prix baissé en dessous devient exactement le minimum (10 € − 10 % = 9 €, minimum 9,80 € → 9,80 €). |
| Republication | Article déjà au minimum, sans prix vente minimum, ou réglé sur « ne pas baisser » → **republication** (le prix n'est pas touché). |
| Invendu | Après **3 republications sans vente**, l'article passe dans un **nouveau statut « Invendu »** : l'annonce reste en vente sur Vinted, la tâche ne touche plus à l'article, une alerte « Invendus » prévient l'utilisateur, l'article reste compté en stock. L'utilisateur décide ensuite (baisse à la main, sortie du stock, retour En ligne, qui remet le compte des republications à zéro). |
| Ordre de la republication | **Supprimer l'ancienne annonce, puis créer la nouvelle** (choix de l'utilisateur, en connaissance du risque) ; si la création échoue, l'article passe *Erreur de publication* avec une alerte et se republie d'un clic. Nouveau lien enregistré sur l'article. |
| Mode | **Automatique** ou **manuel**, au choix dans les réglages du compte. Manuel : les baisses et republications prévues apparaissent dans une **liste à valider** ; l'utilisateur coche puis « Appliquer », l'extension les exécute. |
| Compte des jours | Une baisse et une republication relancent le délai dormant. |
| Rythme | Voir [ADR-0078](0078-rythme-des-taches-automatisees.md). |
| Journal | L'écran « Publication Vinted » affiche aussi ces actions (« Baisse 11 € → 9,50 € », « Republiée ») et leur résultat ; chaque baisse entre dans l'historique des prix. |
| Calibrage | Les pages Vinted « Modifier l'annonce » et « Supprimer » sont relevées par le **Diagnostic** de l'extension ; première version en **mode essai** (rien d'enregistré) jusqu'au relevé de l'utilisateur. |
| Livraison | PR 1 : réglages (migration), calcul, file d'actions, journal, extension en mode essai, relevé au Diagnostic. PR 2 : calibrage d'après le relevé, passage au mode réel. |
