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
        <p style={{ color: "#a89a80", margin: 0 }}>
          La connexion se fait depuis le jeu.
        </p>
      </div>
    </main>
  );
}
