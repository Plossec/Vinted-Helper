// Champ texte avec suggestions tirées d'une liste de référence (autocomplétion).
// Une valeur absente de la liste est créée à l'enregistrement de la fiche.
import { useId } from "react";
import type { ValeurListe } from "../api.js";

interface Props {
  libelle: string;
  valeur: string;
  valeurs: readonly ValeurListe[];
  onChange: (valeur: string) => void;
  obligatoire?: boolean;
}

export function ChampListe({ libelle, valeur, valeurs, onChange, obligatoire = false }: Props) {
  const idListe = useId();
  return (
    <label className="champ">
      <span>
        {libelle}
        {obligatoire && " *"}
      </span>
      <input
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        list={idListe}
        autoComplete="off"
        required={obligatoire}
      />
      <datalist id={idListe}>
        {valeurs.map((v) => (
          <option key={v.id} value={v.nom} />
        ))}
      </datalist>
    </label>
  );
}
