// Publication sur Vinted : demande d'ajout à la file (traitée par le programme du PC) et mode essai.
import { api, type ReponsePublication } from "./api.js";
import { formatReference } from "./statuts.js";

const CLE_ESSAI = "vh-publication-essai";

/** Mode essai (formulaire rempli, rien publié) : activé par défaut tant que l'utilisateur ne l'a pas décoché. */
export function lireModeEssai(): boolean {
  try {
    return localStorage.getItem(CLE_ESSAI) !== "non";
  } catch {
    return true;
  }
}

export function ecrireModeEssai(essai: boolean) {
  try {
    localStorage.setItem(CLE_ESSAI, essai ? "oui" : "non");
  } catch {
    // Préférence facultative.
  }
}

/** Ajoute les articles à la file ; renvoie un message lisible (acceptés, refusés et ce qui leur manque). */
export async function demanderPublication(articleIds: string[]): Promise<{ ok: boolean; texte: string }> {
  const essai = lireModeEssai();
  const r = await api.post<ReponsePublication>("/api/publications", { articleIds, essai });
  const lignes: string[] = [];
  if (r.acceptes.length > 0) {
    lignes.push(
      `${r.acceptes.length} article${r.acceptes.length > 1 ? "s" : ""} ajouté${r.acceptes.length > 1 ? "s" : ""} à la file${essai ? " (mode essai : rien ne sera publié)" : ""}.`,
    );
  }
  for (const refus of r.refuses) {
    lignes.push(`${formatReference(refus.reference)} ${refus.nom ?? ""} : manque ${refus.manques.join(", ")}.`);
  }
  return { ok: r.refuses.length === 0, texte: lignes.join("\n") };
}
