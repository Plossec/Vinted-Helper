# ADR-0034 — Publication par une extension Chrome

- **Date** : 07/10/2026
- **Statut** : Accepté · garde-fous de périmètre remplacés par [ADR-0082](0082-extension-garde-fous-de-perimetre-supprimes.md) ; rythme aléatoire retiré par [ADR-0071](0071-delais-de-l-extension.md) ; règle n° 4 de CLAUDE.md retirée par [ADR-0068](0068-suppression-de-la-regle-n-4-automatisation-de-vinted.md)
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #54
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : retenter la publication automatique en s'inspirant des extensions payantes du marché
(Dotb, DressKare, Bleam, Friptadium) et des projets publics (`vinted-relist-extension` sur GitHub). Toutes
fonctionnent comme une **extension dans le Chrome habituel** de l'utilisateur, avec sa vraie session, une annonce à
la fois, avec des délais, et s'arrêtent sur captcha ou erreur d'accès.

| Sujet | Choix |
|---|---|
| Mécanisme | Extension Chrome (Manifest V3) `outils/extension-vinted/`, chargée « non empaquetée », au lieu du programme Playwright |
| Session Vinted | Celle de l'utilisateur, dans son Chrome ; aucun mot de passe saisi par l'extension |
| Action sur Vinted | Remplissage du formulaire visible « Vendre un article », puis clic « Ajouter » ; **aucun appel direct à l'API interne de Vinted** |
| Application | API et jeton inchangés (`/api/programme/…`) ; seuls les textes de l'écran Publication Vinted changent |
| Rythme | Vérification toutes les 5 min ; une annonce au plus toutes les 10 min, plus 0 à 3 min au hasard |
| Ancien programme | Conservé jusqu'à la validation de l'extension sur le PC, puis retiré |

**Garde-fous (posés par Claude)**
- Toujours **aucun contournement** : ni camouflage, ni résolution de captcha, ni changement d'adresse IP ou
  effacement des cookies (pourtant conseillés par certains outils du marché).
- Vérification (captcha), page « session bloquée » (nouveau repère texte), déconnexion, page illisible ou jeton
  refusé → **pause** : l'extension ne recharge plus Vinted et ne prend aucun article jusqu'au clic « Reprendre ».
- La page est vérifiée **avant** de prendre un article ; une publication interrompue n'est jamais relancée.
- Contrôle avant envoi et mode essai inchangés.
- CLAUDE.md, règle n° 4, mise à jour : la seule automatisation autorisée est la publication par cette extension.
