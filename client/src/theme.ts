// Thème de l'interface : automatique (le téléphone décide) ou forcé clair / sombre depuis les Réglages (issue #138).
// Le choix est mémorisé sur l'appareil (localStorage) ; les couleurs suivent l'attribut data-theme de <html> (styles.css).

export type PreferenceTheme = "auto" | "clair" | "sombre";

export const CHOIX_THEME: readonly { valeur: PreferenceTheme; libelle: string }[] = [
  { valeur: "auto", libelle: "Auto" },
  { valeur: "clair", libelle: "Clair" },
  { valeur: "sombre", libelle: "Sombre" },
];

const CLE = "vh-theme";

/** Valeur inconnue ou absente : « auto ». */
export function normaliserPreferenceTheme(valeur: unknown): PreferenceTheme {
  return valeur === "clair" || valeur === "sombre" ? valeur : "auto";
}

export function lirePreferenceTheme(): PreferenceTheme {
  try {
    return normaliserPreferenceTheme(localStorage.getItem(CLE));
  } catch {
    return "auto";
  }
}

/** Applique le thème au document : « auto » retire l'attribut, le téléphone décide. */
export function appliquerPreferenceTheme(preference: PreferenceTheme): void {
  if (preference === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = preference;
}

export function enregistrerPreferenceTheme(preference: PreferenceTheme): void {
  try {
    if (preference === "auto") localStorage.removeItem(CLE);
    else localStorage.setItem(CLE, preference);
  } catch {
    // Stockage indisponible (navigation privée) : le thème s'applique quand même jusqu'à la fermeture.
  }
  appliquerPreferenceTheme(preference);
}
