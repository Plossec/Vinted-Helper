// Graphique mensuel (§5.9) : une mesure à la fois (une seule échelle), barres depuis la ligne zéro,
// info-bulle au survol et au clavier, tableau des valeurs accessible sans survol.
import { useState } from "react";
import { formatEuros } from "../outils/montants.js";

export interface PointMensuel {
  /** « AAAA-MM ». */
  mois: string;
  /** Centimes. */
  valeur: number;
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const libelleMois = (cle: string) => MOIS[Number(cle.slice(5, 7)) - 1] ?? cle;

const LARGEUR = 360;
const HAUTEUR = 180;
const MARGE_HAUT = 12;
const MARGE_BAS = 22;

export function GraphiqueMensuel({ titre, points }: { titre: string; points: PointMensuel[] }) {
  const [actif, setActif] = useState<number | null>(null);
  const [tableau, setTableau] = useState(false);
  const max = Math.max(0, ...points.map((p) => p.valeur));
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
      <div className="graphique__zone">
        <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="img" aria-label={`${titre} par mois`}>
          <line x1={0} x2={LARGEUR} y1={zero} y2={zero} className="graphique__zero" />
          {points.map((p, i) => {
            const haut = Math.min(y(p.valeur), zero);
            const hauteur = Math.abs(y(p.valeur) - zero);
            const x = i * pas + (pas - largeurBarre) / 2;
            return (
              <g
                key={p.mois}
                tabIndex={0}
                onPointerEnter={() => setActif(i)}
                onPointerLeave={() => setActif(null)}
                onFocus={() => setActif(i)}
                onBlur={() => setActif(null)}
                aria-label={`${libelleMois(p.mois)} : ${formatEuros(p.valeur)}`}
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
                    className={actif === i ? "graphique__barre est-actif" : "graphique__barre"}
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
            <strong>{formatEuros(pointActif.valeur)}</strong> <span>{libelleMois(pointActif.mois)}</span>
          </div>
        )}
      </div>
      <button type="button" className="lien" onClick={() => setTableau((t) => !t)} aria-expanded={tableau}>
        {tableau ? "Masquer le tableau" : "Voir le tableau"}
      </button>
      {tableau && (
        <table className="montants">
          <tbody>
            {points.map((p) => (
              <tr key={p.mois}>
                <td>{libelleMois(p.mois)}</td>
                <td>{formatEuros(p.valeur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
