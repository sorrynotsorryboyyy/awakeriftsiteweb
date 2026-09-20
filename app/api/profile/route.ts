import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, getOrCreateProfile, FieldValue } from "@/lib/firestore";

/** Champs que le joueur a le droit de modifier lui-même. */
const EDITABLE_FIELDS = ["displayName", "avatarImageId"] as const;

/**
 * GET /api/profile
 * Renvoie le profil, en le créant à la première connexion.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const profile = await getOrCreateProfile(
      auth.user.uid,
      auth.user.email,
      auth.user.displayName
    );

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[profile GET]", error);
    return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  }
}

/**
 * PATCH /api/profile
 * Met à jour le pseudo et l'avatar, et rien d'autre.
 *
 * goldCoins, wins, losses et le niveau sont volontairement exclus : les
 * exposer ici laisserait un client modifié s'attribuer ce qu'il veut. Ils
 * passeront par des routes dédiées, côté serveur.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    for (const field of EDITABLE_FIELDS) {
      if (typeof body[field] === "string") {
        updates[field] = body[field].slice(0, 64);
      }
    }

    // La forme normalisée doit suivre le pseudo, sinon le contrôle d'unicité
    // de /api/profile/setup porterait sur une valeur périmée.
    if (typeof updates.displayName === "string") {
      updates.displayNameLower = (updates.displayName as string).trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Aucun champ modifiable fourni." },
        { status: 400 }
      );
    }

    updates.lastSeenAt = FieldValue.serverTimestamp();

    await db().collection("users").doc(auth.user.uid).update(updates);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[profile PATCH]", error);
    return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 });
  }
}
