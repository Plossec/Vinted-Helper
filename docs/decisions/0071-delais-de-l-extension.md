# ADR-0071 — Délais de l'extension

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : Claude
- **Issue** : #136
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Décision

- 14/10/2026 (#136, revue A6) : relecture des délais au regard de la règle n° 4. Ils servent à **espacer les
  publications** et à **laisser les pages se charger**, jamais à paraître humain ; tout tirage aléatoire est retiré.
  Inventaire (`service-worker.js`, `contenu.js`) :

  | Délai | Valeur | Rôle |
  |---|---|---|
  | Passage automatique | 5 min | demander à l'application s'il y a une annonce à publier |
  | Entre deux annonces publiées | **10 min fixes** (avant : + 0 à 3 min aléatoires, retirés) | espacer les publications |
  | Entre deux étapes du remplissage | **5 s fixes** (avant : tirées dans un intervalle) | laisser la page réagir |
  | Chargement de l'onglet | 30 s au plus | attendre la page « Vendre un article » |
  | Réponse du script de contenu | 20 × 0,5 s | attendre que le script soit chargé |
  | Après « Ajouter » | 60 s au plus | attendre la page de l'annonce créée |
  | Champs et listes (`contenu.js`) | 0,25 à 10 s au plus, puis 0,5 à 2 s | attendre qu'un élément apparaisse ou s'ouvre |

  En cas de vérification, de blocage ou de déconnexion : pause, reprise uniquement à la main (inchangé).
