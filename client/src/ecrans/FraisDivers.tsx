// Frais divers (§5.12) : frais généraux saisis à la main (vitrine Vinted, rouleau d'étiquettes…).
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type FraisDivers as Frais } from "../api.js";
import { aujourdhui, formatDate } from "../outils/dates.js";
import { centimesVersSaisie, formatEuros, lireMontant } from "../outils/montants.js";

const vide = () => ({ id: null as string | null, date: aujourdhui(), montant: "", libelle: "" });

export function FraisDivers() {
  const [frais, setFrais] = useState<Frais[] | null>(null);
  const [form, setForm] = useState(vide);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = () =>
    api
      .get<Frais[]>("/api/frais")
      .then(setFrais)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible."));
  useEffect(() => {
    void charger();
  }, []);

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    const montant = lireMontant(form.montant);
    if (form.libelle.trim() === "") return setErreur("Indiquez un libellé.");
    if (montant === null || montant === "invalide") return setErreur("Montant invalide (ex. 3,00).");
    if (form.date === "") return setErreur("Indiquez la date.");
    const corps = { date: form.date, montant, libelle: form.libelle.trim() };
    try {
      if (form.id) await api.put(`/api/frais/${form.id}`, corps);
      else await api.post("/api/frais", corps);
      setForm(vide());
      setErreur(null);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  }

  async function supprimer(id: string) {
    if (!window.confirm("Supprimer ce frais ?")) return;
    await api.delete(`/api/frais/${id}`);
    await charger();
  }

  return (
    <main className="page">
      <Link to="/reglages" className="lien-retour">
        ← Réglages
      </Link>
      <h1>Frais divers</h1>
      <p className="secondaire">
        Dépenses non rattachées à un article. Elles diminuent le bénéfice réalisé et la trésorerie du mois de leur date.
      </p>
      <form className="formulaire encadre" onSubmit={(e) => void enregistrer(e)} noValidate>
        <label className="champ">
          <span>Libellé *</span>
          <input
            value={form.libelle}
            onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
            placeholder="Vitrine Vinted, rouleau d'étiquettes…"
          />
        </label>
        <div className="champs-ligne">
          <label className="champ">
            <span>Montant (€) *</span>
            <input
              inputMode="decimal"
              value={form.montant}
              onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
            />
          </label>
          <label className="champ">
            <span>Date *</span>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </label>
        </div>
        {erreur && (
          <p className="message message--erreur" role="alert">
            {erreur}
          </p>
        )}
        <button className="bouton bouton--principal" type="submit">
          {form.id ? "Enregistrer la modification" : "Ajouter"}
        </button>
        {form.id && (
          <button className="bouton" type="button" onClick={() => setForm(vide())}>
            Annuler la modification
          </button>
        )}
      </form>
      {frais?.length === 0 && <p className="vide">Aucun frais divers.</p>}
      <ul className="historique section">
        {frais?.map((f) => (
          <li key={f.id}>
            <span>
              <strong>{formatEuros(f.montant)}</strong> {f.libelle}{" "}
              <span className="secondaire">— {formatDate(f.date)}</span>
            </span>
            <span>
              <button
                type="button"
                className="lien"
                onClick={() =>
                  setForm({ id: f.id, date: f.date, montant: centimesVersSaisie(f.montant), libelle: f.libelle })
                }
              >
                Modifier
              </button>{" "}
              <button type="button" className="lien" onClick={() => void supprimer(f.id)}>
                Supprimer
              </button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
