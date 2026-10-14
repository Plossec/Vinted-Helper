# ADR-0009 — HTTPS local pour le téléphone

- **Date** : 05/10/2026
- **Statut** : Accepté
- **Décideurs** : Claude ; validé par l'utilisateur le 14/10/2026 (#203)
- **Issue** : #3
- **Thème** : Serveur

[← Index des décisions](README.md)

## Décision

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
