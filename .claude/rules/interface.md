---
paths:
  - "client/**"
---

# Règles de l'interface (client/)

Référence : `docs/cahier-des-charges.md`, §2.2, §2.3 et §5.

## Langue et formats

- Interface **100 % en français**, y compris messages d'erreur, boutons, libellés vides et notifications.
- Montants : reçus en **centimes** de l'API, affichés avec `Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })` → `3,33 €`.
- Saisie d'un montant : accepter la virgule **et** le point, convertir en centimes sans passer par un calcul à virgule
  approximatif (découper la chaîne en euros / centimes).
- Dates : `JJ/MM/AAAA`, fuseau `Europe/Paris` (`Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris" })`).
- Semaine commençant le lundi dans les sélecteurs de date et les graphiques.
- Taux de marge indisponible : afficher « — ».

## Mobile d'abord

- Conçu d'abord pour un **téléphone Android tenu à une main**, puis adapté au PC.
- **Gros boutons** (zone tactile ≥ 48 px), actions principales en bas de l'écran, accessibles au pouce.
- Saisie terrain (« + Achat ») : **3 à 4 gestes maximum**, clavier numérique (`inputMode="decimal"`) ouvert automatiquement.
- Aucun défilement horizontal ; tester à 360 px de large.

## Thème

- Mode **clair / sombre automatique** (`prefers-color-scheme`), couleurs définies une seule fois en variables CSS.
- Contrastes lisibles en plein soleil (vide-grenier).

## PWA et hors réseau

- Les achats terrain sont d'abord enregistrés **sur le téléphone** (IndexedDB), puis envoyés ; afficher le compteur
  « N achats en attente d'envoi ». Identifiants générés sur le téléphone (UUID).
- Référence `#0127` affichée « en attente » tant que le serveur ne l'a pas attribuée.
- Nouvelle version déployée : bandeau « Nouvelle version disponible — Mettre à jour ».

## Sécurité

- **Aucune clé API** dans `client/` : tout appel à Gemini passe par le serveur.
