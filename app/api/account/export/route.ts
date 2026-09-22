import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/firestore";

/**
 * GET /api/account/export
 *
 * Renvoie toutes les données du joueur en JSON. Obligation RGPD (droit à
 * la portabilité) : le format doit être lisible et réutilisable.
 *
 * La réponse est servie en pièce jointe pour que le navigateur la propose
 * au téléchargement plutôt que de l'afficher.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const uid = auth.user.uid;

  try {
    const userRef = db().collection("users").doc(uid);

    const [profile, decks, inventory] = await Promise.all([
      userRef.get(),
      userRef.collection("decks").get(),
      userRef.collection("inventory").get(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        uid,
        email: auth.user.email,
      },
      profile: profile.exists ? serialize(profile.data()) : null,
      decks: decks.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
      inventory: inventory.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
    };

    const filename = `awakerift-donnees-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[account/export]", error);
    return NextResponse.json({ error: "Export impossible." }, { status: 500 });
  }
}

/**
 * Convertit les Timestamp Firestore en dates ISO. Sérialisés tels quels,
 * ils sortiraient en objets `{_seconds, _nanoseconds}`, illisibles pour qui
 * consulte son export.
 */
function serialize(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data) return null;

  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in value) {
      out[key] = (value as FirebaseFirestore.Timestamp).toDate().toISOString();
    } else {
      out[key] = value;
    }
  }

  return out;
}
