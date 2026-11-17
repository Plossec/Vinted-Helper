// Points relais (#210) : transporteurs et horaires d'ouverture saisis à la main.

export const TRANSPORTEURS = [
  { code: "vinted_go", libelle: "Vinted Go" },
  { code: "mondial_relay", libelle: "Mondial Relay" },
  { code: "la_poste", libelle: "La Poste / Colissimo" },
  { code: "relais_colis", libelle: "Relais Colis / Chronopost" },
] as const;

export type CodeTransporteur = (typeof TRANSPORTEURS)[number]["code"];
export const CODES_TRANSPORTEUR = TRANSPORTEURS.map((t) => t.code) as [CodeTransporteur, ...CodeTransporteur[]];

export const estTransporteur = (valeur: unknown): valeur is CodeTransporteur =>
  typeof valeur === "string" && (CODES_TRANSPORTEUR as readonly string[]).includes(valeur);

/** Plage d'ouverture « HH:MM » → « HH:MM » (fin après le début, même jour). */
export interface Plage {
  debut: string;
  fin: string;
}

/** Horaires de la semaine : 7 jours, du lundi au dimanche ; un jour sans plage est un jour de fermeture. */
export type Horaires = Plage[][];

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Contrôle des horaires reçus ; renvoie le message d'erreur, ou null s'ils sont valides. */
export function erreurHoraires(valeur: unknown): string | null {
  if (!Array.isArray(valeur) || valeur.length !== 7) return "Horaires : 7 jours attendus, du lundi au dimanche.";
  for (const [i, jour] of valeur.entries()) {
    const nom = JOURS[i] ?? "";
    if (!Array.isArray(jour) || jour.length > 4) return `Horaires du ${nom} : 4 plages au maximum.`;
    let finPrecedente = "";
    for (const plage of jour as unknown[]) {
      const p = plage as Partial<Plage> | null;
      if (typeof p?.debut !== "string" || typeof p.fin !== "string" || !HEURE.test(p.debut) || !HEURE.test(p.fin)) {
        return `Horaires du ${nom} : heure invalide (ex. 09:00-12:00).`;
      }
      if (p.fin <= p.debut) return `Horaires du ${nom} : la fin doit être après le début.`;
      if (p.debut < finPrecedente) return `Horaires du ${nom} : plages dans l'ordre, sans chevauchement.`;
      finPrecedente = p.fin;
    }
  }
  return null;
}
