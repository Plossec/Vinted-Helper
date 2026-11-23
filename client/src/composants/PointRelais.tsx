// Résumé d'un point relais (#210) : transporteur, nom, état « ouvert / fermé » d'après les horaires saisis, adresse et
// liens (page officielle pour vérifier une fermeture exceptionnelle, itinéraire).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type Article, type Etat, type ListePointsRelais, type PointRelais } from "../api.js";
import { etatOuverture, formatJournee, JOURS } from "../utilitaires/horaires.js";

export function libelleTransporteur(transporteurs: readonly Etat[], code: string): string {
  return transporteurs.find((t) => t.code === code)?.libelle ?? code;
}

export function ResumePointRelais({
  point,
  transporteurs,
  maintenant = new Date(),
}: {
  point: PointRelais;
  transporteurs: readonly Etat[];
  maintenant?: Date;
}) {
  const etat = etatOuverture(point.horaires, maintenant);
  const fermeVintedGo =
    point.transporteur === "vinted_go" &&
    point.vintedGoStatut !== null &&
    ["ferme", "hors_service", "pas_de_compartiments", "ramassage_uniquement"].includes(point.vintedGoStatut);
  // Vinted Go relevé (#262) : ouvert seulement si le point n'est pas fermé ET dans ses horaires relevés.
  const releveVintedGo = point.transporteur === "vinted_go" && point.vintedGoStatut !== null;
  const ouvert = releveVintedGo ? !fermeVintedGo && etat.ouvert : etat.ouvert;
  const statutVintedGo =
    point.vintedGoStatut === "pas_de_compartiments"
      ? "Pas de compartiments"
      : point.vintedGoStatut === "ramassage_uniquement"
        ? "Ramassage uniquement"
        : point.vintedGoStatut === "hors_service"
          ? "Hors service"
          : null;
  return (
    <span className="point-relais">
      <span className="carte-article__ligne">
        <span className="carte-article__nom">
          {point.nom}
          {point.archive && " (archivé)"}
        </span>
        <span className={`badge ${ouvert ? "badge--ouvert" : "badge--ferme"}`}>
          {statutVintedGo ?? (ouvert ? "Ouvert" : "Fermé")}
        </span>
      </span>
      <span className="secondaire">
        {libelleTransporteur(transporteurs, point.transporteur)}
        {point.numero ? ` — n° ${point.numero}` : ""}
      </span>
      <span className="secondaire">
        {releveVintedGo && fermeVintedGo ? "Fermé selon le relevé de Vinted Go" : etat.texte}
      </span>
      {point.transporteur === "vinted_go" && point.vintedGoErreur && (
        <span className="secondaire">Dernier relevé en échec : {point.vintedGoErreur}</span>
      )}
      {point.adresse && <span>{point.adresse}</span>}
      {point.transporteur === "vinted_go" && point.vintedGoCapacite && (
        <span className="secondaire">
          Capacité{point.vintedGoCapacite.miseAJour ? ` — mise à jour ${point.vintedGoCapacite.miseAJour}` : ""}
          {point.vintedGoCapacite.tailles
            .map((taille) => ` · ${taille.taille.toUpperCase()}: ${taille.disponibles ?? "—"}`)
            .join("")}
        </span>
      )}
      {point.transporteur === "vinted_go" && point.vintedGoReleveLe && (
        <details className="section">
          <summary>Horaires complets relevés</summary>
          {JOURS.map((jour, index) => (
            <span key={jour} className="secondaire">
              {jour}: {formatJournee(point.horaires[index] ?? [])}
            </span>
          ))}
        </details>
      )}
      <span className="point-relais__liens">
        {point.url && (
          <a className="lien" href={point.url} target="_blank" rel="noreferrer">
            Page officielle
          </a>
        )}
        {point.adresse && (
          <a
            className="lien"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.adresse)}`}
            target="_blank"
            rel="noreferrer"
          >
            Itinéraire
          </a>
        )}
      </span>
    </span>
  );
}

const ROLES = {
  a_expedier: { champ: "pointDepotId", libelle: "Point de dépôt du colis" },
  envoye: { champ: "pointDepotId", libelle: "Point de dépôt du colis" },
  a_recuperer: { champ: "pointRetraitId", libelle: "Point de retrait du retour" },
} as const;

/**
 * Fiche d'un article vendu (#210) : point de dépôt du colis (À expédier, Envoyé) ou point de retrait d'un retour
 * (À récupérer), choisi parmi les points relais et affiché avec son état ouvert / fermé.
 */
export function BlocPointRelais({ article }: { article: Article }) {
  const role = article.statut in ROLES ? ROLES[article.statut as keyof typeof ROLES] : null;
  const venteId = article.pointsRelais?.venteId ?? null;
  const [liste, setListe] = useState<ListePointsRelais | null>(null);
  const [choisi, setChoisi] = useState<string | null>(
    role && article.pointsRelais ? article.pointsRelais[role.champ] : null,
  );
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (role === null || venteId === null) return;
    api
      .get<ListePointsRelais>("/api/points-relais")
      .then(setListe)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible."));
  }, [role, venteId]);

  if (role === null || venteId === null) return null;

  async function choisir(id: string) {
    if (role === null || venteId === null) return;
    const nouveau = id === "" ? null : id;
    try {
      await api.put(`/api/ventes/${venteId}/points-relais`, { [role.champ]: nouveau });
      setChoisi(nouveau);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  }

  const point = liste?.points.find((p) => p.id === choisi) ?? null;
  const proposes = liste?.points.filter((p) => !p.archive || p.id === choisi) ?? [];
  return (
    <section className="section">
      <label className="champ">
        <span>{role.libelle}</span>
        <select value={choisi ?? ""} onChange={(e) => void choisir(e.target.value)} disabled={liste === null}>
          <option value="">Aucun</option>
          {proposes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom} — {libelleTransporteur(liste?.transporteurs ?? [], p.transporteur)}
            </option>
          ))}
        </select>
      </label>
      {point && liste && (
        <div className="carte-article">
          <ResumePointRelais point={point} transporteurs={liste.transporteurs} />
        </div>
      )}
      {liste?.points.length === 0 && (
        <p className="secondaire">
          Aucun point relais enregistré : <Link to="/points-relais">ajouter un point relais</Link>.
        </p>
      )}
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
    </section>
  );
}
