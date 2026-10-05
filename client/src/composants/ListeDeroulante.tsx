// Liste déroulante avec recherche (remplace la liste native du navigateur) :
// aussi large que le champ, aux couleurs du site (clair / sombre), utilisable au doigt et au clavier.
// On tape pour filtrer (tous les mots doivent correspondre, sans tenir compte des accents ni des majuscules).
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

export interface OptionListe {
  cle: string;
  libelle: string;
  /** Texte secondaire affiché sous le libellé (ex. chemin de la catégorie). */
  secondaire?: string;
  /** Texte utilisé pour la recherche (par défaut : libellé + texte secondaire). */
  recherche?: string;
}

interface Props {
  libelle: string;
  /** Texte affiché dans le champ. */
  texte: string;
  onTexte: (texte: string) => void;
  options: readonly OptionListe[];
  onChoix: (option: OptionListe) => void;
  /** Propose « Ajouter « … » » quand le texte tapé ne correspond à aucune option. */
  ajout?: boolean;
  obligatoire?: boolean;
  placeholder?: string;
}

const RESULTATS_MAX = 60;

export const normaliser = (texte: string) => texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function ListeDeroulante({
  libelle,
  texte,
  onTexte,
  options,
  onChoix,
  ajout = false,
  obligatoire = false,
  placeholder,
}: Props) {
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  /** Recherche en cours ; vide à l'ouverture pour montrer toute la liste. */
  const [filtre, setFiltre] = useState("");
  /** Option surlignée ; -1 = aucune (la première flèche ↓ sélectionne la première option). */
  const [actif, setActif] = useState(-1);
  const listeRef = useRef<HTMLUListElement>(null);

  const resultats = useMemo(() => {
    const mots = normaliser(filtre).split(/\s+/).filter(Boolean);
    const trouves = mots.length
      ? options.filter((o) => {
          const cible = normaliser(o.recherche ?? `${o.libelle} ${o.secondaire ?? ""}`);
          return mots.every((mot) => cible.includes(mot));
        })
      : options;
    // Les options dont le libellé commence par le texte tapé passent en premier (ordre d'origine conservé sinon).
    const debut = normaliser(filtre);
    const commencePar = (o: OptionListe) => (debut !== "" && normaliser(o.libelle).startsWith(debut) ? 0 : 1);
    return [...trouves].sort((a, b) => commencePar(a) - commencePar(b)).slice(0, RESULTATS_MAX);
  }, [filtre, options]);

  const texteAjout = texte.trim();
  const proposerAjout =
    ajout && texteAjout !== "" && !options.some((o) => normaliser(o.libelle) === normaliser(texteAjout));
  const nombre = resultats.length + (proposerAjout ? 1 : 0);

  useEffect(() => {
    listeRef.current?.querySelector(`[data-index="${actif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [actif]);

  function ouvrir(nouveauFiltre = "") {
    setFiltre(nouveauFiltre);
    setActif(-1);
    setOuvert(true);
  }

  function choisir(index: number) {
    const option = resultats[index];
    if (option) onChoix(option);
    else if (proposerAjout) onTexte(texteAjout);
    setOuvert(false);
  }

  function clavier(evenement: KeyboardEvent<HTMLInputElement>) {
    if (evenement.key === "ArrowDown") {
      evenement.preventDefault();
      if (!ouvert) ouvrir();
      else setActif((i) => Math.min(i + 1, nombre - 1));
    } else if (evenement.key === "ArrowUp") {
      evenement.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (evenement.key === "Enter" && ouvert) {
      // Entrée sans option surlignée : on garde le texte tapé et on ferme la liste.
      evenement.preventDefault();
      if (actif >= 0 && actif < nombre) choisir(actif);
      else setOuvert(false);
    } else if (evenement.key === "Escape") {
      setOuvert(false);
    }
  }

  const idListe = `${id}-liste`;
  return (
    <div className="champ">
      <label htmlFor={id}>
        {libelle}
        {obligatoire && " *"}
      </label>
      <div className="liste-deroulante">
        <input
          id={id}
          role="combobox"
          aria-expanded={ouvert}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-activedescendant={ouvert && actif >= 0 && actif < nombre ? `${id}-option-${actif}` : undefined}
          value={texte}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            onTexte(e.target.value);
            ouvrir(e.target.value);
          }}
          onFocus={() => ouvrir()}
          onClick={() => !ouvert && ouvrir()}
          onBlur={() => setOuvert(false)}
          onKeyDown={clavier}
        />
        <button
          type="button"
          className="liste-deroulante__fleche"
          aria-label={ouvert ? `Fermer la liste ${libelle}` : `Ouvrir la liste ${libelle}`}
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault(); // garde le focus dans le champ
            if (ouvert) setOuvert(false);
            else ouvrir();
          }}
        >
          ▾
        </button>
        {ouvert && (
          <ul
            id={idListe}
            ref={listeRef}
            role="listbox"
            aria-label={libelle}
            className="liste-deroulante__options"
            onMouseDown={(e) => e.preventDefault()}
          >
            {resultats.map((option, index) => (
              <li
                key={option.cle}
                id={`${id}-option-${index}`}
                data-index={index}
                role="option"
                aria-selected={index === actif}
                className={index === actif ? "liste-deroulante__option est-actif" : "liste-deroulante__option"}
                onMouseEnter={() => setActif(index)}
                onClick={() => choisir(index)}
              >
                <span className="liste-deroulante__libelle">{option.libelle}</span>
                {option.secondaire && <span className="liste-deroulante__secondaire">{option.secondaire}</span>}
              </li>
            ))}
            {proposerAjout && (
              <li
                id={`${id}-option-${resultats.length}`}
                data-index={resultats.length}
                role="option"
                aria-selected={actif === resultats.length}
                className={
                  actif === resultats.length
                    ? "liste-deroulante__option liste-deroulante__ajout est-actif"
                    : "liste-deroulante__option liste-deroulante__ajout"
                }
                onMouseEnter={() => setActif(resultats.length)}
                onClick={() => choisir(resultats.length)}
              >
                + Ajouter « {texteAjout} »
              </li>
            )}
            {nombre === 0 && <li className="liste-deroulante__vide">Aucun résultat</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
