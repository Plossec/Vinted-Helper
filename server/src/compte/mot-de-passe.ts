// Hachage des mots de passe avec scrypt (intégré à Node, aucune dépendance).
// Format stocké : scrypt$N$r$p$sel$empreinte (sel et empreinte en base64).
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const PARAMETRES = { N: 16384, r: 8, p: 1 } as const;
const LONGUEUR_CLE = 64;
export const LONGUEUR_MIN_MOT_DE_PASSE = 8;

function deriver(motDePasse: string, sel: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((ok, echec) => {
    scrypt(motDePasse, sel, LONGUEUR_CLE, options, (erreur, cle) => (erreur ? echec(erreur) : ok(cle)));
  });
}

export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await deriver(motDePasse, sel, PARAMETRES);
  const { N, r, p } = PARAMETRES;
  return ["scrypt", N, r, p, sel.toString("base64"), cle.toString("base64")].join("$");
}

export async function verifierMotDePasse(motDePasse: string, hache: string): Promise<boolean> {
  const [algo, N, r, p, sel, empreinte] = hache.split("$");
  if (algo !== "scrypt" || !N || !r || !p || !sel || !empreinte) return false;
  const attendu = Buffer.from(empreinte, "base64");
  const cle = await deriver(motDePasse, Buffer.from(sel, "base64"), { N: Number(N), r: Number(r), p: Number(p) });
  return cle.length === attendu.length && timingSafeEqual(cle, attendu);
}
