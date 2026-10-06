// Saisie terrain (§5.1) : démarrer une sortie, « + Achat » en 3-4 gestes, essence, articles Maison.
// Tout passe par la file d'attente du téléphone : rien n'est perdu sans réseau (§2.2).
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { api, type Referentiels, type Sortie, urlVignette } from "../api.js";
import { ListeDeroulante, normaliser, type OptionListe } from "../composants/ListeDeroulante.js";
import {
  chargerReferentiels,
  lireSortieEnCours,
  memoriserSortieEnCours,
  type SortieEnCours,
} from "../hors-ligne/cache.js";
import type { CorpsAchat, Operation } from "../hors-ligne/file.js";
import { ajouterALaFile, useFile } from "../hors-ligne/index.js";
import { aujourdhui, formatDate } from "../outils/dates.js";
import { formatEuros, lireMontant } from "../outils/montants.js";
import { formatReference, LIBELLES_STATUT } from "../statuts.js";

/** Achat en cours de saisie : photo prise (ou non), prix et nombre d'articles. */
interface AchatEnSaisie {
  image: File | null;
  apercu: string | null;
  prix: string;
  nombre: string;
}

const NOMBRE_MAX = 50;

export function Terrain() {
  const [refs, setRefs] = useState<Referentiels | null>(null);
  const [sortie, setSortie] = useState<SortieEnCours | null>(lireSortieEnCours);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [achat, setAchat] = useState<AchatEnSaisie | null>(null);
  const [maison, setMaison] = useState(false);
  const appareil = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void chargerReferentiels(() => api.get<Referentiels>("/api/referentiels")).then(({ refs }) => setRefs(refs));
  }, []);

  function ouvrirAppareil(pourMaison: boolean) {
    setMaison(pourMaison);
    setMessage(null);
    appareil.current?.click();
  }

  function photoPrise(evenement: ChangeEvent<HTMLInputElement>) {
    const image = evenement.target.files?.[0] ?? null;
    evenement.target.value = "";
    if (image === null) return; // appareil photo fermé sans photo
    setAchat({ image, apercu: URL.createObjectURL(image), prix: "", nombre: "1" });
  }

  function fermerAchat() {
    if (achat?.apercu) URL.revokeObjectURL(achat.apercu);
    setAchat(null);
  }

  async function validerAchat(evenement: FormEvent) {
    evenement.preventDefault();
    if (achat === null) return;
    const prix = maison ? 0 : lireMontant(achat.prix);
    const nombre = Number(achat.nombre);
    if (prix === null) return setMessage({ type: "erreur", texte: "Indiquez le prix payé." });
    if (prix === "invalide") return setMessage({ type: "erreur", texte: "Prix invalide (ex. 2 ou 3,50)." });
    if (!Number.isInteger(nombre) || nombre < 1 || nombre > NOMBRE_MAX) {
      return setMessage({ type: "erreur", texte: `Nombre d'articles : entre 1 et ${NOMBRE_MAX}.` });
    }
    const photoId = achat.image ? crypto.randomUUID() : null;
    const corps: CorpsAchat = {
      id: crypto.randomUUID(),
      articleIds: Array.from({ length: nombre }, () => crypto.randomUUID()),
      sortieId: maison ? null : (sortie?.id ?? null),
      prixTotal: prix,
      photoId,
      date: maison ? aujourdhui() : (sortie?.date ?? aujourdhui()),
    };
    const operations: Operation[] = [];
    if (achat.image && photoId) {
      operations.push({ type: "photo", photoId, typePhoto: "terrain", image: achat.image });
    }
    operations.push({ type: "achat", corps });
    await ajouterALaFile(...operations);
    fermerAchat();
    setMessage({
      type: "ok",
      texte: maison
        ? "Article Maison enregistré."
        : nombre > 1
          ? `Lot de ${nombre} articles enregistré (${formatEuros(prix)}).`
          : `Achat enregistré (${formatEuros(prix)}).`,
    });
  }

  return (
    <main className="page">
      <h1>Terrain</h1>
      <input
        ref={appareil}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={photoPrise}
        aria-label="Prendre une photo"
      />

      {achat ? (
        <FormulaireAchat
          achat={achat}
          maison={maison}
          onChange={setAchat}
          onValider={(e) => void validerAchat(e)}
          onAnnuler={fermerAchat}
          message={message}
        />
      ) : sortie ? (
        <SortieActive
          sortie={sortie}
          onAchat={() => ouvrirAppareil(false)}
          onAchatSansPhoto={() => {
            setMaison(false);
            setAchat({ image: null, apercu: null, prix: "", nombre: "1" });
          }}
          onTerminer={() => {
            memoriserSortieEnCours(null);
            setSortie(null);
            setMessage(null);
          }}
          message={message}
          setMessage={setMessage}
        />
      ) : (
        <DemarrerSortie
          refs={refs}
          onDemarree={(s) => {
            memoriserSortieEnCours(s);
            setSortie(s);
            setMessage(null);
          }}
          onMaison={() => ouvrirAppareil(true)}
          message={message}
          setMessage={setMessage}
        />
      )}
    </main>
  );
}

