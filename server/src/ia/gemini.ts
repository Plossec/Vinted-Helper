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

export function creerClientGemini(
  cle: string | undefined,
  modele: string | undefined,
  appeler: typeof fetch = fetch,
): ClientIA {
  return {
    async generer(prompt, images) {
      if (!cle || VALEURS_FICTIVES.has(cle)) {
        throw iaIndisponible("Clé Gemini non configurée (GEMINI_API_KEY dans le fichier .env).");
      }
      if (!modele || VALEURS_FICTIVES.has(modele)) {
        throw iaIndisponible("Modèle Gemini non configuré (GEMINI_MODELE dans le fichier .env).");
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`;
      let reponse: Response;
      try {
        reponse = await appeler(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  ...images.map((i) => ({ inline_data: { mime_type: i.type, data: i.base64 } })),
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
          }),
          signal: AbortSignal.timeout(DELAI_MS),
        });
      } catch {
        throw iaIndisponible("Gemini est injoignable (réseau ou délai dépassé).");
      }
      if (reponse.status === 429) throw iaIndisponible("Quota gratuit de Gemini atteint : réessayez plus tard.");
      if (reponse.status === 404)
        throw iaIndisponible(`Modèle Gemini « ${modele} » introuvable : vérifiez GEMINI_MODELE.`);
      if (reponse.status === 400 || reponse.status === 401 || reponse.status === 403) {
        throw iaIndisponible("Gemini refuse la demande : vérifiez la clé GEMINI_API_KEY.");
      }
      if (!reponse.ok) throw iaIndisponible(`Gemini est indisponible (erreur ${reponse.status}).`);
      const contenu = (await reponse.json().catch(() => null)) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      } | null;
      const texte = contenu?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (texte.trim() === "") throw iaIndisponible("Gemini n'a renvoyé aucune réponse.");
      return texte;
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
