// Choix de plusieurs valeurs dans une liste (filtres de la liste des articles, issue #30) : recherche à la frappe,
// chaque valeur choisie devient une puce « × » pour la retirer.
import { useMemo, useState } from "react";
import { ListeDeroulante, type OptionListe } from "./ListeDeroulante.js";

export function ChoixMultiple({
  libelle,
  options,
  valeurs,
  onChange,
  placeholder = "Toutes",
}: {
  libelle: string;
  options: OptionListe[];
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  placeholder?: string;
}) {
  const [texte, setTexte] = useState("");
  const parCle = useMemo(() => new Map(options.map((o) => [o.cle, o])), [options]);
  const proposees = useMemo(() => options.filter((o) => !valeurs.includes(o.cle)), [options, valeurs]);

  return (
    <div className="choix-multiple">
      <ListeDeroulante
        libelle={libelle}
        texte={texte}
        onTexte={setTexte}
        options={proposees}
        placeholder={valeurs.length > 0 ? "Ajouter…" : placeholder}
        onChoix={(o) => {
          onChange([...valeurs, o.cle]);
          setTexte("");
        }}
      />
      {valeurs.length > 0 && (
        <ul className="puces" aria-label={`${libelle} choisis`}>
          {valeurs.map((cle) => {
            const o = parCle.get(cle);
            const nom = o ? [o.secondaire, o.libelle].filter(Boolean).join(" › ") : cle;
            return (
              <li key={cle}>
                <button
                  type="button"
                  className="puce puce--active"
                  aria-label={`Retirer ${nom}`}
                  onClick={() => onChange(valeurs.filter((v) => v !== cle))}
                >
                  {o?.libelle ?? cle} <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
