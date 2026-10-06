# Vinted Helper

Application web (installable sur téléphone) pour gérer les achats en vide-grenier, le stock, les ventes Vinted et la
rentabilité. Usage personnel, en local sur votre PC, puis plus tard sur un serveur OVH.

> **En cours : lot 1 — socle** (connexion, fiches article sans photo, statuts Brouillon / À publier / En ligne,
> listes de référence). Les fonctionnalités arrivent lot par lot (voir `docs/cahier-des-charges.md`, §9).

---

## 1. Prérequis (à vérifier une seule fois)

Toutes les commandes se tapent dans **PowerShell** (menu Démarrer → « PowerShell »).
Ne travaillez jamais dans `C:\WINDOWS\System32` : placez-vous dans votre dossier (`cd $HOME\Documents\Vinted-Helper`).

| Outil | Vérification | Résultat attendu |
|---|---|---|
| Git pour Windows | `git --version` | `git version 2.…` |
| Node.js 22 ou plus | `node --version` | `v22.…` ou plus |
| Docker Desktop | `docker --version` | `Docker version …` |

### Si une commande n'est pas reconnue

- **Git** : téléchargez et installez https://git-scm.com/download/win (options par défaut). Rouvrez PowerShell.
- **Node.js** : téléchargez la version « LTS » sur https://nodejs.org et installez-la (options par défaut). Rouvrez PowerShell.
- **Docker Desktop** :
  1. Ouvrez PowerShell **en tant qu'administrateur** (clic droit → « Exécuter en tant qu'administrateur ») et tapez
     `wsl --install`. Redémarrez le PC si c'est demandé.
  2. Téléchargez et installez Docker Desktop : https://www.docker.com/products/docker-desktop/ (option « Use WSL 2 »).
  3. Lancez **Docker Desktop** et attendez que la baleine en bas à gauche soit verte (« Engine running »).
  4. Dans un PowerShell normal, `docker --version` doit répondre.

> Docker Desktop doit être **lancé** chaque fois que vous utilisez l'application.

---

## 2. Installation (une seule fois)

```powershell
cd $HOME\Documents
git clone https://github.com/Plossec/Vinted-Helper.git   # inutile si le dossier existe déjà
cd Vinted-Helper
git switch main
git pull
```

### Créer votre fichier de configuration `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

Dans le Bloc-notes, remplacez au minimum :
- `POSTGRES_PASSWORD` : un mot de passe long de votre choix (il protège la base) ;
- `COMPTE_IDENTIFIANT` et `COMPTE_MOT_DE_PASSE_INITIAL` : votre identifiant et votre mot de passe de connexion
  (8 caractères minimum). **Ils ne servent qu'au tout premier démarrage**, pour créer votre compte : ensuite, changez
  le mot de passe dans l'application (Réglages) ; modifier le `.env` n'aura plus d'effet ;
- si un PostgreSQL est déjà installé sur votre PC : `POSTGRES_PORT=15432` (voir Dépannage).

Enregistrez et fermez. **Ne partagez jamais ce fichier** : il n'est pas envoyé sur GitHub (c'est voulu).

### Installer les bibliothèques du projet

```powershell
npm ci
```

Résultat attendu : `added … packages` et `found 0 vulnerabilities` (cela prend une à deux minutes la première fois).

---

## 3. Démarrer et arrêter

| Action | Commande | Remarque |
|---|---|---|
| **Démarrer** | `docker compose up -d --build` | La première fois : quelques minutes (téléchargements) |
| **Ouvrir l'application** | http://localhost:3000 dans votre navigateur | Écran de connexion : identifiant et mot de passe du compte |
| **Voir l'état** | `docker compose ps` | `app` et `db` doivent être `running` |
| **Voir les messages** | `docker compose logs -f app` | `Ctrl + C` pour quitter l'affichage |
| **Arrêter** | `docker compose stop` | Les données sont conservées |

> ⚠️ **Ne lancez jamais `docker compose down -v`** : l'option `-v` efface définitivement la base de données.

---

## 4. Accès depuis le téléphone

Le téléphone utilise une connexion sécurisée (HTTPS), indispensable pour installer l'application et utiliser
l'appareil photo. Elle fonctionne **sur le Wi-Fi de la maison**, PC allumé et application démarrée.
Réglage à faire **une seule fois**.

