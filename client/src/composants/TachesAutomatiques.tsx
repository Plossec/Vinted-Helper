// Réglages des tâches automatisées (#147, ADR-0072, ADR-0073, ADR-0078) : une carte repliable par tâche (#232,
// ADR-0105) avec son état (activée, essai, dernier et prochain passage, actions du jour), ses réglages (plage horaire et
// mode essai propres à la tâche ; pauses et plafonds dans « Réglages avancés »), « Lancer maintenant » et son journal
// (#233). Le journal complet de toutes les tâches suit les cartes.
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { api, type EtatTaches, type ReglagesUtilisateur } from "../api.js";
import { formatDateHeure } from "../outils/dates.js";
import { centimesVersSaisie, lireMontant } from "../outils/montants.js";
import { JournalTaches } from "./JournalTaches.js";
import { LancerTache } from "./LancerTache.js";

/** Entier saisi dans [min, max], sinon null. */
function entier(texte: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(texte.trim())) return null;
  const n = Number(texte.trim());
  return n >= min && n <= max ? n : null;
}

/** Entiers saisis, contrôlés : le premier hors limites donne son message. */
function lireEntiers<K extends string>(
  champs: Record<K, { texte: string; min: number; max: number; message: string }>,
): { valeurs: Record<K, number> } | { erreur: string } {
  const valeurs = {} as Record<K, number>;
  for (const [cle, c] of Object.entries(champs) as [K, (typeof champs)[K]][]) {
    const n = entier(c.texte, c.min, c.max);
    if (n === null) return { erreur: c.message };
    valeurs[cle] = n;
  }
  return { valeurs };
}

type Message = { type: "ok" | "erreur"; texte: string } | null;

/** Formulaire d'une carte : champs texte, modification, enregistrement des réglages de la tâche. */
function useCarte<F extends object>(initial: F, onEnregistre: (r: ReglagesUtilisateur) => void) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<Message>(null);
  const modifier = (m: Partial<F>) => setForm((f) => ({ ...f, ...m }));
  const texte = (cle: keyof F) => ({
    value: String(form[cle]),
    onChange: (e: { target: { value: string } }) => modifier({ [cle]: e.target.value } as Partial<F>),
  });
  async function enregistrer(corps: Partial<ReglagesUtilisateur> | string) {
    if (typeof corps === "string") return setMessage({ type: "erreur", texte: corps });
    try {
      const r = await api.put<ReglagesUtilisateur>("/api/reglages", corps);
      onEnregistre(r);
      setMessage({ type: "ok", texte: "Réglages de la tâche enregistrés." });
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Enregistrement impossible." });
    }
  }
  return { form, modifier, texte, message, enregistrer };
}

/** Carte repliable d'une tâche : nom, étiquettes et état toujours visibles. */
function Carte({
  titre,
  active,
  essai,
  resume,
  children,
}: {
  titre: string;
  active: boolean;
  essai: boolean;
  resume: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="repli carte-tache">
      <summary className="repli__titre">
        <span className="carte-tache__entete">
          <span className="carte-tache__titre">
            <strong>{titre}</strong>{" "}
            <span className={`etiquette-publication etiquette-publication--${active ? "publie" : "annule"}`}>
              {active ? "Activée" : "Désactivée"}
            </span>{" "}
            <span className={`etiquette-publication etiquette-publication--${essai ? "essai" : "erreur"}`}>
              {essai ? "Essai" : "Réel"}
            </span>
          </span>
          <span className="secondaire carte-tache__resume">{resume}</span>
        </span>
      </summary>
      <div className="repli__contenu">{children}</div>
    </details>
  );
}

const dateOuJamais = (iso: string | null) => (iso === null ? "jamais" : formatDateHeure(iso));
const prochain = (iso: string | null) => (iso === null ? "aucun (désactivée)" : formatDateHeure(iso));

type Champ = { value: string; onChange: (e: { target: { value: string } }) => void };

function Plage({ debut, fin }: { debut: Champ; fin: Champ }) {
  return (
    <div className="champs-ligne">
      <label className="champ">
        <span>De (heure)</span>
        <input inputMode="numeric" {...debut} />
      </label>
      <label className="champ">
        <span>À (heure)</span>
        <input inputMode="numeric" {...fin} />
      </label>
    </div>
  );
}

function MessageCarte({ message }: { message: Message }) {
  return message ? (
    <p className={`message message--${message.type}`} role={message.type === "ok" ? "status" : "alert"}>
      {message.texte}
    </p>
  ) : null;
}

const NOTE_LANCER =
  "« Lancer maintenant » : à toute heure, même tâche désactivée, sans plafond du jour (pauses, validation et mode essai inchangés).";

