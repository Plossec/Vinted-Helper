// Prompts par défaut (§5.5), modifiables dans les Réglages. Les {champs} sont remplacés par la fiche.

export const PROMPT_ANNONCE_DEFAUT = `Tu rédiges une annonce Vinted en français pour un vendeur particulier.
Article :
- Nom : {nom}
- Catégorie : {categorie}
- Marque : {marque}
- Gamme : {gamme}
- Taille : {taille}
- État : {etat}
- Matière : {matiere}
- Notes (défauts, remarques) : {notes}

Regarde aussi les photos jointes.
Rédige :
1. un titre de 60 caractères maximum, du type « Jean Levi's 501 noir W32 L32 » ;
2. une description de 3 à 6 lignes, ton simple et sympa, qui mentionne la marque, la taille, l'état et les défauts
   éventuels, suivie de quelques hashtags pertinents sur la dernière ligne.
N'invente rien qui ne soit pas visible ou indiqué. N'ajoute pas de référence d'article.
Réponds uniquement en JSON : {"titre": "...", "description": "..."}`;

export const PROMPT_ETIQUETTE_DEFAUT = `Voici la photo de l'étiquette d'un vêtement ou d'un objet.
Lis ce qui est écrit et propose, en français :
- la marque ;
- la taille (telle qu'écrite : M, 38, W32 L32…) ;
- la catégorie de l'article en quelques mots (ex. « jean slim homme », « robe femme », « pull enfant ») ;
- la matière (ex. « 100 % coton », « 80 % laine, 20 % polyamide »).
Si une information n'est pas lisible, mets null.
Réponds uniquement en JSON : {"marque": "...", "taille": "...", "categorie": "...", "matiere": "..."}`;

/** Remplace les {champs} du prompt ; un champ vide devient « non renseigné ». */
export function remplir(modele: string, valeurs: Record<string, string | null | undefined>): string {
  return modele.replace(/\{(\w+)\}/g, (tout, cle: string) =>
    cle in valeurs ? valeurs[cle]?.trim() || "non renseigné" : tout,
  );
}