### Étape 1 — Trouver l'adresse IP du PC

Dans PowerShell :

```powershell
ipconfig
```

Repérez le bloc **« Carte réseau sans fil Wi-Fi »** (ou « Ethernet » si le PC est branché par câble) et notez
l'**Adresse IPv4**, par exemple `192.168.1.20`.

> Conseil : pour que cette adresse ne change pas, réservez-la dans l'interface de votre box (« bail DHCP statique »).
> Si elle change un jour, refaites les étapes 2 et 3 (le certificat, lui, reste valable).

### Étape 2 — Indiquer l'adresse dans `.env`

```powershell
notepad .env
```

Ajoutez (ou modifiez) la ligne `IP_PC=192.168.1.20` avec **votre** adresse, enregistrez, puis :

```powershell
docker compose up -d --build
```

Résultat attendu : `docker compose ps` affiche trois services, `app`, `db` et `https`.
Si Windows demande d'autoriser Docker sur le réseau : acceptez pour les **réseaux privés**.

### Étape 3 — Installer le certificat sur le téléphone (une seule fois)

1. Sur le téléphone (connecté au Wi-Fi de la maison), ouvrez Chrome à l'adresse `http://192.168.1.20:8080/certificat.crt`
   (avec votre adresse). Le fichier est téléchargé.
2. Ouvrez **Paramètres** → cherchez **« certificat »** → **Installer un certificat** → **Certificat CA**
   (selon la marque : Sécurité → Plus de paramètres de sécurité → Chiffrement et identifiants).
3. Confirmez « Installer quand même », puis choisissez le fichier `certificat.crt` téléchargé.

Ce certificat est créé sur **votre** PC : il ne sert qu'à reconnaître votre application.

### Étape 4 — Ouvrir et installer l'application

1. Dans Chrome : `https://192.168.1.20:8443` (avec votre adresse). Pas d'avertissement de sécurité : c'est bon.
2. Connectez-vous, puis menu **⋮** → **Ajouter à l'écran d'accueil** → **Installer**.

| Problème | Solution |
|---|---|
| La page ne s'ouvre pas | Même Wi-Fi que le PC ? Application démarrée ? `docker compose ps` doit montrer `https` |
| « Votre connexion n'est pas privée » | Le certificat n'est pas installé (étape 3), ou `IP_PC` ne correspond pas à l'adresse tapée |
| L'adresse IP du PC a changé | Mettez à jour `IP_PC` dans `.env`, `docker compose up -d`, et utilisez la nouvelle adresse |

