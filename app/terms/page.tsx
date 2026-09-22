import type { Metadata } from "next";
import { LegalPage, legalStyles as s } from "../legal-layout";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — AwakeRift",
  description: "Les règles d'utilisation d'AwakeRift.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation" updated="22 septembre 2026">
      <p style={s.p}>
        En créant un compte AwakeRift, vous acceptez ces conditions. Elles sont
        volontairement brèves.
      </p>

      <h2 style={s.h2}>Le compte</h2>

      <ul style={s.ul}>
        <li>Un compte est personnel. Ne le partagez pas.</li>
        <li>
          Vous êtes responsable de l&apos;activité qui s&apos;y déroule.
        </li>
        <li>
          Votre pseudonyme doit rester correct. Les pseudonymes insultants,
          haineux ou usurpant l&apos;identité d&apos;autrui peuvent être
          modifiés ou le compte suspendu.
        </li>
        <li>
          Vous pouvez supprimer votre compte à tout moment depuis la page{" "}
          <a href="/account" style={{ color: "#c9a961" }}>
            Mon compte
          </a>
          .
        </li>
      </ul>

      <h2 style={s.h2}>Jeu équitable</h2>

      <p style={s.p}>Sont interdits :</p>

      <ul style={s.ul}>
        <li>
          modifier le jeu ou intercepter ses échanges réseau pour obtenir un
          avantage ;
        </li>
        <li>
          fausser des résultats de match, seul ou avec la complicité
          d&apos;un autre joueur ;
        </li>
        <li>
          automatiser le jeu pour accumuler de la progression ;
        </li>
        <li>
          exploiter sciemment un défaut du jeu au détriment des autres.
        </li>
      </ul>

      <p style={s.p}>
        Un compte impliqué dans ces pratiques peut voir sa progression
        réinitialisée ou être suspendu.
      </p>

      <h2 style={s.h2}>Monnaie du jeu</h2>

      <p style={s.p}>
        La monnaie du jeu n&apos;a aucune valeur monétaire. Elle ne peut être
        ni échangée, ni revendue, ni convertie. Elle peut être ajustée en cas
        d&apos;erreur ou d&apos;abus.
      </p>

      <h2 style={s.h2}>Version bêta</h2>

      <p style={s.p}>
        AwakeRift est en développement. Le jeu peut comporter des défauts,
        être interrompu, et son contenu évoluer. Une réinitialisation de la
        progression reste possible pendant cette phase — vous en seriez averti
        à l&apos;avance dans la mesure du possible.
      </p>

      <h2 style={s.h2}>Disponibilité</h2>

      <p style={s.p}>
        Le service est fourni sans garantie de disponibilité continue. Il peut
        être suspendu pour maintenance, ou arrêté. Dans ce dernier cas, vous
        seriez prévenu suffisamment tôt pour exporter vos données.
      </p>

      <h2 style={s.h2}>Propriété</h2>

      <p style={s.p}>
        Le jeu, ses illustrations et son code appartiennent à FISIGames et à
        ses partenaires. Vous disposez d&apos;un droit d&apos;usage personnel
        et non commercial.
      </p>

      <h2 style={s.h2}>Contact</h2>

      <p style={s.p}>
        <a href="mailto:contact@fisigames.com" style={{ color: "#c9a961" }}>
          contact@fisigames.com
        </a>
      </p>
    </LegalPage>
  );
}
