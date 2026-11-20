// Sous-pages des Réglages (#282, ADR-0119) : titre, retour au sommaire, puis la rubrique (composants inchangés).
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ParametresCalcul } from "../composants/ParametresCalcul.js";
import { PromptsIA } from "../composants/PromptsIA.js";
import { TachesAutomatiques } from "../composants/TachesAutomatiques.js";

/** Page d'une rubrique des Réglages : lien « ← Réglages », titre, contenu. */
export function PageReglages({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <main className="page">
      <Link to="/reglages" className="lien-retour">
        <span aria-hidden="true">←</span> Réglages
      </Link>
      <h1>{titre}</h1>
      {children}
    </main>
  );
}

export function ReglagesTaches() {
  return (
    <PageReglages titre="Tâches automatiques">
      <TachesAutomatiques />
    </PageReglages>
  );
}

export function ReglagesIA() {
  return (
    <PageReglages titre="IA (Gemini)">
      <PromptsIA />
    </PageReglages>
  );
}

export function ReglagesCalculs() {
  return (
    <PageReglages titre="Calculs et alertes">
      <ParametresCalcul />
    </PageReglages>
  );
}
