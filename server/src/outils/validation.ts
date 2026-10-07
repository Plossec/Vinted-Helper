// Lecture et contrôle des données reçues par l'API, avec des messages en français.
import { erreurSaisie } from "./erreurs.js";

/** Montant maximal accepté : 100 000 € (garde-fou contre les fautes de frappe). */
const CENTIMES_MAX = 10_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function objet(valeur: unknown): Record<string, unknown> {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) {
    throw erreurSaisie("Données manquantes ou mal formées.");
  }
  return valeur as Record<string, unknown>;
}

/** Texte facultatif : espaces retirés, chaîne vide → null. */
export function texteFacultatif(valeur: unknown, champ: string, longueurMax = 500): string | null {
  if (valeur === undefined || valeur === null) return null;
  if (typeof valeur !== "string") throw erreurSaisie(`${champ} : texte attendu.`);
  const texte = valeur.trim();
  if (texte.length > longueurMax) throw erreurSaisie(`${champ} : ${longueurMax} caractères au maximum.`);
  return texte === "" ? null : texte;
}

export function texteObligatoire(valeur: unknown, champ: string, longueurMax = 500): string {
  const texte = texteFacultatif(valeur, champ, longueurMax);
  if (texte === null) throw erreurSaisie(`${champ} : obligatoire.`);
  return texte;
}

/** Montant en centimes : entier positif ou nul. */
export function centimesFacultatif(valeur: unknown, champ: string): number | null {
  if (valeur === undefined || valeur === null) return null;
  if (typeof valeur !== "number" || !Number.isInteger(valeur)) {
    throw erreurSaisie(`${champ} : montant invalide.`);
  }
  if (valeur < 0) throw erreurSaisie(`${champ} : le montant ne peut pas être négatif.`);
  if (valeur > CENTIMES_MAX) throw erreurSaisie(`${champ} : montant trop élevé.`);
  return valeur;
}

export function centimesObligatoire(valeur: unknown, champ: string): number {
  const montant = centimesFacultatif(valeur, champ);
  if (montant === null) throw erreurSaisie(`${champ} : obligatoire.`);
  return montant;
}

export function uuidFacultatif(valeur: unknown, champ: string): string | null {
  if (valeur === undefined || valeur === null || valeur === "") return null;
  if (typeof valeur !== "string" || !UUID.test(valeur)) throw erreurSaisie(`${champ} : identifiant invalide.`);
  return valeur.toLowerCase();
}

export function uuidObligatoire(valeur: unknown, champ: string): string {
  const id = uuidFacultatif(valeur, champ);
  if (id === null) throw erreurSaisie(`${champ} : obligatoire.`);
  return id;
}

/** Date calendaire « AAAA-MM-JJ ». */
export function dateObligatoire(valeur: unknown, champ: string): string {
  if (valeur === undefined || valeur === null || valeur === "") throw erreurSaisie(`${champ} : obligatoire.`);
  if (typeof valeur !== "string" || !DATE_ISO.test(valeur)) throw erreurSaisie(`${champ} : date invalide.`);
  const date = new Date(`${valeur}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== valeur) {
    throw erreurSaisie(`${champ} : date invalide.`);
  }
  return valeur;
}

/** Date et heure (format ISO, ex. 2026-10-05T14:30:00.000Z). */
export function horodatageFacultatif(valeur: unknown, champ: string): Date | null {
  if (valeur === undefined || valeur === null || valeur === "") return null;
  if (typeof valeur !== "string") throw erreurSaisie(`${champ} : date invalide.`);
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) throw erreurSaisie(`${champ} : date invalide.`);
  return date;
}

/** Lien vers Vinted (annonce, conversation) : https, site vinted.fr, vinted.be… ; vide = pas de lien. */
export function lienVintedFacultatif(valeur: unknown, champ: string): string | null {
  const texte = texteFacultatif(valeur, champ, 500);
  if (texte === null) return null;
  let url: URL;
  try {
    url = new URL(texte);
  } catch {
    throw erreurSaisie(`${champ} : adresse invalide (copiez-la depuis Vinted : Partager → Copier le lien).`);
  }
  if (url.protocol !== "https:" || !/(^|\.)vinted\.[a-z.]{2,10}$/.test(url.hostname)) {
    throw erreurSaisie(`${champ} : l'adresse doit être une adresse Vinted (https://www.vinted.fr/…).`);
  }
  return url.toString();
}
