// Stockage persistant de la file d'attente dans le navigateur (IndexedDB) : survit à la fermeture de
// l'application, au redémarrage du téléphone et à l'expiration de la session.
import { creerStockageMemoire, type ElementFile, type StockageFile } from "./file.js";

const NOM_BASE = "vinted-helper";
const MAGASIN = "file-attente";

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(NOM_BASE, 1);
    demande.onupgradeneeded = () => {
      demande.result.createObjectStore(MAGASIN, { keyPath: "cle" });
    };
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error ?? new Error("IndexedDB indisponible"));
  });
}

function executer<T>(base: IDBDatabase, mode: IDBTransactionMode, action: (m: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resoudre, rejeter) => {
    const transaction = base.transaction(MAGASIN, mode);
    const demande = action(transaction.objectStore(MAGASIN));
    transaction.oncomplete = () => resoudre(demande.result);
    transaction.onerror = () => rejeter(transaction.error ?? new Error("Écriture impossible"));
  });
}

export function creerStockageIndexedDB(): StockageFile {
  if (typeof indexedDB === "undefined") return creerStockageMemoire();
  let base: Promise<IDBDatabase> | null = null;
  const obtenir = () => (base ??= ouvrir());
  return {
    lister: async () => executer<ElementFile[]>(await obtenir(), "readonly", (m) => m.getAll()),
    ecrire: async (e) => {
      await executer(await obtenir(), "readwrite", (m) => m.put(e));
    },
    supprimer: async (cle) => {
      await executer(await obtenir(), "readwrite", (m) => m.delete(cle));
    },
  };
}
