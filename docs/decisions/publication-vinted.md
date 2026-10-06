# Décisions — Publication automatique sur Vinted

[← Index des décisions](README.md)

## 06/10/2026 — Publication des annonces par un programme sur le PC

**Décision (utilisateur)** : lever la règle « aucune automatisation de Vinted » pour **la seule publication des
annonces**. Risques expliqués et acceptés : les conditions d'utilisation de Vinted interdisent les outils
automatisés (suspension possible du compte, avec annonces, avis et porte-monnaie) ; le programme casse à chaque
changement du site Vinted.

| Sujet | Choix |
|---|---|
| Lancement | Programme en tâche de fond sur le PC (démarre avec Windows) ; le bouton de l'application suffit |
| Validation | Le programme remplit le formulaire **et clique lui-même « Ajouter »**, article après article |
| Champs ajoutés à la fiche | Couleur(s) (liste Vinted, 2 au plus) et format du colis (petit / moyen / grand, défaut réglable) |
| Navigateur | Profil Chrome dédié ; l'utilisateur s'y connecte à Vinted une fois |
| Après publication | Article passé En ligne (prix affiché, date du jour) ; lien de l'annonce gardé sur la fiche |
| Articles incomplets | Refusés, avec la liste de ce qui manque |

**Garde-fous (posés par Claude)**
- Aucun contournement de détection : pas de camouflage du navigateur, pas de résolution de captcha. Vérification
  Vinted, captcha, déconnexion ou champ introuvable → le programme s'arrête et l'article passe « en erreur » avec
  le motif.
- **Contrôle avant envoi** : chaque champ est relu dans la page ; s'il manque ou diffère, aucun clic.
- **Mode essai** (activé par défaut) : tout est rempli mais rien n'est publié, pour vérifier le remplissage.
- Le programme ne fait rien d'autre sur Vinted (ni lecture des ventes, ni messages, ni modification d'annonces).
- Les sélecteurs de la page Vinted sont regroupés dans un seul fichier, calibrés avec l'utilisateur sur son PC
  (Claude ne consulte jamais Vinted).
