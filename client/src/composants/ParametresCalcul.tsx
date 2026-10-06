// Réglages de calcul et d'alertes : emballage par défaut (§5.6), délais des alertes (§5.8).
import { type FormEvent, useEffect, useState } from "react";
import { api, type ReglagesUtilisateur } from "../api.js";
import { centimesVersSaisie, lireMontant } from "../outils/montants.js";

export function ParametresCalcul() {
  const [form, setForm] = useState({ emballage: "", delaiBrouillon: "", delaiDormant: "", formatColis: "petit" });
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    api
      .get<ReglagesUtilisateur>("/api/reglages")
      .then((r) =>
        setForm({
          emballage: centimesVersSaisie(r.emballageDefaut),
          delaiBrouillon: String(r.delaiBrouillon),
          delaiDormant: String(r.delaiDormant),
          formatColis: r.formatColisDefaut,
        }),
      )
      .catch(() => undefined);
  }, []);

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    const emballageDefaut = lireMontant(form.emballage);
    const delaiBrouillon = Number(form.delaiBrouillon);
    const delaiDormant = Number(form.delaiDormant);
    if (emballageDefaut === null || emballageDefaut === "invalide") {
      return setMessage({ type: "erreur", texte: "Emballage invalide (ex. 0,08)." });
    }
    if (![delaiBrouillon, delaiDormant].every((d) => Number.isInteger(d) && d >= 1 && d <= 365)) {
      return setMessage({ type: "erreur", texte: "Délais : nombre de jours entre 1 et 365." });
    }
    try {
      await api.put("/api/reglages", {
        emballageDefaut,
        delaiBrouillon,
        delaiDormant,
        formatColisDefaut: form.formatColis,
      });
      setMessage({ type: "ok", texte: "Réglages enregistrés." });
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Enregistrement impossible." });
    }
  }

  const champ = (cle: keyof typeof form) => ({
    value: form[cle],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [cle]: e.target.value })),
  });

  return (
    <section className="section">
      <h2>Calculs et alertes</h2>
      <form className="formulaire" onSubmit={(e) => void enregistrer(e)} noValidate>
        <label className="champ">
          <span>Emballage par colis, par défaut (€)</span>
          <input inputMode="decimal" {...champ("emballage")} />
        </label>
        <div className="champs-ligne">
          <label className="champ">
            <span>Alerte brouillon après (jours)</span>
            <input inputMode="numeric" {...champ("delaiBrouillon")} />
          </label>
          <label className="champ">
            <span>Article dormant après (jours)</span>
            <input inputMode="numeric" {...champ("delaiDormant")} />
          </label>
        </div>
        <label className="champ">
          <span>Format du colis Vinted par défaut</span>
          <select {...champ("formatColis")}>
            <option value="petit">Petit</option>
            <option value="moyen">Moyen</option>
            <option value="grand">Grand</option>
          </select>
        </label>
        {message && (
          <p className={`message message--${message.type}`} role="status">
            {message.texte}
          </p>
        )}
        <button className="bouton" type="submit">
          Enregistrer
        </button>
      </form>
    </section>
  );
}
