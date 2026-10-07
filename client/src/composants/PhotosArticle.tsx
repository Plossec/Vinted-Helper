// Photos d'un article (§5.2) : photo terrain + photos d'annonce ajoutées depuis la galerie (plusieurs à la fois)
// ou l'appareil photo, réordonnables, une photo principale.
import { type ChangeEvent, useRef, useState } from "react";
import { api, type Article, envoyerPhoto, urlPhoto, urlVignette } from "../api.js";

export function PhotosArticle({ article, onMiseAJour }: { article: Article; onMiseAJour: (a: Article) => void }) {
  const galerie = useRef<HTMLInputElement>(null);
  const appareil = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  /** Photos tournées dans cette page : nouvelle adresse pour forcer le rechargement de l'image. */
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [rotation, setRotation] = useState<string | null>(null);
  const version = (id: string) => (versions[id] ? `?v=${versions[id]}` : "");

  const terrain = article.photos.filter((p) => p.type === "terrain");
  const annonces = article.photos.filter((p) => p.type === "annonce");
  const recharger = async () => onMiseAJour(await api.get<Article>(`/api/articles/${article.id}`));

  async function ajouter(evenement: ChangeEvent<HTMLInputElement>) {
    const fichiers = [...(evenement.target.files ?? [])];
    evenement.target.value = "";
    setErreur(null);
    try {
      for (const [i, fichier] of fichiers.entries()) {
        setEnvoi(`Envoi de la photo ${i + 1} sur ${fichiers.length}…`);
        const photoId = await envoyerPhoto(fichier, "annonce");
        await api.post(`/api/articles/${article.id}/photos`, { photoId });
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setEnvoi(null);
      await recharger().catch(() => undefined);
    }
  }

  async function action(promesse: Promise<unknown>) {
    setErreur(null);
    try {
      await promesse;
      await recharger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    }
  }

  function deplacer(index: number, sens: -1 | 1) {
    const ordre = annonces.map((p) => p.id);
    const cible = index + sens;
    const [photo] = ordre.splice(index, 1);
    if (photo === undefined || cible < 0 || cible > ordre.length) return;
    ordre.splice(cible, 0, photo);
    const principale = annonces.find((p) => p.estPrincipale)?.id ?? null;
    void action(api.put(`/api/articles/${article.id}/photos`, { ordre, principale }));
  }

  function rendrePrincipale(id: string) {
    void action(api.put(`/api/articles/${article.id}/photos`, { ordre: annonces.map((p) => p.id), principale: id }));
  }

  async function pivoter(id: string, sens: "gauche" | "droite") {
    setErreur(null);
    setRotation(id);
    try {
      await api.post(`/api/photos/${id}/rotation`, { sens });
      setVersions((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Rotation impossible.");
    } finally {
      setRotation(null);
    }
  }

  const boutonsRotation = (id: string) => (
    <>
      <button
        type="button"
        onClick={() => void pivoter(id, "gauche")}
        disabled={rotation !== null}
        aria-label="Tourner vers la gauche"
      >
        ↺
      </button>
      <button
        type="button"
        onClick={() => void pivoter(id, "droite")}
        disabled={rotation !== null}
        aria-label="Tourner vers la droite"
      >
        ↻
      </button>
    </>
  );

  function retirer(id: string, type: string) {
    const texte =
      type === "terrain" && article.lot
        ? "Retirer la photo terrain de cet article ? Elle reste sur les autres articles du lot."
        : "Supprimer cette photo ?";
    if (window.confirm(texte)) void action(api.delete(`/api/articles/${article.id}/photos/${id}`));
  }

  return (
    <section className="section">
      <h2>Photos</h2>
      <ul className="photos">
        {terrain.map((p) => (
          <li key={p.id}>
            <a href={urlPhoto(p.id) + version(p.id)} target="_blank" rel="noreferrer">
              <img src={urlVignette(p.id) + version(p.id)} alt="Photo terrain" loading="lazy" />
            </a>
            <span className="photos__legende">Photo terrain</span>
            <div className="photos__actions">
              {boutonsRotation(p.id)}
              <button type="button" onClick={() => retirer(p.id, p.type)} aria-label="Retirer la photo terrain">
                🗑
              </button>
            </div>
          </li>
        ))}
        {annonces.map((p, i) => (
          <li key={p.id} className={p.estPrincipale ? "est-principale" : ""}>
            <a href={urlPhoto(p.id) + version(p.id)} target="_blank" rel="noreferrer">
              <img src={urlVignette(p.id) + version(p.id)} alt={`Photo d'annonce ${i + 1}`} loading="lazy" />
            </a>
            <span className="photos__legende">{p.estPrincipale ? "★ Principale" : `Photo ${i + 1}`}</span>
            <div className="photos__actions">{boutonsRotation(p.id)}</div>
            <div className="photos__actions">
              <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Avancer">
                ←
              </button>
              {!p.estPrincipale && (
                <button type="button" onClick={() => rendrePrincipale(p.id)} aria-label="Photo principale">
                  ★
                </button>
              )}
              <button
                type="button"
                onClick={() => deplacer(i, 1)}
                disabled={i === annonces.length - 1}
                aria-label="Reculer"
              >
                →
              </button>
              <button type="button" onClick={() => retirer(p.id, p.type)} aria-label="Supprimer">
                🗑
              </button>
            </div>
          </li>
        ))}
      </ul>
      {article.photos.length === 0 && <p className="secondaire">Aucune photo.</p>}
      <input ref={galerie} type="file" accept="image/*" multiple hidden onChange={(e) => void ajouter(e)} />
      <input
        ref={appareil}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void ajouter(e)}
      />
      <div className="actions">
        <button className="bouton" type="button" disabled={envoi !== null} onClick={() => galerie.current?.click()}>
          🖼 Galerie
        </button>
        <button className="bouton" type="button" disabled={envoi !== null} onClick={() => appareil.current?.click()}>
          📷 Appareil photo
        </button>
      </div>
      {envoi && <p className="secondaire">{envoi}</p>}
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
    </section>
  );
}