type SetMessage = (m: { type: "ok" | "erreur"; texte: string } | null) => void;

function Message({ message }: { message: { type: "ok" | "erreur"; texte: string } | null }) {
  if (!message) return null;
  return (
    <p className={`message message--${message.type}`} role={message.type === "erreur" ? "alert" : "status"}>
      {message.texte}
    </p>
  );
}

function DemarrerSortie({
  refs,
  onDemarree,
  onMaison,
  message,
  setMessage,
}: {
  refs: Referentiels | null;
  onDemarree: (s: SortieEnCours) => void;
  onMaison: () => void;
  message: { type: "ok" | "erreur"; texte: string } | null;
  setMessage: SetMessage;
}) {
  const [date, setDate] = useState(aujourdhui);
  const [lieu, setLieu] = useState("");
  const options = useMemo(
    () => (refs?.lieux ?? []).filter((l) => !l.estMaison).map((l): OptionListe => ({ cle: l.id, libelle: l.nom })),
    [refs],
  );

  async function demarrer(evenement: FormEvent) {
    evenement.preventDefault();
    const nom = lieu.trim().replace(/\s+/g, " ");
    if (nom === "") return setMessage({ type: "erreur", texte: "Indiquez le lieu." });
    if (nom.length > 100) return setMessage({ type: "erreur", texte: "Lieu : 100 caractères au maximum." });
    if (date === "") return setMessage({ type: "erreur", texte: "Indiquez la date." });
    // Lieu libre : un lieu déjà connu est réutilisé, sinon le serveur l'ajoute à la liste à l'envoi.
    const choisi = refs?.lieux.find((l) => normaliser(l.nom) === normaliser(nom));
    const s: SortieEnCours = { id: crypto.randomUUID(), date, lieuId: choisi?.id ?? null, lieu: choisi?.nom ?? nom };
    await ajouterALaFile({
      type: "sortie",
      corps: choisi
        ? { id: s.id, date, lieuId: choisi.id, notes: null }
        : { id: s.id, date, lieuNom: nom, notes: null },
    });
    onDemarree(s);
  }

  return (
    <>
      <form className="formulaire encadre" onSubmit={(e) => void demarrer(e)} noValidate>
        <h2>Démarrer une sortie</h2>
        <ListeDeroulante
          libelle="Lieu"
          obligatoire
          texte={lieu}
          onTexte={setLieu}
          options={options}
          onChoix={(o) => setLieu(o.libelle)}
        />
        <label className="champ">
          <span>Date *</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <Message message={message} />
        <button className="bouton bouton--principal" type="submit">
          Démarrer la sortie
        </button>
      </form>
      <div className="section">
        <button className="bouton" type="button" onClick={onMaison}>
          📷 Article de la maison (0 €, sans sortie)
        </button>
        <p>
          <Link to="/sorties" className="lien">
            Toutes les sorties
          </Link>
        </p>
      </div>
    </>
  );
}

