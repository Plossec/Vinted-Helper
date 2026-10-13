// Refait docs/categories-vinted.md depuis server/src/catalogue/categories.ts (#133).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { documentCategories } from "../catalogue/doc-categories.js";

const chemin = fileURLToPath(new URL("../../../docs/categories-vinted.md", import.meta.url));
writeFileSync(chemin, documentCategories());
console.info(`Annexe des catégories écrite : ${chemin}`);
