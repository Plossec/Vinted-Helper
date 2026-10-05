# Vinted Helper

Application web (installable sur téléphone) pour gérer les achats en vide-grenier, le stock, les ventes Vinted et la
rentabilité. Usage personnel, en local sur votre PC, puis plus tard sur un serveur OVH.

> **Version actuelle : 0.0.1 (lot 0 — mise en place).** L'application affiche pour l'instant uniquement son état
> (version et connexion à la base). Les fonctionnalités arrivent lot par lot (voir `docs/cahier-des-charges.md`, §9).

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
- les autres valeurs peuvent rester telles quelles pour le lot 0.

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
| **Ouvrir l'application** | http://localhost:3000 dans votre navigateur | Doit afficher « Version 0.0.1 » et « Base de données connectée » |
| **Voir l'état** | `docker compose ps` | `app` et `db` doivent être `running` |
| **Voir les messages** | `docker compose logs -f app` | `Ctrl + C` pour quitter l'affichage |
| **Arrêter** | `docker compose stop` | Les données sont conservées |

> ⚠️ **Ne lancez jamais `docker compose down -v`** : l'option `-v` efface définitivement la base de données.

---

## 4. Accès depuis le téléphone

Pas encore disponible : il nécessite une connexion sécurisée (HTTPS), mise en place **juste avant le lot 2**
([issue #3](https://github.com/Plossec/Vinted-Helper/issues/3)). Pour l'instant, l'application n'est accessible que
depuis votre PC.

---

## 5. Réinitialiser le mot de passe

Disponible à partir du lot 1 (création du compte).

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
| La page affiche « Base de données indisponible » | `docker compose ps` : `db` doit être `healthy`. Sinon `docker compose logs db` |
| La page affiche « Serveur injoignable » | `docker compose logs app` et copiez le message à Claude |
| `npm : terme non reconnu` | Node.js n'est pas installé (voir §1) |
| Tout autre message d'erreur | Copiez-le tel quel à Claude |

---

## Pour aller plus loin

- `docs/cahier-des-charges.md` : le besoin complet (fait foi).
- `docs/decisions.md` : les décisions prises en cours de route.
- `CHANGELOG.md` : l'historique des versions.
- `CLAUDE.md` : les consignes de développement pour Claude.
