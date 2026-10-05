# Vinted Helper — Cahier des charges (V4)

> Statut : **en attente de validation**. Aucun développement avant le feu vert.

## Sommaire

1. Contexte
2. Utilisateur, appareils, technique
3. Glossaire
4. Statuts et transitions
5. Fonctionnalités
6. Règles de calcul
7. Modèle de données
8. Critères d'acceptation
9. Découpage en lots livrables
10. Hors périmètre
11. Annexe — Cas chiffrés (tests automatiques)
12. Organisation du projet, outillage IA et versions

---

## 1. Contexte

Revente amateur sur Vinted d'articles achetés à bas prix (vide-greniers, ressourceries, bourses aux vêtements, lots Leboncoin) ou issus de la maison.
Rythme constaté : ~125 articles achetés en 2,5 mois, ~60 vendus, sorties le week-end.
*Ce rythme est donné à titre d'exemple : il est évolutif et variable, l'application ne doit pas en dépendre.*

Objectif : remplacer le tableur par une application web/mobile simple pour gérer **stock, mises en vente, ventes et rentabilité**, avec une saisie très rapide sur le terrain.

Statut administratif de l'utilisateur : **particulier** (aucun registre comptable requis).

## 2. Utilisateur, appareils, technique

### 2.1 Utilisateur et compte
- **Un seul utilisateur** en V1.
- Le compte est **créé à l'installation** (identifiant + mot de passe dans le fichier de configuration). **Pas de page d'inscription**, pas de « mot de passe oublié » par e-mail.
- Mot de passe **modifiable dans les Réglages** ; en cas d'oubli, **réinitialisation par une commande** sur le serveur (expliquée dans le guide).
- Session mémorisée sur le téléphone.
- **Préparation de l'avenir** : toutes les données (articles, sorties, photos, ventes, référentiels, réglages…) sont rattachées à un utilisateur dans la base, pour permettre une ouverture future au public sans restructuration ([issue #4](https://github.com/Plossec/Vinted-Helper/issues/4)). Aucune fonction multi-utilisateur n'est développée en V1.

### 2.2 Appareils et usage
- **Android** (terrain, photos) et **PC Windows** (compléter les fiches, statistiques).
- Application web installable (**PWA**) : un seul code, icône sur l'écran d'accueil Android, pas de Play Store.
- Réseau 4G généralement disponible en vide-grenier, mais **aucune saisie terrain ne doit être perdue**. Les actions terrain — **démarrer une sortie**, **saisir l'essence**, **enregistrer un achat complet** (photo + prix + nombre d'articles + sortie) — sont d'abord **enregistrées sur le téléphone**, puis envoyées au serveur dès que possible, avec renvoi automatique en cas d'échec. Un compteur indique « N éléments en attente d'envoi ».
  - Les **identifiants** (sortie, achat, article) sont **générés sur le téléphone** (UUID), pour éviter tout doublon au renvoi.
  - La **référence** `#0127` est attribuée **par le serveur** à la réception ; d'ici là, l'article affiche « Réf. en attente ».
  - Si la **session expire** alors que des éléments sont en attente, ils sont **conservés** sur le téléphone et envoyés après reconnexion.
- Interface **claire / sombre automatique**, sobre, gros boutons utilisables à une main.

