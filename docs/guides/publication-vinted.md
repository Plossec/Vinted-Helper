# Publier sur Vinted depuis l'application

Vous choisissez des articles « À publier » dans l'application. Une **extension Chrome**, installée dans **votre
Chrome habituel**, ouvre alors un onglet Vinted, remplit le formulaire article par article, vérifie chaque champ,
puis clique « Ajouter ». L'article passe ensuite **En ligne** et le lien de l'annonce est gardé sur sa fiche.

> **Risques acceptés** (décisions des 06 et 07/10/2026, `docs/decisions/publication-vinted.md`) : Vinted peut
> suspendre un compte qui publie automatiquement, et l'extension cessera de fonctionner si Vinted modifie son site.
> Si Vinted affiche une vérification (captcha), une page « session bloquée », ou si vous n'êtes pas connecté,
> l'extension **se met en pause** : rien n'est rechargé ni publié tant que vous n'avez pas cliqué « Reprendre ».

> L'ancien programme du PC (`outils/publication-vinted/`, fenêtre Chrome pilotée à distance) n'est plus utilisé :
> il a été bloqué par Vinted le 06/10/2026. Il sera retiré une fois l'extension validée.

## 1. Installer l'extension (une seule fois)

1. Mettez le projet à jour. Dans PowerShell, à la racine du projet :
   ```powershell
   git pull
   ```
2. Dans **Chrome**, ouvrez l'adresse `chrome://extensions`.
3. En haut à droite, activez **Mode développeur**.
4. Cliquez **Charger l'extension non empaquetée** et choisissez le dossier `outils\extension-vinted` du projet.
5. Résultat attendu : la carte « Vinted Helper — publication » apparaît. Cliquez l'icône de pièce de puzzle de la
   barre de Chrome, puis l'épingle à côté de « Vinted Helper — publication » pour garder son icône visible.

## 2. Relier l'extension à l'application (une seule fois)

1. Dans l'application en ligne : **Réglages → Publication Vinted → Créer un jeton** (ou « Remplacer le jeton »).
   Copiez le jeton (`vh_…`) : il n'est affiché qu'une fois.
2. Cliquez l'icône de l'extension → **Réglages**. Saisissez :
   - **Adresse de l'application** : `https://vps-6b2cf0b2.vps.ovh.net` ;
   - **Jeton** : celui copié à l'étape 1.
3. Cliquez **Enregistrer et tester**. Chrome demande l'autorisation d'accéder à l'adresse : acceptez.
4. Résultat attendu : « Connexion réussie : N annonce(s) en attente. » L'écran Publication Vinted de l'application
   indique « Extension Chrome : actif » au bout de quelques minutes.

## 3. Être connecté à Vinted

Connectez-vous à Vinted **à la main**, dans ce même Chrome, comme d'habitude. L'extension utilise votre session ;
elle ne saisit jamais votre mot de passe. Tant que vous n'êtes pas connecté, elle se met en pause sans prendre
d'article.

## 4. Préparer les articles

L'application refuse un article incomplet et affiche ce qui manque. Il faut : statut **À publier**, photos
d'annonce, prix affiché, titre, description, catégorie, marque, état et au moins une **couleur** (2 au maximum). La
taille est facultative. Le **format du colis** se choisit sur la fiche ; sinon celui des Réglages (Paramètres de
calcul) est utilisé.

## 5. Publier

- **Plusieurs articles** : Articles → Filtres → Statut « À publier » → **Sélectionner pour Vinted** → cochez →
  **Publier sur Vinted (N)**.
- **Un article** : sur sa fiche, bouton **Publier sur Vinted**.
- **Suivi** : Réglages → Publication Vinted : file d'attente, état de chaque article (en attente, en cours, publié,
  essai, erreur), bouton Annuler tant qu'il n'est pas commencé.

Chrome doit rester ouvert. L'extension vérifie **toutes les 5 minutes** s'il y a des articles à publier, et publie
**un seul article toutes les 10 minutes au moins** (plus un délai variable de 0 à 3 minutes). Pendant le remplissage,
un onglet Vinted s'ouvre au premier plan : laissez-le faire (moins d'une minute), sans le fermer.

Une publication interrompue (Chrome fermé, PC éteint…) passe en **erreur** et n'est **jamais relancée
automatiquement**, pour éviter une annonce en double : vérifiez sur Vinted avant de la redemander.

## 6. Mode essai (activé par défaut)

Case **Mode essai** de l'écran Publication Vinted. En essai, l'extension remplit et contrôle le formulaire mais **ne
clique pas « Ajouter »** : l'onglet reste ouvert, vous pouvez relire. Rien n'est publié et l'article reste À publier.
Décochez la case seulement quand plusieurs essais sont parfaits.

## 7. La fenêtre de l'extension

Cliquez l'icône de l'extension :
- **État** : active, ou **en pause** avec la raison (badge rouge « ! » sur l'icône) ;
- **Mettre en pause / Reprendre** ; **Vérifier maintenant** (sans attendre les 5 minutes) ;
- **Journal** des dernières actions.

**En cas de pause** :
- *Vérification Vinted* : faites-la vous-même dans l'onglet Vinted, puis **Reprendre** ;
- *Non connecté* : connectez-vous à Vinted, puis **Reprendre** ;
- *Session bloquée* : **ne reprenez pas** avant plusieurs jours ; publiez à la main en attendant. Ne cherchez pas
  à contourner le blocage (changement d'adresse IP, effacement des cookies…).

## 8. Si Vinted change (ou au premier réglage)

Les repères du formulaire Vinted sont regroupés dans `outils/extension-vinted/selecteurs.js`. Si un champ n'est pas
trouvé (erreur « champ introuvable » ou contrôle en échec), rien n'est publié. Faites une **capture d'écran** de
l'onglet Vinted et du message d'erreur, et envoyez-les à Claude, qui corrigera `selecteurs.js`. Ensuite :

1. `git pull` à la racine du projet ;
2. `chrome://extensions` → bouton **↻** (recharger) sur la carte de l'extension ;
3. rechargez l'onglet Vinted.

## Dépannage

| Problème | Solution |
|---|---|
| « Extension Chrome : inactive » dans l'application | Chrome est fermé, ou l'extension est en pause : ouvrez sa fenêtre |
| « Jeton refusé » | Créez un nouveau jeton et saisissez-le dans les Réglages de l'extension |
| L'article reste « en attente » | L'extension est en pause (badge « ! ») ou attend les 10 minutes entre deux articles |
| Erreur « contrôle avant envoi » | Un champ n'a pas été rempli comme prévu ; rien n'a été publié (voir §8) |
