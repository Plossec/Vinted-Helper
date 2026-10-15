# ADR-0090 — Un seul terme : « bénéfice attendu »

- **Date** : 15/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #193
- **Thème** : Tableau de bord

[← Index des décisions](README.md)

## Contexte

Une même valeur, **prix vendu − coût total** d'un article vendu non finalisé, portait deux noms : « bénéfice en
cours » (tableau de bord, [ADR-0040](0040-ca-et-benefice-theoriques-ventes-en-cours.md), #85) et « bénéfice
attendu » (fiche article, [ADR-0057](0057-statuts-distincts-montants-homogenes-benefice-attendu.md), #105).
Demande citée : « Bénéfice attendu ».

## Décision

| Sujet | Décision |
|---|---|
| Terme | **« Bénéfice attendu »** partout (interface, cahier des charges §6.5 et §6.6, guides, code). |
| « Théorique » | **Gardé** dans le tableau de bord (réalisé + en cours, pour le CA comme pour le bénéfice) : il désigne une autre valeur. |
| Calcul | Inchangé ; le « bénéfice provisoire » (−coût total, §6.5) reste distinct. |

## Conséquences

- L'interface disait déjà « bénéfice attendu » (fiche article) et n'affichait pas « bénéfice en cours » : seul le
  cahier des charges change (§6.5 : définition ajoutée ; §6.6 : « Ventes en cours » et « CA / bénéfice théoriques »),
  avec l'accord de l'utilisateur donné dans l'issue.
- [ADR-0040](0040-ca-et-benefice-theoriques-ventes-en-cours.md) : terme modifié par cet ADR.
