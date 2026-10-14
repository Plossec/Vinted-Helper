---
paths:
  - "outils/extension-vinted/**"
---

# Règles de l'extension Chrome de publication Vinted

Décisions : `docs/decisions/publication-vinted.md` ; guide : `docs/guides/publication-vinted.md`.

- **Règle n° 4** (`CLAUDE.md`) : l'extension ne fait que **publier des annonces**. Claude ne consulte jamais Vinted ;
  aucune correction ne contourne une détection (camouflage du navigateur, captcha, rechargement en boucle,
  changement d'IP, effacement des cookies). Une vérification ou une page « session bloquée » n'est pas un bug :
  l'extension se met en pause et attend l'utilisateur.
- **Version** : toute modification de l'extension augmente la version dans `manifest.json` **et** `package.json`
  (même numéro ; correctif → dernier chiffre, comportement nouveau → chiffre du milieu). Sans cela, Chrome affiche
  l'ancienne version et l'utilisateur ne sait pas si sa mise à jour est prise. La version de l'application suit
  `/version` comme d'habitude.
- **Tests** : `npm test` dans `outils/extension-vinted` (fausse page `test/faux-vinted.mjs`, jamais le vrai site) ;
  une structure relevée sur Vinted se reproduit dans la fausse page, avec un test qui échoue avant la correction.
- Repères de la page → `selecteurs.js` (commentaire daté « Relevé du JJ/MM/AAAA »), logique de remplissage →
  `contenu.js`, rythme et file → `service-worker.js`.
- L'extension n'est pas déployée sur le serveur : l'utilisateur la met à jour par `git pull` puis **↻** dans
  `chrome://extensions`.
- Aucune donnée personnelle d'un relevé dans le dépôt (public).
