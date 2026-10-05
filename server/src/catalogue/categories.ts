// Arbre des catégories, calqué sur celui de Vinted (rédigé de mémoire le 05/10/2026, relu par l'utilisateur).
// Aucune requête n'est faite vers Vinted (CLAUDE.md) : toute correction se fait ici, à la main.
// Seules les catégories « feuilles » (sans sous-catégorie) peuvent être choisies pour un article.

export interface NoeudCategorie {
  nom: string;
  enfants?: NoeudCategorie[];
}

/** Raccourci : liste de feuilles. */
const f = (...noms: string[]): NoeudCategorie[] => noms.map((nom) => ({ nom }));
const n = (nom: string, enfants?: NoeudCategorie[]): NoeudCategorie => (enfants ? { nom, enfants } : { nom });

export const ARBRE_CATEGORIES: NoeudCategorie[] = [
  n("Femmes", [
    n("Vêtements", [
      n("Manteaux et vestes", [
        n(
          "Manteaux",
          f(
            "Cabans",
            "Duffle-coats",
            "Manteaux en fausse fourrure",
            "Pardessus et manteaux longs",
            "Parkas",
            "Trench-coats",
            "Imperméables",
          ),
        ),
        n(
          "Vestes",
          f(
            "Blousons aviateur",
            "Vestes en jean",
            "Vestes en cuir",
            "Vestes militaires et utilitaires",
            "Vestes polaires",
            "Vestes de ski et de snowboard",
            "Vestes légères",
          ),
        ),
        n("Doudounes et vestes matelassées"),
        n("Vestes sans manches"),
        n("Capes et ponchos"),
      ]),
      n("Sweats et sweats à capuche", f("Sweats", "Sweats à capuche", "Sweats zippés", "Autres sweats")),
      n("Blazers et tailleurs", f("Blazers", "Tailleurs jupe", "Tailleurs pantalon", "Autres tailleurs")),
      n(
        "Robes",
        f(
          "Mini-robes",
          "Robes midi",
          "Robes longues",
          "Robes d'été",
          "Robes de soirée",
          "Robes en jean",
          "Robes pull",
          "Autres robes",
        ),
      ),
      n("Jupes", f("Minijupes", "Jupes mi-longues", "Jupes longues", "Jupes en jean", "Jupes-shorts")),
      n(
        "Hauts et t-shirts",
        f(
          "T-shirts",
          "Chemises",
          "Blouses",
          "Débardeurs",
          "Tops courts",
          "Bodies",
          "Polos",
          "Tuniques",
          "T-shirts à manches longues",
          "Autres hauts",
        ),
      ),
      n("Pulls et gilets", f("Pulls", "Pulls col roulé", "Pulls col V", "Gilets", "Pulls longs", "Autres pulls")),
      n(
        "Jeans",
        f(
          "Jeans skinny",
          "Jeans slim",
          "Jeans droits",
          "Jeans flare",
          "Jeans boyfriend",
          "Jeans mom",
          "Jeans taille haute",
          "Jeans larges",
          "Jeans troués",
          "Autres jeans",
        ),
      ),
      n(
        "Pantalons et leggings",
        f(
          "Pantalons droits",
          "Pantalons larges",
          "Pantalons cigarette",
          "Pantalons cargo",
          "Chinos",
          "Pantalons en cuir",
          "Joggings",
          "Leggings",
          "Autres pantalons",
        ),
      ),
      n(
        "Shorts et pantacourts",
        f("Shorts en jean", "Shorts taille haute", "Shorts de sport", "Pantacourts", "Autres shorts"),
      ),
      n("Combinaisons et combishorts", f("Combinaisons", "Combishorts", "Salopettes")),
      n("Maillots de bain", f("Maillots une pièce", "Bikinis", "Paréos et tenues de plage")),
      n(
        "Lingerie et pyjamas",
        f(
          "Soutiens-gorge",
          "Culottes",
          "Ensembles de lingerie",
          "Pyjamas",
          "Peignoirs",
          "Collants",
          "Chaussettes",
          "Autres",
        ),
      ),
      n(
        "Maternité",
        f("Hauts de maternité", "Pantalons de maternité", "Robes de maternité", "Autres vêtements de maternité"),
      ),
      n(
        "Vêtements de sport",
        f(
          "Hauts et t-shirts de sport",
          "Brassières de sport",
          "Leggings de sport",
          "Pantalons de sport",
          "Shorts de sport",
          "Survêtements",
          "Vestes de sport",
          "Sweats de sport",
          "Maillots de sport",
          "Autres vêtements de sport",
        ),
      ),
      n("Costumes et tenues particulières", f("Déguisements", "Tenues traditionnelles", "Autres tenues")),
      n("Autres vêtements"),
    ]),
    n(
      "Chaussures",
      f(
        "Baskets",
        "Bottes",
        "Bottines",
        "Escarpins",
        "Sandales",
        "Ballerines",
        "Mocassins et chaussures bateau",
        "Mules et sabots",
        "Espadrilles",
        "Chaussures de sport",
        "Chaussons",
        "Tongs",
        "Autres chaussures",
      ),
    ),
    n(
      "Sacs",
      f(
        "Sacs à main",
        "Sacs à dos",
        "Sacs bandoulière",
        "Pochettes",
        "Cabas et tote bags",
        "Bananes",
        "Sacs de voyage",
        "Portefeuilles et porte-monnaie",
        "Trousses",
        "Autres sacs",
      ),
    ),
    n("Accessoires", [
      n("Bijoux", f("Colliers", "Bagues", "Boucles d'oreilles", "Bracelets", "Broches", "Autres bijoux")),
      n("Montres"),
      n("Lunettes de soleil"),
      n("Lunettes de vue et étuis"),
      n("Chapeaux et casquettes"),
      n("Bonnets"),
      n("Écharpes et foulards"),
      n("Ceintures"),
      n("Gants"),
      n("Accessoires pour cheveux"),
      n("Porte-clés"),
      n("Parapluies"),
      n("Autres accessoires"),
    ]),
    n(
      "Beauté",
      f(
        "Maquillage",
        "Parfums",
        "Soins du visage",
        "Soins du corps",
        "Soins des cheveux",
        "Ongles",
        "Accessoires de beauté",
        "Autres",
      ),
    ),
  ]),
  n("Hommes", [
    n("Vêtements", [
      n("Jeans", f("Jeans skinny", "Jeans slim", "Jeans droits", "Jeans coupe large", "Jeans troués", "Autres jeans")),
      n("Manteaux et vestes", [
        n(
          "Manteaux",
          f("Cabans", "Duffle-coats", "Pardessus et manteaux longs", "Parkas", "Trench-coats", "Imperméables"),
        ),
        n(
          "Vestes",
          f(
            "Blousons aviateur",
            "Vestes en jean",
            "Vestes en cuir",
            "Vestes militaires et utilitaires",
            "Vestes polaires",
            "Vestes de ski et de snowboard",
            "Vestes légères",
            "Vestes Harrington",
          ),
        ),
        n("Doudounes et vestes matelassées"),
        n("Vestes sans manches"),
      ]),
      n(
        "Hauts et t-shirts",
        f("T-shirts", "T-shirts à manches longues", "Chemises", "Polos", "Débardeurs", "Autres hauts"),
      ),
      n("Costumes et blazers", f("Blazers", "Costumes", "Pantalons de costume", "Gilets de costume", "Autres")),
      n(
        "Sweats et pulls",
        f("Sweats", "Sweats à capuche", "Sweats zippés", "Pulls", "Pulls col roulé", "Pulls col V", "Gilets", "Autres"),
      ),
      n(
        "Pantalons",
        f("Chinos", "Pantalons cargo", "Joggings", "Pantalons habillés", "Pantalons larges", "Autres pantalons"),
      ),
      n("Shorts", f("Shorts cargo", "Shorts chino", "Shorts en jean", "Shorts de sport", "Autres shorts")),
      n("Sous-vêtements et chaussettes", f("Boxers", "Slips", "Chaussettes", "Pyjamas", "Peignoirs", "Autres")),
      n("Maillots de bain"),
      n(
        "Vêtements de sport",
        f(
          "Hauts et t-shirts de sport",
          "Maillots de sport",
          "Pantalons de sport",
          "Shorts de sport",
          "Survêtements",
          "Vestes de sport",
          "Sweats de sport",
          "Autres vêtements de sport",
        ),
      ),
      n("Costumes et tenues particulières", f("Déguisements", "Tenues traditionnelles", "Autres tenues")),
      n("Autres vêtements"),
    ]),
    n(
      "Chaussures",
      f(
        "Baskets",
        "Bottes",
        "Chaussures habillées",
        "Mocassins et chaussures bateau",
        "Sandales",
        "Espadrilles",
        "Chaussures de sport",
        "Chaussons",
        "Tongs",
        "Autres chaussures",
      ),
    ),
    n("Accessoires", [
      n(
        "Sacs et sacoches",
        f(
          "Sacs à dos",
          "Sacoches et sacs bandoulière",
          "Sacs de voyage",
          "Bananes",
          "Mallettes et porte-documents",
          "Autres sacs",
        ),
      ),
      n("Portefeuilles"),
      n("Ceintures"),
      n("Chapeaux et casquettes"),
      n("Bonnets"),
      n("Écharpes et foulards"),
      n("Gants"),
      n("Lunettes de soleil"),
      n("Lunettes de vue et étuis"),
      n("Montres"),
      n("Bijoux", f("Bagues", "Bracelets", "Colliers", "Boucles d'oreilles", "Boutons de manchette", "Autres bijoux")),
      n("Cravates et nœuds papillon"),
      n("Porte-clés"),
      n("Autres accessoires"),
    ]),
    n("Soins", f("Parfums", "Soins du visage", "Rasage", "Soins du corps", "Soins des cheveux", "Autres")),
  ]),
  n("Enfants", [
    n("Filles", [
      n(
        "Vêtements bébé",
        f(
          "Bodies",
          "Pyjamas et grenouillères",
          "Ensembles",
          "Robes",
          "Hauts",
          "Bas",
          "Manteaux et combinaisons",
          "Autres",
        ),
      ),
      n("Manteaux et vestes"),
      n("Sweats et pulls"),
      n("Hauts et t-shirts"),
      n("Robes"),
      n("Jupes"),
      n("Pantalons et jeans"),
      n("Shorts"),
      n("Combinaisons et salopettes"),
      n("Pyjamas"),
      n("Maillots de bain"),
      n("Vêtements de sport"),
      n("Chaussures"),
      n("Accessoires"),
      n("Déguisements"),
      n("Autres"),
    ]),
    n("Garçons", [
      n(
        "Vêtements bébé",
        f("Bodies", "Pyjamas et grenouillères", "Ensembles", "Hauts", "Bas", "Manteaux et combinaisons", "Autres"),
      ),
      n("Manteaux et vestes"),
      n("Sweats et pulls"),
      n("Hauts et t-shirts"),
      n("Chemises"),
      n("Pantalons et jeans"),
      n("Shorts"),
      n("Combinaisons et salopettes"),
      n("Pyjamas"),
      n("Maillots de bain"),
      n("Vêtements de sport"),
      n("Chaussures"),
      n("Accessoires"),
      n("Déguisements"),
      n("Autres"),
    ]),
    n(
      "Jouets",
      f(
        "Peluches",
        "Poupées et accessoires",
        "Figurines",
        "Jeux de construction",
        "Voitures et véhicules",
        "Jeux éducatifs",
        "Jouets en bois",
        "Jeux d'extérieur",
        "Instruments de musique pour enfants",
        "Autres jouets",
      ),
    ),
    n(
      "Puériculture",
      f(
        "Poussettes",
        "Sièges auto",
        "Porte-bébés",
        "Chaises hautes",
        "Lits et berceaux",
        "Allaitement et repas",
        "Bain et change",
        "Sécurité bébé",
        "Autres",
      ),
    ),
    n("Mobilier et décoration enfant"),
    n("Fournitures scolaires", f("Cartables et sacs", "Trousses", "Autres fournitures")),
  ]),
  n("Maison", [
    n(
      "Textiles",
      f(
        "Linge de lit",
        "Linge de bain",
        "Linge de table",
        "Rideaux",
        "Coussins",
        "Plaids et couvertures",
        "Tapis",
        "Autres textiles",
      ),
    ),
    n(
      "Décoration",
      f(
        "Cadres",
        "Bougies et bougeoirs",
        "Vases",
        "Miroirs",
        "Horloges",
        "Affiches et tableaux",
        "Plantes artificielles",
        "Boîtes et rangements",
        "Objets décoratifs",
        "Autres",
      ),
    ),
    n(
      "Arts de la table",
      f("Assiettes", "Verres", "Tasses et mugs", "Couverts", "Plats et saladiers", "Carafes et théières", "Autres"),
    ),
    n("Cuisine", f("Ustensiles", "Casseroles et poêles", "Pâtisserie", "Rangement", "Autres")),
    n("Petit mobilier"),
    n("Jardin et extérieur"),
    n("Fêtes et célébrations"),
  ]),
  n("Électronique", [
    n("Jeux vidéo et consoles", f("Consoles", "Jeux vidéo", "Manettes et accessoires")),
    n("Téléphones et accessoires", f("Smartphones", "Coques et protections", "Chargeurs et câbles", "Autres")),
    n(
      "Ordinateurs et tablettes",
      f("Ordinateurs portables", "Ordinateurs de bureau", "Tablettes", "Claviers, souris et accessoires", "Autres"),
    ),
    n("Audio", f("Casques et écouteurs", "Enceintes", "Platines vinyle", "Chaînes hi-fi", "Autres")),
    n("Photo et vidéo", f("Appareils photo", "Objectifs", "Caméras", "Accessoires photo")),
    n("TV et vidéo"),
    n("Montres connectées et objets connectés"),
    n("Autres appareils électroniques"),
  ]),
  n("Divertissement", [
    n(
      "Livres",
      f("Romans", "Bandes dessinées", "Mangas", "Livres jeunesse", "Livres pratiques", "Beaux livres", "Autres livres"),
    ),
    n("Musique", f("Vinyles", "CD", "Cassettes", "Instruments de musique")),
    n("Films et séries", f("DVD", "Blu-ray", "VHS")),
    n("Jeux de société et puzzles", f("Jeux de société", "Puzzles", "Jeux de cartes")),
    n(
      "Collections",
      f(
        "Pin's",
        "Cartes à collectionner",
        "Figurines de collection",
        "Pièces et billets",
        "Timbres",
        "Autres objets de collection",
      ),
    ),
    n("Loisirs créatifs"),
  ]),
  n("Sport", [
    n("Football"),
    n("Rugby"),
    n("Basketball"),
    n("Sports de raquette"),
    n("Vélos et accessoires"),
    n("Fitness et musculation"),
    n("Running"),
    n("Randonnée et camping"),
    n("Sports d'hiver"),
    n("Sports nautiques"),
    n("Pêche et chasse"),
    n("Sports de combat"),
    n("Équitation"),
    n("Golf"),
    n("Équipement moto"),
    n("Autres sports"),
  ]),
  n("Animaux", f("Chiens", "Chats", "Petits animaux", "Oiseaux", "Poissons et aquariums", "Autres animaux")),
];

export interface Categorie {
  /** Identifiant stable, construit à partir du chemin (ex. « hommes/vetements/jeans/jeans-slim »). */
  code: string;
  /** Chemin lisible (ex. ["Hommes", "Vêtements", "Jeans", "Jeans slim"]). */
  chemin: string[];
}

const versCode = (nom: string) =>
  nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Toutes les catégories sélectionnables (feuilles), dans l'ordre de l'arbre. */
export const CATEGORIES: readonly Categorie[] = (() => {
  const resultat: Categorie[] = [];
  const parcourir = (noeuds: NoeudCategorie[], chemin: string[], codes: string[]) => {
    for (const noeud of noeuds) {
      const c = [...chemin, noeud.nom];
      const k = [...codes, versCode(noeud.nom)];
      if (noeud.enfants?.length) parcourir(noeud.enfants, c, k);
      else resultat.push({ code: k.join("/"), chemin: c });
    }
  };
  parcourir(ARBRE_CATEGORIES, [], []);
  return resultat;
})();

const PAR_CODE = new Map(CATEGORIES.map((c) => [c.code, c]));

export const estCategorie = (code: string) => PAR_CODE.has(code);
export const categorieParCode = (code: string) => PAR_CODE.get(code);
