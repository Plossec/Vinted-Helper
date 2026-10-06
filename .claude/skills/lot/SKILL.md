---
name: lot
description: Démarre le lot N du cahier des charges — relit le lot et ses critères, propose un plan, attend la validation, puis crée la branche lot-N.
argument-hint: "<numéro du lot>"
disable-model-invocation: true
---

# Démarrer le lot $ARGUMENTS

Tu prépares le **lot $ARGUMENTS**. **Ne code rien** dans cette commande.

1. **Vérifie le point de départ**
   - Lance `git status` : l'arbre de travail doit être propre. Sinon, arrête-toi et explique ce qui reste.
   - Vérifie que le lot précédent est terminé (tag de version présent dans `git tag`, entrée dans `CHANGELOG.md`).
     Si ce n'est pas le cas, signale-le et demande s'il faut continuer.

2. **Relis les sources**
   - `docs/cahier-des-charges.md` : le lot $ARGUMENTS au §9, les fonctionnalités concernées au §5,
     les règles de calcul du §6 si besoin, les critères d'acceptation du §8 et les cas du §11 liés.
   - `docs/decisions/` : les décisions déjà prises (index : `docs/decisions/README.md`).
   - Le §10 (hors périmètre) : rien de ce qui y figure ne doit entrer dans le plan.

3. **Liste les ambiguïtés**
   - Tout point flou, contradictoire ou manquant : pose la question à l'utilisateur, **une question à la fois**,
     avant de proposer le plan. Ne suppose rien.

4. **Propose un plan**, en français, avec :
   - l'objectif du lot en 2 lignes ;
   - les étapes numérotées, chacune avec les fichiers créés ou modifiés ;
   - les migrations de base de données prévues ;
   - les tests prévus (et les cas §11 couverts) ;
   - la correspondance avec chaque critère d'acceptation §8 du lot ;
   - comment l'utilisateur pourra tester le lot (sur PC ou téléphone), pas à pas.

5. **Attends la validation explicite** de l'utilisateur. S'il demande des changements, ajuste le plan et redemande.

6. **Une fois validé** : crée la branche avec `git switch -c lot-$ARGUMENTS` depuis `main`,
   consigne les décisions prises pendant la discussion dans `docs/decisions/lot-$ARGUMENTS.md`, puis annonce que le lot peut démarrer.
