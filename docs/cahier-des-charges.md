# Vinted Helper — Cahier des charges (V2)

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

---

## 1. Contexte

Revente amateur sur Vinted d'articles achetés à bas prix (vide-greniers, ressourceries, bourses aux vêtements, lots Leboncoin) ou issus de la maison.
Rythme constaté : ~125 articles achetés en 2,5 mois, ~60 vendus, sorties le week-end.
*Ce rythme est donné à titre d'exemple : il est évolutif et variable, l'application ne doit pas en dépendre.*

Objectif : remplacer le tableur par une application web/mobile simple pour gérer **stock, mises en vente, ventes et rentabilité**, avec une saisie très rapide sur le terrain.

Statut administratif de l'utilisateur : **particulier** (aucun registre comptable requis).

## 2. Utilisateur, appareils, technique

### 2.1 Utilisateur et appareils
- **Un seul utilisateur**, accès par identifiant + mot de passe (session mémorisée).
- **Android** (terrain, photos) et **PC Windows** (compléter les fiches, statistiques).
- Application web installable (**PWA**) : un seul code, icône sur l'écran d'accueil Android, pas de Play Store.
- Réseau 4G disponible en vide-grenier → pas de mode hors ligne complet, mais **file d'attente des envois** : un envoi de photo échoué est conservé et renvoyé automatiquement.
- Interface **claire / sombre automatique**, sobre, gros boutons utilisables à une main.

