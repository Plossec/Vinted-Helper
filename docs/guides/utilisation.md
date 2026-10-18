# Utilisation au quotidien

[← Sommaire de la documentation](../README.md)

## Tous les jours (onglet **À faire**)

L'écran **À faire** (1er onglet, pastille = nombre de choses à faire) regroupe tout ce qui demande votre attention,
par urgence :
- **Urgent** : publications Vinted en erreur → **Republier** (l'article retourne dans la file de publication) ;
- **À traiter** : articles **à expédier** → **Envoyé** (à la date du jour, pour tout le colis) et 💬 pour ouvrir la
  conversation ; articles **à récupérer** → **Récupéré → À publier** ; articles **À publier incomplets** (avec ce qui
  manque) → **Compléter** ; articles **invendus** → **Remettre en ligne** (ou baisse à la main, sortie du stock) ;
- **Pour info** : articles **dormants** et **brouillons** anciens → **Vu** les masque ; ils reviennent si la situation
  change (ex. article de nouveau dormant après une baisse de prix).

Touchez le nom d'un article pour ouvrir sa fiche. « Rien à faire 🎉 » quand tout est fait.

**Articles dormants : à valider** (en tête de l'écran, si la tâche automatique est en mode manuel) : les baisses de
prix et republications prévues ; cochez-les puis **Appliquer** (l'extension Chrome les fera) ou **Refuser**.

## Tâche automatique « Articles dormants »

**Réglages → Tâches automatiques** (désactivée par défaut) : un article dormant voit son prix baissé (pourcentage ou
montant, arrondi vers le haut au 0,50 €, jamais sous le **prix vente minimum**), puis, une fois au minimum, son
annonce republiée. Sans prix vente minimum, ou réglé **« Ne pas baisser le prix »** sur la fiche (champ « Baisse
automatique », sous le prix vente minimum), l'article est seulement republié. Après **3 republications sans vente**,
il passe **Invendu** : l'annonce reste en ligne et la tâche ne le touche plus.

- **Mode** : *manuel* (liste à valider dans « À faire ») ou *automatique*.
- **Rythme** : un passage par jour (6 h au moins entre deux), pauses entre deux actions, plafonds par jour, de 8 h à
  22 h ; tout se fait par l'extension Chrome, seulement quand Chrome est ouvert.
- **Mode essai** (coché par défaut) : l'extension ouvre les pages Vinted sans rien modifier. À garder tant que
  l'extension n'a pas été calibrée sur les pages « Modifier l'annonce » et « Supprimer » (envoyez le « Dernier
  relevé » de l'extension après un essai, voir `publication-vinted.md`).
- **Journal** : Réglages → Publication Vinted, section « Tâches automatiques ».

## Tâche automatique « Vérification vente finalisée »

**Réglages → Tâches automatiques → Ventes finalisées** (désactivée par défaut) : l'extension lit le « Porte-monnaie » sur Vinted ; une commande terminée fait passer **Finalisé** le colis Envoyé correspondant (retrouvé par le
lien de l'annonce), à la **date de fin lue sur Vinted**.

- **Mode** : *manuel* (« Ventes finalisées sur Vinted : à valider » dans « À faire » → **Finaliser** ou **Refuser**)
  ou *automatique*.
- **Montant différent** : le montant crédité lu sur Vinted remplace celui de l'application ; « Montants corrigés par
  Vinted » dans « À faire » le signale (**Vu**).
- **Commande non retrouvée** (article sans lien d'annonce, colis différent) : « Commandes Vinted à rattacher » →
  choisissez l'article Envoyé, puis **Rattacher** (le lien est enregistré et le colis finalisé), ou **Ignorer**.
- **Extension 1.11 (étape 1)** : elle ouvre et relève seulement la page des ventes ; envoyez le « Dernier relevé » à
  Claude pour activer la lecture des commandes.

**Écran d'ouverture** de l'application installée : **Réglages → Affichage → Ouverture de l'application installée**,
*Terrain* (par défaut, pour le vide-grenier) ou *À faire* ; choix gardé sur chaque appareil.

## En vide-grenier (onglet **Terrain**)

1. **Démarrer une sortie** : tapez le lieu (librement : un lieu nouveau est ajouté à la liste), la date (aujourd'hui
   par défaut), puis « Démarrer la sortie ».
2. **+ Achat** : l'appareil photo s'ouvre → photo → tapez le **prix** → **Valider**. Pour un **lot** (ex. 4 maillots
   pour 15 €), indiquez le prix total et le nombre d'articles : 4 brouillons sont créés, à 3,75 € chacun, avec la même
   photo. « Achat sans photo » si besoin.
3. **Essence** : à saisir quand vous voulez (pendant ou après) ; elle est répartie automatiquement sur les articles.
4. **Terminer la sortie** quand vous rentrez. La sortie reste modifiable dans **Terrain → Toutes les sorties**.
   Sortie démarrée par erreur : **Annuler la sortie** (après confirmation, ses achats vont à la corbeille,
   restaurables 30 jours, et l'essence est effacée ; fonctionne aussi sans réseau).

Sans réseau, tout est **gardé sur le téléphone** : le bandeau affiche « N éléments en attente d'envoi » et l'envoi se
fait tout seul au retour sur le Wi-Fi de la maison (les références `#0127` sont attribuées à ce moment-là).

Article de la maison : **Terrain → Article de la maison** (0 €, sans sortie, lieu « Maison »).

## À la maison (onglet **Articles**)

Ouvrez un brouillon pour compléter sa fiche (nom, catégorie, marque, état…), ajouter les **photos de l'annonce**
(galerie : plusieurs à la fois, ou appareil photo), les réordonner (← →), les **faire pivoter** (↺ ↻, d'un quart de
tour, définitivement) et choisir la **photo principale** (★).
Pour un article de lot, c'est le **prix total du lot** qui se corrige ; il est réparti à nouveau sur les articles.

**Lien de l'annonce Vinted** (section Vinted de la fiche) : dans Vinted, ouvrez l'annonce → Partager → Copier le
lien, puis collez-le et « Enregistrer le lien ». Un article Brouillon ou À publier qui a un prix affiché passe alors
**En ligne**. Dans la liste, le repère **↗** ouvre l'annonce.

**Lien de la conversation avec l'acheteur** : quand vous passez un article « Vendu : à expédier », collez le lien de
la conversation Vinted (facultatif ; dans Vinted : la conversation → copier l'adresse). Il est gardé sur chaque article
du colis, modifiable dans la section Vinted de la fiche, et l'icône 💬 de la ligne « À expédier » de l'écran **À faire** l'ouvre.

**Retour de l'acheteur** : sur la fiche d'un article Envoyé, « Retour de l'acheteur » (colis entier, ou articles
renvoyés + nouveau montant crédité). L'article passe **À récupérer** (ligne dans l'écran **À faire**, avec 💬 si la
conversation est connue). Une fois l'article récupéré : « Récupéré : à publier », « Récupéré : remettre en ligne »
(prix affiché demandé) ou « Sortir du stock ».

**Publication Vinted en erreur** : si l'extension Chrome échoue sur une vraie publication (pas en mode essai),
l'article passe **Erreur** (badge rouge, ligne « Urgent » de l'écran **À faire**). Le message
de l'échec est dans la section Vinted de la fiche. Vérifiez sur Vinted qu'aucune annonce n'a été créée, puis :
« Publier sur Vinted » (l'article repasse À publier et retourne dans la file), « Revenir à « À publier » », ou
« Publié à la main : mettre en ligne » si vous l'avez publiée vous-même.

**Supprimer un changement de statut fait par erreur** : sur la fiche, historique des statuts → « Supprimer » sur la
dernière ligne (après confirmation). L'article revient au statut précédent : « Vendu » annulé → la vente est supprimée
(colis de plusieurs articles : seul cet article en sort, nouveau montant demandé pour les autres) ; « Envoyé »,
« Finalisé » ou « Annulation par l'acheteur » → défait pour tout le colis ; « Sortie du stock » → motif effacé. Pour
remonter plus loin, recommencez. La création, un retour et l'annulation d'une sortie du stock ne se suppriment pas.

**Filtres** (bouton « Filtres ») : touchez les statuts à afficher (par défaut tous sauf Finalisé et Sortie du stock) ;
pour les catégories, marques, lieux et sorties, cherchez puis ajoutez une ou plusieurs valeurs (« × » pour en
retirer une). « Effacer les filtres » revient au réglage par défaut.

**Affichage de la liste** (boutons « Affichage », sous le tri ; choix gardé sur chaque appareil) :
- ▤ **Vignettes** : photo, référence, statut, nom, marque et prix ;
- ☰ **Liste compacte** : une ligne par article, sans photo ;
- ▦ **Mosaïque** : grandes photos en grille ;
- ▥ **Détaillé** : tableau (statut, marque, catégorie, lieu, date et prix d'achat, prix affiché, bénéfice) ; touchez
  un en-tête de colonne pour trier (une 2e fois pour inverser). Sur téléphone, faites glisser le tableau vers la
  gauche ; le bénéfice en *italique* est provisoire (article pas encore finalisé).

## Tableau de bord

- **Chiffre d'affaires** et **bénéfice réalisé** ne comptent que les ventes **Finalisées** (à la date de
  finalisation) et les reventes hors Vinted. Le bénéfice du mois est diminué des **frais généraux** (frais divers,
  essence des sorties sans achat).
- Dans ces deux tuiles : **« Octobre 2026 réalisé »** (ventes finalisées) et **« Octobre 2026 théorique »**, qui
  ajoute les ventes pas encore finalisées (**À expédier**, **Envoyé**), comptées au mois de la **date de vente**. Une
  fois la vente finalisée, elle passe dans le réalisé (au mois de la finalisation).
- **Trésorerie** : l'argent réellement entré et sorti, à la date de chaque mouvement ; son calcul est détaillé dans
  la tuile (encaissé, achats, essence, emballages, boosts, frais divers).
- **Graphique** : barre foncée = réalisé ; le **théorique** (avec les ventes en cours) est entouré d'un contour, la
  partie qui dépasse au-dessus est claire. Quand le théorique est à l'intérieur de la barre (ex. trésorerie négative
  qui remonte grâce aux ventes en cours), un trait pointillé marque son niveau. Pour la trésorerie, le théorique
  ajoute l'argent que Vinted doit encore verser. « Voir le tableau » donne les montants mois par mois.
- **Stock** : par statut, le coût total, le prix affiché et le nombre d'articles. Seules les années où il y a de
  l'activité sont proposées.
- L'essence d'une sortie est partagée entre tous ses articles, vendus ou non : celle des invendus est dans la
  **valeur du stock**, pas dans le bénéfice.

## Nouvelle version

Après une mise à jour (README, « Mettre à jour l'application »), le téléphone affiche « Nouvelle version disponible — Mettre à jour » : touchez
« Mettre à jour ».
