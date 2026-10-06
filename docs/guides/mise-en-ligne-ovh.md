# Mise en ligne sur OVH — guide pas à pas

[← Sommaire de la documentation](../README.md)

But : l'application tourne sur un serveur OVH, joignable **partout** (vide-grenier en 4G compris) à une adresse
`https://…`, avec une sauvegarde chaque nuit. Durée : environ 1 heure la première fois.

Ce que vous faites : commander le serveur, vous y connecter, lancer **une** commande d'installation, répondre à
quelques questions. Toutes les commandes se tapent dans **PowerShell** sur le PC (étapes 2 et 3 : à travers la
connexion SSH, donc sur le serveur).

> Le serveur démarre **vide** (décision du 06/10/2026) : le compte est créé au premier démarrage avec l'identifiant
> et le mot de passe que vous choisirez à l'étape 3.

---

## Étape 1 — Commander le serveur (VPS)

1. Sur https://www.ovhcloud.com/fr/vps/ choisissez l'offre **d'entrée de gamme** (≈ 2 cœurs, 2 à 4 Go de mémoire).
2. Pendant la commande :
   - **Système (image)** : **Ubuntu 24.04** ;
   - **Localisation** : un centre de données en **France** ;
   - **Clé SSH** : aucune (vous avez choisi le mot de passe).
3. Payez. Quelques minutes plus tard, OVH envoie un **e-mail** avec :
   - l'**adresse IPv4** du serveur (ex. `51.75.12.34`) ;
   - le **nom du VPS** (ex. `vps-1234abcd.vps.ovh.net`) : c'est l'**adresse de l'application** ;
   - l'utilisateur **`ubuntu`** et son **mot de passe**.

Gardez cet e-mail.

## Étape 2 — Première connexion au serveur

Dans PowerShell (remplacez par **votre** nom de VPS) :

```powershell
ssh ubuntu@vps-1234abcd.vps.ovh.net
```

- Question « Are you sure you want to continue connecting ? » : tapez `yes` puis Entrée (une seule fois).
- Mot de passe : celui de l'e-mail (rien ne s'affiche pendant la frappe, c'est normal).
- Si le serveur demande de changer le mot de passe : retapez l'ancien, puis deux fois le nouveau.

Choisissez un **mot de passe long** (au moins 16 caractères) : il protège tout le serveur. Pour le changer plus
tard : commande `passwd`.

Résultat attendu : une ligne qui se termine par `ubuntu@vps-1234abcd:~$`. Vous êtes **sur le serveur**.

## Étape 3 — Installer l'application

Toujours connecté au serveur, tapez ces trois commandes l'une après l'autre :

```bash
sudo apt-get update && sudo apt-get install -y git
sudo git clone https://github.com/Plossec/Vinted-Helper.git /opt/vinted-helper
sudo bash /opt/vinted-helper/scripts/ovh/installer.sh
```

Le script fait tout le reste (environ 10 minutes) :
1. installe Docker, le pare-feu (seuls SSH, HTTP et HTTPS sont ouverts), **fail2ban** (bloque les essais de mot de
   passe en série) et les **mises à jour de sécurité automatiques** ;
2. pose les questions suivantes :

| Question | Réponse |
|---|---|
| Adresse de l'application | Entrée pour accepter celle proposée si c'est bien le nom du VPS de l'e-mail ; sinon tapez-le |
| Identifiant | Votre identifiant de connexion à l'application |
| Mot de passe (×2) | Votre mot de passe de l'application (8 caractères minimum, rien ne s'affiche) |
| Clé Gemini | Collez votre clé (voir [ia-gemini.md](ia-gemini.md)), ou Entrée pour plus tard |
| Modèle Gemini | Entrée pour `gemini-2.5-flash`, ou le nom d'un modèle disponible dans Google AI Studio |

3. construit et démarre l'application.

Résultat attendu à la fin : `Installation terminée.` et un tableau où `app`, `db`, `https` et `sauvegarde` sont
`running` (ou `Up`).

