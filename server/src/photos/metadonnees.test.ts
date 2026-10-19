// Photos sans métadonnées (issue #216) : la position GPS et les autres informations EXIF de l'appareil photo ne sont
// jamais conservées ; l'orientation est appliquée à l'image.
import { randomUUID } from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { photo } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { retirerMetadonneesDesPhotos } from "./service.js";
import { creerStockagePhotos } from "./stockage.js";

describe("photos sans métadonnées", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>>;
  let cookie: string;

  beforeEach(async () => {
    t = await creerAppDeTest();
    cookie = await seConnecter(t.app);
  });
  afterEach(async () => {
    await t.fermer();
  });

  async function envoyer(contenu: Buffer, format: string) {
    const id = randomUUID();
    const r = await t.app.inject({
      method: "PUT",
      url: `/api/photos/${id}?type=annonce`,
      headers: { cookie, "content-type": `image/${format}` },
      payload: contenu,
    });
    expect(r.statusCode).toBe(200);
    return t.app.inject({ method: "GET", url: `/api/photos/${id}`, headers: { cookie } });
  }

  it("enregistre la photo en JPEG sans EXIF, orientation appliquée", async () => {
    // Image 64×48 marquée « à tourner de 90° », avec des informations EXIF (comme un téléphone).
    const contenu = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#0b7a75" } })
      .jpeg()
      .withExif({ IFD0: { Make: "Telephone", Copyright: "Utilisateur" } })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(contenu).metadata()).exif).toBeDefined();

    const r = await envoyer(contenu, "jpeg");
    expect(r.headers["content-type"]).toBe("image/jpeg");
    const lu = await sharp(r.rawPayload).metadata();
    expect(lu.exif).toBeUndefined();
    expect(lu.orientation).toBeUndefined();
    expect([lu.width, lu.height]).toEqual([48, 64]);
  });

  it("convertit une photo PNG en JPEG", async () => {
    const contenu = await sharp({ create: { width: 30, height: 20, channels: 3, background: "#ffffff" } })
      .png()
      .toBuffer();
    const r = await envoyer(contenu, "png");
    expect(r.headers["content-type"]).toBe("image/jpeg");
    expect((await sharp(r.rawPayload).metadata()).format).toBe("jpeg");
  });
});

describe("nettoyage des photos d'avant #216", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>>;
  let cookie: string;

  beforeEach(async () => {
    t = await creerAppDeTest();
    cookie = await seConnecter(t.app);
  });
  afterEach(async () => {
    await t.fermer();
  });

  /** Photo enregistrée comme avant #216 : fichier d'origine gardé tel quel (ici un PNG avec EXIF). */
  async function ancienne() {
    const id = randomUUID();
    await t.app.inject({
      method: "PUT",
      url: `/api/photos/${id}?type=annonce`,
      headers: { cookie, "content-type": "image/jpeg" },
      payload: await sharp({ create: { width: 20, height: 10, channels: 3, background: "#000000" } })
        .jpeg()
        .toBuffer(),
    });
    const [ligne] = await t.base.select().from(photo).where(eq(photo.id, id));
    if (!ligne) throw new Error("photo absente");
    const fichier = `${id}.png`;
    const dossier = join(t.dossierPhotos, ligne.utilisateurId);
    rmSync(join(dossier, ligne.fichier));
    writeFileSync(
      join(dossier, fichier),
      await sharp({ create: { width: 20, height: 10, channels: 3, background: "#000000" } })
        .png()
        .withExif({ IFD0: { Make: "Telephone" } })
        .toBuffer(),
    );
    await t.base.update(photo).set({ fichier }).where(eq(photo.id, id));
    return { id, dossier, fichier };
  }

  it("en essai, compte les photos concernées sans rien modifier", async () => {
    const { dossier, fichier } = await ancienne();
    const stockage = creerStockagePhotos(t.dossierPhotos);
    const bilan = await retirerMetadonneesDesPhotos(t.base, stockage, true);
    expect(bilan).toEqual({ verifiees: 1, aNettoyer: 1, nettoyees: 0, illisibles: 0 });
    expect(existsSync(join(dossier, fichier))).toBe(true);
  });

  it("réécrit la photo en JPEG sans EXIF, met la base à jour et retire l'ancien fichier", async () => {
    const { id, dossier, fichier } = await ancienne();
    const stockage = creerStockagePhotos(t.dossierPhotos);
    const bilan = await retirerMetadonneesDesPhotos(t.base, stockage, false);
    expect(bilan.nettoyees).toBe(1);
    const [ligne] = await t.base.select().from(photo).where(eq(photo.id, id));
    expect(ligne?.fichier).toBe(`${id}.jpg`);
    expect(existsSync(join(dossier, fichier))).toBe(false);
    expect((await sharp(join(dossier, `${id}.jpg`)).metadata()).exif).toBeUndefined();
    // Une photo déjà propre n'est plus touchée.
    expect((await retirerMetadonneesDesPhotos(t.base, stockage, false)).aNettoyer).toBe(0);
  });
});
