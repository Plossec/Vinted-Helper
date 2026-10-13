# Sécurité

Vinted Helper est une application personnelle (un seul utilisateur), hébergée par son propriétaire. Le code est
public ; **aucune donnée réelle** (articles, photos, ventes, mots de passe, clés) ne figure dans ce dépôt.

## Signaler une faille

Merci de **ne pas ouvrir d'issue publique** pour une faille de sécurité. Utilisez le signalement privé de GitHub :
onglet **Security** du dépôt → **Report a vulnerability**. Indiquez la version concernée (affichée dans les
Réglages), les étapes pour reproduire et l'impact supposé. Une réponse est donnée dès que possible ; ce projet
n'offre pas de prime.

## Versions prises en charge

Seule la dernière version publiée (tag `vX.Y.Z` le plus récent, voir `CHANGELOG.md`) reçoit des correctifs.

## Mesures en place (résumé)

- Mots de passe hachés (scrypt), 12 caractères minimum ; session par cookie protégé.
- Connexion limitée à 5 échecs en 15 minutes, par adresse IP et par compte.
- Appels à l'IA (Gemini) limités à 30 par heure ; la clé reste sur le serveur.
- Secrets uniquement dans le fichier de configuration du serveur, jamais dans le dépôt.
- Vérifications automatiques à chaque PR : tests, audit des dépendances, analyse CodeQL, mises à jour Dependabot.
