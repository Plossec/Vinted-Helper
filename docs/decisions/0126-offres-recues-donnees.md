# ADR-0126 — Offres reçues : données et lecture (phase 1)

- **Date** : 22/11/2026
- **Statut** : Proposé
- **Décideurs** : Claude, dans le cadre validé par l'utilisateur
- **Issue** : #302
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

[ADR-0076](0076-tache-validee-prix-propose.md) décide des règles : l'extension lit les offres reçues, l'application les
valide (offre ≥ prix vente minimum et article dormant depuis ≥ X jours → acceptation ; sinon contre-offre à mi-chemin ;
sans minimum → signalée dans l'application, #191). #302 a demandé « messagerie automatique : offres reçues
(ex-#150), réponses, négociation, après-vente », avec l'ordre : phase 1 = offres reçues. Les points d'accès Vinted
lus (relevés 22/11/2026, dépôt Microck/vinted-cli et #296) : `GET /api/v2/inbox`, `GET /api/v2/conversations/{id}`,
`POST …/conversations/{id}/replies`, contre-offre `POST /api/v2/transactions/{tid}/offers`, acceptation
`PUT …/offer_requests/{id}/accept`.

## Décision

| Sujet | Décision |
|---|---|
| Lecture | L'extension (content script) lit via `fetch` : `GET /api/v2/inbox`, puis `GET /api/v2/conversations/{id}` pour chaque conversation (extraction tolérante des offres : prix, identifiants de transaction et de demande) ; envoyée à l'application (`POST /api/programme/offres-recues`, jeton). |
| Ligne en base | `offre_recue` (migration 0026) : `offre_id` (unicité par article + offre), `article_id`, `transaction_id`, `offer_request_id`, `prix_offre`, `depuis`, `etat` (`a_valider`, `en_attente`, `faite`, `signale`, `erreur`), `prix_contre_offre`, `essai` / `manuelle` / `releve`. Lecture doublon : offre ignorée. |
| Règles | [ADR-0076](0076-tache-validee-prix-propose.md), appliquées par `planOffreRecue` : offre ≥ minimum → `accepter` si l'article est dormant depuis au moins X jours (délai réglable, 30 j par défaut, ADR-0078) ; sinon contre-offre à mi-chemin (arrondi haut au 0,50 €, plancher ADR-0091). Sans minimum → `signale` (à prendre en compte dans « À faire », #191). |
| Mode manuel | Lignes « à valider » dans « À faire » (écran dédié) : « Appliquer » → `en_attente` → exécutée par l'extension à son passage. Mode automatique : `en_attente` à la réception, puis confiée à l'extension (plage horaire, pause, plafond 30/j, ADR-0078). |
| Exécution | Extension (`contenu.js` → `service-worker.js`) : acceptation (`PUT …/offer_requests/{id}/accept`) ou contre-offre (`POST /api/v2/transactions/{tid}/offers`), un passage à la fois ; résultat renvoyé (`enregistrerResultatOffreRecue`). |
| Vente créée quand payée | Lecture du « Porte-monnaire » (ADR-0097) : quand une commande finalisée rapproche l'article (numéro de l'annonce) et que l'offre est `faite` (acceptée) : vente créée (article « À expédier », prix vendu = prix accepté, date de vente = date de fin lue, lien de la conversation enregistré — `creerVentesPayees`). |
| Reste pour l'étape 2 de #302 | Messagerie, réponses automatiques aux questions, négociation IA, messages après la vente. |

## Conséquences

- Tests : `server/src/taches/offres.test.ts` (règles ADR-0076, lignes à valider, exécution automatique, ventes créées).
- Extension : extraction dans `contenu.js` (`lireOffresRecues`) — formats de l'API Vinted (`inbox`, `conversations`)
  à calibrer au premier essai (mode essai par défaut).
- Risque accepté : `fetch` depuis le content script (respect des cookies de la page, son absence en mode isolé à
  vérifier) — mode essai ; si l'extraction rencontre un problème, l'application ne reçoit simplement pas d'offre lue.
