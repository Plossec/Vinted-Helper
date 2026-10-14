# Tâches automatisées sur Vinted (#147 à #151, #190, #191)

Décisions sur les tâches que l'extension exécute seule sur le compte Vinted de l'utilisateur. Possibles depuis la
suppression de la règle n° 4 (#185, `publication-vinted.md`) ; les risques déjà acceptés (CGU de Vinted : suspension
possible du compte) valent pour chacune.

## 14/10/2026 — Socle commun

**Décision (cadrage avec l'utilisateur)** :

| Sujet | Décision |
|---|---|
| Qui agit sur Vinted | **L'extension Chrome** seule, déjà connectée au compte Vinted de l'utilisateur. Le serveur OVH ne se connecte jamais à Vinted (aucun mot de passe Vinted stocké). |
| Quand | Pendant les passages réguliers de l'extension (alarme existante), donc **seulement quand Chrome est ouvert** ; rattrapage au démarrage suivant. |
| Rythme | Voir « Rythme des tâches (#190) » ci-dessous. Publication inchangée : une annonce à la fois, 10 minutes entre deux annonces publiées, 5 secondes entre deux étapes (#63). Toute tâche s'arrête sur captcha ou erreur d'accès. |
| Résultats | Remontés au serveur par les routes du programme (jeton), comme la publication ; journal visible dans l'application. |
| Ordre de réalisation | À fixer une fois les 5 issues définies (définies le 14/10/2026). Dépendances : #149 → #150 (offre acceptée), #150 → #151 (ventes créées), alertes → #191 ; #147 est la plus simple. |
| Développement | **Aucun développement tant que les 5 issues ne sont pas toutes définies** (demande de l'utilisateur, 14/10/2026). |
| Mode | **Chaque tâche : automatique ou manuel, au choix dans les réglages du compte** ; manuel = liste des actions prévues à valider (cocher puis « Appliquer »). |
| Signalements | Centralisés dans un écran d'accueil « À faire » : #191. |

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
| Rythme | Voir « Rythme des tâches (#190) ». |
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
| Rythme | Voir « Rythme des tâches (#190) ». |
| Alertes | Les nouvelles alertes (à rattacher, montant corrigé) iront dans l'écran d'accueil « À faire » proposé par l'utilisateur : #191. |

## 14/10/2026 — #149 Négociation favoris

**Décision (utilisateur)** : la tâche envoie une **offre réduite** aux personnes qui ont mis un article en favori sans
l'acheter. La plus risquée vis-à-vis de Vinted (envoi vers des tiers) : réalisée en dernier.

| Sujet | Décision |
|---|---|
| Déclencheur | **N jours après le favori** sans achat (N réglable dans les réglages du compte). |
| Remise | **Règle de baisse de #147** : % ou montant (réglage de l'article, sinon du compte ; « ne pas baisser » → pas d'offre), arrondi vers le haut au 0,50 €, jamais sous le prix vente minimum. |
| Sans prix vente minimum | **Pas d'offre.** |
| Message | **Aucun** : l'offre seule (pas de texte répétitif). |
| Répétition | **Une seule offre** par personne et par article, jamais de relance. |
| Mode | **Automatique ou manuel**, au réglage du compte ; manuel = liste des offres prévues à valider. |
| Offre acceptée | Traitée par **#150** (pas par cette tâche). |
| Rythme | Voir « Rythme des tâches (#190) ». |

## 14/10/2026 — #150 Validée prix proposé

**Décision (utilisateur)** : la tâche répond aux **offres reçues** des acheteurs et **crée la vente** quand une offre
(reçue, ou envoyée par #149) est acceptée et payée.

| Sujet | Décision |
|---|---|
| Offre ≥ prix vente minimum | **Acceptée si l'article est dormant depuis au moins X jours** (X réglable dans les réglages du compte), comptés **comme l'alerte dormant** : depuis la dernière baisse de prix ou la mise en ligne. Moins de X jours → **contre-offre à mi-chemin**. |
| Offre < prix vente minimum | **Contre-offre à mi-chemin** entre l'offre et le prix affiché, arrondie vers le haut au 0,50 €, jamais sous le minimum. |
| Sans prix vente minimum | **Rien sur Vinted**, l'offre est **signalée dans l'application** (écran « À faire », #191). |
| Offre acceptée et payée | **La vente est créée** : article *À expédier*, prix vendu = prix accepté, date de vente = date du paiement lue sur Vinted, lien de la conversation enregistré. Offre groupée (plusieurs articles) → vente groupée, montant réparti au prorata (§6.4). Vaut aussi pour les offres envoyées par #149. |
| Mode | **Automatique ou manuel**, au réglage du compte ; manuel = liste des réponses prévues (accepter, contre-offre) à valider. |
| Rythme | Voir « Rythme des tâches (#190) ». |

## 14/10/2026 — #151 Récupération du bon de livraison

**Décision (utilisateur)** : pour chaque article **« À expédier »** (vente saisie à la main ou créée par #150), la
tâche récupère sur Vinted de quoi expédier le colis.

| Sujet | Décision |
|---|---|
| Déclencheur | Article *À expédier* dans l'application, quelle que soit l'origine de la vente (#148 ne crée pas de vente). |
| Récupéré | **Bordereau (PDF)**, **QR code / code de dépôt** (transporteurs sans impression), **numéro de suivi** (avec le transporteur), **date limite d'envoi**. |
| Usage | **Les deux** : impression groupée sur le PC (tous les bordereaux des *À expédier* en un seul PDF) et affichage du bordereau ou du QR code sur la fiche de la vente, au téléphone. |
| Date limite | Alerte dans l'écran « À faire » (#191) quand elle approche. |
| Mode | **Automatique ou manuel**, au réglage du compte. |
| Rythme | Voir « Rythme des tâches (#190) ». |

## 14/10/2026 — Rythme des tâches (#190)

**Décision (utilisateur)** : fréquence, pause et plafond sont **réglables tâche par tâche** dans les réglages du
compte, dans des **limites imposées** contre le spam (valeurs par défaut et limites proposées par Claude, fréquence
fixée par l'utilisateur).

| Tâche | Fréquence | Pause entre deux actions | Plafond par jour |
|---|---|---|---|
| #150 Offres reçues | 1 fois par jour (au plus toutes les 6 h) | 2 min (min. 1 min) | 30 réponses (max. 50) |
| #151 Bordereaux | 1 fois par jour (au plus toutes les 6 h) | 1 min (min. 30 s) | 30 (max. 50) |
| #148 Finalisation | 1 fois par jour (au plus toutes les 6 h) | 1 min (min. 30 s) | 50 (max. 100) |
| #147 Dormants | 1 fois par jour (au plus toutes les 6 h) | baisse 2 min (min. 1 min) ; republication 10 min (min. 10 min) | 20 baisses (max. 40) ; 10 republications (max. 20) |
| #149 Favoris | 1 fois par jour (au plus toutes les 6 h) | 5 min (min. 3 min) | 10 offres (max. 20) |

| Sujet | Décision |
|---|---|
| Enchaînement | **Une seule action à la fois** sur Vinted, par priorité : offres (#150) > bordereaux (#151) > publication > finalisation (#148) > dormants (#147) > favoris (#149). |
| Horaires | **8 h – 22 h** (heure de Paris), plage réglable. |
| Publication | Rythme inchangé (10 min entre deux annonces). |
| Piste (hors périmètre, §10) | Réglages avancés du rythme en **option payante** si l'application devient publique un jour. |

## 14/10/2026 — Écran d'accueil « À faire » (#191)

**Décision (utilisateur)** : un écran unique regroupe tout ce qui demande l'attention de l'utilisateur, les
alertes actuelles (§5.8) comme les signalements des tâches automatisées.

| Sujet | Décision |
|---|---|
| Place | **Nouvel onglet d'accueil « À faire »**, 1er onglet, ouvert au démarrage, avec la **pastille** du nombre de choses à faire (elle quitte l'onglet Articles). Articles devient le 2e onglet (5 onglets en bas). Les puces d'alertes du haut de la liste Articles y sont reprises. |
| Organisation | **Par urgence** : « Urgent » (date limite d'envoi proche #151, publications en erreur, offres sans prix minimum #150) ; « À traiter » (à expédier, à récupérer, ventes à rattacher #148, actions à valider en mode manuel #147 à #151) ; « Pour info » (montants corrigés #148, invendus #147, dormants, brouillons anciens). |
| Actions | **Les deux** : boutons sur la ligne (Valider / Appliquer en mode manuel, Rattacher, Imprimer le bordereau, Ouvrir la conversation, Marquer envoyé…) **et** lien vers la fiche de l'article ou de la vente. |
| Disparition | Les choses à faire disparaissent seules une fois faites ; les signalements d'information se ferment par un bouton **« Vu »**. |
| Notifications | Aucune sur le téléphone (§10) : tout reste dans l'application. |
| Réalisation (#191, 14/10/2026) | Groupes et actions des alertes existantes : Urgent = publications en erreur (**Republier**) ; À traiter = à expédier (**Envoyé** à la date du jour, 💬) et à récupérer (**Récupéré → À publier**) ; Pour info = dormants et brouillons anciens (**Vu**). Un « Vu » est mémorisé côté serveur (table `signalement_vu`, migration 0016) avec la date de départ de l'alerte : une nouvelle date le fait réapparaître ; la pastille ne compte pas les « Vu ». Liste des articles en `/articles`. |
| Écran d'ouverture (#191) | **Au choix dans les Réglages, par appareil** (choix de l'utilisateur) : *Terrain* (par défaut, comportement d'avant) ou *À faire*. Le manifeste ouvre `/demarrage`, qui redirige vers l'écran choisi. |
