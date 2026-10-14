# ADR-0061 — Fiche article organisée autour du statut

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #98
- **Thème** : Interface
- **À relire** : oui (points tranchés par Claude, marqués « *à relire* » ou « choix de Claude »)

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : sections ouvertes **selon le statut** ; la création d'un article est **inchangée**.
- En-tête : photo (première photo d'annonce, sinon terrain), badge, prix affiché, bénéfice (et attendu).
- « Statut et prochaine étape » juste dessous, toujours ouvert : un conseil par statut (`etapeSuivante`,
  `client/src/statuts.ts`) et le passage attendu en bouton plein, en premier ; les autres passages (retour en
  arrière, sortie du stock) en boutons secondaires. Historique replié, du plus récent au plus ancien.
- Avant la vente (Brouillon, À publier, Erreur) : Fiche, Photos, Annonce, Vinted ouverts ; Achat, Montants repliés.
  Ensuite : Montants ouvert en tête, le reste (Fiche comprise) replié. Sections repliables avec `<details>` : une
  saisie en cours n'est pas perdue en repliant (#99).
- Points tranchés par Claude (*à relire*) : la photo de l'en-tête suffit pour « voir la photo à côté des champs » ;
  sur PC la fiche reste à gauche et les blocs à droite (#106), sous « Statut et prochaine étape » en pleine largeur.
