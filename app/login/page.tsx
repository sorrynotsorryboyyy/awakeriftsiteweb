"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithPopup, type User } from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase-client";

type Status = "idle" | "signing-in" | "exchanging" | "done" | "error";

function LoginContent() {
  const params = useSearchParams();
  const redirectUri = params.get("redirect_uri");
  const state = params.get("state");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);

  // Le jeu doit fournir ces deux paramètres. Ouverte directement, la page
  // n'aurait nulle part où renvoyer le token.
  const launchedFromGame = Boolean(redirectUri && state);

  const handleSignIn = useCallback(async () => {
    setStatus("signing-in");
    setError("");

    try {
      const auth = getFirebaseAuth();
      const credential = await signInWithPopup(auth, googleProvider);
      setUser(credential.user);

      setStatus("exchanging");

      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, redirectUri }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Échec de l'échange de jeton.");
      }

      const { customToken } = await response.json();

      // Retour vers le listener local du jeu. Le state est renvoyé tel quel
      // pour que le jeu vérifie qu'il s'agit bien de sa propre demande.
      const target = new URL(redirectUri as string);
      target.searchParams.set("code", customToken);
      target.searchParams.set("state", state as string);

      setStatus("done");
      window.location.href = target.toString();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue.";

      // Fermer la popup Google n'est pas une erreur à afficher comme telle.
      if (message.includes("popup-closed-by-user")) {
        setStatus("idle");
        return;
      }

      setError(message);
      setStatus("error");
    }
  }, [redirectUri, state]);

  if (!launchedFromGame) {
    return (
      <Panel title="AwakeRift">
        <p style={styles.muted}>
          Cette page sert à connecter le jeu. Lancez AwakeRift et cliquez sur
          « Se connecter ».
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="AwakeRift">
      {status === "idle" && (
        <>
          <p style={styles.muted}>Connectez-vous pour retrouver votre progression.</p>
          <button style={styles.button} onClick={handleSignIn}>
            Continuer avec Google
          </button>

          <p style={styles.consent}>
            En vous connectant, vous acceptez les{" "}
            <a href="/terms" style={styles.consentLink}>
              conditions d&apos;utilisation
            </a>{" "}
            et la{" "}
            <a href="/privacy" style={styles.consentLink}>
              politique de confidentialité
            </a>
            .
          </p>
        </>
      )}

      {status === "signing-in" && <p style={styles.muted}>Connexion en cours…</p>}

      {status === "exchanging" && <p style={styles.muted}>Préparation de la session…</p>}

      {status === "done" && (
        <>
          <p style={styles.success}>Connecté{user?.displayName ? ` — ${user.displayName}` : ""}.</p>
          <p style={styles.muted}>Retour au jeu…</p>
        </>
      )}

      {status === "error" && (
        <>
          <p style={styles.error}>{error}</p>
          <button style={styles.button} onClick={handleSignIn}>
            Réessayer
          </button>
        </>
      )}
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>{title}</h1>
        {children}
      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams impose une frontière Suspense lors du prerendering.
  return (
    <Suspense fallback={<Panel title="AwakeRift"><p style={styles.muted}>Chargement…</p></Panel>}>
      <LoginContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b0a08",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 32,
    borderRadius: 12,
    background: "#16130d",
    border: "1px solid #2e2519",
    textAlign: "center",
  },
  title: {
    margin: "0 0 12px",
    fontSize: 32,
    color: "#e8dcc0",
    letterSpacing: 0.5,
  },
  muted: { margin: "0 0 20px", color: "#a89a80", lineHeight: 1.5 },
  success: { margin: "0 0 8px", color: "#9ec98a" },
  error: { margin: "0 0 20px", color: "#d97a72", lineHeight: 1.5 },
  consent: {
    margin: "18px 0 0",
    fontSize: 12.5,
    lineHeight: 1.55,
    color: "#7d7160",
  },
  consentLink: {
    color: "#a89a80",
    textDecoration: "underline",
  },
  button: {
    width: "100%",
    padding: "12px 20px",
    fontSize: 16,
    color: "#f5eeda",
    background: "#6b5429",
    border: "1px solid #8a6e36",
    borderRadius: 8,
    cursor: "pointer",
  },
};
