# ADR-0012 — Annuler la sortie

- **Date** : 06/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : —
- **Thème** : Saisie terrain

[← Index des décisions](README.md)

## Décision

- Bouton **Annuler la sortie** sur l'écran Terrain (sortie en cours), avec confirmation indiquant le nombre d'achats.
- Choix de l'utilisateur : les articles de la sortie vont **à la corbeille** (restaurables 30 jours) ; restaurés, ils
  n'ont plus de sortie (lieu et date d'achat conservés, plus d'essence). Les lots perdent leur sortie ; la sortie et
  son essence sont supprimées.
- Sans réseau : ce qui n'est pas encore envoyé (sortie, achats, photos, essence) est retiré du téléphone, puis
  l'annulation est mise dans la file ; le serveur l'accepte même si la sortie ne lui est jamais parvenue.
