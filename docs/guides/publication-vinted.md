# Publier sur Vinted depuis l'application

Vous choisissez des articles « À publier » dans l'application. Une **extension Chrome**, installée dans **votre
Chrome habituel**, ouvre alors un onglet Vinted, remplit le formulaire article par article, vérifie chaque champ,
puis clique « Ajouter ». L'article passe ensuite **En ligne** et le lien de l'annonce est gardé sur sa fiche.

> **Risques acceptés** (décisions des 07 et 14/10/2026, ADR 0034, 0068 et 0082 de `docs/decisions/`) : Vinted peut
> suspendre un compte qui publie automatiquement, et l'extension cessera de fonctionner si Vinted modifie son site.
> Si Vinted affiche une vérification (captcha), une page « session bloquée », ou si vous n'êtes pas connecté,
> l'extension **se met en pause** : rien n'est rechargé ni publié tant que vous n'avez pas cliqué « Reprendre ».

> L'ancien programme du PC (fenêtre Chrome pilotée à distance), bloqué par Vinted le 06/10/2026, a été retiré le
> 08/10/2026 (#68). Son dossier de données sur le PC, `%LOCALAPPDATA%\VintedHelper`, peut être supprimé.

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
   - **Adresse de l'application** : celle de votre serveur, celle que vous ouvrez sur le téléphone (exemple :
     `https://vps-1234abcd.vps.ovh.net`) ;
   - **Jeton** : celui copié à l'étape 1.
3. Cliquez **Enregistrer et tester**. Chrome demande l'autorisation d'accéder à l'adresse : acceptez.
4. Résultat attendu : « Connexion réussie : N annonce(s) en attente. » L'écran Publication Vinted de l'application
   indique « Extension Chrome : actif » au bout de quelques minutes.

## 3. Être connecté à Vinted

Connectez-vous à Vinted **à la main**, dans ce même Chrome, comme d'habitude. L'extension utilise votre session ;
elle ne saisit jamais votre mot de passe. Tant que vous n'êtes pas connecté, elle se met en pause sans prendre
d'article.

## 4. Préparer les articles

Un article ne passe **À publier** que s'il est complet (sinon l'application affiche ce qui manque) : photos
d'annonce, prix affiché, titre, description, catégorie, marque, état et au moins une **couleur** (2 au maximum). La
taille est facultative. Catégorie « Autre » : l'article passe À publier mais se publie **à la main** sur Vinted (la
publication automatique le refuse). Un article À publier devenu incomplet est signalé dans **À faire**. Le **format du colis** se choisit sur la fiche ; sinon celui des Réglages (Paramètres de
calcul) est utilisé.

## 5. Publier

- **Plusieurs articles** : Articles → Filtres → Statut « À publier » et/ou « Erreur » (seulement ces statuts) →
  **Sélectionner pour Vinted** → cochez → **Publier sur Vinted (N)**. Les articles incomplets restent visibles, grisés
  et non cochables, avec ce qui leur manque. Les articles en Erreur repassent À publier
  (sauf en mode essai, qui ne change rien).
- **Un article** : sur sa fiche, bouton **Publier sur Vinted**.
- **Suivi** : Réglages → Publication Vinted : file d'attente, état de chaque article (en attente, en cours, publié,
  essai, erreur), bouton Annuler tant qu'il n'est pas commencé.

Chrome doit rester ouvert. L'extension vérifie **toutes les 5 minutes** s'il y a des articles à publier, et publie
**un seul article toutes les 10 minutes**. Pendant le remplissage,
un onglet Vinted s'ouvre au premier plan : laissez-le faire, sans le fermer. L'extension marque une pause de **5 secondes**
entre chaque étape (photos, titre, description, catégorie…) : une annonce prend environ **1 minute**.

Une publication interrompue (Chrome fermé, PC éteint…) passe en **erreur** et n'est **jamais relancée
automatiquement**, pour éviter une annonce en double : vérifiez sur Vinted avant de la redemander.

