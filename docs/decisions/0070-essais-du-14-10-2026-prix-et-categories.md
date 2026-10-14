# ADR-0070 — Essais du 14/10/2026 : prix et catégories

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : Claude
- **Issue** : #176
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Décision

- Essais du 14/10/2026 (#176) :
  - prix : « NaN € » lu sur Vinted pour « 9,00 » saisi. Vinted reformate désormais le champ (« 9.00 € ») et ne lit
    pas la virgule. Le prix est saisi avec un point, puis relu à l'étape prix. Un contrôle avant envoi en échec joint
    maintenant un relevé.
  - catégorie : « Pulls col V » n'existe pas sur Vinted. Hommes › Vêtements › Sweats et pulls reprend la liste exacte
    de Vinted (journal d'erreur). Les articles déjà classés sont repris par la migration 0012 (Sweats à capuche →
    Pulls et pulls à capuche, Sweats zippés → Pulls à capuche avec zip, Pulls → Pulls ras de cou, Pulls col roulé →
    Pulls à col roulé, Pulls col V → Sweats à col V, Gilets → Cardigans). Les autres rayons seront rapprochés de
    Vinted à partir de relevés (#177).
