import type { Metadata } from "next";
import { LegalPage, legalStyles as s } from "../legal-layout";

export const metadata: Metadata = {
  title: "Confidentialité — AwakeRift",
  description: "Quelles données AwakeRift collecte et comment les supprimer.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="22 septembre 2026">
      <p style={s.p}>
        AwakeRift est un jeu de cartes en ligne. Cette page décrit les données
        que nous collectons, pourquoi, et comment vous en reprendre le contrôle.
      </p>

      <h2 style={s.h2}>Données collectées</h2>

      <p style={s.p}>Lorsque vous créez un compte :</p>

      <ul style={s.ul}>
        <li>
          <strong>Adresse e-mail</strong> — transmise par Google lors de la
          connexion. Elle identifie votre compte.
        </li>
        <li>
          <strong>Pseudonyme</strong> — celui que vous choisissez. Il est
          visible par vos adversaires en partie.
        </li>
        <li>
          <strong>Progression</strong> — niveau, points, monnaie du jeu,
          victoires, défaites, égalités.
        </li>
        <li>
          <strong>Decks</strong> — leur nom et les cartes qu&apos;ils
          contiennent.
        </li>
        <li>
          <strong>Résultats de match</strong> — l&apos;issue de chaque partie,
          associée à votre identifiant de compte.
        </li>
        <li>
          <strong>Dates de création et de dernière connexion.</strong>
        </li>
      </ul>

      <p style={s.p}>
        Nous ne collectons ni votre nom, ni votre adresse, ni vos coordonnées
        bancaires, ni votre adresse IP à des fins de suivi.
      </p>

      <h2 style={s.h2}>Pourquoi</h2>

      <ul style={s.ul}>
        <li>
          Votre progression est conservée sur nos serveurs pour que vous la
          retrouviez depuis n&apos;importe quel ordinateur.
        </li>
        <li>
          Les résultats de match sont recoupés entre les deux joueurs afin de
          détecter les déclarations frauduleuses.
        </li>
        <li>
          Votre pseudonyme est affiché à votre adversaire pendant la partie.
        </li>
      </ul>

      <p style={s.p}>
        Vos données ne sont ni vendues, ni transmises à des tiers à des fins
        publicitaires.
      </p>

      <h2 style={s.h2}>Où elles sont stockées</h2>

      <p style={s.p}>
        Les données sont hébergées par{" "}
        <strong>Google Firebase (Cloud Firestore)</strong>, dans un centre de
        données situé en Europe (<code>europe-west9</code>, Paris).
        L&apos;authentification est assurée par Firebase Authentication.
      </p>

      <p style={s.p}>
        Les parties en ligne transitent par les services multijoueur de Unity
        Technologies. Aucune donnée de profil n&apos;y est conservée.
      </p>

      <h2 style={s.h2}>Combien de temps</h2>

      <p style={s.p}>
        Vos données sont conservées tant que votre compte existe. Si vous le
        supprimez, elles le sont immédiatement, à une exception près : les
        résultats de match sont <strong>anonymisés</strong> plutôt que détruits,
        car un match lie deux joueurs et les effacer fausserait
        l&apos;historique de votre adversaire. Après anonymisation, plus rien
        ne permet de vous y rattacher.
      </p>

      <h2 style={s.h2}>Vos droits</h2>

      <p style={s.p}>
        Conformément au RGPD, vous pouvez à tout moment, depuis la page{" "}
        <a href="/account" style={{ color: "#c9a961" }}>
          Mon compte
        </a>{" "}
        :
      </p>

      <ul style={s.ul}>
        <li>
          <strong>Exporter vos données</strong> — vous obtenez un fichier JSON
          lisible contenant tout ce que nous détenons.
        </li>
        <li>
          <strong>Supprimer votre compte</strong> — l&apos;effacement est
          immédiat et irréversible.
        </li>
        <li>
          <strong>Rectifier votre pseudonyme</strong> — depuis le jeu, dans
          l&apos;écran de profil.
        </li>
      </ul>

      <p style={s.p}>
        Pour toute question relative à vos données, écrivez à{" "}
        <a href="mailto:contact@fisigames.com" style={{ color: "#c9a961" }}>
          contact@fisigames.com
        </a>
        .
      </p>

      <h2 style={s.h2}>Cookies</h2>

      <p style={s.p}>
        Ce site n&apos;utilise ni cookie publicitaire, ni traceur. La connexion
        Google repose sur un cookie de session technique, nécessaire au
        fonctionnement, qui disparaît à la fermeture du navigateur.
      </p>

      <h2 style={s.h2}>Mineurs</h2>

      <p style={s.p}>
        AwakeRift n&apos;est pas destiné aux enfants de moins de 13 ans. Si
        vous constatez qu&apos;un compte a été créé par un enfant de moins de
        13 ans, signalez-le à l&apos;adresse ci-dessus : il sera supprimé.
      </p>
    </LegalPage>
  );
}
