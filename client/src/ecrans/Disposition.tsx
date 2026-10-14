// Disposition commune une fois connecté : contenu + barre de navigation en bas (usage au pouce).
// Sans réseau, l'application reste utilisable (saisie terrain mise en attente, §2.2).
import { type ComponentType, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { api, ErreurApi } from "../api.js";
import { nombreAlertes } from "../outils/alertes.js";
import { chargerAlertes } from "../outils/alertesCache.js";
import { BandeauFile } from "../composants/BandeauFile.js";
import { FenetreDialogue } from "../composants/Dialogue.js";
import { IconeAFaire, IconeArticles, IconeReglages, IconeTableau, IconeTerrain } from "../composants/Icones.js";
import { demarrerFile, envoyerMaintenant } from "../hors-ligne/index.js";
import { type Onglet, ongletActif } from "../navigation.js";
import { useTitreEtFocus } from "../outils/titrePage.js";
import { mettreAJour, useNouvelleVersion } from "../pwa.js";

type Etat = "verification" | "connecte" | "hors-ligne";

const ONGLETS: { onglet: Onglet; chemin: string; libelle: string; Icone: ComponentType }[] = [
  { onglet: "a-faire", chemin: "/", libelle: "À faire", Icone: IconeAFaire },
  { onglet: "articles", chemin: "/articles", libelle: "Articles", Icone: IconeArticles },
  { onglet: "terrain", chemin: "/terrain", libelle: "Terrain", Icone: IconeTerrain },
  { onglet: "tableau", chemin: "/tableau", libelle: "Tableau", Icone: IconeTableau },
  { onglet: "reglages", chemin: "/reglages", libelle: "Réglages", Icone: IconeReglages },
];

export function Disposition() {
  const naviguer = useNavigate();
  const [etat, setEtat] = useState<Etat>("verification");
  const nouvelleVersion = useNouvelleVersion();
  const { pathname } = useLocation();
  const [alertes, setAlertes] = useState(0);
  const actif = ongletActif(pathname);
  const contenu = useRef<HTMLDivElement>(null);

  // Pastille du nombre de choses à faire sur l'onglet « À faire » (#191), mise à jour à chaque changement d'écran.
  useEffect(() => {
    let actif = true;
    chargerAlertes()
      .then((a) => actif && setAlertes(nombreAlertes(a)))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [pathname]);

  useEffect(() => {
    demarrerFile();
    let actif = true;
    const verifier = () =>
      api
        .get<{ identifiant: string }>("/api/moi")
        .then(() => {
          if (!actif) return;
          setEtat("connecte");
          void envoyerMaintenant(); // après une reconnexion : envoie ce qui attendait
        })
        .catch((e: unknown) => {
          if (!actif) return;
          if (e instanceof ErreurApi && e.statut === 401) void naviguer("/connexion", { replace: true });
          else setEtat("hors-ligne");
        });
    void verifier();
    // Retour du réseau : on revérifie (le bandeau « Hors ligne » disparaît).
    window.addEventListener("online", verifier);
    window.addEventListener("file-envoyee", verifier);
    return () => {
      actif = false;
      window.removeEventListener("online", verifier);
      window.removeEventListener("file-envoyee", verifier);
    };
  }, [naviguer]);

  useTitreEtFocus(contenu, etat === "verification" ? null : pathname);

  if (etat === "verification") return <p className="page statut">Chargement…</p>;

  return (
    <div className="disposition">
      {nouvelleVersion && (
        <p className="bandeau bandeau--version">
          Nouvelle version disponible —{" "}
          <button className="lien" type="button" onClick={mettreAJour}>
            Mettre à jour
          </button>
        </p>
      )}
      {etat === "hors-ligne" && (
        <p className="bandeau bandeau--hors-ligne">
          Hors ligne (ou serveur injoignable) : la saisie terrain reste possible, elle sera envoyée plus tard.
        </p>
      )}
      <BandeauFile />
      <div className="disposition__contenu" ref={contenu}>
        <Outlet />
      </div>
      <FenetreDialogue />
      <nav className="navigation" aria-label="Navigation principale">
        {ONGLETS.map(({ onglet, chemin, libelle, Icone }) => (
          <Link
            key={onglet}
            to={chemin}
            className={`navigation__lien${actif === onglet ? " active" : ""}`}
            aria-current={actif === onglet ? "page" : undefined}
          >
            <span className="navigation__icone">
              <Icone />
              {onglet === "a-faire" && alertes > 0 && (
                <span className="pastille" aria-label={`${alertes} à faire`}>
                  {alertes}
                </span>
              )}
            </span>
            <span className="navigation__libelle">{libelle}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
