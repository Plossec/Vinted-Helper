// Horaires d'un point relais (#210) : saisie d'une journée en texte (« 9h-12h, 14h-19h »), affichage, et état
// « ouvert / fermé » à l'heure de Paris.

export interface Plage {
  debut: string;
  fin: string;
}

/** 7 jours, du lundi au dimanche. */
export type Horaires = Plage[][];

export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

/** « 9h », « 9h30 », « 09:30 », « 9 » → « 09:30 » ; null si l'heure est invalide. */
function lireHeure(texte: string): string | null {
  const m = /^(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?$/i.exec(texte.trim());
  if (!m) return null;
  const heures = Number(m[1]);
  const minutes = Number(m[2] ?? "0");
  if (minutes > 59 || heures > 24 || (heures === 24 && minutes > 0)) return null;
  return `${String(heures).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Horaires d'une journée saisis en texte : plages séparées par une virgule, « / » ou « et » (« 9h-12h, 14h-19h »).
 * Vide ou « fermé » = jour de fermeture. « invalide » si une plage est illisible, inversée ou chevauche la précédente.
 */
export function lireJournee(texte: string): Plage[] | "invalide" {
  const brut = texte.trim();
  if (brut === "" || /^ferm[ée]e?$/i.test(brut)) return [];
  const plages: Plage[] = [];
  for (const morceau of brut.split(/\s*(?:,|;|\/|\bet\b)\s*/i)) {
    const [d, f, ...reste] = morceau.split(/\s*(?:-|–|à)\s*/);
    if (d === undefined || f === undefined || reste.length > 0) return "invalide";
    const debut = lireHeure(d);
    const fin = lireHeure(f);
    if (debut === null || fin === null || fin <= debut) return "invalide";
    const precedente = plages.at(-1);
    if (precedente && debut < precedente.fin) return "invalide";
    plages.push({ debut, fin });
  }
  return plages.length > 4 ? "invalide" : plages;
}

/** « 09:00-12:00, 14:00-19:00 » ou « Fermé ». */
export function formatJournee(plages: readonly Plage[]): string {
  return plages.length === 0 ? "Fermé" : plages.map((p) => `${p.debut}-${p.fin}`).join(", ");
}

const NOMS_JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Jour (0 = lundi) et heure « HH:MM » à Paris. */
function instantParis(date: Date): { jour: number; heure: string } {
  const parties = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const valeur = (type: string) => parties.find((p) => p.type === type)?.value ?? "";
  return { jour: NOMS_JOURS.indexOf(valeur("weekday")), heure: `${valeur("hour")}:${valeur("minute")}` };
}

const enClair = (heure: string) =>
  heure === "24:00" || heure === "00:00"
    ? "minuit"
    : heure
        .replace(/^0(\d)/, "$1")
        .replace(":", " h ")
        .replace(/ h 00$/, " h");

/** « Ouvert — ferme à 19 h » ou « Fermé — ouvre lundi à 9 h » (d'après les horaires saisis, heure de Paris). */
export function etatOuverture(horaires: Horaires, maintenant: Date): { ouvert: boolean; texte: string } {
  const { jour, heure } = instantParis(maintenant);
  const plage = (horaires[jour] ?? []).find((p) => p.debut <= heure && heure < p.fin);
  if (plage) return { ouvert: true, texte: `Ouvert — ferme à ${enClair(plage.fin)}` };
  for (let decalage = 0; decalage < 8; decalage++) {
    const j = (jour + decalage) % 7;
    const prochaine = (horaires[j] ?? []).find((p) => decalage > 0 || p.debut > heure);
    if (prochaine) {
      const quand = decalage === 0 ? "" : decalage === 1 ? " demain" : ` ${NOMS_JOURS[j] ?? ""}`;
      return { ouvert: false, texte: `Fermé — ouvre${quand} à ${enClair(prochaine.debut)}` };
    }
  }
  return { ouvert: false, texte: "Fermé — aucun horaire saisi" };
}
