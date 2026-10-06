# Vinted Helper

Application web (installable sur téléphone) pour gérer les achats en vide-grenier, le stock, les ventes Vinted et la
rentabilité. Usage personnel, en local sur votre PC, puis plus tard sur un serveur OVH.

> Toutes les fonctionnalités du cahier des charges sont livrées (version 0.7.0). Prochaine étape : la mise en ligne
> sur OVH ([guide](docs/guides/mise-en-ligne-ovh.md)). Ce README couvre l'installation sur le PC ; les autres guides
> sont listés à la fin (« Documentation »).

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

## 4. Réinitialiser le mot de passe

En temps normal, changez le mot de passe dans l'application : **Réglages → Changer le mot de passe**.

En cas d'oubli, l'application doit être démarrée, puis dans PowerShell (dossier du projet) :

```powershell
docker compose exec -it app npm run reset-password -w server
```

Tapez deux fois le nouveau mot de passe (8 caractères minimum ; il s'affiche sous forme d'étoiles), puis Entrée.
Résultat attendu : `Mot de passe modifié. Toutes les sessions ont été fermées : reconnectez-vous.`

---

## 5. Mettre à jour l'application

```powershell
git switch main
git pull
npm ci
docker compose up -d --build
```

Les évolutions de la base (migrations) s'appliquent automatiquement au démarrage, sans perte de données.

---

## 6. Lancer les tests

```powershell
npm test                          # tous les tests
npm test -w server -- calculs     # uniquement les calculs (règle d'arrondi, cas de l'annexe)
```

Résultat attendu : `Tests  … passed` et aucun `failed`.

Autres vérifications : `npm run typecheck` (types), `npm run lint` (qualité du code).

---

## 7. Dépannage

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
| `docker compose logs sauvegarde` affiche « ÉCHEC de la sauvegarde » | Vérifiez que `db` est `healthy` (`docker compose ps`) ; un nouvel essai a lieu toutes les 10 minutes |
| Tout autre message d'erreur | Copiez-le tel quel à Claude |

---

## Documentation

Tout est rangé dans [`docs/`](docs/README.md) :

| Je veux… | Guide |
|---|---|
| Utiliser l'application au quotidien (terrain, fiches, ventes) | [docs/guides/utilisation.md](docs/guides/utilisation.md) |
| Ouvrir l'application sur le téléphone (Wi-Fi de la maison) | [docs/guides/telephone-https.md](docs/guides/telephone-https.md) |
| Sauvegarder ou restaurer mes données | [docs/guides/sauvegarde-restauration.md](docs/guides/sauvegarde-restauration.md) |
| Configurer l'IA Gemini | [docs/guides/ia-gemini.md](docs/guides/ia-gemini.md) |
| Mettre l'application en ligne (OVH) | [docs/guides/mise-en-ligne-ovh.md](docs/guides/mise-en-ligne-ovh.md) |
| Comprendre le besoin complet ou une décision | [docs/README.md](docs/README.md) |
| Voir les nouveautés de chaque version | [CHANGELOG.md](CHANGELOG.md) |
