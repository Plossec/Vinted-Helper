// Dates : stockées en UTC (format ISO), affichées en JJ/MM/AAAA, heure de Paris.

const FORMAT_DATE_HEURE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const deux = (n: number) => String(n).padStart(2, "0");

/** « 2026-10-04 » → « 04/10/2026 ». */
export function formatDate(dateIso: string | null): string {
  if (!dateIso) return "—";
  const [annee, mois, jour] = dateIso.split("-");
  return `${jour}/${mois}/${annee}`;
}

/** Horodatage ISO → « 05/10/2026 14:32 » (heure de Paris). */
export function formatDateHeure(iso: string): string {
  return FORMAT_DATE_HEURE.format(new Date(iso)).replace(",", "");
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau du téléphone ou du PC. */
export function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

/** Valeur d'un champ « date et heure » (heure locale) à partir d'un horodatage. */
export function versChampDateHeure(date: Date): string {
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}T${deux(date.getHours())}:${deux(date.getMinutes())}`;
}

/** Valeur d'un champ « date et heure » → horodatage ISO (UTC). Null si la saisie est incomplète. */
export function depuisChampDateHeure(valeur: string): string | null {
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
