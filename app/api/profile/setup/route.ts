import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, FieldValue } from "@/lib/firestore";

const MIN_LENGTH = 3;
const MAX_LENGTH = 16;

// Lettres, chiffres, tiret et underscore. Pas d'espace : le pseudo sert
// d'identité visible en partie, autant éviter les variantes invisibles.
const ALLOWED = /^[a-zA-Z0-9_-]+$/;

/**
 * POST /api/profile/setup  { displayName }
 *
 * Fixe le pseudo à la première connexion et marque le profil comme configuré.
 * Rejoué sur un profil déjà configuré, il répond 409 : le changement de pseudo
 * passe par PATCH /api/profile.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";

    const invalid = validate(displayName);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const users = db().collection("users");
    const ref = users.doc(auth.user.uid);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    if (snapshot.data()?.setupCompleted === true) {
      return NextResponse.json({ error: "Profil déjà configuré." }, { status: 409 });
    }

    // Unicité : la recherche porte sur une forme normalisée pour que "Elysia"
    // et "elysia" ne puissent pas coexister.
    const normalized = displayName.toLowerCase();
    const taken = await users.where("displayNameLower", "==", normalized).limit(1).get();

    if (!taken.empty && taken.docs[0].id !== auth.user.uid) {
      return NextResponse.json({ error: "Ce pseudo est déjà pris." }, { status: 409 });
    }

    await ref.update({
      displayName,
      displayNameLower: normalized,
      setupCompleted: true,
      lastSeenAt: FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();

    return NextResponse.json({ ok: true, profile: { id: auth.user.uid, ...updated.data() } });
  } catch (error) {
    console.error("[profile/setup POST]", error);
    return NextResponse.json({ error: "Configuration impossible." }, { status: 500 });
  }
}

function validate(name: string): string | null {
  if (name.length < MIN_LENGTH)
    return `Le pseudo doit faire au moins ${MIN_LENGTH} caractères.`;

  if (name.length > MAX_LENGTH)
    return `Le pseudo ne doit pas dépasser ${MAX_LENGTH} caractères.`;

  if (!ALLOWED.test(name))
    return "Lettres, chiffres, tiret et underscore uniquement.";

  return null;
}
