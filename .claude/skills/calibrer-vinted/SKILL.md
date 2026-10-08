---
name: calibrer-vinted
description: Corrige l'extension Chrome de publication Vinted à partir d'un relevé (diagnostic-vinted-….json) ou d'une erreur du journal — analyse, test qui échoue sur la fausse page, correction, nouvelle version de l'extension, PR, étapes de mise à jour pour l'utilisateur. À utiliser dès que l'utilisateur envoie un relevé ou une erreur de remplissage.
argument-hint: "[chemin du relevé] [message d'erreur]"
---

# Calibrer l'extension Vinted

Entrée : `$ARGUMENTS` (relevé, message du journal, captures) ; sinon, ce que l'utilisateur vient d'envoyer.

**Règle n° 4 (`CLAUDE.md`)** : Claude ne consulte jamais Vinted ; aucune correction ne contourne une détection
(camouflage du navigateur, captcha, rechargement en boucle, changement d'IP, effacement des cookies). Une
vérification ou une page « session bloquée » n'est pas un bug à corriger : l'extension doit se mettre en pause.

## 1. Issue
Si aucune issue ouverte ne couvre ce problème, crée `[Correctif] Extension Vinted : …` (étape, message, ce que
l'utilisateur voit), donne son lien. L'utilisateur ayant envoyé le relevé pour correction, enchaîne sans attendre,
sauf si la cause touche autre chose que l'extension (serveur, données de l'article) : demande alors.

## 2. Analyse
Lance le sous-agent **`analyste-releve`** avec : le chemin du relevé, le message d'erreur, l'étape, les captures.
Ne lis pas le relevé dans la conversation principale. Si le rapport dit « hypothèse » ou qu'il manque une
information, demande à l'utilisateur le relevé ou la capture qui manque plutôt que de deviner.

Si la cause est dans les **données de l'article** (catégorie ou taille absente du catalogue Vinted), dis-le à
l'utilisateur : la correction est sur la fiche (ou dans `server/src/catalogue/`), pas dans l'extension.

## 3. Test d'abord
Branche depuis `main` à jour. Dans `outils/extension-vinted/test/faux-vinted.mjs`, reproduis la structure réelle
relevée (fragment proposé par le sous-agent : `data-testid`, `role`, textes, valeur pré-remplie), en option de
`pageFormulaire` si elle ne doit pas changer les autres tests. Ajoute un test dans `test/extension.test.mjs`
(titre en français, numéro de l'issue). Lance-le : il **doit échouer** pour la raison attendue.

## 4. Correction
- Repères de la page → `selecteurs.js`, avec un commentaire daté (« Relevé du JJ/MM/AAAA : … »). Garde les anciens
  sélecteurs en secours sauf s'ils provoquent l'erreur.
- Logique de remplissage ou de contrôle → `contenu.js` ; rythme, file, pauses → `service-worker.js`.
- Correction minimale : ne retouche pas les autres étapes.

## 5. Vérifications
1. `npm test` dans `outils/extension-vinted` : **tous** les tests passent (pas seulement le nouveau).
2. À la racine : `npm run lint` et `npm run format:check`.
3. Relis le diff : rien qui contourne une détection, aucune donnée personnelle du relevé (le dépôt est public).

## 6. Version de l'extension
Augmente la version dans `outils/extension-vinted/manifest.json` **et** `outils/extension-vinted/package.json`
(même numéro ; correctif → dernier chiffre, comportement nouveau → chiffre du milieu). Sans cela, Chrome affiche
l'ancienne version et l'utilisateur ne sait pas si la mise à jour est prise. Ajoute une ligne à la section
`[Non publié]` de `CHANGELOG.md` (Corrigé), en langage simple.

## 7. Livraison
Commit en français à l'impératif, push, PR `#N — Corrige …` avec `Closes #N`. Fusionne quand les vérifications
GitHub sont vertes (l'extension n'est pas déployée sur le serveur : elle se met à jour par `git pull` sur le PC).

## 8. Message à l'utilisateur (court)
Ce qui était en cause (une phrase), puis :
1. dans PowerShell, à la racine du projet : `git pull` ;
2. Chrome → `chrome://extensions` → bouton **↻** sur « Vinted Helper — publication » : la carte doit afficher la
   **nouvelle version** (donne le numéro) ;
3. recharger l'onglet Vinted, puis refaire un **essai** (mode essai coché) ;
4. en cas de nouvelle erreur : extension → **Dernier relevé** → **Télécharger le fichier**, et me l'envoyer.
