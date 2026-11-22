# ADR-0118 — Regroupement des photos par article plus fiable

- **Date** : 18/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 22/11/2026 (#250)
- **Issue** : #280
- **Thème** : IA Gemini

[← Index des décisions](README.md)

## Contexte

Premier essai réel des « Nouveaux articles par photos » ([ADR-0117](0117-articles-crees-par-photos.md)) : 3 photos
d'une même paire de bottines noires (côté, mètre ruban, face) donnent 3 articles, sans message d'erreur : l'IA a
répondu mais s'est trompée. Les photos lui étaient envoyées très réduites (384 px), sans numéro devant chaque image,
avec une consigne courte et une « température » de 0,7 (réponses variées).

## Décision

| Sujet | Décision |
|---|---|
| En cas de doute | L'IA **regroupe** avec la photo précédente plutôt que de créer un article : il est plus simple de séparer une photo que d'en réunir plusieurs (choix de l'utilisateur). |
| Consigne | Même objet sous un autre angle, de plus près ou en partie = même article ; **une paire = un seul article** ; photos d'un article prises à la suite, sur le même fond ; gros plan, étiquette ou mesure rattachés à l'objet de la photo précédente (issue #280). |
| Numérotation | Chaque image est précédée de son numéro (« Photo 0 », « Photo 1 »…) pour que l'IA ne se trompe pas de photo (choix de Claude, *à relire*). |
| Taille des photos | 768 px de côté au lieu de 384 (environ 5 Mo pour 60 photos, sous la limite de Gemini) (issue #280 ; valeur : choix de Claude, *à relire*). |
| Température | 0,1 pour ce seul appel (classement, pas rédaction) ; les autres appels gardent 0,7 (choix de Claude, *à relire*). |
| Écran | Si l'IA échoue, l'écran n'écrit plus « L'IA propose N article(s) » mais « Regroupement à faire à la main » (issue #280). |

## Conséquences

- `server/src/ia/gemini.ts` : une image peut porter une légende, un appel peut choisir sa température.
- `server/src/ia/articles-par-photos.ts` : nouvelle consigne, 768 px, température 0,1.
- [ADR-0117](0117-articles-crees-par-photos.md) : ligne « Regroupement » précisée par cette décision.
- Le regroupement reste une proposition : l'utilisateur la corrige avant de créer les brouillons.
