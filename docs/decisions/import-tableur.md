# Décisions — Import de l'ancien tableur

[← Index des décisions](README.md)

## 07/10/2026 — Import du tableur « compte 2026 - Vinted » (demande de l'utilisateur)

| Sujet | Décision |
|---|---|
| Méthode | Le tableur (CSV) est transformé par Claude en un fichier JSON, **jamais versionné** (données personnelles, dépôt public), puis importé sur le serveur par `npm run import-tableur -w server` : les fonctions de l'application créent sorties, achats, mises en ligne et ventes (références, historiques et calculs cohérents), le tout dans **une seule transaction** ; mode `--essai` sans rien enregistrer ; un second import est refusé. Plutôt que des `INSERT` SQL écrits à la main. |
| Articles vendus | Finalisés ; ceux vendus depuis le 05/10/2026 restent **Envoyé** (à finaliser dans l'application). Date d'envoi et de finalisation = date de vente. |
| Jamais mis en ligne | **Brouillon** (fiches à compléter : catégorie, photos, annonce). Un prix estimé éventuel est gardé dans les notes. |
| Lots | 4 lots recréés d'après les prix de part (1,67 € ×6 = 10 € ; 3,75 € ×4 = 15 € ; 2,75 € ×2 = 5,50 € ; 1,66 € ×2 = 3,32 €) : parts recalculées par l'application (écarts de quelques centimes avec le tableur). |
| Sorties et essence | Une sortie par date et lieu (hors Maison), essence = somme de la colonne Essence ; lieux inconnus (« LBC Turq », « LBC foot ») ajoutés à la liste. |
| Ventes | Prix vendu = montant crédité, emballage de la ligne ; les deux chinos Tommy Hilfiger du 05/10 (emballage 0,04 € chacun) = une **vente groupée** de 15 €. |
| Colonnes | « Type » → Gamme ; marque reconnue dans le nom (liste de marques, complétée si besoin) ; la catégorie Vinted reste à choisir sur chaque fiche. |
| Corrections | Vente du « Jogging adidas trefoil multi » : 09/08/2028 → 09/08/2026 ; vente du « Polo Ralph Lauren » : 22/06/2026 → 22/09/2026 (validé par l'utilisateur). |
| Heures | Évènements datés à 8 h (heure de Paris) le jour indiqué, à quelques minutes d'écart pour garder l'ordre. |
