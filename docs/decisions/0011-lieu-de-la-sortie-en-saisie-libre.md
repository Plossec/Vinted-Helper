# ADR-0011 — Lieu de la sortie en saisie libre

- **Date** : 06/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #7
- **Thème** : Saisie terrain

[← Index des décisions](README.md)

## Décision

Remplace la ligne « Sortie » de [ADR-0010](0010-lot-2-choix-pris-en-autonomie.md) pour le choix du lieu. Écran Terrain → Démarrer une sortie : le **lieu est un
texte libre**, avec les lieux connus proposés pendant la frappe. Un nom déjà connu (sans tenir compte des majuscules
ni des accents) réutilise ce lieu ; un nom nouveau est **ajouté à la liste des lieux** à l'envoi de la sortie, y
compris saisi sans réseau (le téléphone envoie le nom, le serveur retrouve ou crée le lieu). Couvre la « création
automatique depuis la saisie terrain » de l'issue #7.
