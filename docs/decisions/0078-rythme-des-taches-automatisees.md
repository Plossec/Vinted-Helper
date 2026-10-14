# ADR-0078 — Rythme des tâches automatisées

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur et Claude
- **Issue** : #190
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : fréquence, pause et plafond sont **réglables tâche par tâche** dans les réglages du
compte, dans des **limites imposées** contre le spam (valeurs par défaut et limites proposées par Claude, fréquence
fixée par l'utilisateur).

| Tâche | Fréquence | Pause entre deux actions | Plafond par jour |
|---|---|---|---|
| #150 Offres reçues | 1 fois par jour (au plus toutes les 6 h) | 2 min (min. 1 min) | 30 réponses (max. 50) |
| #151 Bordereaux | 1 fois par jour (au plus toutes les 6 h) | 1 min (min. 30 s) | 30 (max. 50) |
| #148 Finalisation | 1 fois par jour (au plus toutes les 6 h) | 1 min (min. 30 s) | 50 (max. 100) |
| #147 Dormants | 1 fois par jour (au plus toutes les 6 h) | baisse 2 min (min. 1 min) ; republication 10 min (min. 10 min) | 20 baisses (max. 40) ; 10 republications (max. 20) |
| #149 Favoris | 1 fois par jour (au plus toutes les 6 h) | 5 min (min. 3 min) | 10 offres (max. 20) |

| Sujet | Décision |
|---|---|
| Enchaînement | **Une seule action à la fois** sur Vinted, par priorité : offres (#150) > bordereaux (#151) > publication > finalisation (#148) > dormants (#147) > favoris (#149). |
| Horaires | **8 h – 22 h** (heure de Paris), plage réglable. |
| Publication | Rythme inchangé (10 min entre deux annonces). |
| Piste (hors périmètre, §10) | Réglages avancés du rythme en **option payante** si l'application devient publique un jour. |
