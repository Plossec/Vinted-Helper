// Réglages des tâches automatisées (#147, ADR-0072, ADR-0073, ADR-0078) : tâche « Articles dormants » (activation,
// mode, règle de baisse du compte, rythme dans les limites imposées), tâche « Vérification vente finalisée » (#148,
// ADR-0074), plage horaire et mode essai communs.
import { type FormEvent, useEffect, useState } from "react";
import { api, type ReglagesUtilisateur } from "../api.js";
import { centimesVersSaisie, lireMontant } from "../outils/montants.js";

interface Formulaire {
  active: boolean;
  mode: "automatique" | "manuel";
  baisseType: "pourcentage" | "montant";
  baisseValeur: string;
  frequence: string;
  /** Minutes. */
  pauseBaisse: string;
  pauseRepublication: string;
  plafondBaisses: string;
  plafondRepublications: string;
  heureDebut: string;
  heureFin: string;
  essai: boolean;
  finalisationActive: boolean;
  finalisationMode: "automatique" | "manuel";
  finalisationFrequence: string;
  finalisationPlafond: string;
}

const versFormulaire = (r: ReglagesUtilisateur): Formulaire => ({
  active: r.dormantsActive,
  mode: r.dormantsMode,
  baisseType: r.dormantsBaisseType,
  baisseValeur:
    r.dormantsBaisseType === "montant" ? centimesVersSaisie(r.dormantsBaisseValeur) : String(r.dormantsBaisseValeur),
  frequence: String(r.dormantsFrequenceHeures),
  pauseBaisse: String(Math.round(r.dormantsPauseBaisse / 60)),
  pauseRepublication: String(Math.round(r.dormantsPauseRepublication / 60)),
  plafondBaisses: String(r.dormantsPlafondBaisses),
  plafondRepublications: String(r.dormantsPlafondRepublications),
  heureDebut: String(r.tachesHeureDebut),
  heureFin: String(r.tachesHeureFin),
  essai: r.tachesEssai,
  finalisationActive: r.finalisationActive,
  finalisationMode: r.finalisationMode,
  finalisationFrequence: String(r.finalisationFrequenceHeures),
  finalisationPlafond: String(r.finalisationPlafond),
});

/** Entier saisi dans [min, max], sinon null. */
function entier(texte: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(texte.trim())) return null;
  const n = Number(texte.trim());
  return n >= min && n <= max ? n : null;
}

