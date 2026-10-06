// Prompts de l'IA modifiables (§5.5). Champs remplacés automatiquement : {nom} {categorie} {marque} {gamme}
// {taille} {etat} {matiere} {notes}. « Rétablir » revient au prompt d'origine.
import { useEffect, useState } from "react";
import { api, type ReglagesUtilisateur } from "../api.js";

type Cle = "promptAnnonce" | "promptEtiquette";
const LIBELLES: Record<Cle, string> = {
  promptAnnonce: "Prompt de l'annonce",
  promptEtiquette: "Prompt de l'étiquette",
};

export function PromptsIA() {
  const [defauts, setDefauts] = useState<{ annonce: string; etiquette: string } | null>(null);
  const [valeurs, setValeurs] = useState<Record<Cle, string>>({ promptAnnonce: "", promptEtiquette: "" });
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    void Promise.all([
      api.get<{ annonce: string; etiquette: string }>("/api/prompts/defaut"),
      api.get<ReglagesUtilisateur>("/api/reglages"),
    ])
      .then(([d, r]) => {
        setDefauts(d);
        setValeurs({ promptAnnonce: r.promptAnnonce ?? d.annonce, promptEtiquette: r.promptEtiquette ?? d.etiquette });
      })
      .catch(() => undefined);
  }, []);

  const defautDe = (cle: Cle) => (cle === "promptAnnonce" ? defauts?.annonce : defauts?.etiquette) ?? "";

  async function enregistrer(cle: Cle, valeur: string) {
    try {
      // Identique au prompt d'origine : on enregistre « aucun » pour suivre les futures améliorations.
      await api.put("/api/reglages", { [cle]: valeur.trim() === defautDe(cle).trim() ? null : valeur });
      setValeurs((v) => ({ ...v, [cle]: valeur }));
      setMessage({ type: "ok", texte: `${LIBELLES[cle]} enregistré.` });
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Enregistrement impossible." });
    }
  }

  if (defauts === null) return null;
  return (
    <section className="section">
      <h2>IA (Gemini)</h2>
      <p className="secondaire">
        Champs remplacés automatiquement : {"{nom} {categorie} {marque} {gamme} {taille} {etat} {matiere} {notes}"}. La
        réponse doit rester en JSON (voir la dernière ligne du prompt).
      </p>
      {(Object.keys(LIBELLES) as Cle[]).map((cle) => (
        <div key={cle} className="formulaire">
          <label className="champ">
            <span>{LIBELLES[cle]}</span>
            <textarea
              rows={10}
              value={valeurs[cle]}
              onChange={(e) => setValeurs((v) => ({ ...v, [cle]: e.target.value }))}
            />
          </label>
          <div className="actions">
            <button type="button" className="bouton" onClick={() => void enregistrer(cle, valeurs[cle])}>
              Enregistrer
            </button>
            <button type="button" className="bouton" onClick={() => void enregistrer(cle, defautDe(cle))}>
              Rétablir le prompt d'origine
            </button>
          </div>
        </div>
      ))}
      {message && (
        <p className={`message message--${message.type}`} role="status">
          {message.texte}
        </p>
      )}
    </section>
  );
}
