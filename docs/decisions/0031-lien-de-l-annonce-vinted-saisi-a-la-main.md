# ADR-0031 — Lien de l'annonce Vinted saisi à la main

- **Date** : 07/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #46
- **Thème** : Liste

[← Index des décisions](README.md)

## Décision

- Champ « Lien de l'annonce Vinted » dans la section Vinted de la fiche ; seules les adresses `https` d'un site Vinted
  (vinted.fr, vinted.be…) sont acceptées ; vide = lien retiré. Simple lien enregistré : l'application n'interroge
  jamais Vinted (règle n° 4).
- Un article Brouillon ou À publier passe **En ligne automatiquement** quand un lien est enregistré, s'il a un prix
  affiché (date du jour) ; sinon le lien est gardé et le prix demandé (choix de l'utilisateur).
- Liste des articles : repère « ↗ » qui ouvre l'annonce, dans tous les modes d'affichage (choix de l'utilisateur).