function SortieActive({
  sortie,
  onAchat,
  onAchatSansPhoto,
  onTerminer,
  message,
  setMessage,
}: {
  sortie: SortieEnCours;
  onAchat: () => void;
  onAchatSansPhoto: () => void;
  onTerminer: () => void;
  message: { type: "ok" | "erreur"; texte: string } | null;
  setMessage: SetMessage;
}) {
  const file = useFile();
  const [serveur, setServeur] = useState<Sortie | null>(null);
  const [essence, setEssence] = useState("");

  // Articles déjà reçus par le serveur ; rechargés après chaque envoi de la file.
  useEffect(() => {
    let actif = true;
    const charger = () =>
      api
        .get<Sortie>(`/api/sorties/${sortie.id}`)
        .then((s) => actif && setServeur(s))
        .catch(() => undefined);
    charger();
    window.addEventListener("file-envoyee", charger);
    return () => {
      actif = false;
      window.removeEventListener("file-envoyee", charger);
    };
  }, [sortie.id]);

  // Achats de cette sortie encore sur le téléphone.
  const enAttente = useMemo(() => {
    const photos = new Map<string, Blob>();
    for (const e of file.elements) {
      if (e.operation.type === "photo") photos.set(e.operation.photoId, e.operation.image);
    }
    return file.elements.flatMap((e) =>
      e.operation.type === "achat" && e.operation.corps.sortieId === sortie.id
        ? [{ cle: e.cle, corps: e.operation.corps, image: photos.get(e.operation.corps.photoId ?? "") ?? null }]
        : [],
    );
  }, [file.elements, sortie.id]);

  async function enregistrerEssence(evenement: FormEvent) {
    evenement.preventDefault();
    const montant = lireMontant(essence);
    if (montant === null || montant === "invalide") {
      return setMessage({ type: "erreur", texte: "Montant d'essence invalide (ex. 4,50)." });
    }
    await ajouterALaFile({ type: "essence", sortieId: sortie.id, montantEssence: montant });
    setEssence("");
    setMessage({ type: "ok", texte: `Essence enregistrée : ${formatEuros(montant)}.` });
  }

  return (
    <>
      <div className="encadre">
        <p>
          <strong>{sortie.lieu}</strong> — {formatDate(sortie.date)}
        </p>
        <button className="bouton bouton--achat" type="button" onClick={onAchat}>
          + Achat
        </button>
        <button className="lien" type="button" onClick={onAchatSansPhoto}>
          Achat sans photo
        </button>
        <Message message={message} />
      </div>

      <form className="formulaire section" onSubmit={(e) => void enregistrerEssence(e)} noValidate>
        <div className="champs-ligne champs-ligne--bas">
          <label className="champ">
            <span>
              Essence de la sortie (€)
              {serveur ? ` — actuellement ${formatEuros(serveur.montantEssence)}` : ""}
            </span>
            <input
              inputMode="decimal"
              value={essence}
              onChange={(e) => setEssence(e.target.value)}
              placeholder="4,50"
            />
          </label>
          <button className="bouton" type="submit">
            Enregistrer
          </button>
        </div>
      </form>

      <section className="section">
        <h2>Achats de la sortie</h2>
        <ul className="liste">
          {enAttente.map((a) => (
            <li key={a.cle} className="carte-article carte-article--photo">
              <VignetteLocale image={a.image} />
              <span>
                <span className="reference">Réf. en attente</span>
                <br />
                {a.corps.articleIds.length > 1
                  ? `Lot de ${a.corps.articleIds.length} — ${formatEuros(a.corps.prixTotal)}`
                  : formatEuros(a.corps.prixTotal)}
              </span>
            </li>
          ))}
          {serveur?.articles.map((a) => (
            <li key={a.id}>
              <Link to={`/articles/${a.id}`} className="carte-article carte-article--photo">
                {a.vignette ? (
                  <img className="vignette" src={urlVignette(a.vignette)} alt="" loading="lazy" />
                ) : (
                  <span className="vignette" />
                )}
                <span>
                  <span className="reference">{formatReference(a.reference)}</span>{" "}
                  <span className={`badge badge--${a.statut}`}>{LIBELLES_STATUT[a.statut]}</span>
                  <br />
                  {formatEuros(a.prixAchat)}
                  {a.lotId ? " (part du lot)" : ""}
                  {a.essence > 0 ? ` + ${formatEuros(a.essence)} d'essence` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {enAttente.length === 0 && (serveur?.articles.length ?? 0) === 0 && (
          <p className="vide">Aucun achat pour l'instant.</p>
        )}
      </section>

      <div className="section actions">
        <Link to={`/sorties/${sortie.id}`} className="bouton">
          Détail de la sortie
        </Link>
        <button
          className="bouton"
          type="button"
          onClick={() => {
            if (window.confirm("Terminer la sortie ? Vous pourrez toujours la modifier depuis « Sorties »."))
              onTerminer();
          }}
        >
          Terminer la sortie
        </button>
      </div>
    </>
  );
}

function VignetteLocale({ image }: { image: Blob | null }) {
  const url = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url ? <img className="vignette" src={url} alt="" /> : <span className="vignette" />;
}

function FormulaireAchat({
  achat,
  maison,
  onChange,
  onValider,
  onAnnuler,
  message,
}: {
  achat: AchatEnSaisie;
  maison: boolean;
  onChange: (a: AchatEnSaisie) => void;
  onValider: (e: FormEvent) => void;
  onAnnuler: () => void;
  message: { type: "ok" | "erreur"; texte: string } | null;
}) {
  return (
    <form className="formulaire" onSubmit={onValider} noValidate>
      <h2>{maison ? "Article de la maison" : "Nouvel achat"}</h2>
      {achat.apercu && <img className="apercu-photo" src={achat.apercu} alt="Photo de l'achat" />}
      {!maison && (
        <label className="champ">
          <span>Prix payé (€) *</span>
          <input
            className="champ-grand"
            inputMode="decimal"
            autoFocus
            value={achat.prix}
            onChange={(e) => onChange({ ...achat, prix: e.target.value })}
            placeholder="2"
          />
        </label>
      )}
      <label className="champ">
        <span>Nombre d'articles (lot si plus d'un)</span>
        <input
          className="champ-grand"
          inputMode="numeric"
          value={achat.nombre}
          onChange={(e) => onChange({ ...achat, nombre: e.target.value })}
        />
      </label>
      <Message message={message?.type === "erreur" ? message : null} />
      <button className="bouton bouton--principal bouton--achat" type="submit">
        Valider
      </button>
      <button className="bouton" type="button" onClick={onAnnuler}>
        Annuler
      </button>
    </form>
  );
}
