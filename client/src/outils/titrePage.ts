// Titre d'onglet et focus à chaque changement d'écran (#132) : le titre suit le <h1> de l'écran (même chargé plus
// tard, ex. fiche article) et le <h1> reçoit le focus, pour que les lecteurs d'écran annoncent le nouvel écran.
import { type RefObject, useEffect } from "react";

const NOM_APPLICATION = "Vinted Helper";

/** « #0012 Robe Sézane — Vinted Helper » ; titre vide → nom de l'application seul. */
export function titreDocument(titreEcran: string | null | undefined): string {
  const t = (titreEcran ?? "").replace(/\s+/g, " ").trim();
  return t === "" ? NOM_APPLICATION : `${t} — ${NOM_APPLICATION}`;
}

/** `chemin` null : écran pas encore affiché (rien à faire). */
export function useTitreEtFocus(conteneur: RefObject<HTMLElement | null>, chemin: string | null) {
  useEffect(() => {
    const racine = conteneur.current;
    if (chemin === null || !racine) return;
    let focusAFaire = true;
    const appliquer = () => {
      const h1 = racine.querySelector("h1");
      document.title = titreDocument(h1?.textContent);
      if (!h1 || !focusAFaire) return;
      focusAFaire = false;
      // Un champ déjà focalisé (ex. montant de la saisie terrain, clavier ouvert) garde le focus.
      const actif = document.activeElement;
      if (actif instanceof HTMLElement && actif !== document.body && racine.contains(actif)) return;
      h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: true });
    };
    appliquer();
    const observateur = new MutationObserver(appliquer);
    observateur.observe(racine, { childList: true, subtree: true, characterData: true });
    return () => observateur.disconnect();
  }, [conteneur, chemin]);
}
