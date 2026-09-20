import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, FieldValue } from "@/lib/firestore";

const MAX_DECKS = 50;
const MAX_CARDS_PER_DECK = 200;

/**
 * GET /api/decks
 * Renvoie tous les decks du joueur.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const snapshot = await db()
      .collection("users")
      .doc(auth.user.uid)
      .collection("decks")
      .get();

    const decks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ decks });
  } catch (error) {
    console.error("[decks GET]", error);
    return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  }
}

/**
 * PUT /api/decks  { name, hero, race, cards[], defaultSize, maxDuplicates }
 * Crée ou remplace un deck. Le nom sert d'identifiant, comme dans la
 * sauvegarde locale du jeu (un fichier par nom de deck).
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "name requis." }, { status: 400 });
    }

    if (!Array.isArray(body.cards) || body.cards.length > MAX_CARDS_PER_DECK) {
      return NextResponse.json({ error: "cards invalide." }, { status: 400 });
    }

    const decksRef = db()
      .collection("users")
      .doc(auth.user.uid)
      .collection("decks");

    const deckId = encodeDeckId(body.name);
    const existing = await decksRef.doc(deckId).get();

    // Plafond par joueur : sans lui, un client en boucle pourrait remplir
    // la base indéfiniment.
    if (!existing.exists) {
      const count = (await decksRef.count().get()).data().count;
      if (count >= MAX_DECKS) {
        return NextResponse.json(
          { error: `Limite de ${MAX_DECKS} decks atteinte.` },
          { status: 409 }
        );
      }
    }

    await decksRef.doc(deckId).set({
      name: body.name,
      hero: typeof body.hero === "string" ? body.hero : "",
      race: typeof body.race === "number" ? body.race : 0,
      cards: body.cards.filter((c: unknown) => typeof c === "string"),
      defaultSize: typeof body.defaultSize === "number" ? body.defaultSize : 0,
      maxDuplicates: typeof body.maxDuplicates === "number" ? body.maxDuplicates : 0,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: deckId });
  } catch (error) {
    console.error("[decks PUT]", error);
    return NextResponse.json({ error: "Écriture impossible." }, { status: 500 });
  }
}

/**
 * DELETE /api/decks?name=...
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name requis." }, { status: 400 });
  }

  try {
    await db()
      .collection("users")
      .doc(auth.user.uid)
      .collection("decks")
      .doc(encodeDeckId(name))
      .delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[decks DELETE]", error);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}

/**
 * Un identifiant Firestore ne peut pas contenir de "/" ni dépasser 1500 octets.
 * L'encodage garde une correspondance stable entre le nom et le document.
 */
function encodeDeckId(name: string): string {
  return encodeURIComponent(name.trim()).slice(0, 200);
}
