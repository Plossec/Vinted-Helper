// Mentions légales (#216) : accessibles sans connexion, depuis l'écran de connexion. Éditeur particulier, non
// professionnel : seul l'hébergeur est nommé (LCEN, article 1-1).
import { Link } from "react-router";

export function MentionsLegales() {
  return (
    <main className="page page--connexion page--texte">
      <h1>Mentions légales</h1>

      <section>
        <h2>Éditeur</h2>
        <p>
          Vinted Helper est une application personnelle, éditée par un particulier à titre non professionnel. Ses
          éléments d'identification ont été communiqués à l'hébergeur.
        </p>
      </section>

      <section>
        <h2>Hébergeur</h2>
        <p>
          OVH SAS
          <br />2 rue Kellermann, 59100 Roubaix, France
          <br />
          <a className="lien" href="https://www.ovhcloud.com" rel="noreferrer">
            www.ovhcloud.com
          </a>
        </p>
      </section>

      <section>
        <h2>Accès et données</h2>
        <p>
          L'application est privée : elle est réservée à son utilisateur, qui s'y connecte avec un identifiant et un mot
          de passe. Elle ne propose pas d'inscription.
        </p>
        <p>
          Un seul cookie est utilisé : celui de la connexion, indispensable au fonctionnement (il n'exige pas de
          consentement). Aucune mesure d'audience, aucune publicité. Pour rédiger les annonces, les textes et les photos
          d'un article peuvent être envoyés à Google Gemini, à la demande de l'utilisateur.
        </p>
      </section>

      <p>
        <Link className="lien" to="/connexion">
          <span aria-hidden="true">←</span> Connexion
        </Link>
      </p>
    </main>
  );
}
