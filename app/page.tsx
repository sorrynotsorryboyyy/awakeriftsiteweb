import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0a08",
        color: "#e8dcc0",
        textAlign: "center",
        padding: 16,
      }}
    >
      <div>
        <h1 style={{ fontSize: 40, margin: "0 0 12px" }}>AwakeRift</h1>
        <p style={{ color: "#a89a80", margin: "0 0 32px" }}>
          La connexion se fait depuis le jeu.
        </p>

        <nav style={{ display: "flex", gap: 24, justifyContent: "center" }}>
          <Link href="/account" style={linkStyle}>
            Mon compte
          </Link>
          <Link href="/privacy" style={linkStyle}>
            Confidentialité
          </Link>
          <Link href="/terms" style={linkStyle}>
            Conditions d&apos;utilisation
          </Link>
        </nav>
      </div>
    </main>
  );
}

const linkStyle = {
  color: "#8a7c62",
  textDecoration: "none",
  fontSize: 15,
};
