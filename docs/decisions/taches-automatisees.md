# Tâches automatisées sur Vinted (#147 à #151)

Décisions sur les tâches que l'extension exécute seule sur le compte Vinted de l'utilisateur. Possibles depuis la
suppression de la règle n° 4 (#185, `publication-vinted.md`) ; les risques déjà acceptés (CGU de Vinted : suspension
possible du compte) valent pour chacune.

## 14/10/2026 — Socle commun

**Décision (cadrage avec l'utilisateur)** :

| Sujet | Décision |
|---|---|
| Qui agit sur Vinted | **L'extension Chrome** seule, déjà connectée au compte Vinted de l'utilisateur. Le serveur OVH ne se connecte jamais à Vinted (aucun mot de passe Vinted stocké). |
| Quand | Pendant les passages réguliers de l'extension (alarme existante), donc **seulement quand Chrome est ouvert** ; rattrapage au démarrage suivant. |
| Rythme | **Propre à chaque tâche, à définir** (*TBD*) à la fin de #147 à #151 : issue #190. Tâche déjà réalisée, la **publication** : une annonce à la fois, 10 minutes entre deux annonces publiées, 5 secondes entre deux étapes (#63). Toute tâche s'arrête sur captcha ou erreur d'accès. |
| Résultats | Remontés au serveur par les routes du programme (jeton), comme la publication ; journal visible dans l'application. |
| Ordre de réalisation proposé | Socle + #148, puis #151, #150, #147, #149. **L'utilisateur choisit de commencer par #147** (la plus simple). |
| Développement | **Aucun développement tant que les 5 issues ne sont pas toutes définies** (demande de l'utilisateur, 14/10/2026). |
| Démarrage | Chaque tâche pourra démarrer en mode « proposer puis l'utilisateur valide » ; #147 est directement **automatique** (choix de l'utilisateur). |

## 14/10/2026 — #147 Articles dormants

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
| Rythme | *TBD* (#190). |
| Journal | L'écran « Publication Vinted » affiche aussi ces actions (« Baisse 11 € → 9,50 € », « Republiée ») et leur résultat ; chaque baisse entre dans l'historique des prix. |
| Calibrage | Les pages Vinted « Modifier l'annonce » et « Supprimer » sont relevées par le **Diagnostic** de l'extension ; première version en **mode essai** (rien d'enregistré) jusqu'au relevé de l'utilisateur. |
| Livraison | PR 1 : réglages (migration), calcul, file d'actions, journal, extension en mode essai, relevé au Diagnostic. PR 2 : calibrage d'après le relevé, passage au mode réel. |

## 14/10/2026 — #148 Vérification vente finalisée

**Décision (utilisateur)** : la tâche ne fait qu'une chose : **commande terminée sur Vinted → article Finalisé**
dans l'application. La saisie des ventes, l'envoi et les retours restent manuels (#150 et #151 pourront y revenir).

| Sujet | Décision |
|---|---|
| Source | L'extension lit *Mes commandes › Ventes* sur Vinted. |
| Articles vérifiés | **Envoyé** seulement (seule transition existante vers Finalisé). |
| Rattachement | Commande Vinted ↔ article par le lien de l'annonce (`url_vinted`). Commande terminée sans article Envoyé retrouvé → liste **« à rattacher »** dans les alertes : l'utilisateur choisit l'article, le lien est enregistré, la tâche continue. |
| Vente groupée | Une commande de plusieurs articles = la vente groupée de l'application : tous les articles du colis passent Finalisé ensemble (règle existante, §4). |
| Date | **Date de fin de la commande lue sur Vinted** (le CA réalisé tombe dans le bon mois même si la tâche passe plus tard). |
| Montant | Si le montant crédité par Vinted diffère de celui de l'application : **le montant Vinted remplace** le montant crédité de la vente (réparti au prorata pour une vente groupée, §6.4) **et une alerte le signale** avec les deux montants. |
| Mode | **Automatique ou manuel**, au réglage du compte (comme #147) ; manuel = liste « changements détectés sur Vinted » à valider. |
| Rythme | *TBD* (#190). |
| Alertes | Les nouvelles alertes (à rattacher, montant corrigé) iront dans l'écran d'accueil « À faire » proposé par l'utilisateur : #191. |

## 14/10/2026 — #149 Négociation favoris (*à préciser*)

**Piste retenue au cadrage** : envoyer une **offre réduite** aux personnes ayant mis l'article en favori — après N
jours, remise de X %, jamais sous le prix vente minimum (#146), une seule fois par personne. **La plus risquée**
(seul envoi de messages vers des tiers, ce que Vinted surveille le plus) : à réaliser **en dernier**, d'abord en mode
« proposer puis l'utilisateur valide ».

Reste à trancher : délai, remise, message libre ou rédigé par Gemini.

## 14/10/2026 — #150 Validée prix proposé (*à préciser*)

**Piste retenue au cadrage** : l'extension lit les **offres reçues** ; offre ≥ prix vente minimum (#146) →
**acceptée** ; en dessous → **refus ou contre-offre**. Une offre acceptée crée une vente, récupérée par #148.

Reste à trancher : 100 % automatique ou d'abord une notification « offre à valider » ; règle de contre-offre (au
minimum ? à mi-chemin ?).

## 14/10/2026 — #151 Récupération du bon de livraison (*à préciser*)

**Piste retenue au cadrage** : dès qu'une vente est détectée (#148, prérequis), l'extension télécharge le **bordereau
d'envoi (PDF)** et le rattache à la vente ; impression depuis l'application (plusieurs d'un coup) ; numéro de suivi
enregistré.

Reste à trancher : impression depuis le PC ou le téléphone.