export function TachesAutomatiques() {
  const [form, setForm] = useState<Formulaire | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    api
      .get<ReglagesUtilisateur>("/api/reglages")
      .then((r) => setForm(versFormulaire(r)))
      .catch(() => undefined);
  }, []);

  if (form === null) return null;
  const modifier = (m: Partial<Formulaire>) => setForm((f) => (f === null ? f : { ...f, ...m }));
  const texte = (cle: keyof Formulaire) => ({
    value: String(form[cle]),
    onChange: (e: { target: { value: string } }) => modifier({ [cle]: e.target.value }),
  });

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    if (form === null) return;
    const erreur = (t: string) => setMessage({ type: "erreur", texte: t });
    const baisse =
      form.baisseType === "pourcentage" ? entier(form.baisseValeur, 1, 90) : lireMontant(form.baisseValeur);
    if (baisse === null || baisse === "invalide" || baisse <= 0)
      return erreur(
        form.baisseType === "pourcentage"
          ? "Baisse : pourcentage entre 1 et 90."
          : "Baisse : montant invalide (ex. 1,00).",
      );
    const valeurs = {
      dormantsFrequenceHeures: entier(form.frequence, 6, 168),
      dormantsPauseBaisse: entier(form.pauseBaisse, 1, 60),
      dormantsPauseRepublication: entier(form.pauseRepublication, 10, 120),
      dormantsPlafondBaisses: entier(form.plafondBaisses, 1, 40),
      dormantsPlafondRepublications: entier(form.plafondRepublications, 1, 20),
      tachesHeureDebut: entier(form.heureDebut, 0, 23),
      tachesHeureFin: entier(form.heureFin, 1, 24),
      finalisationFrequenceHeures: entier(form.finalisationFrequence, 6, 168),
      finalisationPlafond: entier(form.finalisationPlafond, 1, 100),
    };
    const limites: Record<keyof typeof valeurs, string> = {
      dormantsFrequenceHeures: "Fréquence : toutes les 6 à 168 heures.",
      dormantsPauseBaisse: "Pause entre deux baisses : 1 à 60 minutes.",
      dormantsPauseRepublication: "Pause entre deux republications : 10 à 120 minutes.",
      dormantsPlafondBaisses: "Baisses par jour : 1 à 40.",
      dormantsPlafondRepublications: "Republications par jour : 1 à 20.",
      tachesHeureDebut: "Heure de début : 0 à 23.",
      tachesHeureFin: "Heure de fin : 1 à 24.",
      finalisationFrequenceHeures: "Ventes finalisées : lecture toutes les 6 à 168 heures.",
      finalisationPlafond: "Ventes finalisées : 1 à 100 finalisations par jour.",
    };
    for (const [cle, valeur] of Object.entries(valeurs))
      if (valeur === null) return erreur(limites[cle as keyof typeof valeurs]);
    try {
      const r = await api.put<ReglagesUtilisateur>("/api/reglages", {
        dormantsActive: form.active,
        dormantsMode: form.mode,
        dormantsBaisseType: form.baisseType,
        dormantsBaisseValeur: baisse,
        ...valeurs,
        dormantsPauseBaisse: (valeurs.dormantsPauseBaisse ?? 0) * 60,
        dormantsPauseRepublication: (valeurs.dormantsPauseRepublication ?? 0) * 60,
        tachesEssai: form.essai,
        finalisationActive: form.finalisationActive,
        finalisationMode: form.finalisationMode,
      });
      setForm(versFormulaire(r));
      setMessage({ type: "ok", texte: "Réglages des tâches enregistrés." });
    } catch (e) {
      erreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  }

  return (
    <section className="section">
      <h2>Tâches automatiques</h2>
      <p className="secondaire">
        Faites par l'extension Chrome, seulement quand Chrome est ouvert, une action à la fois sur Vinted.
      </p>
      <form className="formulaire" onSubmit={(e) => void enregistrer(e)} noValidate>
        <h3>Articles dormants</h3>
        <label className="case">
          <input type="checkbox" checked={form.active} onChange={(e) => modifier({ active: e.target.checked })} /> Tâche
          activée : baisser le prix des articles dormants, puis les republier une fois au prix minimum
        </label>
        <label className="champ">
          <span>Mode</span>
          <select {...texte("mode")}>
            <option value="manuel">Manuel : liste à valider dans « À faire »</option>
            <option value="automatique">Automatique : sans validation</option>
          </select>
        </label>
        <div className="champs-ligne">
          <label className="champ">
            <span>Baisse</span>
            <select {...texte("baisseType")}>
              <option value="pourcentage">Pourcentage</option>
              <option value="montant">Montant</option>
            </select>
          </label>
          <label className="champ">
            <span>{form.baisseType === "pourcentage" ? "Valeur (%)" : "Valeur (€)"}</span>
            <input inputMode={form.baisseType === "pourcentage" ? "numeric" : "decimal"} {...texte("baisseValeur")} />
          </label>
        </div>
        <p className="secondaire">
          Prix arrondi vers le haut au 0,50 €, jamais sous le prix vente minimum ; sans minimum, ou réglé « ne pas
          baisser » sur la fiche, l'article est seulement republié. Après 3 republications sans vente : « Invendu ».
        </p>
        <label className="champ">
          <span>Passage toutes les (heures, 6 au moins)</span>
          <input inputMode="numeric" {...texte("frequence")} />
        </label>
        <div className="champs-ligne">
          <label className="champ">
            <span>Pause entre deux baisses (min)</span>
            <input inputMode="numeric" {...texte("pauseBaisse")} />
          </label>
          <label className="champ">
            <span>Entre deux republications (min)</span>
            <input inputMode="numeric" {...texte("pauseRepublication")} />
          </label>
        </div>
        <div className="champs-ligne">
          <label className="champ">
            <span>Baisses par jour (40 au plus)</span>
            <input inputMode="numeric" {...texte("plafondBaisses")} />
          </label>
          <label className="champ">
            <span>Republications par jour (20 au plus)</span>
            <input inputMode="numeric" {...texte("plafondRepublications")} />
          </label>
        </div>

        <h3>Ventes finalisées</h3>
        <label className="case">
          <input
            type="checkbox"
            checked={form.finalisationActive}
            onChange={(e) => modifier({ finalisationActive: e.target.checked })}
          />{" "}
          Tâche activée : lire le « Porte-monnaie » sur Vinted et passer « Finalisé » les colis dont la commande est
          terminée
        </label>
        <label className="champ">
          <span>Mode</span>
          <select {...texte("finalisationMode")}>
            <option value="manuel">Manuel : liste à valider dans « À faire »</option>
            <option value="automatique">Automatique : sans validation</option>
          </select>
        </label>
        <div className="champs-ligne">
          <label className="champ">
            <span>Lecture toutes les (heures, 6 au moins)</span>
            <input inputMode="numeric" {...texte("finalisationFrequence")} />
          </label>
          <label className="champ">
            <span>Finalisations par jour (100 au plus)</span>
            <input inputMode="numeric" {...texte("finalisationPlafond")} />
          </label>
        </div>
        <p className="secondaire">
          Date de finalisation : celle de la commande sur Vinted. Montant crédité différent : celui de Vinted le
          remplace, avec une alerte. Commande non retrouvée : « à rattacher » dans « À faire ».
        </p>

        <h3>Toutes les tâches</h3>
        <div className="champs-ligne">
          <label className="champ">
            <span>De (heure)</span>
            <input inputMode="numeric" {...texte("heureDebut")} />
          </label>
          <label className="champ">
            <span>À (heure)</span>
            <input inputMode="numeric" {...texte("heureFin")} />
          </label>
        </div>
        <label className="case">
          <input type="checkbox" checked={form.essai} onChange={(e) => modifier({ essai: e.target.checked })} /> Mode
          essai : l'extension ouvre les pages Vinted sans rien modifier (à garder tant que le calibrage n'est pas fait)
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