### 2.2 Format français (obligatoire partout)
- Montants : `3,33 €` (virgule décimale, symbole après). Saisie acceptée avec virgule **ou** point.
- Dates : `JJ/MM/AAAA`. Fuseau **Europe/Paris** (heure d'été/hiver).
- Semaine commençant le **lundi**.
- Interface entièrement en **français**.

### 2.3 Technique
| Élément | Choix |
|---|---|
| Interface | **React + TypeScript**, PWA |
| Serveur | **Node.js + TypeScript** |
| Base de données | **PostgreSQL** (accès via l'ORM Drizzle) |
| Photos | Fichiers dans un dossier du serveur |
| Lancement | **Docker Compose** : identique sur PC Windows (Docker Desktop) et VPS |
| IA | **Google Gemini, offre gratuite**, appelé **uniquement depuis le serveur** (la clé API n'est jamais dans l'appli téléphone) |
| Tests | Tests automatiques obligatoires sur le module de calcul (annexe §11) |
| Hébergement cible | **VPS OVH** (offre précise : [issue #2](https://github.com/Plossec/Vinted-Helper/issues/2)) |

Démarche : développement et tests **en local sur PC Windows** d'abord. HTTPS en test local : [issue #3](https://github.com/Plossec/Vinted-Helper/issues/3). Puis mise en ligne OVH (issue #2).
Niveau technique de l'utilisateur : intermédiaire (terminal OK) → installation guidée pas-à-pas.

## 3. Glossaire

| Terme | Définition |
|---|---|
| **Sortie** | Un déplacement d'achat (ex. vide-grenier du 27/09) : date, lieu, essence. Regroupe les articles achetés ce jour-là. |
| **Lieu** | Endroit d'achat, choisi dans une liste réutilisable (Vide grenier, Ressourcerie, Bourse vêtement, LBC…, Maison). |
| **Lot (d'achat)** | Plusieurs articles achetés ensemble pour un prix global (ex. 4 maillots pour 15 €). |
| **Photo terrain** | Photo rapide prise au moment de l'achat, pour se souvenir de l'article et du prix. |
| **Photos annonce** | Photos propres destinées à l'annonce Vinted. |
| **Prix affiché** | Prix de l'annonce sur Vinted ; chaque changement est historisé. |
| **Prix vendu** | Montant **réellement crédité** sur le porte-monnaie Vinted (après offre négociée). |
| **Vente** | Une transaction avec un acheteur = **un colis**. Contient 1 article (vente simple) ou plusieurs (**vente groupée**). |
| **Finalisé** | Vente validée par Vinted, argent crédité. C'est la **date de finalisation** qui compte pour le chiffre d'affaires. |
| **Sortie du stock** | Article qui quitte le stock sans vente Vinted (Donné, Jeté, Revendu hors Vinted, Gardé pour moi, Perdu). |
| **Frais généraux** | Dépense non rattachée à un article (ex. essence d'une sortie sans achat). |
| **Boost** | Option payante Vinted pour mettre un article en avant ; coût rattaché à l'article. |
| **Référence** | Numéro court unique et automatique de l'article (`#0127`). |
| **Article dormant** | Article En ligne depuis plus de N jours sans vente ni baisse de prix. |

## 4. Statuts et transitions

### 4.1 Statuts
| Statut | Signification |
|---|---|
| **Brouillon** | Photo terrain + prix d'achat, fiche incomplète |
| **À publier** | Fiche complète, photos annonce prêtes, pas encore en ligne |
| **En ligne** | Annonce publiée sur Vinted |
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
| Envoyé | Finalisé, En ligne (colis retourné / litige perdu) |
| Finalisé | *aucune* (correction par modification manuelle uniquement) |
| Tout statut sauf Finalisé | Sortie du stock |
| Sortie du stock | À publier (annulation de la sortie) |

Toute autre transition est refusée par l'application.

### 4.3 Dates des changements
- Chaque changement de statut est enregistré dans un **historique** (statut de départ, statut d'arrivée, date).
- La date proposée est **maintenant**, **modifiable** avant validation, et **corrigeable après coup** depuis l'historique de la fiche.
- Lors d'un retour en arrière (annulation, retour colis), la vente associée est annulée et n'entre plus dans les calculs.

## 5. Fonctionnalités

### 5.1 Saisie rapide terrain
- **Démarrer une sortie** : date (aujourd'hui par défaut), lieu (liste). La sortie en cours est mémorisée.
- Gros bouton **« + Achat »** → l'appareil photo s'ouvre → photo → clavier numérique pour le **prix** + champ **nombre d'articles** (1 par défaut) → **Valider**. 3 à 4 gestes, rien d'autre d'obligatoire.
- **Lot** : 1 photo + prix total + nombre d'articles N → N brouillons créés, partageant la même photo terrain ; le prix est réparti (§6.1).
- **Essence** de la sortie saisie à tout moment (pendant ou après), répartie automatiquement (§6.2).
- Articles **Maison** : créés **sans sortie**, prix d'achat 0 €, lieu « Maison ».

### 5.2 Fiche article
- **Référence** automatique (`#0001`, `#0002`…), recherche directe par numéro.
- Nom, **catégorie**, **marque**, **gamme**, **état**, taille, matière, notes.
- Lieu, sortie, lot éventuel, prix d'achat, date d'achat.
- **Photos** : photo terrain + photos annonce, ajoutées **depuis la galerie (sélection multiple) ou l'appareil photo**, réordonnables, une photo **principale**.
- **Prix affiché** + **historique complet** des changements de prix.
- **Frais de boost** (0 ou plusieurs, montant + date).
- Titre et description de l'annonce (générés par IA ou saisis), **enregistrés et modifiables**, bouton **Copier**.
- Historique des statuts avec dates.
- Indicateurs : coût total, bénéfice (réel ou provisoire), délai de vente.

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
- **Prompt modifiable** dans les Réglages.
- **Secours** : bouton **« Copier le prompt »** (texte prêt à coller dans une IA gratuite : Claude.ai, ChatGPT, Gemini) si le quota est dépassé ou le service indisponible.
- Aucune automatisation de Vinted (pas d'API publique ; scraping contraire aux CGU).

### 5.6 Ventes
- Passage **En ligne → À expédier** : création d'une **vente** (= un colis) avec 1 ou plusieurs articles, montant crédité, date de vente.
- **Emballage** : 0,08 € par colis par défaut (modifiable dans la vente et dans les Réglages).
- Dates d'envoi et de finalisation saisies au passage aux statuts Envoyé et Finalisé.

### 5.7 Sortie du stock
- Motif obligatoire : **Donné, Jeté, Revendu hors Vinted, Gardé pour moi, Perdu**.
- **Revendu hors Vinted** : prix de revente + canal (Vide-grenier, Leboncoin, Main propre, Autre).

### 5.8 Alertes (affichées dans l'application uniquement)
- **Brouillon trop ancien** : Brouillon depuis > **3 jours**.
- **Article dormant** : En ligne depuis > **7 jours** **depuis la dernière baisse de prix** (ou la mise en ligne s'il n'y a pas eu de baisse).
- **À expédier** : tout article dans ce statut.
- Délais modifiables dans les Réglages. Affichage : bandeau / pastilles sur l'écran d'accueil.

### 5.9 Tableau de bord
- **Chiffre d'affaires**, **bénéfice réalisé** et **trésorerie** du mois / de l'année + graphique mensuel (§6.6).
- **Valeur du stock** (au coût d'achat et au prix affiché), nombre d'articles par statut.
- **Rentabilité par sortie et par lieu** (les articles Maison sont affichés à part, hors classement).
- **Analyse par catégorie / marque / gamme** : marge moyenne, délai moyen de vente.

### 5.10 Photos : stockage
- Pleine qualité tant que l'article n'est pas Finalisé.
- Au passage en **Finalisé** : on conserve uniquement la **photo principale** et la **photo terrain**, **réduites** (~1600 px) ; les autres sont supprimées.
- *Hypothèse à confirmer : même traitement au passage en Sortie du stock.*

### 5.11 Suppression
- Supprimer un article (erreur, doublon) → **corbeille 30 jours**, restaurable ; ensuite suppression définitive avec ses photos.
- Un article supprimé n'apparaît dans aucun calcul.

### 5.12 Sauvegarde
- Sauvegarde automatique **quotidienne** (base + photos).
- **Copie hors serveur**, conservation **30 jours**, **restauration testée une fois** et documentée. Destination à choisir dans l'issue #2.

## 6. Règles de calcul

**Règle d'arrondi commune** : toute répartition d'un montant total entre N éléments donne des parts **arrondies au centime le plus proche** ; le **dernier** élément reçoit `total − somme des autres parts`, pour que la somme soit toujours exactement égale au total.

### 6.1 Prix d'achat (lots)
- Article seul : prix saisi.
- Lot : prix total réparti **à parts égales** (règle d'arrondi). Le prix d'achat n'est **pas** modifié article par article ; si le **total du lot** est corrigé, la répartition est recalculée.

### 6.2 Essence
- Saisie **par sortie**, répartie **à parts égales** entre tous les articles de la sortie (règle d'arrondi).
- **Recalcul automatique** si un article est ajouté, retiré ou supprimé de la sortie, ou si le montant change.
- Sortie **sans aucun article** : l'essence devient un **frais général** du mois de la sortie.
- Articles Maison : pas de sortie → essence 0 €.

### 6.3 Emballage
- **0,08 € par colis** par défaut, modifiable.
- Réparti **à parts égales** entre les articles du colis (règle d'arrondi).
- Articles en Sortie du stock : pas d'emballage.

### 6.4 Prix vendu (ventes groupées)
- Vente simple : prix vendu = montant crédité.
- Vente groupée : montant crédité réparti **au prorata des prix affichés** au moment de la vente (règle d'arrondi).

### 6.5 Bénéfice d'un article
```
Coûts     = Prix d'achat + Part d'essence + Part d'emballage + Boosts
Bénéfice  = Prix vendu − Coûts                       (Finalisé)
          = Prix de revente − Coûts                  (Revendu hors Vinted)
          = − Coûts                                  (Donné, Jeté, Gardé pour moi, Perdu : perte)
          = − Coûts   (provisoire, affiché comme tel) (tout autre statut)
```

### 6.6 Indicateurs mensuels (date de rattachement)
| Indicateur | Calcul |
|---|---|
| **Chiffre d'affaires** | Σ prix vendus des articles **finalisés** dans le mois (date de finalisation) + Σ prix de revente hors Vinted (date de sortie du stock) |
| **Bénéfice réalisé** | Σ bénéfices des articles **finalisés** ou **sortis du stock** dans le mois − frais généraux du mois |
| **Trésorerie** | Entrées − sorties d'argent du mois : + montants crédités (date de finalisation) + reventes hors Vinted − achats (date d'achat) − essence (date de sortie) − emballages (date d'envoi) − boosts (date du boost) − frais généraux |

## 7. Modèle de données

| Entité | Champs principaux |
|---|---|
| **Utilisateur** | identifiant, mot de passe (haché) |
| **Lieu** | nom, est_maison |
| **Categorie / Marque / Gamme / Etat** | nom (unique) |
| **Sortie** | date, lieu, montant_essence, notes |
| **LotAchat** | sortie, prix_total, nb_articles |
| **Article** | reference (auto), nom, categorie, marque, gamme, etat, taille, matiere, notes, lieu, sortie (facultatif), lot (facultatif), prix_achat, part_essence (calculée), date_achat, statut, prix_affiche_actuel, titre_annonce, description_annonce, motif_sortie, canal_revente, prix_revente, date_sortie_stock, supprime_le (corbeille) |
| **Photo** | article, type (terrain / annonce), ordre, est_principale, fichier, est_reduite |
| **HistoriqueStatut** | article, de, vers, date |
| **HistoriquePrix** | article, prix, date |
| **Boost** | article, montant, date |
| **Vente** (= colis) | montant_credite, emballage, date_vente, date_envoi, date_finalisation, annulee |
| **VenteArticle** | vente, article, prix_affiche_au_moment, part_prix_vendu (calculée), part_emballage (calculée) |
| **FraisGeneral** | date, montant, libellé, sortie (facultatif) |
| **Reglages** | emballage_defaut, delai_brouillon, delai_dormant, prompt_annonce, prompt_etiquette |

La photo terrain d'un lot est partagée par les articles du lot.

## 8. Critères d'acceptation

**Saisie terrain**
- Étant donné une sortie en cours, quand je fais « + Achat », photo, prix 2 et Valider, alors un article Brouillon à 2 € est créé, rattaché à la sortie et à son lieu.
- Étant donné une sortie en cours, quand je saisis un lot de 15 € pour 4 articles, alors 4 brouillons à 3,75 € partageant la même photo sont créés.
- Étant donné une sortie avec 4 articles et 2 € d'essence, quand j'ajoute un 5e article, alors chaque article porte 0,40 € d'essence.

**Statuts**
- Étant donné un article À expédier, quand l'acheteur annule, alors je peux le repasser En ligne et la vente est annulée.
- Étant donné un article Finalisé, alors aucune transition de statut n'est proposée.
- Étant donné un article Brouillon, quand je le passe En ligne directement, alors c'est accepté.
- Étant donné un changement de statut, quand je modifie la date proposée, alors la date saisie est enregistrée dans l'historique.

**Ventes et calculs**
- Étant donné deux articles affichés 9 € et 6 € vendus ensemble pour 12 €, alors leurs prix vendus sont 7,20 € et 4,80 € et l'emballage 0,04 € chacun.
- Étant donné un article finalisé le 04/10 et vendu le 30/09, alors il compte dans le CA d'octobre.
- Tous les cas de l'annexe §11 donnent le résultat attendu (tests automatiques).

**Liste, référence, IA**
- Étant donné l'article #0127, quand je tape « 127 » dans la recherche, alors sa fiche est proposée en premier.
- Étant donné une description générée, alors elle se termine par « Réf. 127 » et reste modifiable.
- Étant donné Gemini indisponible, quand je clique « Générer l'annonce », alors un message d'erreur clair apparaît et le bouton « Copier le prompt » est proposé.
- Étant donné une photo d'étiquette, quand je clique « Lire l'étiquette », alors marque / taille / catégorie / matière sont proposées sans être enregistrées tant que je n'ai pas validé.

**Référentiels, alertes, corbeille**
- Étant donné les marques « Levis » et « Levi's », quand je les fusionne, alors tous les articles portent la marque conservée.
- Étant donné un article En ligne le 01/10 avec une baisse de prix le 05/10, alors l'alerte « dormant » apparaît le 12/10.
- Étant donné un article supprimé, alors il est restaurable pendant 30 jours et exclu de tous les calculs.

## 9. Découpage en lots livrables

Chaque lot est testable sur le téléphone avant de passer au suivant.

1. **Socle** : connexion, fiche article, référentiels, statuts et transitions, liste simple.
2. **Saisie terrain** : sorties, « + Achat », lots, photos terrain, essence.
3. **Ventes et calculs** : ventes simples et groupées, emballage, boosts, sorties du stock, bénéfice, historique des prix, tests de l'annexe.
4. **Liste et recherche** : filtres, recherche, tri, référence, fusion/renommage des référentiels, corbeille.
5. **Tableau de bord** : CA, bénéfice réalisé, trésorerie, stock, rentabilité par sortie/lieu, analyse par catégorie/marque.
6. **IA** : génération d'annonce, lecture d'étiquette, prompt modifiable, secours « Copier le prompt ».
7. **Alertes et sauvegarde** : alertes, réduction des photos à la finalisation, sauvegarde automatique.

## 10. Hors périmètre

### Exclus (non prévus)
- Aucune possibilité d'**import** de données (départ de zéro).
- Pas d'**export** de données.
- Pas de **mode d'envoi**.
- Pas de **pseudo acheteur**.
- Pas d'**alerte seuil fiscal** (DAC7).
- Pas de **suggestion de prix** basée sur l'historique.
- Pas de **notifications** sur le téléphone (alertes dans l'appli uniquement).
- Pas de **croquis d'écrans** dans ce document.

### Reportés à plus tard
- Emplacement de rangement / QR codes → [issue #1](https://github.com/Plossec/Vinted-Helper/issues/1).
- Déploiement OVH (offre, domaine, destination de la sauvegarde hors serveur) → [issue #2](https://github.com/Plossec/Vinted-Helper/issues/2).
- HTTPS pour les tests locaux sur téléphone → [issue #3](https://github.com/Plossec/Vinted-Helper/issues/3).

## 11. Annexe — Cas chiffrés (tests automatiques)

À relire et valider par l'utilisateur. Chaque cas devient un test automatique.

| # | Situation | Résultat attendu |
|---|---|---|
| 1 | Lot de 3 articles pour 10 € | Prix d'achat : 3,33 / 3,33 / 3,34 |
| 2 | Lot de 3 articles pour 5 € | 1,67 / 1,67 / 1,66 |
| 3 | Total du lot n°1 corrigé à 12 € | 4,00 / 4,00 / 4,00 |
| 4 | Sortie : essence 2 €, 5 articles | 0,40 € d'essence par article |
| 5 | Sortie : essence 2 €, 3 articles | 0,67 / 0,67 / 0,66 |
| 6 | Sortie : essence 2 €, 4 articles, puis ajout d'un 5e | 0,50 € chacun, puis 0,40 € chacun |
| 7 | Sortie : essence 1,30 €, aucun achat | Frais général de 1,30 € dans le mois ; bénéfice réalisé et trésorerie du mois diminués de 1,30 € |
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
| 18 | Article acheté 5 € + 0,65 € essence, toujours En ligne | Bénéfice provisoire = **−5,65 €** ; valeur du stock au coût = 5,65 € |
| 19 | Article vendu le 30/09, envoyé le 01/10, finalisé le 04/10 à 9 € | Compté dans le CA et le bénéfice réalisé d'**octobre** |
| 20 | Septembre : article X (acheté en août 2 € + 0,40 € essence) envoyé le 02/09 et finalisé le 04/09 à 9 €, colis 0,08 € ; sortie du 20/09 : 5 articles à 2 €, essence 1 €, aucun vendu ; article Y (acheté en août 1 €, sans essence) donné le 25/09 | CA sept. = **9,00 €** ; bénéfice réalisé sept. = 6,52 − 1,00 = **5,52 €** ; trésorerie sept. = 9 − 10 − 1 − 0,08 = **−2,08 €** |
| 21 | Article affiché 9 € mis en ligne le 01/10, baissé à 7 € le 05/10 | Historique des prix : 9 € (01/10), 7 € (05/10) ; alerte dormant le **12/10** |
| 22 | Article À expédier dont l'acheteur annule | Repasse En ligne ; la vente est annulée et exclue de tous les calculs |
