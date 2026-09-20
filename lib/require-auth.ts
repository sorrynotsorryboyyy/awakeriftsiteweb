import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "./firebase-admin";

export interface AuthedUser {
  uid: string;
  email: string;
  displayName: string;
}

/**
 * Vérifie le jeton porté par l'en-tête Authorization.
 *
 * Le jeu envoie son IdToken Firebase ; verifyIdToken rejette tout jeton expiré,
 * mal signé ou émis pour un autre projet. C'est ce qui garantit qu'une requête
 * ne peut pas se faire passer pour un autre joueur : l'uid vient du jeton
 * vérifié, jamais du corps de la requête.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthedUser } | { error: NextResponse }> {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Jeton manquant." },
        { status: 401 }
      ),
    };
  }

  const idToken = header.slice("Bearer ".length).trim();

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);

    // verifyIdToken valide la signature, pas l'existence du compte : un jeton
    // reste utilisable après suppression de l'utilisateur, jusqu'à expiration.
    // Sans ce contrôle, un compte supprimé continuerait de jouer et de
    // réécrire ses données.
    const record = await auth.getUser(decoded.uid);

    if (record.disabled) {
      return {
        error: NextResponse.json({ error: "Compte désactivé." }, { status: 403 }),
      };
    }

    return {
      user: {
        uid: decoded.uid,
        email: decoded.email ?? record.email ?? "",
        displayName:
          decoded.name ??
          record.displayName ??
          decoded.email?.split("@")[0] ??
          "Joueur",
      },
    };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Jeton invalide ou expiré." },
        { status: 401 }
      ),
    };
  }
}
