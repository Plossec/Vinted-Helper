// Échanges avec l'application Vinted Helper (jeton personnel « Bearer »). Aucune requête vers Vinted ici.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function creerApi({ adresse, jeton }) {
  const appeler = async (chemin, options = {}) => {
    const reponse = await fetch(`${adresse}${chemin}`, {
      ...options,
      headers: { authorization: `Bearer ${jeton}`, "content-type": "application/json", ...options.headers },
    });
    if (reponse.status === 401)
      throw new Error("Jeton refusé : créez-en un nouveau dans Réglages → Publication Vinted.");
    if (!reponse.ok) throw new Error(`Application : erreur ${reponse.status}`);
    return reponse;
  };
  return {
    /** Nombre de demandes en attente (sans en prendre). */
    async enAttente() {
      return (await (await appeler("/api/programme/attente")).json()).nombre;
    },
    /** Demande suivante, ou null s'il n'y a rien à publier. */
    async suivante() {
      return (await (await appeler("/api/programme/suivante")).json()).publication;
    },
    async resultat(id, corps) {
      await appeler(`/api/programme/publications/${id}/resultat`, { method: "POST", body: JSON.stringify(corps) });
    },
    /** Télécharge les photos dans l'ordre ; renvoie les chemins des fichiers. */
    async telechargerPhotos(liens, dossier) {
      rmSync(dossier, { recursive: true, force: true });
      mkdirSync(dossier, { recursive: true });
      const fichiers = [];
      for (const [i, lien] of liens.entries()) {
        const reponse = await appeler(lien, { headers: { "content-type": "" } });
        const type = reponse.headers.get("content-type") ?? "image/jpeg";
        const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
        const fichier = join(dossier, `${String(i + 1).padStart(2, "0")}.${extension}`);
        writeFileSync(fichier, Buffer.from(await reponse.arrayBuffer()));
        fichiers.push(fichier);
      }
      return fichiers;
    },
  };
}