### 2.3 Format français (obligatoire partout)
- Montants : `3,33 €` (virgule décimale, symbole après). Saisie acceptée avec virgule **ou** point.
- Dates : `JJ/MM/AAAA`. Fuseau **Europe/Paris** (heure d'été/hiver).
- Semaine commençant le **lundi**.
- Interface entièrement en **français**.

### 2.4 Technique
| Élément | Choix |
|---|---|
| Interface | **React + TypeScript**, PWA |
| Serveur | **Node.js + TypeScript** |
| Base de données | **PostgreSQL** (accès via l'ORM Drizzle) |
| Photos | Fichiers dans un dossier du serveur |
| Lancement | **Docker Compose** : identique sur PC Windows (Docker Desktop) et VPS |
| IA | **Google Gemini, offre gratuite**, appelé **uniquement depuis le serveur** (la clé API n'est jamais dans l'appli téléphone) |
| Montants | **Tous les montants sont stockés et calculés en centimes (entiers)** et convertis en euros uniquement à l'affichage |
| Tests | Tests automatiques obligatoires sur le module de calcul (annexe §11) |
| Hébergement cible | **VPS OVH** (offre précise : [issue #2](https://github.com/Plossec/Vinted-Helper/issues/2)) |

Démarche :
1. Développement **en local sur PC Windows**. Le lot 1 est testé sur le PC.
2. **Juste avant le lot 2** : mise en place du HTTPS local pour tester sur le téléphone ([issue #3](https://github.com/Plossec/Vinted-Helper/issues/3)) — indispensable pour l'installation PWA et la mise en attente des achats.
3. Mise en ligne OVH (issue #2).

Niveau technique de l'utilisateur : intermédiaire (terminal OK) → installation guidée pas-à-pas.

## 3. Glossaire

| Terme | Définition |
|---|---|
| **Sortie** | Un déplacement d'achat (ex. vide-grenier du 27/09) : date, lieu, essence. Regroupe les articles achetés ce jour-là. |
| **Lieu** | Endroit d'achat, choisi dans une liste réutilisable (Vide grenier, Ressourcerie, Bourse vêtement, LBC…, Maison). |
| **Lot (d'achat)** | Plusieurs articles achetés ensemble pour un prix global (ex. 4 maillots pour 15 €). |
| **Photo terrain** | Photo rapide prise au moment de l'achat, pour se souvenir de l'article et du prix. Partagée par tous les articles d'un lot. |
| **Photos annonce** | Photos propres destinées à l'annonce Vinted. |
| **Prix affiché** | Prix de l'annonce sur Vinted ; chaque changement est historisé. Obligatoire pour être En ligne. |
| **Prix vendu** | Montant **réellement crédité** sur le porte-monnaie Vinted (après offre négociée). |
| **Vente** | Une transaction avec un acheteur = **un colis**. Contient 1 article (vente simple) ou plusieurs (**vente groupée**). |
| **Retour partiel** | L'acheteur d'un colis groupé renvoie une partie des articles seulement. |
| **Finalisé** | Vente validée par Vinted, argent crédité. C'est la **date de finalisation** qui compte pour le chiffre d'affaires. |
| **Sortie du stock** | Article qui quitte le stock sans vente Vinted (Donné, Jeté, Revendu hors Vinted, Gardé pour moi, Perdu). |
| **Coût total** | Prix d'achat + part d'essence + part d'emballage + boosts d'un article. |
| **Frais généraux** | Dépense non rattachée à un article (ex. essence d'une sortie sans achat). |
| **Boost** | Option payante Vinted pour mettre un article en avant ; coût rattaché à l'article. |
| **Référence** | Numéro court unique et automatique de l'article (`#0127`), **numéroté par utilisateur** (chacun commence à `#0001`), attribué par le serveur, jamais réutilisé. |
| **Article dormant** | Article En ligne depuis N jours ou plus sans vente ni baisse de prix. |

## 4. Statuts et transitions

### 4.1 Statuts
| Statut | Signification |
|---|---|
| **Brouillon** | Photo terrain + prix d'achat, fiche incomplète |
| **À publier** | Fiche complète, photos annonce prêtes, pas encore en ligne |
| **En ligne** | Annonce publiée sur Vinted (prix affiché obligatoire) |
| **À expédier** | Acheté sur Vinted, colis à préparer |
| **Envoyé** | Colis expédié |
| **Finalisé** | Vente validée, argent crédité |
| **Sortie du stock** | Quitte le stock sans vente Vinted (avec motif) |

### 4.2 Transitions autorisées
| Statut actuel | Peut passer à |
|---|---|
| Brouillon | À publier, En ligne |
| À publier | En ligne, Brouillon |
| En ligne | À expédier, À publier (annonce retirée temporairement) |
| À expédier | Envoyé, En ligne (annulation par l'acheteur) |
| Envoyé | Finalisé, **À publier** (retour du colis, retour partiel ou litige perdu : l'article est vérifié avant d'être remis en ligne) |
| Finalisé | *aucune* (correction par modification manuelle uniquement) |
| Tout statut sauf Finalisé | Sortie du stock |
| Sortie du stock | À publier (annulation de la sortie) |

Toute autre transition est refusée par l'application.
Le passage **En ligne** exige un **prix affiché** : l'application le demande au moment du changement de statut s'il manque.

### 4.3 Colis (ventes groupées) et statuts
- Les changements **Envoyé**, **Finalisé** et **Annulation** (retour En ligne depuis À expédier) s'appliquent **automatiquement à tous les articles du colis** en même temps.
- **Retour partiel** : depuis Envoyé, on peut retirer un ou plusieurs articles du colis ; ils repassent **À publier**. Les articles restants poursuivent normalement (montants : §6.4).
- **Retour du colis entier** : tous les articles repassent **À publier** et la vente est annulée.

### 4.4 Dates des changements
- Chaque changement de statut est enregistré dans un **historique** (statut de départ, statut d'arrivée, date).
- La date proposée est **maintenant**, **modifiable** avant validation, et **corrigeable après coup** depuis l'historique de la fiche.
- Une vente annulée n'entre plus dans aucun calcul.

## 5. Fonctionnalités

### 5.1 Saisie rapide terrain
- **Démarrer une sortie** : date (aujourd'hui par défaut), lieu (liste). La sortie en cours est mémorisée.
- Gros bouton **« + Achat »** → l'appareil photo s'ouvre → photo → clavier numérique pour le **prix** + champ **nombre d'articles** (1 par défaut) → **Valider**. 3 à 4 gestes, rien d'autre d'obligatoire.
- **Lot** : 1 photo + prix total + nombre d'articles N → N brouillons créés, partageant la même photo terrain ; le prix est réparti (§6.1). Le nombre d'articles d'un lot n'est **jamais stocké** à part : il est toujours **déduit des articles présents** dans le lot.
- **Essence** de la sortie saisie à tout moment (pendant ou après), répartie automatiquement (§6.2).
- Articles **Maison** : créés **sans sortie**, prix d'achat 0 €, lieu « Maison ».
- Achats **mis en attente sur le téléphone** si le réseau manque (§2.2).

### 5.2 Fiche article
- **Référence** automatique (`#0001`, `#0002`…), **numérotée par utilisateur**, attribuée par le serveur, **jamais réutilisée** (même après corbeille ou suppression définitive), recherche directe par numéro.
- Nom, **catégorie**, **marque**, **gamme**, **état**, taille, matière, notes.
- Lieu, sortie, lot éventuel, prix d'achat, date d'achat.
- **Photos** : photo terrain + photos annonce, ajoutées **depuis la galerie (sélection multiple) ou l'appareil photo**, réordonnables, une photo **principale**.
- **Prix affiché** + **historique complet** des changements de prix.
- **Frais de boost** (0 ou plusieurs, montant + date).
- Titre et description de l'annonce (générés par IA ou saisis), **enregistrés et modifiables**, bouton **Copier**.
- Historique des statuts avec dates.
- Indicateurs : coût total, bénéfice (réel ou provisoire), délais de vente.

### 5.3 Liste et recherche (écran principal)
- Liste des articles avec vignette, référence, nom, statut, prix affiché.
- **Filtres** : statut, catégorie, marque, gamme, lieu, sortie.
- **Recherche texte** (nom, marque, référence…).
- **Tri** : date d'achat, date de mise en ligne, prix, ancienneté dans le statut.

### 5.4 Listes de référence (Réglages)
- Catégories, marques, gammes, états, lieux : listes réutilisables avec **autocomplétion** à la saisie.
- **Renommer** une valeur → tous les articles concernés sont mis à jour.
- **Fusionner** deux valeurs (ex. « Levis » + « Levi's ») → une seule valeur, articles mis à jour.

### 5.5 IA (Gemini)
- **« Générer l'annonce »** : envoie 3 à 4 photos + les champs de la fiche ; produit :
  - un **titre** ≤ 60 caractères (ex. « Jean Levi's 501 noir W32 L32 ») ;
  - une **description** de 3 à 6 lignes, ton simple et sympa, mentionnant marque, taille, état et défauts ;
  - quelques **hashtags** à la fin ;
  - la mention **« Réf. 127 »** ajoutée automatiquement en dernière ligne.
- **« Lire l'étiquette »** : à partir d'une photo d'étiquette, pré-remplit marque, taille, catégorie, matière ; l'utilisateur vérifie avant d'enregistrer.
- **Prompts modifiables** dans les Réglages.
- **Secours** : bouton **« Copier le prompt »** (texte prêt à coller dans une IA gratuite : Claude.ai, ChatGPT, Gemini) si le quota est dépassé ou le service indisponible.
- Aucune automatisation de Vinted (pas d'API publique ; scraping contraire aux CGU).

### 5.6 Ventes
- Passage **En ligne → À expédier** : création d'une **vente** (= un colis) avec 1 ou plusieurs articles, montant crédité, date de vente.
- **Emballage** : 0,08 € par colis par défaut (modifiable dans la vente et dans les Réglages).
- Dates d'envoi et de finalisation saisies au passage aux statuts Envoyé et Finalisé (appliquées à tout le colis).
- **Retour partiel** : sélection des articles renvoyés + saisie du **nouveau montant réellement crédité** pour le colis.

### 5.7 Sortie du stock
- Motif obligatoire : **Donné, Jeté, Revendu hors Vinted, Gardé pour moi, Perdu**.
- **Revendu hors Vinted** : prix de revente + canal (Vide-grenier, Leboncoin, Main propre, Autre).

### 5.8 Alertes (affichées dans l'application uniquement)
- **Brouillon trop ancien** : Brouillon depuis **3 jours ou plus**.
- **Article dormant** : En ligne depuis **7 jours ou plus**, comptés **depuis la dernière baisse de prix** (ou la mise en ligne s'il n'y a pas eu de baisse).
- **À expédier** : tout article dans ce statut.
- Délais modifiables dans les Réglages. Affichage : bandeau / pastilles sur l'écran d'accueil.

### 5.9 Tableau de bord
- **Chiffre d'affaires**, **bénéfice réalisé** et **trésorerie** du mois / de l'année + graphique mensuel (§6.6).
- **Valeur du stock** au **coût total** et au **prix affiché**, nombre d'articles par statut.
- **Rentabilité par sortie et par lieu** : **bénéfice réalisé** + **bénéfice provisoire** (articles encore en stock) + nombre d'articles restants. Les articles Maison sont affichés à part, hors classement.
- **Analyse par catégorie / marque / gamme** : **marge moyenne en € et en %**, **délai moyen de vente** (mise en ligne → vente **et** achat → vente).

### 5.10 Photos : stockage
- Pleine qualité tant que l'article est actif.
- Au passage en **Finalisé** ou en **Sortie du stock** : on conserve uniquement la **photo principale** et la **photo terrain**, **réduites** (~1600 px) ; les autres sont supprimées.
- **Photo terrain partagée** (lot) : elle n'est réduite que lorsque **tous** les articles qui l'utilisent sont Finalisés ou Sortis du stock, et n'est supprimée que lorsque **plus aucun** article ne l'utilise.

### 5.11 Suppression
- Supprimer un article (erreur, doublon) → **corbeille 30 jours**, restaurable ; ensuite suppression définitive avec ses photos propres (la photo terrain partagée suit la règle §5.10).
- Un article supprimé n'apparaît dans aucun calcul ; les répartitions de son lot et de sa sortie sont recalculées (§6.1, §6.2).

### 5.12 Sauvegarde
- Sauvegarde automatique **quotidienne** (base + photos).
- **Copie hors serveur**, conservation **30 jours**, **restauration testée une fois** et documentée. Destination à choisir dans l'issue #2.

## 6. Règles de calcul

**Règle d'arrondi commune** : toute répartition d'un montant total entre N éléments donne des parts **arrondies au centime le plus proche** ; le **dernier** élément reçoit `total − somme des autres parts`, pour que la somme soit toujours exactement égale au total.

**Recalcul** : toutes les répartitions (lot, essence, emballage, prix vendu) sont **calculées à partir des données**, jamais figées. Ajouter un article à une ancienne sortie peut donc modifier le bénéfice des mois passés : c'est accepté.

### 6.1 Prix d'achat (lots)
- Article seul : prix saisi.
- Lot : prix total réparti **à parts égales** entre les articles présents dans le lot (règle d'arrondi). Le prix d'achat n'est **pas** modifié article par article.
- Si le **total du lot** est corrigé, ou si un article du lot est **supprimé**, le **total est conservé** et réparti sur les articles restants.

### 6.2 Essence
- Saisie **par sortie**, répartie **à parts égales** entre tous les articles de la sortie (règle d'arrondi).
- **Recalcul automatique** si un article est ajouté, retiré ou supprimé, ou si le montant change.
- Sortie **sans aucun article** : son essence est **comptée (par calcul, pas par enregistrement)** comme frais général du mois de la sortie. Dès qu'un article y est ajouté, elle est répartie sur les articles et ne compte plus en frais général — jamais de double comptage.
- Articles Maison : pas de sortie → essence 0 €.

### 6.3 Emballage
- **0,08 € par colis** par défaut, modifiable.
- Réparti **à parts égales** entre les articles du colis (règle d'arrondi).
- Articles en Sortie du stock : pas d'emballage.

### 6.4 Prix vendu (ventes groupées et retours partiels)
- Vente simple : prix vendu = montant crédité.
- Vente groupée : montant crédité réparti **au prorata des prix affichés** au moment de la vente (règle d'arrondi).
- **Retour partiel** : l'utilisateur saisit le **nouveau montant crédité** pour le colis ; il est réparti au prorata entre les **articles restants**. L'**emballage** (déjà dépensé) est **entièrement porté par les articles restants**. Les articles renvoyés n'ont plus ni prix vendu ni part d'emballage.

### 6.5 Bénéfice d'un article
```
Coût total = Prix d'achat + Part d'essence + Part d'emballage + Boosts
Bénéfice   = Prix vendu − Coût total                       (Finalisé)
           = Prix de revente − Coût total                  (Revendu hors Vinted)
           = − Coût total                                  (Donné, Jeté, Gardé pour moi, Perdu : perte)
           = − Coût total  (provisoire, affiché comme tel) (tout autre statut)
```

### 6.6 Indicateurs
| Indicateur | Calcul |
|---|---|
| **Chiffre d'affaires** (mois) | Σ prix vendus des articles **finalisés** dans le mois (date de finalisation) + Σ prix de revente hors Vinted (date de sortie du stock) |
| **Bénéfice réalisé** (mois) | Σ bénéfices des articles **finalisés** ou **sortis du stock** dans le mois + (− frais généraux du mois) |
| **Trésorerie** (mois) | + montants crédités (date de finalisation) + reventes hors Vinted (date de sortie du stock) − achats (date d'achat) − essence (date de sortie) − emballages (date d'envoi) − boosts (date du boost) − frais généraux |
| **Valeur du stock** | Σ coûts totaux des articles ni Finalisés ni Sortis du stock (et Σ de leurs prix affichés) |
| **Marge moyenne** | Moyenne des bénéfices des articles Finalisés, en **€** ; et en **%** = Σ bénéfices / Σ coûts totaux. Si Σ coûts totaux = 0 € (ex. uniquement des articles Maison sans emballage), le taux affiche **« — »** |
| **Délai de vente** | Moyenne en jours de (date de vente − date de mise en ligne) **et** de (date de vente − date d'achat), articles Finalisés |
| **Rentabilité d'une sortie / d'un lieu** | **Réalisé** = Σ bénéfices des articles Finalisés ou Sortis du stock ; **Provisoire** = Réalisé − Σ coûts totaux des articles encore en stock |

## 7. Modèle de données

Toutes les entités (sauf Utilisateur) portent un **utilisateur** propriétaire (§2.1).

| Entité | Champs principaux |
|---|---|
| **Utilisateur** | identifiant, mot de passe (haché), dernier_numero_reference |
| **Lieu** | nom, est_maison |
| **Categorie / Marque / Gamme / Etat** | nom (unique par utilisateur) |
| **Sortie** | id (UUID généré sur le téléphone), date, lieu, montant_essence, notes |
| **LotAchat** | sortie, prix_total *(le nombre d'articles est déduit, jamais stocké)* |
| **Article** | id (UUID généré sur le téléphone), reference (séquence **par utilisateur**, attribuée par le serveur, jamais réutilisée), nom, categorie, marque, gamme, etat, taille, matiere, notes, lieu, sortie (facultatif), lot (facultatif), prix_achat (saisi si hors lot), date_achat, statut, prix_affiche_actuel, titre_annonce, description_annonce, motif_sortie, canal_revente, prix_revente, date_sortie_stock, supprime_le (corbeille) |
| **Photo** | type (terrain / annonce), fichier, est_reduite ; liée à un ou plusieurs articles (photo terrain partagée d'un lot) ; ordre et est_principale par article |
| **HistoriqueStatut** | article, de, vers, date |
| **HistoriquePrix** | article, prix, date |
| **Boost** | article, montant, date |
| **Vente** (= colis) | montant_credite, emballage, date_vente, date_envoi, date_finalisation, annulee |
| **VenteArticle** | vente, article, prix_affiche_au_moment, retourne (oui/non) |
| **FraisGeneral** | date, montant, libellé *(frais saisis à la main ; l'essence des sorties vides est calculée, pas stockée ici)* |
| **Reglages** | emballage_defaut, delai_brouillon, delai_dormant, prompt_annonce, prompt_etiquette |

Les parts calculées (prix d'achat d'un lot, essence, emballage, prix vendu) ne sont **pas stockées** : elles sont recalculées à partir de ces données (ou mises en cache de façon transparente).

## 8. Critères d'acceptation

**Saisie terrain**
- Étant donné une sortie en cours, quand je fais « + Achat », photo, prix 2 et Valider, alors un article Brouillon à 2 € est créé, rattaché à la sortie et à son lieu.
- Étant donné une sortie en cours, quand je saisis un lot de 15 € pour 4 articles, alors 4 brouillons à 3,75 € partageant la même photo sont créés.
- Étant donné une sortie avec 4 articles et 2 € d'essence, quand j'ajoute un 5e article, alors chaque article porte 0,40 € d'essence.
- Étant donné aucun réseau, quand je valide un achat, alors il est conservé sur le téléphone, le compteur « en attente d'envoi » augmente, et l'achat est envoyé automatiquement au retour du réseau.

**Statuts et colis**
- Étant donné un article À expédier, quand l'acheteur annule, alors je peux le repasser En ligne et la vente est annulée.
- Étant donné un article Finalisé, alors aucune transition de statut n'est proposée.
- Étant donné un article Brouillon sans prix affiché, quand je le passe En ligne, alors l'application me demande le prix affiché avant d'accepter.
- Étant donné un colis de 2 articles À expédier, quand je le marque Envoyé, alors les 2 articles passent Envoyé avec la même date.
- Étant donné un colis de 2 articles Envoyé, quand l'acheteur renvoie l'un des deux, alors cet article repasse À publier et je saisis le nouveau montant crédité pour l'autre.
- Étant donné un changement de statut, quand je modifie la date proposée, alors la date saisie est enregistrée dans l'historique.

**Ventes et calculs**
- Étant donné deux articles affichés 9 € et 6 € vendus ensemble pour 12 €, alors leurs prix vendus sont 7,20 € et 4,80 € et l'emballage 0,04 € chacun.
- Étant donné un article finalisé le 04/10 et vendu le 30/09, alors il compte dans le CA d'octobre.
- Tous les cas de l'annexe §11 donnent le résultat attendu (tests automatiques).

**Liste, référence, IA**
- Étant donné l'article #0127, quand je tape « 127 » dans la recherche, alors sa fiche est proposée en premier.
- Étant donné l'article #0127 supprimé définitivement, quand je crée un nouvel article, alors il ne reçoit jamais le numéro 127.
- Étant donné une description générée, alors elle se termine par « Réf. 127 » et reste modifiable.
- Étant donné Gemini indisponible, quand je clique « Générer l'annonce », alors un message d'erreur clair apparaît et le bouton « Copier le prompt » est proposé.
- Étant donné une photo d'étiquette, quand je clique « Lire l'étiquette », alors marque / taille / catégorie / matière sont proposées sans être enregistrées tant que je n'ai pas validé.

**Référentiels, alertes, photos, corbeille**
- Étant donné les marques « Levis » et « Levi's », quand je les fusionne, alors tous les articles portent la marque conservée.
- Étant donné un article En ligne le 01/10 avec une baisse de prix le 05/10, alors l'alerte « dormant » apparaît le 12/10.
- Étant donné un lot de 4 articles partageant une photo terrain, quand j'en supprime définitivement un, alors la photo terrain reste visible sur les 3 autres.
- Étant donné un article supprimé, alors il est restaurable pendant 30 jours et exclu de tous les calculs.

**Compte**
- Il n'existe aucune page d'inscription ; le compte est créé à l'installation et le mot de passe est modifiable dans les Réglages.

## 9. Découpage en lots livrables

Chaque lot est testable avant de passer au suivant.

0. **Mise en place** : dépôt, Docker Compose (application + PostgreSQL), premier test du module de calcul, CLAUDE.md, `.claude/`, README, CHANGELOG (§12.1).
1. **Socle** *(testé sur PC)* : compte créé à l'installation, connexion, fiche article, référentiels, statuts et transitions, liste simple.
   → **Avant le lot 2** : HTTPS local pour le téléphone (issue #3).
2. **Saisie terrain** : sorties, « + Achat », lots, photos terrain, essence, mise en attente des achats hors réseau.
3. **Ventes et calculs** : ventes simples et groupées, retours (partiels), emballage, boosts, sorties du stock, bénéfice, historique des prix, tests de l'annexe.
4. **Liste et recherche** : filtres, recherche, tri, référence, fusion/renommage des référentiels, corbeille.
5. **Tableau de bord** : CA, bénéfice réalisé, trésorerie, stock, rentabilité par sortie/lieu, analyse par catégorie/marque.
6. **IA** : génération d'annonce, lecture d'étiquette, prompts modifiables, secours « Copier le prompt ».
7. **Alertes et sauvegarde** : alertes, réduction des photos (Finalisé / Sortie du stock), sauvegarde automatique.

## 10. Hors périmètre

### Exclus (non prévus)
- Aucune possibilité d'**import** de données (départ de zéro).
- Pas d'**export** de données.
- Pas de **mode d'envoi**.
- Pas de **pseudo acheteur**.
- Pas d'**alerte seuil fiscal** (DAC7).
- Pas de **suggestion de prix** basée sur l'historique.
- Pas de **notifications** sur le téléphone (alertes dans l'appli uniquement).
- Pas de **page d'inscription** ni de « mot de passe oublié » par e-mail.
- Pas de **croquis d'écrans** dans ce document.

### Reportés à plus tard
- Emplacement de rangement / QR codes → [issue #1](https://github.com/Plossec/Vinted-Helper/issues/1).
- Déploiement OVH (offre, domaine, destination de la sauvegarde hors serveur) → [issue #2](https://github.com/Plossec/Vinted-Helper/issues/2).
- HTTPS pour les tests locaux sur téléphone (avant le lot 2) → [issue #3](https://github.com/Plossec/Vinted-Helper/issues/3).
- Ouverture au grand public (multi-utilisateurs) → [issue #4](https://github.com/Plossec/Vinted-Helper/issues/4).

## 11. Annexe — Cas chiffrés (tests automatiques)

Chaque cas devient un test automatique.

| # | Situation | Résultat attendu |
|---|---|---|
| 1 | Lot de 3 articles pour 10 € | Prix d'achat : 3,33 / 3,33 / 3,34 |
| 2 | Lot de 3 articles pour 5 € | 1,67 / 1,67 / 1,66 |
| 3 | Total du lot n°1 corrigé à 12 € | 4,00 / 4,00 / 4,00 |
| 4 | Sortie : essence 2 €, 5 articles | 0,40 € d'essence par article |
| 5 | Sortie : essence 2 €, 3 articles | 0,67 / 0,67 / 0,66 |
| 6 | Sortie : essence 2 €, 4 articles, puis ajout d'un 5e | 0,50 € chacun, puis 0,40 € chacun |
| 7 | Sortie : essence 1,30 €, aucun achat | Frais général calculé de 1,30 € dans le mois ; bénéfice réalisé et trésorerie du mois diminués de 1,30 € |
| 8 | Article du lot n°1 (3,33 €), essence 0,40 €, vendu seul 9 €, emballage 0,08 € | Bénéfice = 9 − 3,33 − 0,40 − 0,08 = **5,19 €** |
| 9 | Vente groupée : A affiché 9 €, B affiché 6 €, crédité 12 €, colis 0,08 € | A : 7,20 € vendu, 0,04 € emballage ; B : 4,80 €, 0,04 € |
| 10 | Suite du cas 9 : A acheté 2 € + 0,40 € essence ; B acheté 1 € + 0,40 € essence | Bénéfice A = **4,76 €** ; B = **3,36 €** |
| 11 | Vente groupée : 3 articles affichés 5 € chacun, crédité 10 € | 3,33 / 3,33 / 3,34 |
| 12 | Colis de 3 articles, emballage 0,08 € | 0,03 / 0,03 / 0,02 |
| 13 | Article acheté 4 €, sans essence, boost 1,50 €, vendu 10 €, emballage 0,08 € | Bénéfice = **4,42 €** |
| 14 | Article Maison (0 €, sans sortie), vendu 5 €, emballage 0,08 € | Bénéfice = **4,92 €** ; affiché à part dans la rentabilité par lieu |
| 15 | Article acheté 3,75 € + 0,65 € essence, sorti du stock « Donné » | Bénéfice = **−4,40 €** (perte) |
| 16 | Même article, sorti du stock « Gardé pour moi » | Bénéfice = **−4,40 €** (perte) |
| 17 | Article acheté 2 € + 0,40 € essence, « Revendu hors Vinted » 5 € en vide-grenier | Bénéfice = **2,60 €** ; 5 € comptés dans le CA du mois de la sortie du stock |
| 18 | Article acheté 5 € + 0,65 € essence, toujours En ligne | Bénéfice provisoire = **−5,65 €** ; valeur du stock au coût total = **5,65 €** |
| 19 | Article vendu le 30/09, envoyé le 01/10, finalisé le 04/10 à 9 € | Compté dans le CA et le bénéfice réalisé d'**octobre** |
| 20 | Septembre : article X (acheté en août 2 € + 0,40 € essence) envoyé le 02/09 et finalisé le 04/09 à 9 €, colis 0,08 € ; sortie du 20/09 : 5 articles à 2 €, essence 1 €, aucun vendu ; article Y (acheté en août 1 €, sans essence) donné le 25/09 | CA sept. = **9,00 €** ; bénéfice réalisé sept. = 6,52 (X) + (−1,00 : Y donné) = **5,52 €** ; trésorerie sept. = 9 − 10 − 1 − 0,08 = **−2,08 €** |
| 21 | Article affiché 9 € mis en ligne le 01/10, baissé à 7 € le 05/10 | Historique des prix : 9 € (01/10), 7 € (05/10) ; alerte dormant le **12/10** |
| 22 | Article À expédier dont l'acheteur annule | Repasse En ligne ; la vente est annulée et exclue de tous les calculs |
| 23 | Lot de 3 articles pour 10 €, un article supprimé | Total conservé : 5,00 / 5,00 |
| 24 | Sortie du cas 7 (essence 1,30 €, aucun achat), puis ajout d'un article oublié | Frais général du mois : 0 € ; l'article porte 1,30 € d'essence (jamais compté deux fois) |
| 25 | Article acheté 5 € + 0,65 € essence + boost 1,50 €, En ligne affiché 12 € | Valeur du stock : **7,15 €** au coût total, **12 €** au prix affiché |
| 26 | Suite des cas 9-10 : colis Envoyé, l'acheteur renvoie B ; nouveau montant crédité 7,20 € | A : prix vendu 7,20 €, emballage 0,08 €, bénéfice = 7,20 − 2 − 0,40 − 0,08 = **4,72 €** ; B repasse **À publier**, sans prix vendu ni emballage |
| 27 | Colis de 2 articles Envoyé, retour du colis entier | Les 2 articles repassent **À publier** ; la vente est annulée |
| 28 | Article Brouillon créé le 01/10 | Alerte brouillon le **04/10** (3 jours ou plus) |
| 29 | Jeans finalisés : J1 coût total 4 € vendu 12 € ; J2 coût total 6 € vendu 9 € | Marge moyenne = (8 + 3) / 2 = **5,50 €** ; en % = 11 / 10 = **110 %** |
| 30 | Article acheté le 01/09, en ligne le 10/09, vendu le 15/09, finalisé le 19/09 | Délai mise en ligne → vente = **5 j** ; achat → vente = **14 j** |
| 31 | Sortie : 3 articles achetés 2 € chacun + 0,90 € essence ; A finalisé 9 € (emballage 0,08 €) ; B et C En ligne | Réalisé = 9 − 2 − 0,30 − 0,08 = **6,62 €** ; provisoire = 6,62 − 2,30 − 2,30 = **2,02 €** ; 2 articles restants |
| 32 | Articles Maison finalisés : 0 € d'achat, sans essence, emballage 0 €, vendus 5 € et 3 € | Marge moyenne = **4,00 €** ; taux de marge = **« — »** (aucun coût) |

## 12. Organisation du projet, outillage IA et versions

### 12.1 Lot 0 — Mise en place (avant le lot 1)
À la fin du lot 0 :
- dépôt Git sur GitHub avec l'arborescence ci-dessous ;
- Docker Compose (application + PostgreSQL) qui démarre ;
- un premier test du module de calcul qui passe (règle d'arrondi) ;
- `CLAUDE.md`, `.claude/`, `README.md` et `CHANGELOG.md` présents.

Version : **0.0.1**.

### 12.2 Arborescence
```
vinted-helper/
├─ CLAUDE.md                 instructions permanentes pour Claude
├─ README.md                 guide utilisateur (installation, usage, dépannage)
├─ CHANGELOG.md              historique des versions
├─ docs/
│  ├─ cahier-des-charges.md  ce document = source de vérité
│  └─ decisions.md           décisions prises en cours de développement
├─ .claude/
│  ├─ settings.json          permissions + formatage automatique
│  ├─ hooks/formater.mjs     formatage Prettier après chaque modification (compatible Windows)
│  ├─ rules/                 consignes chargées selon le dossier modifié
│  ├─ skills/                commandes /lot, /verifier, /version
│  └─ agents/relecteur.md    sous-agent de relecture
├─ client/                   interface React (PWA)
├─ server/                   API, base de données, module de calcul
├─ docker-compose.yml
└─ .env.example              modèle de configuration (sans secrets)
```

### 12.3 CLAUDE.md
Moins de 200 lignes, en français : le projet en 5 lignes avec renvoi vers ce document (qui fait foi ; en cas d'ambiguïté, Claude pose la question) ; les commandes ; les conventions (TypeScript strict, termes métier du glossaire, centimes, dates UTC affichées en Europe/Paris, interface en français) ; les règles non négociables (une seule fonction de répartition, parts calculées jamais stockées, clé Gemini côté serveur, aucune automatisation de Vinted, rien du §10 sans demande explicite) ; la méthode (un lot à la fois, plan validé avant de coder, tests avant le code pour les calculs, migrations appliquées jamais modifiées, README / CHANGELOG / decisions.md mis à jour à chaque fin de lot) ; le profil de l'utilisateur (intermédiaire, commandes expliquées pas à pas).

### 12.4 Architecture Claude (projet solo de 8 lots)
| Élément | Contenu |
|---|---|
| `settings.json` | Autorisé : tests, scripts npm, `docker compose`, `git status/diff/log/add/commit/branch/switch`. Interdit : lire `.env`, `git push --force`, `git reset --hard`, `rm -rf`. Formatage Prettier automatique après chaque modification de fichier. |
| `rules/calculs.md` | Chargée uniquement pour `server/src/calculs/` : règle d'arrondi, centimes, renvoi à l'annexe §11. |
| `rules/interface.md` | Chargée uniquement pour `client/` : format français, mobile d'abord, gros boutons, clair / sombre, hors réseau. |
| `/lot N` | Relit le lot N et ses critères, propose un plan, attend la validation, crée la branche `lot-N`. |
| `/verifier` | Types, lint, tests, build Docker ; résumé en français. |
| `/version` | Propose le numéro, met à jour CHANGELOG et version, crée le tag Git. |
| `agents/relecteur.md` | Sous-agent en lecture seule, lancé en fin de lot ; compare le code au cahier des charges et aux critères §8. |

Les trois skills ne se déclenchent que sur demande de l'utilisateur (`disable-model-invocation: true`).
Volontairement exclus (surdimensionnés) : serveurs MCP, équipes d'agents, workflows, plusieurs sous-agents.

### 12.5 README.md
En français, mis à jour à chaque lot : présentation et prérequis (Docker Desktop, Git) ; installation pas à pas et configuration du `.env` (identifiant, mot de passe initial, clé Gemini, **nom du modèle Gemini**, modifiable sans toucher au code car Google retire régulièrement ses anciens modèles) ; démarrage et arrêt ; accès depuis le téléphone (après l'issue #3) ; réinitialisation du mot de passe ; sauvegarde et restauration ; mise à jour ; lancement des tests ; dépannage courant.

### 12.6 Versionnage
- **Git** : `main` toujours fonctionnelle ; chaque lot a sa branche `lot-N`, fusionnée après validation.
- **SemVer** :

| Étape | Version |
|---|---|
| Lot 0 | 0.0.1 |
| Lot N validé | 0.N.0 |
| Correctifs | 0.N.1, 0.N.2… |
| Mise en ligne OVH validée | 1.0.0 |

- Source unique : `version` du `package.json` racine, affichée dans les Réglages (« Version 0.3.0 »).
- À chaque version : tag Git `vX.Y.Z` + entrée dans le CHANGELOG, en français (Ajouté / Modifié / Corrigé).
- **Base de données** : migrations Drizzle versionnées, appliquées automatiquement au démarrage ; une mise à jour ne perd jamais de données.
- **PWA** : à chaque nouvelle version, le téléphone affiche « Nouvelle version disponible — Mettre à jour ».
