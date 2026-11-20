// Réglages → Affichage (#282) : thème clair / sombre et écran d'ouverture de l'application installée (#191), par appareil.
import { useState } from "react";
import { CHOIX_DEMARRAGE, type EcranDemarrage, enregistrerDemarrage, lireDemarrage } from "../demarrage.js";
import { CHOIX_THEME, enregistrerPreferenceTheme, lirePreferenceTheme, type PreferenceTheme } from "../theme.js";
import { PageReglages } from "./ReglagesRubrique.js";

export function ReglagesAffichage() {
  const [theme, setTheme] = useState<PreferenceTheme>(lirePreferenceTheme);
  const [demarrage, setDemarrage] = useState<EcranDemarrage>(lireDemarrage);

  function choisirTheme(preference: PreferenceTheme) {
    enregistrerPreferenceTheme(preference);
    setTheme(preference);
  }

  function choisirDemarrage(ecran: EcranDemarrage) {
    enregistrerDemarrage(ecran);
    setDemarrage(ecran);
  }

  return (
    <PageReglages titre="Affichage">
      <section className="section">
        <h2>Thème</h2>
        <p className="secondaire">Auto suit le réglage clair / sombre du téléphone.</p>
        <div className="segments" role="group" aria-label="Thème">
          {CHOIX_THEME.map((choix) => (
            <button
              key={choix.valeur}
              type="button"
              className={choix.valeur === theme ? "bouton bouton--principal" : "bouton"}
              aria-pressed={choix.valeur === theme}
              onClick={() => choisirTheme(choix.valeur)}
            >
              {choix.libelle}
            </button>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Ouverture de l'application installée</h2>
        <p className="secondaire">Écran affiché quand vous ouvrez l'application sur cet appareil.</p>
        <div className="segments" role="group" aria-label="Écran d'ouverture">
          {CHOIX_DEMARRAGE.map((choix) => (
            <button
              key={choix.valeur}
              type="button"
              className={choix.valeur === demarrage ? "bouton bouton--principal" : "bouton"}
              aria-pressed={choix.valeur === demarrage}
              onClick={() => choisirDemarrage(choix.valeur)}
            >
              {choix.libelle}
            </button>
          ))}
        </div>
      </section>
    </PageReglages>
  );
}
