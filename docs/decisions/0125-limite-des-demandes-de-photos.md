# ADR-0125 — Limite des demandes de photos (@fastify/rate-limit)

- **Date** : 22/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #303
- **Thème** : Serveur
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

Alerte GitHub code scanning #1 (CodeQL, « Missing rate limiting », gravité « High ») : les routes qui envoient les
photos et vignettes lisent un fichier sur le disque sans limite du nombre de demandes. Risque réel faible : ces routes
exigent une session ou le jeton de l'extension, et une demande anonyme est refusée avant tout accès au disque.

## Décision

| Sujet | Décision |
|---|---|
| Correction | Ajouter une limite plutôt qu'ignorer l'alerte (choix de l'utilisateur). |
| Dépendance | **`@fastify/rate-limit`**, module officiel de Fastify, reconnu par CodeQL (l'alerte se ferme seule) ; version 11.2.1, publiée en octobre 2026, plutôt que la 11.3.0 sortie deux jours avant (choix de l'utilisateur pour le module ; version : choix de Claude, *à relire*). |
| Portée | Aucune limite globale : seulement les routes des photos (choix de Claude, *à relire*). |
| Plafond | **1 000 demandes par minute et par utilisateur** (adresse IP à défaut), large pour la mosaïque de la liste ; au-delà, refus 429 « Trop de demandes de photos : réessayez dans une minute. » (choix de Claude, *à relire*). |

## Conséquences

- `server/src/app.ts` (enregistrement du module), `server/src/photos/routes.ts` (limite des deux routes GET).
- Une autre route signalée plus tard pourra déclarer sa propre limite de la même façon.