Quand une **vraie** publication échoue (pas un essai), l'article passe au statut **Erreur** : badge rouge, alerte
dans l'écran « À faire » et message de l'échec dans la section Vinted de la fiche. Depuis la fiche : **Publier sur
Vinted** (l'article repasse À publier et retourne dans la file) ou **Revenir à « À publier »**.

## 6. Mode essai (activé par défaut)

Case **Mode essai** de l'écran Publication Vinted. En essai, l'extension remplit et contrôle le formulaire mais **ne
clique pas « Ajouter »** : l'onglet reste ouvert, vous pouvez relire. Rien n'est publié et l'article reste À publier.
Décochez la case seulement quand plusieurs essais sont parfaits.

## 6 bis. Tâches automatiques : articles dormants (extension 1.14 : essai ou réel)

Activées dans l'application (**Réglages → Tâches automatiques**, voir `utilisation.md`). Quand aucune annonce n'est
à publier (la publication passe toujours d'abord), l'extension fait l'action suivante, **une à la fois**, avec les
pauses réglées dans l'application.

**Mode essai** (case « Mode essai » de la carte « Articles dormants » cochée) : rien n'est modifié sur Vinted.

- **Baisse de prix** : ouvre l'annonce, puis « Modifier l'annonce », et lit le prix affiché ; **rien n'est saisi ni
  enregistré**.
- **Republication** : ouvre l'annonce (le bouton « Supprimer » est repéré, **jamais cliqué**), puis remplit
  « Vendre un article » avec l'annonce, **sans cliquer « Ajouter »**.

**Mode réel** (case décochée, extension 1.14 au moins) :

- **Baisse de prix** : « Modifier l'annonce » ; si le prix affiché n'est pas celui de l'application, **rien n'est
  modifié** (erreur au journal). Sinon le nouveau prix est saisi, seul **« Valider »** est cliqué (jamais
  « Pousser »), puis la page est rouverte pour vérifier le prix enregistré.
- **Republication** : « Supprimer » sur l'annonce, puis « Supprimer » **dans la fenêtre de confirmation** ; l'annonce
  est rouverte pour vérifier qu'elle a disparu (sinon rien n'est republié), puis la nouvelle annonce est publiée
  (contrôle, « Ajouter ») et son lien enregistré. Si la nouvelle annonce échoue, l'article passe **Erreur** : à
  republier d'un clic.
- **Premier essai réel** : sur **un seul article** (mode manuel, une seule ligne cochée dans « À faire »), puis
  vérifiez l'annonce sur Vinted. Une page inattendue arrête l'action avec un relevé : **Dernier relevé →
  Télécharger le fichier**, et envoyez-le à Claude.

**Relever une page** (extension 1.12, pour le calibrage) : « Relever cet onglet » relève la page Vinted ouverte telle
quelle, sans rien cliquer. Exemple, la fenêtre de suppression :

1. Sur Vinted, ouvrez une de vos annonces et cliquez **Supprimer**. **Ne confirmez pas.**
2. La fenêtre de confirmation ouverte, cliquez l'icône de l'extension → **Relever cet onglet**. L'extension lit la
   page telle quelle, sans rien cliquer, puis ouvre la page du relevé : **Télécharger le fichier**.
3. Revenez sur Vinted et cliquez **Annuler** : l'annonce reste en ligne.
4. Envoyez le fichier à Claude, avec une capture de la fenêtre si possible.

## 6 ter. Tâches automatiques : ventes finalisées (extension 1.11, en essai)

Activée dans l'application (**Réglages → Tâches automatiques → Ventes finalisées**). Une fois par jour (réglable),
après les publications, l'extension ouvre **le « Porte-monnaie »** sur Vinted et la relève, **sans rien lire ni
modifier** dans cette version. Envoyez ensuite le **Dernier relevé** à Claude : la version suivante lira les commandes
terminées pour finaliser les colis dans l'application.

**Erreurs** (extension 1.13) : une lecture ou une action qui échoue est signalée à l'application, avec sa raison, dans
le **journal des tâches** (Réglages → Tâches automatiques, ou Publication Vinted) ; « Relevé enregistré » indique
qu'un **Dernier relevé** est disponible dans la fenêtre de l'extension. Après une erreur de lecture, la suivante
attend la fréquence réglée (ou **Lancer maintenant**).

## 7. La fenêtre de l'extension

Cliquez l'icône de l'extension :
- **État** : active, ou **en pause** avec la raison (badge rouge « ! » sur l'icône) ;
- **Mettre en pause / Reprendre** ; **Vérifier maintenant** (sans attendre les 5 minutes) ;
- **Diagnostic** (voir §8) ;
- **Journal** des dernières actions.

**En cas de pause** :
- *Vérification Vinted* : faites-la vous-même dans l'onglet Vinted, puis **Reprendre** ;
- *Non connecté* : connectez-vous à Vinted, puis **Reprendre** ;
- *Session bloquée* : **ne reprenez pas** avant plusieurs jours ; publiez à la main en attendant. Ne cherchez pas
  à contourner le blocage (changement d'adresse IP, effacement des cookies…).

## 8. Si Vinted change (ou au premier réglage)

Les repères du formulaire Vinted sont regroupés dans `outils/extension-vinted/selecteurs.js`. Si un champ n'est pas
trouvé (erreur « champ introuvable », « catégorie introuvable » ou contrôle en échec), rien n'est publié :

En cas d'erreur pendant un remplissage, l'extension relève **automatiquement** la page : cliquez l'icône de
l'extension → **Dernier relevé** → **Télécharger le fichier**, et envoyez-le à Claude. Sinon, relevé à la demande :

1. Soyez connecté à Vinted, puis cliquez l'icône de l'extension → **Diagnostic**.
2. L'extension ouvre « Vendre un article », relève la structure du formulaire, ouvre la liste des catégories (sans
   rien choisir) et la referme. Rien n'est saisi ni publié.
3. Une page « Diagnostic du formulaire Vinted » s'ouvre : cliquez **Télécharger le fichier**
   (`diagnostic-vinted-….json`, dans votre dossier Téléchargements).
4. Envoyez ce fichier à Claude, avec le message d'erreur, et une capture de l'onglet Vinted si possible. Claude
   corrigera `selecteurs.js`. Ensuite :

1. `git pull` à la racine du projet ;
2. `chrome://extensions` → bouton **↻** (recharger) sur la carte de l'extension ;
3. rechargez l'onglet Vinted.

## Dépannage

| Problème | Solution |
|---|---|
| « Extension Chrome : inactive » dans l'application | Chrome est fermé, ou l'extension est en pause : ouvrez sa fenêtre |
| « Jeton refusé » | Créez un nouveau jeton et saisissez-le dans les Réglages de l'extension |
| L'article reste « en attente » | L'extension est en pause (badge « ! ») ou attend les 10 minutes entre deux articles |
| Article au statut « Erreur » | La publication a échoué : lisez le message sur la fiche, vérifiez sur Vinted, puis « Publier sur Vinted » |
| Erreur « contrôle avant envoi » | Un champ n'a pas été rempli comme prévu ; rien n'a été publié (voir §8) |

## Annexe : format du relevé de l'extension

Pour Claude (agent `analyste-releve`) : contenu du fichier `diagnostic-vinted-….json`.

- `adresse`, `date`, `etat` (`pret`, `verification`, `bloque`, `deconnecte`).
- **Relevé automatique** (erreur pendant une publication) : `etape` (photos, titre, description, categorie, marque,
  taille, etat, couleurs, prix, colis), `erreur`, `selecteursTrouves`, `elements`.
- **Relevé à la demande** (bouton Diagnostic) : `selecteursTrouves`, `elements`, `apparusApresClicCategorie`,
  `options « Femmes »` (ancêtres des éléments dont le texte est « Femmes »).
- Chaque élément : `balise`, `type`, `name`, `id`, `testid`, `role`, `aria`, `ariaExpanded`, `placeholder`,
  `valeur` (ce que le champ contient, y compris ce que Vinted a pré-rempli), `coche`, `classe`, `texte` (80
  caractères, en minuscules, espaces regroupés), `visible`.
- `selecteursTrouves` : pour chaque champ de `SELECTEURS.champs`, le premier sélecteur présent, ou `null`. Un `null`
  n'est pas forcément une erreur (champ affiché seulement après le choix de la catégorie).
