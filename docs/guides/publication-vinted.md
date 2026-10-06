# Publier sur Vinted depuis l'application

Vous choisissez des articles « À publier » dans l'application. Un petit programme installé sur le PC ouvre alors
Chrome, remplit le formulaire Vinted article par article, vérifie chaque champ, puis clique « Ajouter ». L'article
passe ensuite **En ligne** et le lien de l'annonce est gardé sur sa fiche.

> **Risques acceptés** (décision du 06/10/2026, `docs/decisions/publication-vinted.md`) : Vinted peut suspendre un
> compte qui publie automatiquement, et le programme cessera de fonctionner si Vinted modifie son site. Si Vinted
> demande une vérification (captcha…), le programme **s'arrête et attend** : faites-la vous-même dans la fenêtre Chrome.

## 1. Installer le programme (une seule fois)

Il faut **Google Chrome** et **Node.js** (déjà installé pour le projet).

1. Démarrez l'application (`docker compose up -d --build`), ouvrez-la, puis **Réglages → Publication Vinted →
   Créer un jeton**. Copiez le jeton (`vh_…`) : il n'est affiché qu'une fois.
2. Dans PowerShell, à la racine du projet :
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\installer-publication.ps1
   ```
   Le script installe le programme, demande l'**adresse** de l'application (Entrée = `http://localhost:3000` ; sur
   OVH, l'adresse `https://…` du serveur) et le **jeton**, le fait démarrer avec Windows (fenêtre réduite) et le lance.
3. Résultat attendu : « Installé. » en vert. Le programme vérifie **toutes les 5 minutes** s'il y a des articles à
   publier (une sélection de plusieurs articles est ensuite traitée d'affilée) ; l'écran **Publication Vinted** de
   l'application indique « Programme actif ».

La configuration est dans `%LOCALAPPDATA%\VintedHelper\publication.json`, le journal dans
`%LOCALAPPDATA%\VintedHelper\publication.log`. Pour changer d'adresse ou de jeton, relancez le script.

## 2. Se connecter à Vinted (une seule fois)

À la première publication, une fenêtre Chrome s'ouvre sur Vinted (profil Chrome **réservé au programme**, distinct
de votre Chrome habituel). Connectez-vous dans **cette** fenêtre : la connexion est gardée. Tant que vous n'êtes pas
connecté, le programme attend et ne prend aucun article.

## 3. Préparer les articles

Le programme refuse un article incomplet et affiche ce qui manque. Il faut : statut **À publier**, photos d'annonce,
prix affiché, titre, description, catégorie, marque, état et au moins une **couleur** (2 au maximum). La taille est
facultative. Le **format du colis** se choisit sur la fiche ; sinon celui des Réglages (Paramètres de calcul) est
utilisé.

## 4. Publier

- **Plusieurs articles** : Articles → Filtres → Statut « À publier » → **Sélectionner pour Vinted** → cochez →
  **Publier sur Vinted (N)**.
- **Un article** : sur sa fiche, bouton **Publier sur Vinted**.
- **Suivi** : Réglages → Publication Vinted : file d'attente, état de chaque article (en attente, en cours, publié,
  essai, erreur), bouton Annuler tant qu'il n'est pas commencé.

Une publication interrompue (Chrome fermé, PC éteint…) passe en **erreur** au bout de 15 minutes et n'est **jamais
relancée automatiquement**, pour éviter une annonce en double : vérifiez sur Vinted avant de la redemander.

## 5. Mode essai (activé par défaut)

Case **Mode essai** de l'écran Publication Vinted. En essai, le programme remplit et contrôle le formulaire mais **ne
clique pas « Ajouter »** : vous relisez pendant 20 secondes, puis il passe au suivant. Rien n'est publié et l'article
reste À publier. Décochez la case seulement quand plusieurs essais sont parfaits.

## 6. Si Vinted change (ou au premier réglage) : le diagnostic

Les repères du formulaire Vinted sont regroupés dans `outils/publication-vinted/selecteurs.mjs`. Si un champ n'est
plus trouvé (erreur « champ introuvable » ou contrôle en échec) :

1. Fermez la fenêtre du programme (icône réduite dans la barre des tâches) : un seul programme à la fois peut
   utiliser son profil Chrome.
2. Dans PowerShell :
   ```powershell
   cd outils\publication-vinted
   npm run diagnostic
   ```
   Chrome ouvre le formulaire Vinted ; connectez-vous si besoin. Au bout de 20 secondes, deux fichiers sont créés
   dans `%LOCALAPPDATA%\VintedHelper\` : `diagnostic-….json` et `diagnostic-….png`.
3. Envoyez ces deux fichiers à Claude, qui corrigera `selecteurs.mjs`. Faites ensuite `git pull`, puis relancez le
   programme (redémarrez le PC, ou relancez le script d'installation).

## Dépannage

| Problème | Solution |
|---|---|
| « Programme inactif » dans l'application | Relancez le script d'installation, ou redémarrez le PC |
| 401 / jeton refusé dans le journal | Créez un nouveau jeton et relancez le script d'installation |
| L'article reste « en attente » | Le programme attend la connexion à Vinted : regardez la fenêtre Chrome |
| Erreur « contrôle avant envoi » | Un champ n'a pas été rempli comme prévu ; rien n'a été publié. Lancez le diagnostic |