Pour quitter le serveur : `exit`.

## Étape 4 — Ouvrir l'application

1. Sur le PC puis sur le téléphone, ouvrez `https://vps-1234abcd.vps.ovh.net` (votre adresse). Le cadenas doit
   apparaître **sans aucun avertissement** (certificat Let's Encrypt, rien à installer). La première fois, le
   certificat peut mettre une minute à arriver : rechargez la page.
2. Connectez-vous avec l'identifiant et le mot de passe choisis à l'étape 3.
3. Sur le téléphone : menu **⋮** → **Ajouter à l'écran d'accueil** → **Installer**.

> **Ancienne application du Wi-Fi de la maison** (`https://192.168…:8443`) : c'est une autre adresse, donc une
> autre application pour le téléphone. Vérifiez qu'elle n'a plus d'« éléments en attente d'envoi », puis
> supprimez son icône. Vous pouvez aussi retirer le certificat installé pour elle (Paramètres → « certificat »).

Si le certificat n'arrive pas (message « connexion non sécurisée » au bout de 5 minutes) : voir *Dépannage*.

## Étape 5 — Sauvegardes

- **Sur le serveur** : automatiques chaque nuit à 3 h (base 30 jours ; photos 7 jours + les dimanches 30 jours),
  dans `/opt/vinted-helper/sauvegardes/auto`.
- **Copie sur le PC** (hors du serveur, une fois par semaine par exemple) — dans PowerShell, dossier du projet :

```powershell
cd $HOME\Documents\Vinted-Helper
powershell -ExecutionPolicy Bypass -File scripts\rapatrier-sauvegardes.ps1
```

  - la première fois, le script demande l'**adresse du serveur** (il la retient ensuite) ;
  - puis le **mot de passe SSH** du serveur (celui de l'étape 2) ;
  - seules les nouvelles sauvegardes sont téléchargées, dans `Documents\Sauvegardes Vinted Helper` (sur le PC, les
    fichiers de plus de 45 jours sont retirés). Placez ce dossier dans OneDrive si vous voulez une copie de plus.

Résultat attendu : `Sauvegardes présentes sur le PC : N fichiers…`.

### Copie automatique sur le PC (recommandé, à faire une fois)

Pour ne plus rien taper : une **clé SSH** dédiée permet au PC de récupérer les sauvegardes seul, chaque jour à 12 h
(ou au démarrage du PC s'il était éteint). Cette clé ne sert qu'à **lire** les sauvegardes : elle ne permet ni de
lancer une commande sur le serveur, ni de modifier ou supprimer quoi que ce soit.

```powershell
cd $HOME\Documents\Vinted-Helper
powershell -ExecutionPolicy Bypass -File scripts\installer-sauvegarde-auto.ps1
```

- le script crée la clé, puis demande le **mot de passe SSH** du serveur **une dernière fois** ;
- il teste le rapatriement avec la clé (aucun mot de passe demandé), puis crée la tâche planifiée
  « Vinted Helper - sauvegardes ».

Résultat attendu : `Installé.` en vert. Pour vérifier plus tard : ouvrez `rapatriement.log` dans
`Documents\Sauvegardes Vinted Helper` (une ligne par jour). Pour lancer la tâche tout de suite :
`Start-ScheduledTask -TaskName "Vinted Helper - sauvegardes"`. Pour l'arrêter définitivement :
`Unregister-ScheduledTask -TaskName "Vinted Helper - sauvegardes"`.

Le script manuel ci-dessus fonctionne toujours (sans mot de passe une fois la clé installée).

### Restaurer une sauvegarde sur le serveur

```bash
ssh ubuntu@vps-1234abcd.vps.ovh.net
cd /opt/vinted-helper
sudo docker compose stop app
sudo docker compose exec sauvegarde sh /scripts/restaurer.sh
```

La dernière commande liste les dates disponibles ; relancez-la avec la date choisie, puis redémarrez :

```bash
sudo docker compose exec sauvegarde sh /scripts/restaurer.sh 2026-10-06
sudo docker compose start app
```

⚠️ La base est **remplacée** par celle de la sauvegarde.

## Mettre à jour l'application

Quand Claude annonce une nouvelle version :

```bash
ssh ubuntu@vps-1234abcd.vps.ovh.net
cd /opt/vinted-helper
sudo bash scripts/ovh/mettre-a-jour.sh
```

Le script sauvegarde la base, récupère la nouvelle version, reconstruit et redémarre (quelques minutes). Résultat
attendu : `Version en ligne : X.Y.Z`. Sur le téléphone, le bandeau « Nouvelle version disponible — Mettre à jour »
apparaît : touchez « Mettre à jour ».

## Autres opérations

| Besoin | Commande (sur le serveur, dans `/opt/vinted-helper`) |
|---|---|
| Voir l'état | `sudo docker compose ps` |
| Voir les journaux | `sudo docker compose logs -f app` (`Ctrl + C` pour quitter) |
| Ajouter ou changer la clé Gemini | `sudo nano .env` (lignes `GEMINI_…`, `Ctrl + O` Entrée pour enregistrer, `Ctrl + X` pour quitter), puis `sudo docker compose up -d` |
| Mot de passe de l'application oublié | `sudo docker compose exec -it app npm run reset-password -w server` |
| Redémarrer | `sudo docker compose restart` |

⚠️ Comme sur le PC : **jamais** `docker compose down -v` (efface la base).

## Utiliser un nom de domaine (plus tard, facultatif)

1. Achetez un domaine (ex. `vinted-helper.fr`, ≈ 10 €/an) chez OVH.
2. Dans l'espace client OVH → Noms de domaine → Zone DNS : ajoutez un enregistrement **A** qui pointe vers
   l'**adresse IPv4** du serveur.
3. Sur le serveur : `sudo nano .env`, remplacez la ligne `DOMAINE=` par votre domaine, enregistrez, puis
   `sudo docker compose up -d`. Le nouveau certificat est obtenu automatiquement.
4. Sur le téléphone, réinstallez l'application depuis la nouvelle adresse (envoyez d'abord les éléments en attente).

## Sécurité en place

- Pare-feu : seuls les ports 22 (SSH), 80 et 443 sont ouverts ; la base de données n'est pas accessible depuis
  internet.
- fail2ban : une adresse qui se trompe plusieurs fois de mot de passe SSH est bloquée temporairement.
- Mises à jour de sécurité d'Ubuntu installées automatiquement.
- HTTPS obligatoire (redirection automatique), cookie de session sécurisé, application protégée par votre
  identifiant et mot de passe (blocage 15 minutes après 5 erreurs).
- Les secrets (mots de passe, clé Gemini) sont uniquement dans `/opt/vinted-helper/.env`, lisible par
  l'administrateur seulement.

## Dépannage

| Problème | Solution |
|---|---|
| `ssh : connexion refusée` ou délai dépassé | Vérifiez l'adresse ; le VPS est-il démarré (espace client OVH) ? |
| `Permission denied` à la connexion SSH | Mot de passe erroné. Après plusieurs erreurs, fail2ban bloque votre adresse 10 minutes : patientez |
| « Connexion non sécurisée » après 5 minutes | `sudo docker compose logs https` et copiez les lignes d'erreur à Claude. Si Let's Encrypt refuse l'adresse OVH (limite atteinte pour `ovh.net`), passez à un nom de domaine (section ci-dessus) |
| La page ne s'ouvre pas | `sudo docker compose ps` : les 4 services doivent être `running` ; sinon `sudo docker compose up -d` |
| L'installation s'arrête sur une erreur | Relancez `sudo bash /opt/vinted-helper/scripts/ovh/installer.sh` (sans risque) ; si l'erreur revient, copiez-la à Claude |
| Le script de rapatriement dit « Échec du téléchargement » | Adresse ou mot de passe SSH erroné, ou pas de réseau |
| Tout autre message | Copiez-le tel quel à Claude |
