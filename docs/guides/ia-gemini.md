# IA Gemini (annonces et étiquettes)

[← Sommaire de la documentation](../README.md)

L'application utilise l'offre **gratuite** de Google Gemini, appelée uniquement par le serveur (la clé ne va jamais
sur le téléphone). Réglage à faire une seule fois :

1. Ouvrez https://aistudio.google.com/apikey avec votre compte Google, puis **Create API key** (Créer une clé).
   Copiez la clé.
2. Dans PowerShell : `notepad .env`, puis renseignez :
   - `GEMINI_API_KEY=` la clé copiée ;
   - `GEMINI_MODELE=gemini-flash-latest` : ce nom suit toujours le dernier modèle « Flash » de Google (ou le nom
     précis d'un modèle disponible dans AI Studio).
     Google retire régulièrement ses anciens modèles : si un jour l'application affiche « Modèle Gemini introuvable »,
     changez simplement ce nom.
   - « Gemini est surchargé » : les serveurs de Google sont saturés (fréquent sur l'offre gratuite). L'application a
     déjà réessayé deux fois ; réessayez quelques minutes plus tard, ou utilisez « Copier le prompt ».
3. Enregistrez, puis `docker compose up -d` pour relancer l'application.

Utilisation, sur la fiche d'un article :
- **🏷 Lire l'étiquette** (en haut) : photo de l'étiquette → marque, taille, catégorie et matière sont proposées dans
  le formulaire. Rien n'est enregistré tant que vous n'avez pas cliqué « Enregistrer la fiche ».
- **✨ Générer l'annonce** (section Annonce) : titre et description générés à partir de la fiche et des photos, avec
  « Réf. 127 » en dernière ligne ; enregistrés et modifiables. **Copier** met le titre et la description dans le
  presse-papiers.
- Si Gemini est indisponible (quota gratuit atteint, pas de clé…) : un message l'explique ; **Copier le prompt**
  permet de coller la demande dans Claude.ai, ChatGPT ou Gemini (ajoutez-y les photos), puis de recopier le résultat.
- Les prompts sont modifiables dans **Réglages → IA (Gemini)**.
