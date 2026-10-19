// Repère « ↗ » d'un lien qui s'ouvre dans un nouvel onglet (#215) : la flèche est masquée aux lecteurs d'écran, qui
// annoncent « (nouvel onglet) » à la place.
export function NouvelOnglet() {
  return (
    <>
      <span aria-hidden="true"> ↗</span>
      <span className="visuellement-masque"> (nouvel onglet)</span>
    </>
  );
}
