# ADR-0126 — Offres reçues : lecture seule et données (étape 1 de #302)

- **Date** : 23/11/2026
- **Statut** : Proposé
- **Décideurs** : utilisateur (réponses du 23/11/2026 sur #302), avec des points tranchés par Claude
- **Issue** : #302 (ex-#150)
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

[ADR-0076](0076-tache-validee-prix-propose.md) fixe les règles des offres reçues : offre ≥ prix vente minimum et article
dormant depuis au moins X jours → acceptation ; sinon contre-offre à mi-chemin (arrondie au 0,50 € au-dessus, jamais
sous le minimum) ; sans minimum → offre signalée dans l'application. #302 (messagerie automatique) commence par les
offres reçues. Une première version de la branche envoyait déjà des acceptations et contre-offres, sans calibrage et
sans respecter le mode essai ; elle a été relue le 23/11/2026.

## Décision

Réponses de l'utilisateur (23/11/2026, #302) :

| Sujet | Décision |
|---|---|
| Première livraison | **Lecture seule** : la tâche lit les offres reçues et affiche ce que la règle propose ; **rien n'est envoyé à Vinted** (ni acceptation, ni contre-offre) tant que la lecture n'est pas calibrée sur un vrai relevé |
| Moyen de lecture | **Adresses internes** du site, depuis la page Vinted ouverte dans le Chrome de l'utilisateur : `GET /api/v2/inbox`, puis `GET /api/v2/conversations/{id}` (20 conversations au plus) ; la publication reste au formulaire |

Points tranchés par Claude (*à relire*) :
- **Rattachement** : l'extension lit le numéro de l'annonce Vinted ; l'article est celui dont le lien Vinted porte ce
  numéro. Annonce sans article dans l'application : offre ignorée, avec la raison au journal.
- **Identifiant de l'offre** : celui de la demande d'offre Vinted ; sans identifiant, l'offre est ignorée (pas de
  doublon à chaque lecture).
- **Relevé de calibrage** : à chaque lecture, la **forme** des réponses (noms des champs et types, jamais les valeurs)
  est gardée comme « Dernier relevé » de l'extension ; aucune donnée personnelle.
- **Mode automatique** : sans effet tant que l'envoi n'existe pas ; l'offre reste « à valider » (affichée dans
  « À faire » avec la proposition : accepter, contre-offre à X €, ou rien sans minimum), la réponse se fait à la main.
- **Fréquence** : une lecture compte comme un passage (la suivante attend la fréquence réglée, 6 h par défaut) ;
  « Lancer maintenant » la demande au prochain passage, à toute heure (colonne `offres_recues_lancement_demande`).
- **Calcul de la contre-offre** : dans `server/src/calculs/contre-offre.ts` (règle n° 1 de `CLAUDE.md`).
- **Vente créée quand payée** : le code existe (lecture du « Porte-monnaie », ADR-0097), il servira quand l'envoi
  rendra des offres « faites ».

## Conséquences

- Migrations 0026 (table `offre_recue`, réglages de la tâche) et 0027 (demande « Lancer maintenant »).
- Extension 1.20.0 : lecture des offres, relevé de forme ; tests sur une fausse messagerie (aucune écriture vers Vinted).
- Étapes suivantes de #302 : calibrage d'après le premier relevé, carte de réglages de la tâche (délai X jours, mode),
  envoi des acceptations et contre-offres (jeton CSRF du site, adresse
  `PUT /api/v2/transactions/{tid}/offer_requests/{id}/accept`), puis réponses, négociation et messages après la vente.
