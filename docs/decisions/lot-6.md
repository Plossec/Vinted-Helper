# Décisions — Lot 6 — IA Gemini

[← Index des décisions](README.md)

## 06/10/2026 — Lot 6 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Accès à Gemini | Requête HTTPS directe depuis le serveur (pas de bibliothèque Google) ; clé dans l'en-tête, jamais dans l'adresse ni dans les journaux. Délai maximal 60 s. Réponse demandée en JSON. |
| Photos envoyées | 4 au plus (principale, autres photos d'annonce, puis photo terrain), réduites à 1024 px pour économiser le quota gratuit. |
| Génération | Le résultat est enregistré directement (il reste modifiable) ; confirmation demandée s'il remplace un texte existant. Titre coupé à 60 caractères au dernier mot ; toute ligne « Réf. … » proposée par l'IA est retirée puis « Réf. 127 » est ajouté. |
| Lecture d'étiquette | La catégorie libre de l'IA est rapprochée de l'arbre Vinted par mots-clés ; si rien ne correspond, elle est seulement affichée. Une marque inconnue est proposée telle quelle (ajoutée à la liste à l'enregistrement de la fiche). |
| Prompts | Un prompt identique au prompt d'origine n'est pas enregistré, pour profiter des futures améliorations. |

---

## 07/10/2026 — Modèle retiré et serveurs surchargés (issue #38)

- `gemini-2.5-flash` n'est plus proposé par Google (404). Modèle conseillé partout (installation, `.env.example`,
  guides, message d'erreur) : l'alias **`gemini-flash-latest`**, qui suit le dernier modèle « Flash ».
- Erreurs passagères de Google (500, 502, 503, 504) : **2 nouveaux essais** automatiques, après 2 s puis 5 s, avant
  le message « Gemini est surchargé pour le moment… ».

## 07/10/2026 — Modèle de secours (issue #43)

- Constat : `gemini-flash-latest` (alias du dernier modèle) et `gemini-3.5-flash` ne répondaient plus (attente sans
  fin, 503) alors que `gemini-flash-lite-latest` répondait en quelques secondes.
- Modèle de secours (`GEMINI_MODELE_SECOURS`, par défaut `gemini-flash-lite-latest`, « aucun » pour le désactiver) :
  le principal est essayé une fois avec un délai de 30 s ; s'il est saturé, trop lent, sans quota, retiré ou renvoie
  une réponse vide, le secours est essayé (60 s, 2 nouveaux essais sur erreur passagère). Clé refusée : pas de
  secours (même clé).
