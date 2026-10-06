# Décisions — Lot 2 — saisie terrain (et HTTPS local)

[← Index des décisions](README.md)

## 05/10/2026 — HTTPS local pour le téléphone (issue #3) *à relire*

**Décision** : relais **Caddy** (image Docker officielle `caddy:2-alpine`, service `https` du `docker-compose.yml`)
avec son **autorité de certification locale** (équivalent de mkcert, sans rien installer sous Windows).
- Application : `https://<IP du PC>:8443` ; certificat racine téléchargeable sur `http://<IP du PC>:8080/certificat.crt`
  (seul ce fichier est servi, jamais la clé). L'adresse IP est indiquée dans `.env` (`IP_PC`).
- Le certificat racine est conservé dans un volume Docker (`certificats`) : installé une seule fois sur le téléphone.
- Le serveur fait confiance au relais (`trustProxy`) pour poser le cookie de session en mode sécurisé.

**Raison** : gratuit, tout reste à la maison, adresse stable (indispensable : la file d'attente hors réseau et
l'installation PWA sont liées à l'adresse). Le tunnel Cloudflare gratuit change d'adresse à chaque démarrage (file
d'attente perdue) et exposerait le PC sur internet. Limite : hors Wi-Fi de la maison, les achats restent en attente
sur le téléphone jusqu'au retour (accès depuis partout : OVH, issue #2).

---

## 06/10/2026 — Lot 2 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Dépendance | `sharp` (serveur) : vignettes 400 px des photos (listes légères sur le téléphone) et, au lot 7, réduction à ~1600 px. Fonctionne sous Windows, Linux et dans l'image Docker (versions précompilées, aucun outil à installer). |
| Photo terrain | Facultative (« Achat sans photo ») pour ne jamais bloquer une saisie ; l'original est gardé en pleine qualité (§5.10). |
| Lot | Un achat de N > 1 articles crée un lot : le prix d'achat de chaque article n'est pas stocké, il est calculé (part du prix total). On corrige le **prix total du lot** depuis la fiche. |
| Ordre de répartition | Les articles d'un lot ou d'une sortie sont ordonnés par référence croissante : le « dernier » (qui reçoit le reste) est celui de plus grande référence. |
| Article Maison | Bouton « Article de la maison » sur l'écran Terrain : photo, sans prix, sans sortie, lieu « Maison », 0 €. Plusieurs articles Maison d'un coup = articles séparés (pas de lot). |
| Sortie | Lieu choisi dans la liste existante (pas de création hors ligne, issue #7). Changer la date ou le lieu d'une sortie les reporte sur ses articles. « Terminer la sortie » ne fait qu'oublier la sortie en cours sur le téléphone. |
| File d'attente | Ordre d'envoi = ordre de saisie ; arrêt au premier problème de réseau ; session expirée → tout est gardé jusqu'à la reconnexion ; un élément refusé par le serveur est mis de côté avec son message (Réessayer / Abandonner). |
| Photos d'annonce | Envoyées directement depuis la fiche (réseau nécessaire) : elles se font à la maison. |
| PWA | Service worker écrit à la main (pas de nouvelle dépendance) : l'application est gardée sur le téléphone, l'API n'est jamais mise en cache. Ouverture sur l'écran Terrain. |

---

## 06/10/2026 — Lieu de la sortie en saisie libre (demande de l'utilisateur)

Remplace la ligne « Sortie » ci-dessus pour le choix du lieu. Écran Terrain → Démarrer une sortie : le **lieu est un
texte libre**, avec les lieux connus proposés pendant la frappe. Un nom déjà connu (sans tenir compte des majuscules
ni des accents) réutilise ce lieu ; un nom nouveau est **ajouté à la liste des lieux** à l'envoi de la sortie, y
compris saisi sans réseau (le téléphone envoie le nom, le serveur retrouve ou crée le lieu). Couvre la « création
automatique depuis la saisie terrain » de l'issue #7.