En vide-grenier (hors Wi-Fi de la maison), les achats saisis sont **gardés sur le téléphone** et envoyés
automatiquement au retour sur le Wi-Fi de la maison. L'accès depuis partout viendra avec l'hébergement OVH
([issue #2](https://github.com/Plossec/Vinted-Helper/issues/2)).

---

## 5. Réinitialiser le mot de passe

En temps normal, changez le mot de passe dans l'application : **Réglages → Changer le mot de passe**.

En cas d'oubli, l'application doit être démarrée, puis dans PowerShell (dossier du projet) :

```powershell
docker compose exec -it app npm run reset-password -w server
```

Tapez deux fois le nouveau mot de passe (8 caractères minimum ; il s'affiche sous forme d'étoiles), puis Entrée.
Résultat attendu : `Mot de passe modifié. Toutes les sessions ont été fermées : reconnectez-vous.`

---

## 6. Sauvegarde et restauration

### Sauvegarder la base

L'application doit être démarrée. Puis :

```powershell
npm run db:sauvegarde
```

Résultat attendu : `Sauvegarde créée : sauvegardes/AAAA-MM-JJ_HH-MM-SS.sql`. Le dossier `sauvegardes` n'est pas envoyé
sur GitHub. Copiez de temps en temps ces fichiers ailleurs (clé USB, cloud).

> Une sauvegarde est faite **avant chaque migration** de la base. La sauvegarde automatique quotidienne et la
> procédure de restauration complète (testée) arrivent au lot 7.

### Photos

Les photos des articles seront dans le dossier `data\photos` du projet (à partir du lot 2). Pensez à le copier aussi.

---

## 7. Mettre à jour l'application

```powershell
git switch main
git pull
npm ci
docker compose up -d --build
```

Les évolutions de la base (migrations) s'appliquent automatiquement au démarrage, sans perte de données.

---

## 8. Lancer les tests

```powershell
npm test                          # tous les tests
npm test -w server -- calculs     # uniquement les calculs (règle d'arrondi, cas de l'annexe)
```

Résultat attendu : `Tests  … passed` et aucun `failed`.

Autres vérifications : `npm run typecheck` (types), `npm run lint` (qualité du code).

---

## 9. Dépannage

| Problème | Solution |
|---|---|
| `docker : terme non reconnu` | Docker Desktop n'est pas installé (voir §1) |
| `error during connect` / `cannot find the file specified` | Docker Desktop n'est pas lancé : ouvrez-le et attendez « Engine running » |
| `env file … .env not found` | Le fichier `.env` manque : `Copy-Item .env.example .env` (§2) |
| `port is already allocated` (3000 ou 5432) | Un autre programme utilise ce port : changez `PORT` ou `POSTGRES_PORT` dans `.env`, puis relancez |
| `ports are not available … 5432 … forbidden by its access permissions` | Le port 5432 est déjà pris, le plus souvent par un **PostgreSQL déjà installé sur le PC** (ou réservé par Windows). Dans `.env`, mettez `POSTGRES_PORT=15432`, puis `docker compose up -d --build`. Les deux bases cohabitent sans problème |
| La page affiche « Base de données indisponible » | `docker compose ps` : `db` doit être `healthy`. Sinon `docker compose logs db` |
| La page affiche « Serveur injoignable » | `docker compose logs app` et copiez le message à Claude |
| `npm : terme non reconnu` | Node.js n'est pas installé (voir §1) |
| `port is already allocated` (8443 ou 8080) | Un autre programme utilise ce port : fermez-le, ou demandez à Claude de changer le port du service `https` |
| Des achats restent « en attente d'envoi » | Le téléphone doit être sur le Wi-Fi de la maison, PC et application démarrés ; si le bandeau dit « session expirée », reconnectez-vous : rien n'est perdu |
| Tout autre message d'erreur | Copiez-le tel quel à Claude |

---

## 10. Utilisation au quotidien

### En vide-grenier (onglet **Terrain**)

1. **Démarrer une sortie** : choisissez le lieu, la date (aujourd'hui par défaut), puis « Démarrer la sortie ».
2. **+ Achat** : l'appareil photo s'ouvre → photo → tapez le **prix** → **Valider**. Pour un **lot** (ex. 4 maillots
   pour 15 €), indiquez le prix total et le nombre d'articles : 4 brouillons sont créés, à 3,75 € chacun, avec la même
   photo. « Achat sans photo » si besoin.
3. **Essence** : à saisir quand vous voulez (pendant ou après) ; elle est répartie automatiquement sur les articles.
4. **Terminer la sortie** quand vous rentrez. La sortie reste modifiable dans **Terrain → Toutes les sorties**.

Sans réseau, tout est **gardé sur le téléphone** : le bandeau affiche « N éléments en attente d'envoi » et l'envoi se
fait tout seul au retour sur le Wi-Fi de la maison (les références `#0127` sont attribuées à ce moment-là).

Article de la maison : **Terrain → Article de la maison** (0 €, sans sortie, lieu « Maison »).

### À la maison (onglet **Articles**)

Ouvrez un brouillon pour compléter sa fiche (nom, catégorie, marque, état…), ajouter les **photos de l'annonce**
(galerie : plusieurs à la fois, ou appareil photo), les réordonner (← →) et choisir la **photo principale** (★).
Pour un article de lot, c'est le **prix total du lot** qui se corrige ; il est réparti à nouveau sur les articles.

### Nouvelle version

Après une mise à jour (§7), le téléphone affiche « Nouvelle version disponible — Mettre à jour » : touchez
« Mettre à jour ».

---

## Pour aller plus loin

- `docs/cahier-des-charges.md` : le besoin complet (fait foi).
- `docs/decisions.md` : les décisions prises en cours de route.
- `CHANGELOG.md` : l'historique des versions.
- `CLAUDE.md` : les consignes de développement pour Claude.
