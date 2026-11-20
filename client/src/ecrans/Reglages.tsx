// Réglages (#282, ADR-0119) : un sommaire de rubriques regroupées ; chaque rubrique ouvre sa propre page (court à lire
// au téléphone). En haut, ce qui sert le plus : tâches automatiques, publication Vinted, IA et calculs.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type Sante } from "../api.js";

interface Rubrique {
  chemin: string;
  titre: string;
  detail: string;
}

const GROUPES: { titre: string; rubriques: Rubrique[] }[] = [
  {
    titre: "Automatisation",
    rubriques: [
      {
        chemin: "/reglages/taches",
        titre: "Tâches automatiques",
        detail: "Activer, régler, lancer ; journal de toutes les tâches",
      },
      {
        chemin: "/publication",
        titre: "Publication Vinted",
        detail: "File de publication, jeton de l'extension",
      },
    ],
  },
  {
    titre: "IA et calculs",
    rubriques: [
      { chemin: "/reglages/ia", titre: "IA (Gemini)", detail: "Prompts des annonces et de l'étiquette" },
      {
        chemin: "/reglages/calculs",
        titre: "Calculs et alertes",
        detail: "Emballage, format du colis, délais des alertes",
      },
    ],
  },
  {
    titre: "Données",
    rubriques: [
      { chemin: "/frais", titre: "Frais divers", detail: "Dépenses hors articles" },
      { chemin: "/sorties", titre: "Sorties", detail: "Vide-greniers, lieux, essence" },
      { chemin: "/listes", titre: "Marques et lieux", detail: "Listes de référence" },
      { chemin: "/points-relais", titre: "Points relais", detail: "Dépôt des colis, retrait des retours" },
      { chemin: "/corbeille", titre: "Corbeille", detail: "Articles supprimés, restaurables 30 jours" },
    ],
  },
  {
    titre: "Application",
    rubriques: [
      { chemin: "/reglages/affichage", titre: "Affichage", detail: "Thème clair ou sombre, écran d'ouverture" },
      { chemin: "/reglages/compte", titre: "Compte", detail: "Mot de passe, déconnexion" },
    ],
  },
];

export function Reglages() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api
      .get<Sante>("/api/sante")
      .then((s) => actif && setVersion(s.version))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, []);

  return (
    <main className="page">
      <h1>Réglages</h1>
      {GROUPES.map((groupe) => (
        <section className="section" key={groupe.titre}>
          <h2>{groupe.titre}</h2>
          <ul className="sommaire">
            {groupe.rubriques.map((r) => (
              <li key={r.chemin}>
                <Link to={r.chemin} className="sommaire__lien">
                  <span className="sommaire__texte">
                    <span className="sommaire__titre">{r.titre}</span>
                    <span className="sommaire__detail">{r.detail}</span>
                  </span>
                  <span className="sommaire__fleche" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="secondaire">Vinted Helper — version {version ?? "…"}</p>
    </main>
  );
}
