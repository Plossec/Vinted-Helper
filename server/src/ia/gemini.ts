// Client Google Gemini (§5.5) — appelé UNIQUEMENT depuis le serveur : la clé ne quitte jamais le serveur.
// Pas de bibliothèque : simple requête HTTPS (fetch intégré à Node). Les tests utilisent un client simulé.
import { ErreurMetier } from "../outils/erreurs.js";

export interface ImageIA {
  /** Ex. « image/jpeg ». */
  type: string;
  /** Contenu en base64. */
  base64: string;
}

export interface ClientIA {
  /** Envoie le texte et les images ; renvoie la réponse texte (JSON attendu). */
  generer(prompt: string, images: readonly ImageIA[]): Promise<string>;
}

/** Erreur IA : message clair pour l'utilisateur (503), l'interface propose alors « Copier le prompt ». */
export const iaIndisponible = (message: string) => new ErreurMetier(503, message);

const VALEURS_FICTIVES = new Set(["", "votre-cle-gemini", "nom-du-modele-gemini"]);
const DELAI_MS = 60_000;
/** Modèle principal : délai court quand un modèle de secours peut prendre le relais (issue #43). */
const DELAI_PRINCIPAL_MS = 30_000;
/** Modèle conseillé : l'alias de Google qui suit toujours le dernier modèle « Flash » (issue #38). */
export const MODELE_CONSEILLE = "gemini-flash-latest";
/** Modèle de secours par défaut : plus léger, il répond quand le principal est saturé (issue #43). */
export const MODELE_SECOURS_DEFAUT = "gemini-flash-lite-latest";
/** Erreurs passagères de Google (serveurs surchargés) : nouvel essai après ces délais. */
const ERREURS_PASSAGERES = new Set([500, 502, 503, 504]);
const DELAIS_NOUVEL_ESSAI_MS = [2_000, 5_000];

const pause = (ms: number) => new Promise<void>((fin) => setTimeout(fin, ms));

/** Résultat d'un appel à un modèle ; `basculer` : le modèle de secours peut être essayé. */
type Resultat = { texte: string } | { erreur: ErreurMetier; basculer: boolean };

/**
 * Client Gemini. `secours` : modèle essayé si le principal est saturé, trop lent, sans quota ou retiré
 * (GEMINI_MODELE_SECOURS ; « aucun » pour s'en passer).
 */
export function creerClientGemini(
  cle: string | undefined,
  modele: string | undefined,
  appeler: typeof fetch = fetch,
  attendre: (ms: number) => Promise<void> = pause,
  secours: string | undefined = undefined,
): ClientIA {
  async function essayer(
    cleApi: string,
    nom: string,
    prompt: string,
    images: readonly ImageIA[],
    delai: number,
    nouveauxEssais: readonly number[],
  ): Promise<Resultat> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(nom)}:generateContent`;
    const envoyer = () =>
      appeler(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cleApi },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, ...images.map((i) => ({ inline_data: { mime_type: i.type, data: i.base64 } }))],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(delai),
      });
    let reponse: Response;
    try {
      reponse = await envoyer();
      // Serveurs de Google surchargés (fréquent sur l'offre gratuite) : nouveaux essais.
      for (const attente of nouveauxEssais) {
        if (!ERREURS_PASSAGERES.has(reponse.status)) break;
        await attendre(attente);
        reponse = await envoyer();
      }
    } catch {
      return { erreur: iaIndisponible("Gemini est injoignable (réseau ou délai dépassé)."), basculer: true };
    }
    if (reponse.status === 429) {
      return { erreur: iaIndisponible("Quota gratuit de Gemini atteint : réessayez plus tard."), basculer: true };
    }
    if (reponse.status === 404) {
      return {
        erreur: iaIndisponible(
          `Modèle Gemini « ${nom} » introuvable : Google l'a peut-être retiré. Indiquez ` +
            `GEMINI_MODELE=${MODELE_CONSEILLE} dans le fichier .env (guide « IA Gemini »).`,
        ),
        basculer: true,
      };
    }
    if (ERREURS_PASSAGERES.has(reponse.status)) {
      return {
        erreur: iaIndisponible(
          "Gemini est surchargé pour le moment : réessayez dans quelques minutes (ou utilisez « Copier le prompt »).",
        ),
        basculer: true,
      };
    }
    if (reponse.status === 400 || reponse.status === 401 || reponse.status === 403) {
      return {
        erreur: iaIndisponible("Gemini refuse la demande : vérifiez la clé GEMINI_API_KEY."),
        basculer: false,
      };
    }
    if (!reponse.ok) {
      return { erreur: iaIndisponible(`Gemini est indisponible (erreur ${reponse.status}).`), basculer: true };
    }
    const contenu = (await reponse.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    } | null;
    const texte = contenu?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (texte.trim() === "") return { erreur: iaIndisponible("Gemini n'a renvoyé aucune réponse."), basculer: true };
    return { texte };
  }

  return {
    async generer(prompt, images) {
      if (!cle || VALEURS_FICTIVES.has(cle)) {
        throw iaIndisponible("Clé Gemini non configurée (GEMINI_API_KEY dans le fichier .env).");
      }
      if (!modele || VALEURS_FICTIVES.has(modele)) {
        throw iaIndisponible("Modèle Gemini non configuré (GEMINI_MODELE dans le fichier .env).");
      }
      const relais = secours && secours !== "aucun" && secours !== modele ? secours : null;
      // Avec un modèle de secours : un seul essai rapide du principal, puis le secours (avec ses nouveaux essais).
      const premier = relais
        ? await essayer(cle, modele, prompt, images, DELAI_PRINCIPAL_MS, [])
        : await essayer(cle, modele, prompt, images, DELAI_MS, DELAIS_NOUVEL_ESSAI_MS);
      if ("texte" in premier) return premier.texte;
      if (!relais || !premier.basculer) throw premier.erreur;
      const second = await essayer(cle, relais, prompt, images, DELAI_MS, DELAIS_NOUVEL_ESSAI_MS);
      if ("texte" in second) return second.texte;
      throw second.erreur;
    },
  };
}

/** Lit l'objet JSON de la réponse (tolère un bloc ```json … ```). */
export function lireJson(texte: string): Record<string, unknown> {
  const nettoye = texte
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const objet: unknown = JSON.parse(nettoye);
    if (typeof objet === "object" && objet !== null && !Array.isArray(objet)) return objet as Record<string, unknown>;
  } catch {
    // traité ci-dessous
  }
  throw iaIndisponible("Réponse de Gemini illisible : réessayez, ou utilisez « Copier le prompt ».");
}
