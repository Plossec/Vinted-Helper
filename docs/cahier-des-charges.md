# Vinted Helper — Cahier des charges (V4)

> Statut : **en vigueur** — application en production sur le serveur OVH depuis la version 1.0.0. Les décisions de
> [`decisions/`](decisions/README.md) le précisent ; une décision qui le modifie le met à jour **dans la même PR**
> ([ADR-0098](decisions/0098-cahier-des-charges-tenu-a-jour.md)). Vue d'ensemble par thème :
> [`regles-en-vigueur.md`](regles-en-vigueur.md).

## Sommaire

1. [Contexte](#1-contexte)
2. [Utilisateur, appareils, technique](#2-utilisateur-appareils-technique)
3. [Glossaire](#3-glossaire)
4. [Statuts et transitions](#4-statuts-et-transitions)
5. [Fonctionnalités](#5-fonctionnalités)
6. [Règles de calcul](#6-règles-de-calcul)
7. [Modèle de données](#7-modèle-de-données)
8. [Critères d'acceptation](#8-critères-dacceptation)
9. [Découpage en lots livrables](#9-découpage-en-lots-livrables) (historique)
10. [Hors périmètre](#10-hors-périmètre)
11. [Annexe — Cas chiffrés (tests automatiques)](#11-annexe--cas-chiffrés-tests-automatiques)
12. [Organisation du projet](#12-organisation-du-projet)

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
- Application **privée** : jamais indexée par les moteurs de recherche (`robots.txt`, `noindex`) ; page **« Mentions
  légales »** accessible sans connexion depuis l'écran de connexion (éditeur particulier, hébergeur OVH ; ADR-0100).
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
- **Accessible** : contrastes WCAG 2.2 AA, lisible par les lecteurs d'écran (et les agents IA), contrôle automatique à
  chaque PR (ADR-0102).

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
| Publication sur Vinted | **Extension Chrome** (`outils/extension-vinted/`) dans le Chrome habituel de l'utilisateur, avec sa session Vinted (§5.14) |
| Montants | **Tous les montants sont stockés et calculés en centimes (entiers)** et convertis en euros uniquement à l'affichage |
| Tests | Tests automatiques obligatoires sur le module de calcul (annexe §11) |
| Hébergement | **VPS OVH**, en ligne depuis la 1.0.0 (ADR-0018) ; mise en production automatique à chaque fusion dans `main`, avec retour à la version précédente si elle ne répond pas (ADR-0022, ADR-0042) |

Démarche suivie : développement **en local sur PC Windows** (Docker Desktop) ; HTTPS local pour le téléphone sur le
Wi-Fi de la maison (ADR-0009, issue #3) ; mise en ligne OVH (ADR-0018, issue #2).

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
| **Sortie du stock** | Article qui quitte le stock sans vente Vinted (Donné, Jeté, Revendu hors Vinted, Gardé pour moi, Perdu, À vendre hors Vinted). |
| **Coût total** | Prix d'achat + part d'essence + part d'emballage + boosts d'un article. |
| **Frais généraux** | Dépense non rattachée à un article : essence d'une sortie sans achat (calculée) et **frais divers** saisis à la main (ex. vitrine Vinted, rouleau d'étiquettes). |
| **Boost** | Option payante Vinted pour mettre un article en avant ; coût rattaché à l'article. |
| **Référence** | Numéro court unique et automatique de l'article (`#0127`), **numéroté par utilisateur** (chacun commence à `#0001`), attribué par le serveur, jamais réutilisé. |
| **Article dormant** | Article En ligne depuis N jours ou plus sans vente ni baisse de prix. |
| **Prix vente minimum** | Prix le plus bas accepté pour un article (facultatif, jamais au-dessus du prix affiché) ; plancher des tâches automatisées (ADR-0048, ADR-0091). |
| **Bénéfice attendu** | Bénéfice d'un article vendu mais pas encore finalisé (À expédier, Envoyé) : prix vendu − coût total (§6.5, ADR-0090). |
| **Ventes en cours / théorique** | Ventes À expédier ou Envoyé ; le CA et le bénéfice **théoriques** les ajoutent au réalisé (§6.6). |
| **Extension** | Extension Chrome qui agit sur Vinted à la place de l'utilisateur : publication, tâches automatisées (§5.14). |
| **Tâche automatisée** | Action répétée par l'extension sur le compte Vinted (articles dormants, ventes finalisées…), en mode **automatique** ou **manuel** (liste à valider) (§5.15). |
| **Mode essai** | L'extension ouvre les pages Vinted sans rien modifier ; l'application n'enregistre rien. |
| **À faire** | Écran qui regroupe tout ce qui demande l'attention de l'utilisateur (§5.8). |

## 4. Statuts et transitions

### 4.1 Statuts
| Statut | Signification |
|---|---|
| **Brouillon** | Photo terrain + prix d'achat, fiche incomplète |
| **En stock** | Gardé hors vente (boîte de lunettes vide…) : compté dans le stock, sans alerte, masqué par défaut dans les filtres — ajouté le 14/10/2026 (issue #183) |
| **À publier** | Fiche complète, photos annonce prêtes, pas encore en ligne |
| **Erreur** | La publication automatique sur Vinted (extension Chrome) a échoué ; le message de l'échec est sur la fiche — ajouté le 08/10/2026 (issue #72) |
| **En ligne** | Annonce publiée sur Vinted (prix affiché obligatoire) |
| **Invendu** | Article dormant republié 3 fois sans vente par la tâche « Articles dormants » : l'annonce reste en vente, la tâche ne le touche plus, compté dans le stock — ajouté le 15/10/2026 (issue #147) |
| **À expédier** | Acheté sur Vinted, colis à préparer |
| **Envoyé** | Colis expédié |
| **À récupérer** | Retour de l'acheteur : l'article est à aller chercher (point relais…) — ajouté le 07/10/2026 (issue #52) |
| **Finalisé** | Vente validée, argent crédité |
| **Sortie du stock** | Quitte le stock sans vente Vinted (avec motif) |

### 4.2 Transitions autorisées
| Statut actuel | Peut passer à |
|---|---|
| Brouillon | À publier, En ligne, **En stock** |
| En stock | Brouillon, À publier |
| À publier | En ligne, Brouillon, **En stock** ; **Erreur** uniquement par une publication Vinted en échec (jamais à la main, jamais en mode essai) |
| Erreur | À publier (nouvelle demande « Publier sur Vinted », ou retour à la main), En ligne (annonce publiée à la main), Brouillon |
| En ligne | À expédier, À publier (annonce retirée temporairement) ; **Invendu** uniquement par la tâche « Articles dormants » (3 republications sans vente) |
| Invendu | À expédier (vendu : l'annonce est restée en ligne), En ligne (la tâche reprend, compte des republications remis à zéro), À publier |
| À expédier | Envoyé, En ligne (annulation par l'acheteur) |
| Envoyé | Finalisé, **À récupérer** (retour du colis, retour partiel ou litige perdu : l'article est à aller chercher) |
| À récupérer | À publier ou En ligne (« Récupéré » : l'article est vérifié avant d'être remis en ligne) |
| Finalisé | *aucune* (correction par modification manuelle uniquement) |
| Tout statut sauf Finalisé | Sortie du stock |
| Sortie du stock | À publier (annulation de la sortie) |

Toute autre transition est refusée par l'application.
Le passage **En ligne** exige un **prix affiché** : l'application le demande au moment du changement de statut s'il manque.
Le passage **À publier** (15/10/2026, #196) exige un **article complet** — mêmes champs que la publication Vinted
(photos d'annonce, prix affiché, titre, description, catégorie, marque, état, couleur) ; refusé sinon, avec ce qui
manque. La catégorie « Autre » est admise (publication à la main).

### 4.3 Colis (ventes groupées) et statuts
- Les changements **Envoyé**, **Finalisé** et **Annulation** (retour En ligne depuis À expédier) s'appliquent **automatiquement à tous les articles du colis** en même temps.
- **Retour partiel** : depuis Envoyé, on peut retirer un ou plusieurs articles du colis ; ils passent **À récupérer**. Les articles restants poursuivent normalement (montants : §6.4).
- **Retour du colis entier** : tous les articles passent **À récupérer** et la vente est annulée.

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
- Nom, **catégorie** \*, **marque** \*, **état** \*, gamme, taille, matière, notes (\* obligatoires à chaque enregistrement de la fiche ; seule la saisie terrain du lot 2 peut créer un brouillon sans) :
  - **Catégorie** : choix dans l'**arbre des catégories recopié de vinted.fr** (`docs/categories-vinted.md` : rayons Femmes, Hommes, Sport, Loisirs et collections, 1 001 catégories sélectionnables, « Autre » comprise pour tout le reste ; ADR-0065), fixe ; seules les catégories du dernier niveau sont sélectionnables ; recherche par mots (« jean slim »). Un article « Autre » se publie à la main sur Vinted.
  - **Marque** : liste de départ des marques courantes sur Vinted (≈ 360, dont « Sans marque »), complétée à la volée.
  - **État** : liste fixe — Neuf avec étiquette · Neuf sans étiquette · Très bon état · Bon état · Satisfaisant · Abîmé.
  - **Gamme** : texte libre, facultatif ([issue #6](https://github.com/Plossec/Vinted-Helper/issues/6)).
  - Listes déroulantes avec recherche, aussi larges que le champ, aux couleurs de l'application.
- Lieu, sortie, lot éventuel, prix d'achat, date d'achat.
- **Photos** : photo terrain + photos annonce, ajoutées **depuis la galerie (sélection multiple) ou l'appareil photo**, réordonnables, une photo **principale**, **tournables** d'un quart de tour (définitif ; ADR-0024).
- **Prix affiché** + **historique complet** des changements de prix ; **prix vente minimum** facultatif, jamais au-dessus du prix affiché (verrou dans la base ; ADR-0048, ADR-0091) ; règle de baisse de l'article pour la tâche « Articles dormants » (§5.15).
- **Section Vinted** : lien de l'annonce (saisi à la main ou enregistré par l'extension ; un article Brouillon ou À publier avec un prix affiché passe alors En ligne, ADR-0031), lien de la conversation avec l'acheteur (saisi à la vente, ADR-0026), couleurs et format du colis (pour la publication).
- **Frais de boost** (0 ou plusieurs, montant + date).
- Titre et description de l'annonce (générés par IA ou saisis), **enregistrés et modifiables**, bouton **Copier**.
- Historique des statuts avec dates.
- Indicateurs : coût total, bénéfice (réel ou provisoire), délais de vente.

### 5.3 Liste et recherche (écran principal)
- Liste des articles avec vignette, référence, nom, statut, prix affiché ; 4 **modes d'affichage** (Vignettes, Liste compacte, Mosaïque, Détaillé en tableau), mémorisés par appareil (ADR-0029) ; repère « ↗ » vers l'annonce Vinted.
- **Filtres** à choix multiples : statut, catégorie, marque, gamme, lieu, sortie (ADR-0030 ; En stock et À vendre hors Vinted masqués par défaut, ADR-0067, ADR-0083).
- **Recherche texte** (nom, marque, référence…).
- **Tri** : date d'achat, date de mise en ligne, prix, ancienneté dans le statut.

### 5.4 Listes de référence (Réglages)
- **Marques et lieux** : listes de l'utilisateur, pré-remplies, avec recherche à la saisie et ajout à la volée.
  - **Renommer** une valeur → tous les articles concernés sont mis à jour.
  - **Fusionner** deux valeurs (ex. « Levis » + « Levi's ») → une seule valeur, articles mis à jour.
  - Lieux : le lieu d'une sortie se saisit en **texte libre**, avec les lieux connus proposés ; un nom nouveau est ajouté à la liste, même saisi sans réseau (ADR-0011, issue #7).
- **Catégories et états** : listes fixes calquées sur Vinted, non modifiables dans l'application (correction dans le code).

### 5.5 IA (Gemini)
- **« Générer l'annonce »** : envoie 3 à 4 photos + les champs de la fiche ; produit :
  - un **titre** ≤ 60 caractères (ex. « Jean Levi's 501 noir W32 L32 ») ;
  - une **description** de 3 à 6 lignes, ton simple et sympa, mentionnant marque, taille, état et défauts ;
  - quelques **hashtags** à la fin ;
  - la mention **« Réf. 127 »** ajoutée automatiquement en dernière ligne.
- **« Lire l'étiquette »** : à partir d'une photo d'étiquette, pré-remplit marque, taille, catégorie, matière ; l'utilisateur vérifie avant d'enregistrer.
- **Prompts modifiables** dans les Réglages.
- **Secours** : bouton **« Copier le prompt »** (texte prêt à coller dans une IA gratuite : Claude.ai, ChatGPT, Gemini) si le quota est dépassé ou le service indisponible.
- Quota : **30 appels par heure** (annonce et étiquette), message « Réessayez dans N min » (ADR-0049) ; modèle de
  secours si le modèle principal est retiré ou surchargé (ADR-0032, ADR-0033, ADR-0088).

### 5.6 Ventes
- Passage **En ligne → À expédier** : création d'une **vente** (= un colis) avec 1 ou plusieurs articles, montant crédité, date de vente, lien facultatif de la conversation Vinted (ADR-0026).
- **Conservation** : le lien de la conversation et les commandes lues sur Vinted sont **effacés 6 mois après la
  finalisation** ; la vente et ses montants restent (ADR-0100).
- **Emballage** : 0,08 € par colis par défaut (modifiable dans la vente et dans les Réglages).
- Dates d'envoi et de finalisation saisies au passage aux statuts Envoyé et Finalisé (appliquées à tout le colis).
- **Retour partiel** : sélection des articles renvoyés + saisie du **nouveau montant réellement crédité** pour le colis.

### 5.7 Sortie du stock
- Motif obligatoire : **Donné, Jeté, Revendu hors Vinted, Gardé pour moi, Perdu, À vendre hors Vinted**.
- **Revendu hors Vinted** : prix de revente + canal (Vide-grenier, Leboncoin, Main propre, Autre).
- **À vendre hors Vinted** (14/10/2026, #180) : canal ; l'article reste compté en stock (rien de réalisé) jusqu'à sa
  revente, enregistrée ensuite comme « Revendu hors Vinted » (ou un autre motif).

### 5.8 Alertes (affichées dans l'application uniquement)
- **Brouillon trop ancien** : Brouillon depuis **3 jours ou plus**.
- **Article dormant** : En ligne depuis **7 jours ou plus**, comptés **depuis la dernière baisse de prix** (ou la mise en ligne s'il n'y a pas eu de baisse) ; une republication par la tâche « Articles dormants » relance aussi le délai (#147).
- **Invendu** (#147) : tout article dans ce statut.
- **À expédier** : tout article dans ce statut.
- **À récupérer** et **publications en erreur** : tout article dans ces statuts (ADR-0028, ADR-0037).
- Délais modifiables dans les Réglages.
- Affichage : écran **« À faire »** (1er onglet, pastille du nombre de choses à faire), classé par urgence —
  **Urgent** (publications en erreur), **À traiter** (à expédier, à récupérer, invendus, actions et ventes des tâches
  automatisées à valider ou à rattacher), **Pour info** (dormants, brouillons anciens, montants corrigés par Vinted,
  fermés par « Vu ») ; chaque ligne a ses boutons et mène à la fiche (ADR-0079, ADR-0089). L'écran d'ouverture de
  l'application (Terrain par défaut, ou À faire) se choisit dans les Réglages, par appareil.

### 5.9 Tableau de bord
- **Chiffre d'affaires**, **bénéfice réalisé** et **trésorerie** du mois / de l'année + graphique mensuel (§6.6).
  Affichage revu (issue #88, ADR-0041, ADR-0051) : tuiles CA et bénéfice avec le libellé « *Mois Année* réalisé »
  au-dessus du gros chiffre et la ligne « *Mois Année* théorique : Y € » dessous (le théorique ajoute les ventes
  À expédier et Envoyé, issue #85) ; tuile trésorerie
  avec son **calcul** (encaissé − achats − essence − emballages − boosts − frais divers) ; frais généraux du mois avec
  explication en info-bulle et bouton « Ajouter des frais divers » ; graphique en **barres empilées** réalisé +
  théorique (trésorerie : + crédits attendus des ventes en cours) ; seules les **années d'activité** sont proposées.
- **Valeur du stock** au **coût total** et au **prix affiché** ; par statut : coût total, prix affiché et nombre
  d'articles (issue #88).
- **Rentabilité par sortie et par lieu** : **bénéfice réalisé** + **bénéfice provisoire** (articles encore en stock) + nombre d'articles restants. Les articles Maison sont affichés à part, hors classement.
- **Analyse par catégorie / marque / gamme** : **marge moyenne en € et en %**, **délai moyen de vente** (mise en ligne → vente **et** achat → vente).

### 5.10 Photos : stockage
- Enregistrées en **JPEG sans métadonnées** (position GPS, modèle du téléphone…), orientation de l'appareil photo
  appliquée (ADR-0100) ; pleine taille tant que l'article est actif.
- Au passage en **Finalisé** ou en **Sortie du stock** : on conserve uniquement la **photo principale** et la **photo terrain**, **réduites** (~1600 px) ; les autres sont supprimées.
- **Photo terrain partagée** (lot) : elle n'est réduite que lorsque **tous** les articles qui l'utilisent sont Finalisés ou Sortis du stock, et n'est supprimée que lorsque **plus aucun** article ne l'utilise.

### 5.11 Suppression
- Supprimer un article (erreur, doublon) → **corbeille 30 jours**, restaurable ; ensuite suppression définitive avec ses photos propres (la photo terrain partagée suit la règle §5.10).
- Un article supprimé n'apparaît dans aucun calcul ; les répartitions de son lot et de sa sortie sont recalculées (§6.1, §6.2).

### 5.12 Frais divers
- Écran **« Frais divers »** (accessible depuis le menu) : liste des frais saisis à la main, ajout / modification / suppression.
- Champs : **date**, **montant**, **libellé** (ex. « Vitrine Vinted », « Rouleau d'étiquettes »).
- Comptés comme **frais généraux** du mois de leur date (bénéfice réalisé et trésorerie, §6.6).

### 5.13 Sauvegarde
- Sauvegarde automatique **quotidienne** (base + photos) sur le serveur : base gardée **30 jours** ; photos **7 jours**,
  plus l'archive du dimanche gardée 30 jours (ADR-0018).
- **Copie hors serveur** : rapatriement automatique chaque jour sur le PC de l'utilisateur (ADR-0019) ;
  **restauration testée une fois** et documentée (`docs/guides/sauvegarde-restauration.md`, `docs/guides/mise-en-ligne-ovh.md`).
- Une **sauvegarde de la base** précède chaque mise à jour du serveur (ADR-0042).

### 5.14 Publication sur Vinted (extension Chrome)
- Pas d'API publique Vinted. **Décision de l'utilisateur** (ADR-0034, ADR-0036) : une **extension Chrome**
  (`outils/extension-vinted/`), dans le Chrome habituel et avec la session Vinted de l'utilisateur (aucun mot de passe
  Vinted stocké), remplit le formulaire « Vendre un article » des articles **À publier** mis dans la file (« Publier
  sur Vinted »). Risques acceptés par l'utilisateur : CGU de Vinted, suspension possible du compte. La limite
  « aucune autre automatisation de Vinted » a été retirée le 14/10/2026 (ADR-0068, ADR-0082).
- **Une annonce à la fois**, 10 minutes entre deux annonces, 5 secondes entre deux étapes, passage toutes les
  5 minutes, seulement quand Chrome est ouvert (ADR-0071). Vérification (captcha), blocage ou déconnexion →
  **pause**, reprise à la main uniquement ; aucun contournement.
- **Mode essai** : le formulaire est rempli sans être envoyé.
- Réussite : l'article passe **En ligne** avec le lien de l'annonce. Échec d'une vraie publication : statut
  **Erreur** avec le message (§4, ADR-0037, ADR-0052).
- Catégorie « Autre » refusée par la file (publication à la main). Diagnostic et relevés de l'extension pour la
  recaler quand Vinted change ses pages (`docs/guides/publication-vinted.md`).

### 5.15 Tâches automatisées
- Exécutées par l'**extension** pendant ses passages, une action à la fois sur Vinted, dans la **plage horaire** de
  chaque tâche (**8 h à 22 h** par défaut) ; chaque tâche est **désactivée** par défaut, en mode **manuel** par défaut
  (liste à valider dans « À faire ») ou **automatique**, avec fréquence, pauses et plafonds réglables dans des limites
  (ADR-0072, ADR-0078). Chaque tâche a son **mode essai** (coché par défaut) : l'extension ouvre les pages sans rien
  modifier (ADR-0105).
  **« Lancer maintenant »** (Réglages et « À faire ») : chaque tâche à la demande, à toute heure, même désactivée et
  sans plafond du jour ; l'extension s'en charge à son prochain passage (ADR-0104).
- **Réglages → Tâches automatiques** : une **carte repliable par tâche** montrant si elle est activée, en essai ou en
  réel, son dernier et son prochain passage et ses actions du jour ; pauses et plafonds dans « Réglages avancés »
  (ADR-0105).
- **Journal de toutes les tâches** (une ligne par action, une par lecture des ventes) : filtres par tâche, état et
  jour, raison des erreurs ; sous chaque tâche, en entier dans Réglages et dans « Publication Vinted » ; lignes
  effacées après **3 mois** (ADR-0105).

| Tâche | Ce qu'elle fait | État |
|---|---|---|
| **Articles dormants** (#147) | Baisse le prix d'un article dormant (règle du compte ou de l'article, arrondie vers le haut au 0,50 €, jamais sous le prix vente minimum), sinon le republie ; après 3 republications sans vente → **Invendu** (ADR-0073, ADR-0094, ADR-0095) | réalisée, en mode essai jusqu'au calibrage |
| **Ventes finalisées** (#148) | Lit le **Porte-monnaie** de Vinted ; une commande terminée finalise le colis Envoyé correspondant à la date Vinted ; montant différent → le montant Vinted remplace l'ancien, avec un signalement ; commande non retrouvée → « à rattacher » (ADR-0074, ADR-0096, ADR-0097) | application réalisée, lecture par l'extension à calibrer |
| **Négociation favoris** (#149) | Une offre réduite unique aux personnes qui ont mis l'article en favori (ADR-0075) | décidée |
| **Validée prix proposé** (#150) | Répond aux offres reçues et crée la vente quand une offre est acceptée et payée (ADR-0076) | décidée |
| **Bon de livraison** (#151) | Récupère bordereau, code de dépôt, suivi et date limite d'envoi des articles À expédier (ADR-0077) | décidée |

## 6. Règles de calcul

**Règle d'arrondi commune** : toute répartition d'un montant total entre N éléments donne des parts **arrondies au centime inférieur** ; le **dernier** élément reçoit **tout le reste** (`total − somme des autres parts`). La somme est toujours exactement égale au total et **aucune part n'est jamais négative** (ex. 5 centimes sur 8 articles → 0 × 7 puis 5). *(Décision du 05/10/2026 : remplace l'arrondi au plus proche, qui pouvait donner une part négative.)*

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
Article vendu pas encore finalisé (À expédier, Envoyé) : **bénéfice attendu** = Prix vendu − Coût total, affiché à côté
du bénéfice provisoire (un seul terme partout, #193).

### 6.6 Indicateurs
| Indicateur | Calcul |
|---|---|
| **Chiffre d'affaires** (mois) | Σ prix vendus des articles **finalisés** dans le mois (date de finalisation) + Σ prix de revente hors Vinted (date de sortie du stock) |
| **Bénéfice réalisé** (mois) | Σ bénéfices des articles **finalisés** ou **sortis du stock** dans le mois + (− frais généraux du mois) |
| **Ventes en cours** (mois) | Articles **À expédier** ou **Envoyé** d'une vente non annulée, non renvoyés, rattachés à la **date de vente** : Σ prix vendus (CA en cours) et Σ (prix vendu − coût total) (**bénéfice attendu**) — issue #85, terme unifié le 15/10/2026 (#193) |
| **CA / bénéfice théoriques** (mois) | CA + CA en cours ; bénéfice réalisé (frais généraux déduits) + bénéfice attendu |
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
| **Marque** | nom (unique par utilisateur, sans tenir compte des majuscules) |
| *Catégories, états* | *listes fixes dans le code (`server/src/catalogue/`), pas de table* |
| **Sortie** | id (UUID généré sur le téléphone), date, lieu, montant_essence, notes |
| **LotAchat** | sortie, prix_total *(le nombre d'articles est déduit, jamais stocké)* |
| **Article** | id (UUID généré sur le téléphone), reference (séquence **par utilisateur**, attribuée par le serveur, jamais réutilisée), nom, categorie (code de l'arbre), marque, etat (code fixe), gamme (texte libre), taille, matiere, notes, lieu, sortie (facultatif), lot (facultatif), prix_achat (saisi si hors lot), date_achat, statut, prix_affiche_actuel, prix_vente_minimum, baisse_regle et baisse_valeur (tâche « Articles dormants »), titre_annonce, description_annonce, couleurs, format_colis, url_vinted (lien de l'annonce), url_conversation, motif_sortie, canal_revente, prix_revente, date_sortie_stock, supprime_le (corbeille) |
| **Photo** | type (terrain / annonce), fichier, est_reduite ; liée à un ou plusieurs articles (photo terrain partagée d'un lot) ; ordre et est_principale par article |
| **HistoriqueStatut** | article, de, vers, date |
| **HistoriquePrix** | article, prix, date |
| **Boost** | article, montant, date |
| **Vente** (= colis) | montant_credite, emballage, date_vente, date_envoi, date_finalisation, annulee |
| **VenteArticle** | vente, article, prix_affiche_au_moment, retourne (oui/non) |
| **FraisGeneral** | date, montant, libellé *(frais divers saisis à la main via l'écran §5.12 ; l'essence des sorties vides est calculée, pas stockée ici)* |
| **Reglages** | emballage_defaut, delai_brouillon, delai_dormant, prompt_annonce, prompt_etiquette, format_colis_defaut, jeton de l'extension (empreinte), réglages des tâches automatisées (plage horaire, mode essai ; par tâche : activée, mode, fréquence, pauses, plafonds) |
| **Session** | empreinte du jeton de connexion, date d'expiration |
| **PublicationVinted** | article, état de la publication dans la file, essai, message, dates |
| **ActionVinted** | article, type (baisse de prix ou republication), état, prix avant / après, essai, message, lien |
| **CommandeVinted** | identifiant de la commande Vinted, annonces, date de fin, montant, état (à valider, à rattacher, appliquée…), vente rattachée, montant avant correction |
| **SignalementVu** | type d'alerte, article, date de départ de l'alerte, date du « Vu » |

Détail à jour des tables : [`architecture.md`](architecture.md) §3 et `server/src/base/schema.ts`.

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
- Étant donné un colis de 2 articles Envoyé, quand l'acheteur renvoie l'un des deux, alors cet article passe À récupérer et je saisis le nouveau montant crédité pour l'autre.
- Étant donné un changement de statut, quand je modifie la date proposée, alors la date saisie est enregistrée dans l'historique.

**Ventes et calculs**
- Étant donné deux articles affichés 9 € et 6 € vendus ensemble pour 12 €, alors leurs prix vendus sont 7,20 € et 4,80 € et l'emballage 0,04 € chacun.
- Étant donné un article finalisé le 04/10 et vendu le 30/09, alors il compte dans le CA d'octobre.
- Étant donné un frais divers de 3 € saisi le 10/10, alors le bénéfice réalisé et la trésorerie d'octobre diminuent de 3 €.
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

*Historique* : les lots 0 à 7 sont réalisés (V1). Depuis le 08/10/2026, chaque évolution suit une issue GitHub
réalisée par une PR, avec sa propre version (ADR-0039, ADR-0045).

Chaque lot est testable avant de passer au suivant.

0. **Mise en place** : dépôt, Docker Compose (application + PostgreSQL), premier test du module de calcul, CLAUDE.md, `.claude/`, README, CHANGELOG (§12.1).
1. **Socle** *(testé sur PC)* : compte créé à l'installation, connexion, fiche article, référentiels, statuts et transitions, liste simple.
   → **Avant le lot 2** : HTTPS local pour le téléphone (issue #3).
2. **Saisie terrain** : sorties, « + Achat », lots, photos terrain, essence, mise en attente des achats hors réseau.
3. **Ventes et calculs** : ventes simples et groupées, retours (partiels), emballage, boosts, sorties du stock, frais divers, bénéfice, historique des prix, tests de l'annexe.
4. **Liste et recherche** : filtres, recherche, tri, référence, fusion/renommage des référentiels, corbeille.
5. **Tableau de bord** : CA, bénéfice réalisé, trésorerie, stock, rentabilité par sortie/lieu, analyse par catégorie/marque.
6. **IA** : génération d'annonce, lecture d'étiquette, prompts modifiables, secours « Copier le prompt ».
7. **Alertes et sauvegarde** : alertes, réduction des photos (Finalisé / Sortie du stock), sauvegarde automatique.

## 10. Hors périmètre

### Exclus (non prévus)
- Aucune possibilité d'**import** de données dans l'application. Seule exception : l'import unique, par une commande du
  serveur, du tableur « compte 2026 - Vinted » de l'utilisateur (ADR-0023).
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
- Ouverture au grand public (multi-utilisateurs) → [issue #4](https://github.com/Plossec/Vinted-Helper/issues/4).

Reports déjà réalisés : déploiement OVH ([issue #2](https://github.com/Plossec/Vinted-Helper/issues/2), ADR-0018,
ADR-0019) et HTTPS local pour le téléphone ([issue #3](https://github.com/Plossec/Vinted-Helper/issues/3), ADR-0009).

## 11. Annexe — Cas chiffrés (tests automatiques)

Chaque cas devient un test automatique.

| # | Situation | Résultat attendu |
|---|---|---|
| 1 | Lot de 3 articles pour 10 € | Prix d'achat : 3,33 / 3,33 / 3,34 |
| 2 | Lot de 3 articles pour 5 € | 1,66 / 1,66 / 1,68 |
| 3 | Total du lot n°1 corrigé à 12 € | 4,00 / 4,00 / 4,00 |
| 4 | Sortie : essence 2 €, 5 articles | 0,40 € d'essence par article |
| 5 | Sortie : essence 2 €, 3 articles | 0,66 / 0,66 / 0,68 |
| 6 | Sortie : essence 2 €, 4 articles, puis ajout d'un 5e | 0,50 € chacun, puis 0,40 € chacun |
| 7 | Sortie : essence 1,30 €, aucun achat | Frais général calculé de 1,30 € dans le mois ; bénéfice réalisé et trésorerie du mois diminués de 1,30 € |
| 8 | Article du lot n°1 (3,33 €), essence 0,40 €, vendu seul 9 €, emballage 0,08 € | Bénéfice = 9 − 3,33 − 0,40 − 0,08 = **5,19 €** |
| 9 | Vente groupée : A affiché 9 €, B affiché 6 €, crédité 12 €, colis 0,08 € | A : 7,20 € vendu, 0,04 € emballage ; B : 4,80 €, 0,04 € |
| 10 | Suite du cas 9 : A acheté 2 € + 0,40 € essence ; B acheté 1 € + 0,40 € essence | Bénéfice A = **4,76 €** ; B = **3,36 €** |
| 11 | Vente groupée : 3 articles affichés 5 € chacun, crédité 10 € | 3,33 / 3,33 / 3,34 |
| 12 | Colis de 3 articles, emballage 0,08 € | 0,02 / 0,02 / 0,04 |
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
| 26 | Suite des cas 9-10 : colis Envoyé, l'acheteur renvoie B ; nouveau montant crédité 7,20 € | A : prix vendu 7,20 €, emballage 0,08 €, bénéfice = 7,20 − 2 − 0,40 − 0,08 = **4,72 €** ; B passe **À récupérer** (modifié le 07/10/2026, issue #52 ; avant : « repasse À publier »), sans prix vendu ni emballage |
| 27 | Colis de 2 articles Envoyé, retour du colis entier | Les 2 articles passent **À récupérer** (modifié le 07/10/2026, issue #52 ; avant : « repassent À publier ») ; la vente est annulée |
| 28 | Article Brouillon créé le 01/10 | Alerte brouillon le **04/10** (3 jours ou plus) |
| 29 | Jeans finalisés : J1 coût total 4 € vendu 12 € ; J2 coût total 6 € vendu 9 € | Marge moyenne = (8 + 3) / 2 = **5,50 €** ; en % = 11 / 10 = **110 %** |
| 30 | Article acheté le 01/09, en ligne le 10/09, vendu le 15/09, finalisé le 19/09 | Délai mise en ligne → vente = **5 j** ; achat → vente = **14 j** |
| 31 | Sortie : 3 articles achetés 2 € chacun + 0,90 € essence ; A finalisé 9 € (emballage 0,08 €) ; B et C En ligne | Réalisé = 9 − 2 − 0,30 − 0,08 = **6,62 €** ; provisoire = 6,62 − 2,30 − 2,30 = **2,02 €** ; 2 articles restants |
| 32 | Articles Maison finalisés : 0 € d'achat, sans essence, emballage 0 €, vendus 5 € et 3 € | Marge moyenne = **4,00 €** ; taux de marge = **« — »** (aucun coût) |
| 33 | Frais divers « Rouleau d'étiquettes » 3 € le 10/10 ; en octobre, un article finalisé avec 6,52 € de bénéfice et 9 € crédités, aucun autre mouvement | Bénéfice réalisé oct. = 6,52 + (−3,00) = **3,52 €** ; trésorerie oct. = 9 − 3 = **6,00 €** |
| 34 | Article acheté 2 €, vendu le 28/09 à 12,50 € (emballage 0,08 €), envoyé le 01/10, pas encore finalisé (ajouté le 08/10/2026, issue #85) | En cours **septembre** : CA **12,50 €**, bénéfice 12,50 − 2 − 0,08 = **10,42 €** ; rien en octobre ; CA et bénéfice réalisés de septembre inchangés (**0 €**) |
| 35 | Colis A + B (prix affichés 10 € et 5 €) vendu le 02/10 15 € (emballage 0,10 €), Envoyé ; B renvoyé, nouveau montant 9 € ; A acheté 3 €, B 2 € ; un autre article C finalisé en octobre (bénéfice 4 €) ; frais divers 1 € en octobre (issue #85) | En cours oct. : A seul, CA **9,00 €**, bénéfice 9 − 3 − 0,10 = **5,90 €** ; théorique oct. : bénéfice = (4 − 1) + 5,90 = **8,90 €** |

## 12. Organisation du projet

L'organisation d'origine (lot 0, arborescence, outillage Claude prévu, versions 0.N.0) est dans l'historique Git de
ce document. Ce qui est en vigueur :

| Sujet | Où |
|---|---|
| Consignes de Claude, commandes, garde-fous | [`CLAUDE.md`](../CLAUDE.md) ; `.claude/` : `settings.json` (interdictions appliquées par Claude Code), `rules/` (consignes chargées selon les fichiers touchés), `skills/` (`/lot`, `/verifier`, `/version`, `/calibrer-vinted`), `agents/` (`relecteur`, `analyste-releve`), `hooks/` |
| Où écrire quoi (décision, architecture, guide, consigne) | [`README.md`](README.md) de `docs/` |
| Méthode | Une issue GitHub → une branche → une PR `#N — …`, fusionnée quand la CI est verte ; une fusion dans `main` part en production (ADR-0039, ADR-0022, ADR-0081) |
| Versions | Une version par PR (SemVer, règle 1.x), source unique `version` du `package.json` racine, affichée dans les Réglages ; entrée dans le `CHANGELOG.md` en français (Ajouté / Modifié / Corrigé) ; tag `vX.Y.Z` créé par GitHub après la mise en production (ADR-0045) |
| Base de données | Migrations Drizzle versionnées, appliquées automatiquement au démarrage ; une mise à jour ne perd jamais de données (`.claude/rules/migrations.md`) |
| Application installée (PWA) | À chaque nouvelle version, le téléphone affiche « Nouvelle version disponible — Mettre à jour » |
| Sécurité du dépôt | Deux niveaux : `CLAUDE.md` contient les **consignes** (Claude les suit) ; `.claude/settings.json` et ESLint les **interdictions** (appliquées quoi que Claude décide) ; le vrai filet reste les commits fréquents, la sauvegarde quotidienne et la sauvegarde avant chaque mise à jour (ADR-0046) |
