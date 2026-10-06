# Accès depuis le téléphone (Wi-Fi de la maison, HTTPS)

[← Sommaire de la documentation](../README.md)

Le téléphone utilise une connexion sécurisée (HTTPS), indispensable pour installer l'application et utiliser
l'appareil photo. Elle fonctionne **sur le Wi-Fi de la maison**, PC allumé et application démarrée.
Réglage à faire **une seule fois**.

## Étape 1 — Trouver l'adresse IP du PC

Dans PowerShell :

```powershell
ipconfig
```

Repérez le bloc **« Carte réseau sans fil Wi-Fi »** (ou « Ethernet » si le PC est branché par câble) et notez
l'**Adresse IPv4**, par exemple `192.168.1.20`.

> Conseil : pour que cette adresse ne change pas, réservez-la dans l'interface de votre box (« bail DHCP statique »).
> Si elle change un jour, refaites les étapes 2 et 3 (le certificat, lui, reste valable).

## Étape 2 — Indiquer l'adresse dans `.env`

```powershell
notepad .env
```

Ajoutez (ou modifiez) la ligne `IP_PC=192.168.1.20` avec **votre** adresse, enregistrez, puis :

```powershell
docker compose up -d --build
```

Résultat attendu : `docker compose ps` affiche quatre services : `app`, `db`, `https` et `sauvegarde`.
Si Windows demande d'autoriser Docker sur le réseau : acceptez pour les **réseaux privés**.

## Étape 3 — Installer le certificat sur le téléphone (une seule fois)

1. Sur le téléphone (connecté au Wi-Fi de la maison), ouvrez Chrome à l'adresse `http://192.168.1.20:8080/certificat.crt`
   (avec votre adresse). Le fichier est téléchargé.
2. Ouvrez **Paramètres** → cherchez **« certificat »** → **Installer un certificat** → **Certificat CA**
   (selon la marque : Sécurité → Plus de paramètres de sécurité → Chiffrement et identifiants).
3. Confirmez « Installer quand même », puis choisissez le fichier `certificat.crt` téléchargé.

Ce certificat est créé sur **votre** PC : il ne sert qu'à reconnaître votre application.

## Étape 4 — Ouvrir et installer l'application

1. Dans Chrome : `https://192.168.1.20:8443` (avec votre adresse). Pas d'avertissement de sécurité : c'est bon.
2. Connectez-vous, puis menu **⋮** → **Ajouter à l'écran d'accueil** → **Installer**.

| Problème | Solution |
|---|---|
| La page ne s'ouvre pas | Même Wi-Fi que le PC ? Application démarrée ? `docker compose ps` doit montrer `https` |
| « Votre connexion n'est pas privée » | Le certificat n'est pas installé (étape 3), ou `IP_PC` ne correspond pas à l'adresse tapée |
| L'adresse IP du PC a changé | Mettez à jour `IP_PC` dans `.env`, `docker compose up -d`, et utilisez la nouvelle adresse |

En vide-grenier (hors Wi-Fi de la maison), les achats saisis sont **gardés sur le téléphone** et envoyés
automatiquement au retour sur le Wi-Fi de la maison. L'accès depuis partout viendra avec l'hébergement OVH
([issue #2](https://github.com/Plossec/Vinted-Helper/issues/2)).
