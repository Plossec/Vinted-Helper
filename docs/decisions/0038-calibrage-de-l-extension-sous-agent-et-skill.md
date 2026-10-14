# ADR-0038 — Calibrage de l'extension : sous-agent et skill

- **Date** : 08/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 14/10/2026 (#203)
- **Issue** : #73, #74
- **Thème** : Méthode

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur, #73 et #74)** : après le retour d'expérience du 08/10/2026, la correction de l'extension à
partir d'un relevé est outillée :
- sous-agent **`analyste-releve`** (`.claude/agents/`, lecture seule) : lit le relevé (et les captures) hors de la
  conversation principale et ne rend que la conclusion (étape, extrait, correction, fragment pour la fausse page) ;
- skill **`/calibrer-vinted`** (`.claude/skills/`) : issue → analyse → test qui échoue → correction → tests →
  version de l'extension → PR fusionnée → étapes de mise à jour pour l'utilisateur.

Points tranchés par Claude (*à relire*) : le sous-agent lit aussi les captures d'écran ; il est utilisé dès qu'un
relevé arrive, seul ou depuis le skill ; le skill peut être lancé par Claude dès qu'un relevé ou une erreur de
remplissage est envoyé ; la PR est fusionnée quand les vérifications GitHub sont vertes (l'extension ne part pas en
production : l'utilisateur la met à jour par `git pull`), puis l'utilisateur refait un essai.
