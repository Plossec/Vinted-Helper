// Répartition d'un montant entre plusieurs éléments — règle d'arrondi du cahier des charges (§6).
//
// C'est la SEULE fonction de répartition de l'application : prix d'un lot, essence d'une sortie,
// emballage d'un colis et prix vendu d'une vente groupée passent tous par elle.
//
// Règle : chaque part est arrondie au centime le plus proche ; le dernier élément reçoit
// « total − somme des autres parts », pour que la somme soit toujours exactement égale au total.
// L'ordre des éléments doit être stable et déterministe (c'est à l'appelant de le garantir),
// pour que « le dernier » soit toujours le même.

/**
 * Répartit `total` (en centimes) entre les éléments, au prorata de leurs `poids`.
 * - Parts égales : passer des poids identiques (ex. `[1, 1, 1]`).
 * - Au prorata : passer les poids voulus (ex. les prix affichés en centimes).
 * - Poids tous nuls : bascule en parts égales.
 * - Aucun élément : renvoie une liste vide (l'appelant gère ce cas, ex. essence d'une sortie vide).
 *
 * @param total montant à répartir, en centimes entiers positifs ou nuls
 * @param poids poids de chaque élément, entiers positifs ou nuls
 * @returns les parts en centimes, dans l'ordre des poids ; leur somme vaut exactement `total`
 */
export function repartir(total: number, poids: readonly number[]): number[] {
  if (!Number.isInteger(total)) {
    throw new Error(`Montant invalide : ${total}. Les montants doivent être des centimes entiers.`);
  }
  if (total < 0) {
    throw new Error(`Montant invalide : ${total}. Le montant à répartir doit être positif ou nul.`);
  }
  for (const p of poids) {
    if (!Number.isInteger(p)) throw new Error(`Poids invalide : ${p}. Les poids doivent être des entiers.`);
    if (p < 0) throw new Error(`Poids invalide : ${p}. Les poids doivent être positifs ou nuls.`);
  }

  const nombre = poids.length;
  if (nombre === 0) return [];

  const sommePoids = poids.reduce((a, b) => a + b, 0);
  const poidsEffectifs = sommePoids === 0 ? poids.map(() => 1) : poids;
  const sommeEffective = sommePoids === 0 ? nombre : sommePoids;

  const parts: number[] = [];
  let dejaReparti = 0;
  for (let i = 0; i < nombre - 1; i++) {
    const part = Math.round((total * (poidsEffectifs[i] ?? 0)) / sommeEffective);
    parts.push(part);
    dejaReparti += part;
  }
  parts.push(total - dejaReparti);
  return parts;
}
