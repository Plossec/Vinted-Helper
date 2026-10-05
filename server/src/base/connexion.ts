// Connexion à PostgreSQL (pool de connexions + Drizzle).
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { adresseBase } from "../config.js";
import * as schema from "./schema.js";

export function creerConnexion() {
  const pool = new pg.Pool({ connectionString: adresseBase(), max: 10 });
  const db = drizzle(pool, { schema });

  /** Vérifie que la base répond (utilisé par /api/sante). */
  async function verifier(): Promise<boolean> {
    try {
      await pool.query("select 1");
      return true;
    } catch {
      return false;
    }
  }

  async function fermer(): Promise<void> {
    await pool.end();
  }

  return { pool, db, verifier, fermer };
}

export type Connexion = ReturnType<typeof creerConnexion>;
