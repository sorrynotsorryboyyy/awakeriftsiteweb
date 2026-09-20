import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

/**
 * Échange l'ID token Google (obtenu côté navigateur) contre un custom token
 * Firebase que le jeu pourra consommer.
 *
 * Pourquoi ce détour : le jeu ne peut pas recevoir directement l'ID token du
 * navigateur sans exposer la session web. Le custom token est à usage unique et
 * ne vaut que pour cet échange, ce qui limite la casse s'il fuite via l'URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken, redirectUri } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken manquant." }, { status: 400 });
    }

    if (!isAllowedRedirect(redirectUri)) {
      // Sans ce contrôle, n'importe quel site pourrait faire émettre un token
      // et se le faire livrer sur son propre serveur.
      return NextResponse.json(
        { error: "redirect_uri non autorisée." },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();

    // verifyIdToken rejette un token expiré, mal signé ou émis pour un autre
    // projet : c'est ce qui garantit que l'utilisateur s'est vraiment connecté.
    const decoded = await auth.verifyIdToken(idToken);

    const customToken = await auth.createCustomToken(decoded.uid, {
      source: "web-login",
    });

    return NextResponse.json({ customToken });
  } catch (error) {
    console.error("[auth/callback]", error);

    return NextResponse.json(
      { error: "Échec de la vérification." },
      { status: 401 }
    );
  }
}

/**
 * Le jeu écoute sur un port local choisi par l'OS, donc le port varie à chaque
 * lancement. On valide l'hôte et le chemin, pas le port.
 */
function isAllowedRedirect(redirectUri: unknown): boolean {
  if (typeof redirectUri !== "string" || redirectUri.length === 0) return false;

  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }

  const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";

  return url.protocol === "http:" && isLoopback && url.pathname === "/callback";
}
