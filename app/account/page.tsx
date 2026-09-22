"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase-client";

type Status = "loading" | "signed-out" | "ready" | "working" | "deleted";

export default function AccountPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setStatus(u ? "ready" : "signed-out");
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    setError("");
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connexion impossible.";
      if (!msg.includes("popup-closed-by-user")) setError(msg);
    }
  }, []);

  /** Ajoute le jeton de session à la requête : le serveur en déduit l'identité. */
  const authorizedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const current = getFirebaseAuth().currentUser;
      if (!current) throw new Error("Session expirée.");

      const token = await current.getIdToken();

      return fetch(path, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      });
    },
    []
  );

  const exportData = useCallback(async () => {
    setStatus("working");
    setError("");

    try {
      const response = await authorizedFetch("/api/account/export");
      if (!response.ok) throw new Error("Export impossible.");

      // Le navigateur télécharge le fichier renvoyé en pièce jointe.
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `awakerift-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export impossible.");
    } finally {
      setStatus("ready");
    }
  }, [authorizedFetch]);

  const deleteAccount = useCallback(async () => {
    setStatus("working");
    setError("");

    try {
      const response = await authorizedFetch("/api/account", { method: "DELETE" });
      if (!response.ok) throw new Error("Suppression impossible.");

      await signOut(getFirebaseAuth());
      setStatus("deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible.");
      setStatus("ready");
    }
  }, [authorizedFetch]);

  if (status === "deleted") {
    return (
      <Shell title="Compte supprimé">
        <p style={styles.p}>
          Vos données ont été effacées. Merci d&apos;avoir joué à AwakeRift.
        </p>
      </Shell>
    );
  }

  if (status === "loading") {
    return (
      <Shell title="Mon compte">
        <p style={styles.muted}>Chargement…</p>
      </Shell>
    );
  }

  if (status === "signed-out") {
    return (
      <Shell title="Mon compte">
        <p style={styles.p}>
          Connectez-vous pour exporter ou supprimer vos données.
        </p>
        <button style={styles.button} onClick={signIn}>
          Continuer avec Google
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </Shell>
    );
  }

  const canDelete = confirmText.trim().toUpperCase() === "SUPPRIMER";

  return (
    <Shell title="Mon compte">
      <p style={styles.muted}>Connecté en tant que {user?.email}</p>

      <section style={styles.section}>
        <h2 style={styles.h2}>Exporter mes données</h2>
        <p style={styles.p}>
          Téléchargez l&apos;ensemble des données que nous détenons : profil,
          progression, decks. Le fichier est au format JSON.
        </p>
        <button
          style={styles.button}
          onClick={exportData}
          disabled={status === "working"}
        >
          {status === "working" ? "Préparation…" : "Télécharger mes données"}
        </button>
      </section>

      <section style={styles.sectionDanger}>
        <h2 style={styles.h2}>Supprimer mon compte</h2>
        <p style={styles.p}>
          Votre profil, votre progression et vos decks seront effacés
          définitivement. <strong>Cette action est irréversible.</strong>
        </p>
        <p style={styles.p}>
          Pour confirmer, saisissez <strong>SUPPRIMER</strong> ci-dessous.
        </p>

        <input
          style={styles.input}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="SUPPRIMER"
          aria-label="Confirmation de suppression"
        />

        <button
          style={{
            ...styles.button,
            ...styles.buttonDanger,
            ...(canDelete ? {} : styles.buttonDisabled),
          }}
          onClick={deleteAccount}
          disabled={!canDelete || status === "working"}
        >
          Supprimer définitivement
        </button>
      </section>

      {error && <p style={styles.error}>{error}</p>}

      <button style={styles.linkButton} onClick={() => signOut(getFirebaseAuth())}>
        Se déconnecter
      </button>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <Link href="/" style={styles.back}>
          ← AwakeRift
        </Link>
        <h1 style={styles.title}>{title}</h1>
        {children}
        <footer style={styles.footer}>
          <Link href="/privacy" style={styles.link}>
            Confidentialité
          </Link>
          <Link href="/terms" style={styles.link}>
            Conditions d&apos;utilisation
          </Link>
        </footer>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#0b0a08",
    color: "#c3b79d",
    padding: "48px 16px 80px",
  },
  card: { maxWidth: 620, margin: "0 auto" },
  back: { color: "#8a7c62", textDecoration: "none", fontSize: 15 },
  title: { fontSize: 32, color: "#e8dcc0", margin: "20px 0 24px" },
  h2: { fontSize: 20, color: "#e8dcc0", margin: "0 0 10px" },
  p: { margin: "0 0 16px", lineHeight: 1.6 },
  muted: { margin: "0 0 28px", color: "#7d7160", fontSize: 15 },
  section: {
    padding: 24,
    marginBottom: 20,
    borderRadius: 10,
    background: "#16130d",
    border: "1px solid #2e2519",
  },
  sectionDanger: {
    padding: 24,
    marginBottom: 20,
    borderRadius: 10,
    background: "#1a100d",
    border: "1px solid #5a2a22",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    marginBottom: 14,
    fontSize: 15,
    color: "#f5eeda",
    background: "#0d0b08",
    border: "1px solid #3a2e20",
    borderRadius: 6,
  },
  button: {
    padding: "11px 22px",
    fontSize: 15,
    color: "#f5eeda",
    background: "#6b5429",
    border: "1px solid #8a6e36",
    borderRadius: 7,
    cursor: "pointer",
  },
  buttonDanger: { background: "#7a2f24", border: "1px solid #9c3d2f" },
  buttonDisabled: { opacity: 0.45, cursor: "not-allowed" },
  linkButton: {
    marginTop: 8,
    padding: 0,
    fontSize: 15,
    color: "#8a7c62",
    background: "none",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
  },
  error: { color: "#d97a72", margin: "16px 0 0", lineHeight: 1.5 },
  footer: {
    marginTop: 48,
    paddingTop: 20,
    borderTop: "1px solid #2e2519",
    display: "flex",
    gap: 24,
  },
  link: { color: "#a89a80", textDecoration: "none", fontSize: 15 },
};