function CarteDormants({
  r,
  etat,
  version,
  onChangement,
}: {
  r: ReglagesUtilisateur;
  etat: EtatTaches["dormants"] | null;
  version: number;
  onChangement: (r?: ReglagesUtilisateur) => void;
}) {
  const { form, modifier, texte, message, enregistrer } = useCarte(
    {
      active: r.dormantsActive,
      essai: r.dormantsEssai,
      mode: r.dormantsMode,
      heureDebut: String(r.dormantsHeureDebut),
      heureFin: String(r.dormantsHeureFin),
      baisseType: r.dormantsBaisseType,
      baisseValeur:
        r.dormantsBaisseType === "montant"
          ? centimesVersSaisie(r.dormantsBaisseValeur)
          : String(r.dormantsBaisseValeur),
      frequence: String(r.dormantsFrequenceHeures),
      /** Minutes. */
      pauseBaisse: String(Math.round(r.dormantsPauseBaisse / 60)),
      pauseRepublication: String(Math.round(r.dormantsPauseRepublication / 60)),
      plafondBaisses: String(r.dormantsPlafondBaisses),
      plafondRepublications: String(r.dormantsPlafondRepublications),
    },
    onChangement,
  );

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    const baisse =
      form.baisseType === "pourcentage" ? entier(form.baisseValeur, 1, 90) : lireMontant(form.baisseValeur);
    if (baisse === null || baisse === "invalide" || baisse <= 0)
      return void enregistrer(
        form.baisseType === "pourcentage"
          ? "Baisse : pourcentage entre 1 et 90."
          : "Baisse : montant invalide (ex. 1,00).",
      );
    const lus = lireEntiers({
      dormantsHeureDebut: { texte: form.heureDebut, min: 0, max: 23, message: "Heure de début : 0 à 23." },
      dormantsHeureFin: { texte: form.heureFin, min: 1, max: 24, message: "Heure de fin : 1 à 24." },
      dormantsFrequenceHeures: {
        texte: form.frequence,
        min: 6,
        max: 168,
        message: "Fréquence : toutes les 6 à 168 heures.",
      },
      pauseBaisse: { texte: form.pauseBaisse, min: 1, max: 60, message: "Pause entre deux baisses : 1 à 60 minutes." },
      pauseRepublication: {
        texte: form.pauseRepublication,
        min: 10,
        max: 120,
        message: "Pause entre deux republications : 10 à 120 minutes.",
      },
      dormantsPlafondBaisses: { texte: form.plafondBaisses, min: 1, max: 40, message: "Baisses par jour : 1 à 40." },
      dormantsPlafondRepublications: {
        texte: form.plafondRepublications,
        min: 1,
        max: 20,
        message: "Republications par jour : 1 à 20.",
      },
    });
    if ("erreur" in lus) return void enregistrer(lus.erreur);
    const { pauseBaisse, pauseRepublication, ...valeurs } = lus.valeurs;
    void enregistrer({
      dormantsActive: form.active,
      dormantsEssai: form.essai,
      dormantsMode: form.mode,
      dormantsBaisseType: form.baisseType,
      dormantsBaisseValeur: baisse,
      ...valeurs,
      dormantsPauseBaisse: pauseBaisse * 60,
      dormantsPauseRepublication: pauseRepublication * 60,
    });
  }

  const resume = etat && (
    <>
      Dernier passage : {dateOuJamais(etat.dernierPassage)} · Prochain : {prochain(etat.prochainPassage)}
      <br />
      Aujourd'hui : {etat.aujourdhui.baisses}/{etat.aujourdhui.plafondBaisses} baisse(s),{" "}
      {etat.aujourdhui.republications}/{etat.aujourdhui.plafondRepublications} republication(s)
    </>
  );

  return (
    <Carte titre="Articles dormants" active={r.dormantsActive} essai={r.dormantsEssai} resume={resume}>
      <form className="formulaire" onSubmit={soumettre} noValidate>
        <label className="case">
          <input type="checkbox" checked={form.active} onChange={(e) => modifier({ active: e.target.checked })} /> Tâche
          activée : baisser le prix des articles dormants, puis les republier une fois au prix minimum
        </label>
        <label className="case">
          <input type="checkbox" checked={form.essai} onChange={(e) => modifier({ essai: e.target.checked })} /> Mode
          essai : l'extension ouvre les pages Vinted sans rien modifier. Décoché (extension 1.14 au moins) : le prix est
          vraiment baissé, l'annonce vraiment supprimée puis recréée
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
        <Plage debut={texte("heureDebut")} fin={texte("heureFin")} />
        <details className="repli-historique">
          <summary>Réglages avancés</summary>
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
        </details>
        <MessageCarte message={message} />
        <button className="bouton bouton--principal" type="submit">
          Enregistrer
        </button>
      </form>
      <LancerTache tache="dormants" libelle="Lancer maintenant les articles dormants" onLance={() => onChangement()} />
      <p className="secondaire">{NOTE_LANCER}</p>
      <h4>Journal</h4>
      <JournalTaches tache="dormants" limite={10} version={version} />
    </Carte>
  );
}

