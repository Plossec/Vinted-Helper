# Sauvegarde et restauration (sur le PC)

[← Sommaire de la documentation](../README.md)

## Sauvegarde automatique (tous les jours)

Le service `sauvegarde` (démarré avec l'application) sauvegarde chaque jour, à partir de 3 h du matin ou dès que le PC
est allumé ensuite :
- la base : `sauvegardes\auto\AAAA-MM-JJ-base.sql.gz` ;
- les photos : `sauvegardes\auto\AAAA-MM-JJ-photos.tar.gz`.

Les sauvegardes de plus de 30 jours sont effacées automatiquement. Vérifier : `docker compose logs sauvegarde`
(dernière ligne « Sauvegarde terminée »).

> **Copie hors du PC** : en attendant l'hébergement OVH ([issue #2](https://github.com/Plossec/Vinted-Helper/issues/2)),
> copiez régulièrement le dossier `sauvegardes\auto` sur une clé USB ou un cloud (OneDrive, Google Drive…).
> Une sauvegarde qui reste sur le même PC ne protège pas d'une panne de disque.

## Sauvegarde manuelle (avant une mise à jour)

```powershell
npm run db:sauvegarde
```

Résultat attendu : `Sauvegarde créée : sauvegardes/AAAA-MM-JJ_HH-MM-SS.sql` (base uniquement).

## Restaurer une sauvegarde automatique

⚠️ La base actuelle est **remplacée** par celle de la sauvegarde choisie (les données saisies depuis sont perdues).

```powershell
docker compose stop app
docker compose exec sauvegarde sh /scripts/restaurer.sh
```

La deuxième commande affiche les dates disponibles. Relancez-la avec la date choisie, puis redémarrez l'application :

```powershell
docker compose exec sauvegarde sh /scripts/restaurer.sh 2026-10-06
docker compose start app
```

Résultat attendu : `Restauration terminée.` Les photos de la sauvegarde sont remises en place (les photos plus
récentes déjà présentes sont gardées). Procédure testée le 06/10/2026.
