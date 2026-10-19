// Graphique mensuel (§5.9) : une mesure à la fois (une seule échelle), barres depuis la ligne zéro,
// info-bulle au survol et au clavier, tableau des valeurs accessible sans survol.
// Issues #88 et #91 : barre « réalisé » + « théorique » (ventes en cours) : partie claire quand le théorique dépasse
// le réalisé vers le haut, et contour plein de 0 au théorique, lisible quel que soit le signe (contraste ≥ 3:1).
import { useState } from "react";
import { formatEuros } from "../outils/montants.js";

export interface PointMensuel {
  /** « AAAA-MM ». */
  mois: string;
  /** Centimes : réalisé. */
  valeur: number;
  /** Centimes : réalisé + ventes en cours, calculé par le serveur (absent : pas de théorique). */
  theorique?: number;
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const libelleMois = (cle: string) => MOIS[Number(cle.slice(5, 7)) - 1] ?? cle;
/** « octobre 2026 » : le mois avec son année, pour la bulle, le tableau et les lecteurs d'écran (#215). */
const moisAnnee = (cle: string) => `${libelleMois(cle)} ${cle.slice(0, 4)}`;

const LARGEUR = 360;
const HAUTEUR = 180;
const MARGE_HAUT = 12;
const MARGE_BAS = 22;

/** Le théorique est montré (dessin, bulle, lecteur d'écran, tableau) dès qu'il diffère du réalisé. */
const aUnTheorique = (p: PointMensuel): p is PointMensuel & { theorique: number } =>
  p.theorique !== undefined && p.theorique !== p.valeur;

export function GraphiqueMensuel({ titre, points }: { titre: string; points: PointMensuel[] }) {
  const [actif, setActif] = useState<number | null>(null);
  const [tableau, setTableau] = useState(false);
  const avecTheorique = points.some(aUnTheorique);
  // Échelle commune au réalisé et au théorique, zéro toujours visible.
  const valeurs = points.flatMap((p) => (aUnTheorique(p) ? [p.valeur, p.theorique] : [p.valeur]));
  const max = Math.max(0, ...valeurs);
  const min = Math.min(0, ...valeurs);
  const etendue = max - min || 1;
  const zone = HAUTEUR - MARGE_HAUT - MARGE_BAS;
  const y = (v: number) => MARGE_HAUT + ((max - v) / etendue) * zone;
  const zero = y(0);
  const pas = LARGEUR / points.length;
  const largeurBarre = Math.max(4, pas - 8);
  const pointActif = actif === null ? null : points[actif];
  /** Rectangle vertical entre deux valeurs (ordre indifférent). */
  const entre = (a: number, b: number) => ({ y: Math.min(y(a), y(b)), hauteur: Math.abs(y(a) - y(b)) });

  return (
    <figure className="graphique">
      <figcaption className="graphique__titre">{titre}</figcaption>
      {avecTheorique && (
        <p className="graphique__legende" aria-hidden="true">
          <span className="graphique__pastille" /> Réalisé{" "}
          <span className="graphique__pastille graphique__pastille--theorique" /> Théorique (avec les ventes en cours)
        </p>
      )}
      <div className="graphique__zone">
        <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="group" aria-label={`${titre} par mois`}>
          <line x1={0} x2={LARGEUR} y1={zero} y2={zero} className="graphique__zero" aria-hidden="true" />
          {points.map((p, i) => {
            const realise = entre(0, p.valeur);
            // Partie claire : seulement là où le théorique dépasse le réalisé vers le haut.
            const bas = Math.max(p.valeur, 0);
            const clair = aUnTheorique(p) && p.theorique > bas ? entre(bas, p.theorique) : null;
            // Théorique à l'intérieur de la barre réalisée (ex. trésorerie −500 € → théorique −400 €) : trait de la
            // couleur du fond à son niveau ; sinon, contour plein de 0 au théorique.
            const dedans =
              aUnTheorique(p) &&
              Math.sign(p.theorique) === Math.sign(p.valeur) &&
              Math.abs(p.theorique) < Math.abs(p.valeur);
            const contour = aUnTheorique(p) && !dedans ? entre(0, p.theorique) : null;
            const x = i * pas + (pas - largeurBarre) / 2;
            const classe = actif === i ? " est-actif" : "";
            return (
              <g
                key={p.mois}
                role="img"
                tabIndex={0}
                onPointerEnter={() => setActif(i)}
                onPointerLeave={() => setActif(null)}
                onFocus={() => setActif(i)}
                onBlur={() => setActif(null)}
                aria-label={
                  `${moisAnnee(p.mois)} : réalisé ${formatEuros(p.valeur)}` +
                  (aUnTheorique(p) ? `, théorique ${formatEuros(p.theorique)}` : "")
                }
              >
                {/* Zone de survol : toute la colonne du mois. */}
                <rect x={i * pas} y={0} width={pas} height={HAUTEUR} fill="transparent" />
                {clair && clair.hauteur > 0 && (
                  <rect
                    x={x}
                    y={clair.y}
                    width={largeurBarre}
                    height={clair.hauteur}
                    className="graphique__barre graphique__barre--theorique"
                  />
                )}
                {realise.hauteur > 0 && (
                  <rect
                    x={x}
                    y={realise.y}
                    width={largeurBarre}
                    height={realise.hauteur}
                    rx={Math.min(4, realise.hauteur / 2)}
                    className={`graphique__barre${classe}`}
                  />
                )}
                {dedans && (
                  <line
                    x1={x}
                    x2={x + largeurBarre}
                    y1={y(p.theorique ?? 0)}
                    y2={y(p.theorique ?? 0)}
                    className="graphique__repere"
                  />
                )}
                {contour && contour.hauteur > 0 && (
                  <rect
                    x={x + 0.75}
                    y={contour.y + 0.75}
                    width={largeurBarre - 1.5}
                    height={Math.max(0, contour.hauteur - 1.5)}
                    className="graphique__contour"
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
            <span>{moisAnnee(pointActif.mois)}</span> <strong>{formatEuros(pointActif.valeur)}</strong>
            {aUnTheorique(pointActif) && (
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
              {avecTheorique && <th>Théorique</th>}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.mois}>
                <td>{moisAnnee(p.mois)}</td>
                <td>{formatEuros(p.valeur)}</td>
                {avecTheorique && <td>{formatEuros(p.theorique ?? p.valeur)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
