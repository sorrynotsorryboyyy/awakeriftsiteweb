import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * Mise en page commune aux pages légales et à la gestion de compte.
 *
 * Ces pages sont lues sur un écran, pas dans le jeu : on privilégie la
 * lisibilité d'un texte long à la cohérence avec l'habillage du jeu.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <main style={styles.main}>
      <article style={styles.article}>
        <Link href="/" style={styles.back}>
          ← AwakeRift
        </Link>

        <h1 style={styles.title}>{title}</h1>

        {updated && (
          <p style={styles.updated}>Dernière mise à jour : {updated}</p>
        )}

        <div style={styles.body}>{children}</div>

        <footer style={styles.footer}>
          <Link href="/privacy" style={styles.link}>
            Confidentialité
          </Link>
          <Link href="/terms" style={styles.link}>
            Conditions d&apos;utilisation
          </Link>
          <Link href="/account" style={styles.link}>
            Mon compte
          </Link>
        </footer>
      </article>
    </main>
  );
}

export const legalStyles: Record<string, CSSProperties> = {
  h2: {
    fontSize: 22,
    color: "#e8dcc0",
    margin: "36px 0 12px",
  },
  p: {
    margin: "0 0 14px",
    lineHeight: 1.65,
  },
  ul: {
    margin: "0 0 14px",
    paddingLeft: 22,
    lineHeight: 1.65,
  },
};

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#0b0a08",
    color: "#c3b79d",
    padding: "48px 16px 80px",
  },
  article: {
    maxWidth: 760,
    margin: "0 auto",
  },
  back: {
    color: "#8a7c62",
    textDecoration: "none",
    fontSize: 15,
  },
  title: {
    fontSize: 34,
    color: "#e8dcc0",
    margin: "20px 0 8px",
  },
  updated: {
    margin: "0 0 28px",
    fontSize: 14,
    color: "#7d7160",
  },
  body: {
    fontSize: 16,
  },
  footer: {
    marginTop: 56,
    paddingTop: 22,
    borderTop: "1px solid #2e2519",
    display: "flex",
    gap: 24,
    flexWrap: "wrap",
  },
  link: {
    color: "#a89a80",
    textDecoration: "none",
    fontSize: 15,
  },
};
