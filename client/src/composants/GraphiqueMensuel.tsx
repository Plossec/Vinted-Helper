// Graphique mensuel (§5.9) : une mesure à la fois (une seule échelle), barres depuis la ligne zéro,
// info-bulle au survol et au clavier, tableau des valeurs accessible sans survol.
// Issue #88 : barre « réalisé » + complément « théorique » empilé (ventes en cours), même teinte en plus clair.
import { useState } from "react";
import { formatEuros } from "../outils/montants.js";

export interface PointMensuel {
  /** « AAAA-MM ». */
  mois: string;
  /** Centimes : réalisé. */
  valeur: number;
  /** Centimes : ventes en cours ajoutées au réalisé (théorique = valeur + complément). Dessiné s'il est positif. */
  complement?: number;
  /** Centimes : réalisé + complément, calculé par le serveur. */
  theorique?: number;
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const libelleMois = (cle: string) => MOIS[Number(cle.slice(5, 7)) - 1] ?? cle;

const LARGEUR = 360;
const HAUTEUR = 180;
const MARGE_HAUT = 12;
const MARGE_BAS = 22;

/** Hauteur visible du complément : seulement la partie positive. */
const dessus = (p: PointMensuel) => Math.max(0, p.complement ?? 0);

export function GraphiqueMensuel({ titre, points }: { titre: string; points: PointMensuel[] }) {
  const [actif, setActif] = useState<number | null>(null);
  const [tableau, setTableau] = useState(false);
  const avecTheorique = points.some((p) => dessus(p) > 0);
  // Échelle : le haut de la pile (réalisé + complément) ou le réalisé s'il dépasse (complément nul).
  const hautPile = (p: PointMensuel) => (dessus(p) > 0 ? (p.theorique ?? p.valeur) : p.valeur);
  const max = Math.max(0, ...points.map(hautPile));
  const min = Math.min(0, ...points.map((p) => p.valeur));
  const etendue = max - min || 1;
  const zone = HAUTEUR - MARGE_HAUT - MARGE_BAS;
  const y = (v: number) => MARGE_HAUT + ((max - v) / etendue) * zone;
  const zero = y(0);
  const pas = LARGEUR / points.length;
  const largeurBarre = Math.max(4, pas - 8);
  const pointActif = actif === null ? null : points[actif];

  return (
    <figure className="graphique">
      <figcaption className="graphique__titre">{titre}</figcaption>
      {avecTheorique && (
        <p className="graphique__legende" aria-hidden="true">
          <span className="graphique__pastille" /> Réalisé{" "}
          <span className="graphique__pastille graphique__pastille--theorique" /> Ventes en cours (théorique)
        </p>
      )}
      <div className="graphique__zone">
        <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="img" aria-label={`${titre} par mois`}>
          <line x1={0} x2={LARGEUR} y1={zero} y2={zero} className="graphique__zero" />
          {points.map((p, i) => {
            const haut = Math.min(y(p.valeur), zero);
            const hauteur = Math.abs(y(p.valeur) - zero);
            // Le complément part du haut de la barre réalisée (ou de zéro si le réalisé est négatif).
            const base = p.valeur > 0 ? p.valeur : 0;
            const hautComplement = y(p.theorique !== undefined && p.valeur > 0 ? p.theorique : base + dessus(p));
            const hauteurComplement = dessus(p) > 0 ? y(base) - hautComplement : 0;
            const x = i * pas + (pas - largeurBarre) / 2;
            const classe = actif === i ? " est-actif" : "";
            return (
              <g
                key={p.mois}
                tabIndex={0}
                onPointerEnter={() => setActif(i)}
                onPointerLeave={() => setActif(null)}
                onFocus={() => setActif(i)}
                onBlur={() => setActif(null)}
                aria-label={
                  `${libelleMois(p.mois)} : réalisé ${formatEuros(p.valeur)}` +
                  (p.theorique !== undefined && dessus(p) > 0 ? `, théorique ${formatEuros(p.theorique)}` : "")
                }
              >
                {/* Zone de survol : toute la colonne du mois. */}
                <rect x={i * pas} y={0} width={pas} height={HAUTEUR} fill="transparent" />
                {hauteur > 0 && (
                  <rect
                    x={x}
                    y={haut}
                    width={largeurBarre}
                    height={hauteur}
                    rx={Math.min(4, hauteur / 2)}
                    className={`graphique__barre${classe}`}
                  />
                )}
                {hauteurComplement > 0 && (
                  <rect
                    x={x}
                    y={hautComplement}
                    width={largeurBarre}
                    height={hauteurComplement}
                    rx={Math.min(4, hauteurComplement / 2)}
                    className={`graphique__barre graphique__barre--theorique${classe}`}
                  />
                )}
                <text x={i * pas + pas / 2} y={HAUTEUR - 6} textAnchor="middle" className="graphique__axe">
                  {libelleMois(p.mois).slice(0, 4)}
                </text>
              </g>
            );
          })}
        </svg>
        {pointActif && (
          <div className="graphique__bulle" role="status">
            <span>{libelleMois(pointActif.mois)}</span> <strong>{formatEuros(pointActif.valeur)}</strong>
            {pointActif.theorique !== undefined && (pointActif.complement ?? 0) !== 0 && (
              <>
                {" "}
                <span>· théorique</span> <strong>{formatEuros(pointActif.theorique)}</strong>
              </>
            )}
          </div>
        )}
      </div>
      <button type="button" className="bouton" onClick={() => setTableau((t) => !t)} aria-expanded={tableau}>
        {tableau ? "Masquer le tableau" : "Voir le tableau"}
      </button>
      {tableau && (
        <table className="tableau">
          <thead>
            <tr>
              <th>Mois</th>
              <th>Réalisé</th>
              {points.some((p) => p.theorique !== undefined) && <th>Théorique</th>}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.mois}>
                <td>{libelleMois(p.mois)}</td>
                <td>{formatEuros(p.valeur)}</td>
                {p.theorique !== undefined && <td>{formatEuros(p.theorique)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