function CarteFinalisation({
  r,
  etat,
  version,
  onChangement,
}: {
  r: ReglagesUtilisateur;
  etat: EtatTaches["finalisation"] | null;
  version: number;
  onChangement: (r?: ReglagesUtilisateur) => void;
}) {
  const { form, modifier, texte, message, enregistrer } = useCarte(
    {
      active: r.finalisationActive,
      essai: r.finalisationEssai,
      mode: r.finalisationMode,
      heureDebut: String(r.finalisationHeureDebut),
      heureFin: String(r.finalisationHeureFin),
      frequence: String(r.finalisationFrequenceHeures),
      plafond: String(r.finalisationPlafond),
    },
    onChangement,
  );

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    const lus = lireEntiers({
      finalisationHeureDebut: { texte: form.heureDebut, min: 0, max: 23, message: "Heure de début : 0 à 23." },
      finalisationHeureFin: { texte: form.heureFin, min: 1, max: 24, message: "Heure de fin : 1 à 24." },
      finalisationFrequenceHeures: {
        texte: form.frequence,
        min: 6,
        max: 168,
        message: "Lecture toutes les 6 à 168 heures.",
      },
      finalisationPlafond: { texte: form.plafond, min: 1, max: 100, message: "1 à 100 finalisations par jour." },
    });
    if ("erreur" in lus) return void enregistrer(lus.erreur);
    void enregistrer({
      finalisationActive: form.active,
      finalisationEssai: form.essai,
      finalisationMode: form.mode,
      ...lus.valeurs,
    });
  }

  const resume = etat && (
    <>
      Dernière lecture : {dateOuJamais(etat.dernierPassage)} · Prochaine : {prochain(etat.prochainPassage)}
      {etat.lancementDemande && " · Lecture demandée, au prochain passage de l'extension"}
      <br />
      Aujourd'hui : {etat.aujourdhui.finalisees}/{etat.aujourdhui.plafond} finalisation(s)
    </>
  );

  return (
    <Carte titre="Ventes finalisées" active={r.finalisationActive} essai={r.finalisationEssai} resume={resume}>
      <form className="formulaire" onSubmit={soumettre} noValidate>
        <label className="case">
          <input type="checkbox" checked={form.active} onChange={(e) => modifier({ active: e.target.checked })} /> Tâche
          activée : lire le « Porte-monnaie » sur Vinted et passer « Finalisé » les colis dont la commande est terminée
        </label>
        <label className="case">
          <input type="checkbox" checked={form.essai} onChange={(e) => modifier({ essai: e.target.checked })} /> Mode
          essai : la page est lue, rien n'est enregistré (à garder tant que le calibrage n'est pas fait)
        </label>
        <label className="champ">
          <span>Mode</span>
          <select {...texte("mode")}>
            <option value="manuel">Manuel : liste à valider dans « À faire »</option>
            <option value="automatique">Automatique : sans validation</option>
          </select>
        </label>
        <label className="champ">
          <span>Lecture toutes les (heures, 6 au moins)</span>
          <input inputMode="numeric" {...texte("frequence")} />
        </label>
        <Plage debut={texte("heureDebut")} fin={texte("heureFin")} />
        <details className="repli-historique">
          <summary>Réglages avancés</summary>
          <label className="champ">
            <span>Finalisations par jour (100 au plus)</span>
            <input inputMode="numeric" {...texte("plafond")} />
          </label>
        </details>
        <p className="secondaire">
          Date de finalisation : celle de la commande sur Vinted. Montant crédité différent : celui de Vinted le
          remplace, avec une alerte. Commande non retrouvée : « à rattacher » dans « À faire ».
        </p>
        <MessageCarte message={message} />
        <button className="bouton bouton--principal" type="submit">
          Enregistrer
        </button>
      </form>
      <LancerTache
        tache="finalisation"
        libelle="Lancer maintenant la lecture des ventes"
        onLance={() => onChangement()}
      />
      <p className="secondaire">{NOTE_LANCER}</p>
      <h4>Journal</h4>
      <JournalTaches tache="finalisation" limite={10} version={version} />
    </Carte>
  );
}

export function TachesAutomatiques() {
  const [reglages, setReglages] = useState<ReglagesUtilisateur | null>(null);
  const [etat, setEtat] = useState<EtatTaches | null>(null);
  const [version, setVersion] = useState(0);

  const chargerEtat = useCallback(() => {
    api
      .get<EtatTaches>("/api/taches/etat")
      .then(setEtat)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    api
      .get<ReglagesUtilisateur>("/api/reglages")
      .then(setReglages)
      .catch(() => undefined);
    chargerEtat();
  }, [chargerEtat]);

  if (reglages === null) return null;
  /** Après un enregistrement ou un lancement : état et journaux relus. */
  const onChangement = (r?: ReglagesUtilisateur) => {
    if (r) setReglages(r);
    chargerEtat();
    setVersion((v) => v + 1);
  };

  return (
    <section className="section">
      <h2>Tâches automatiques</h2>
      <p className="secondaire">
        Faites par l'extension Chrome, seulement quand Chrome est ouvert, une action à la fois sur Vinted. Touchez une
        tâche pour voir ses réglages et son journal.
      </p>
      <CarteDormants r={reglages} etat={etat?.dormants ?? null} version={version} onChangement={onChangement} />
      <CarteFinalisation r={reglages} etat={etat?.finalisation ?? null} version={version} onChangement={onChangement} />
      <h3>Journal de toutes les tâches</h3>
      <p className="secondaire">3 derniers mois, le plus récent d'abord.</p>
      <JournalTaches filtres version={version} />
    </section>
  );
}
