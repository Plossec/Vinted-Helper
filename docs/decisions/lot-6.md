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
