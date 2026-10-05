# Vinted Helper — Cahier des charges (V1)

> Statut : **en attente de validation**. Aucun développement avant le feu vert.

## 1. Contexte

Revente amateur sur Vinted d'articles achetés à bas prix (vide-greniers, ressourceries, bourses aux vêtements, lots Leboncoin) ou issus de la maison.
Rythme constaté : ~125 articles achetés en 2,5 mois, ~60 vendus, sorties le week-end.
*Ce rythme est donné à titre d'exemple : il est évolutif et variable, l'application ne doit pas en dépendre.*

Objectif : remplacer le tableur par une application web/mobile simple pour gérer **stock, mises en vente, ventes et rentabilité**, avec une saisie très rapide sur le terrain.

## 2. Utilisateurs et appareils

- **Un seul utilisateur**, accès par identifiant + mot de passe (session mémorisée).
- **Android** (usage terrain + photos) et **PC Windows** (compléter les fiches, statistiques).
- Application web installable (**PWA**) : un seul code, icône sur l'écran d'accueil Android, pas de Play Store.
- Réseau 4G disponible en vide-grenier → pas de mode hors ligne complet, mais **file d'attente des envois** si un upload échoue.
- Interface **claire / sombre automatique**, sobre, gros boutons utilisables à une main.

## 3. Cycle de vie d'un article (statuts)

| Statut | Signification |
|---|---|
| **Brouillon** | Photo terrain + prix d'achat pris au vide-grenier, fiche incomplète |
| **À publier** | Fiche complétée, photos Vinted prêtes, pas encore en ligne |
| **En ligne** | Annonce publiée sur Vinted |
| **En vente** | Acheté par un client Vinted, pas encore envoyé |
| **Envoyé** | Colis expédié |
| **Vendu** | Vente validée (fonds reçus) |
| **Sortie du stock** | Motif : Donné, Jeté, Revendu hors Vinted, Gardé pour moi, Perdu (perte comptabilisée) |

Chaque changement de statut est daté.

## 4. Fonctionnalités

### 4.1 Saisie rapide terrain
- Démarrer une **sortie** (date, lieu, type de lieu).
- Pour chaque achat : **photo rapide + prix** en quelques secondes → article en *Brouillon*.
- **Lots** : saisir un prix global pour N articles → réparti **à parts égales, modifiable** article par article.
- Saisie de l'**essence de la sortie**, répartie automatiquement entre les articles achetés ce jour-là.

### 4.2 Fiche article
- Nom, **catégorie** (Jean, Polo, Pull…), **marque** (Levis, Nike…), **gamme** (marque+, fast fashion, foot, vintage…), **état** (bon, abîmé, taché…), taille, notes.
  Listes réutilisables avec autocomplétion (gérables dans les réglages).
- Lieu d'achat (liste réutilisable : Vide grenier, Maison, Ressourcerie, Bourse vêtement, LBC …).
- Prix d'achat, date d'achat, sortie associée.
- **Photos** : photo terrain + toutes les photos propres de l'annonce Vinted.
- **Prix affiché** avec **historique complet** des changements (baisses).
- Dates : achat, mise en ligne, vente, envoi, validation.

### 4.3 Rédaction d'annonce (IA)
- Bouton **« Générer l'annonce »** : titre + description à partir des photos et des champs, via **Google Gemini (offre gratuite)**.
- Bouton **« Copier »** pour coller dans Vinted.
- Secours : bouton **« Copier le prompt »** à coller dans une IA gratuite (Claude.ai, ChatGPT, Gemini) si quota dépassé.
- Aucune automatisation de Vinted (pas d'API publique ; scraping contraire aux CGU).

### 4.4 Ventes
- Prix vendu, date de vente, date d'envoi, date de validation.
- **Ventes groupées** : plusieurs articles vendus ensemble pour un prix global, réparti **au prorata des prix affichés** ; emballage partagé.
- **Sortie du stock** : motif au choix (Donné, Jeté, Revendu hors Vinted, Gardé pour moi, Perdu). Pour *Revendu hors Vinted* : **prix de vente** + **canal** (liste : Vide-grenier, Leboncoin, Main propre, Autre), pris en compte dans le bénéfice.
- **Emballage + étiquette** : 0,08 € par défaut, modifiable.
- **Bénéfice** = Prix vendu − Prix d'achat − Emballage − Essence (négatif tant que l'article n'est pas vendu).

### 4.5 Alertes
- **Brouillon trop ancien** : > 3 jours.
- **Article dormant** : en ligne depuis > 7 jours sans vente.
- **À envoyer** : article en vente non expédié.
- Délais modifiables dans les réglages.

### 4.6 Tableau de bord
- Chiffre d'affaires et bénéfice du mois / de l'année + graphique mensuel.
- Valeur du stock (prix d'achat et prix affiché), nombre d'articles par statut.
- Rentabilité **par sortie / lieu d'achat**.
- Analyse **par catégorie / marque / gamme** : marge moyenne, délai moyen de vente.

### 4.7 Sauvegarde
- Sauvegarde automatique quotidienne de la base et des photos sur le serveur.

## 5. Hors périmètre V1

### Exclus (non prévus)
- Aucune possibilité d'**import** de données (départ de zéro).
- Pas de **mode d'envoi**.
- Pas de **pseudo acheteur**.
- Pas d'**alerte seuil fiscal** (DAC7).
- Pas de **suggestion de prix** basée sur l'historique.

### Reportés à plus tard
- Emplacement de rangement / QR codes → [issue #1](https://github.com/Plossec/Vinted-Helper/issues/1).
- Déploiement OVH → [issue #2](https://github.com/Plossec/Vinted-Helper/issues/2) (développement et tests en local d'abord).

## 6. Démarche

1. Développement et tests **en local sur PC Windows** (accès depuis le téléphone via le Wi-Fi de la maison pour les tests).
2. Retours utilisateur, ajustements.
3. Mise en ligne OVH (issue #2).

Niveau technique utilisateur : intermédiaire (terminal OK) → installation guidée pas-à-pas.
