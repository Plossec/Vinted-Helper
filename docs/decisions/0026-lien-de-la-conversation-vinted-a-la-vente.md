# ADR-0026 — Lien de la conversation Vinted à la vente

- **Date** : 07/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #48
- **Thème** : Ventes

[← Index des décisions](README.md)

## Décision

- Champ facultatif « Lien de la conversation Vinted » dans le formulaire « Vendu : à expédier » ; enregistré sur
  chaque article du colis (colonne `article.url_conversation`, migration 0007, ajout de colonne sans perte).
- Modifiable ensuite dans la section Vinted de la fiche (affichée dès qu'un article est vendu) ; icône 💬 dans
  l'alerte « À expédier » (choix de l'utilisateur). Seules les adresses `https` d'un site Vinted sont acceptées ;
  simple lien enregistré, l'application n'interroge jamais Vinted.
