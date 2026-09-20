import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, FieldValue } from "@/lib/firestore";

type Outcome = "win" | "loss" | "draw";

/** Gains attribués par issue de match. */
const REWARDS: Record<Outcome, { coins: number; points: number }> = {
  win: { coins: 50, points: 10 },
  loss: { coins: 10, points: 2 },
  draw: { coins: 25, points: 5 },
};

const FIELD_BY_OUTCOME: Record<Outcome, "wins" | "losses" | "draws"> = {
  win: "wins",
  loss: "losses",
  draw: "draws",
};

/**
 * POST /api/stats  { outcome: "win" | "loss" | "draw" }
 *
 * Enregistre le résultat d'un match et crédite les gains.
 *
 * ⚠ Aucun anti-triche à ce stade : le serveur croit le client sur parole.
 * Un joueur qui modifie le jeu peut déclarer autant de victoires qu'il veut.
 * Acceptable tant qu'il n'y a ni classement public ni récompense monétaire.
 * À renforcer avant toute boutique ou compétition — voir README.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const { outcome } = await request.json();

    if (outcome !== "win" && outcome !== "loss" && outcome !== "draw") {
      return NextResponse.json(
        { error: "outcome doit valoir win, loss ou draw." },
        { status: 400 }
      );
    }

    const reward = REWARDS[outcome as Outcome];
    const field = FIELD_BY_OUTCOME[outcome as Outcome];
    const ref = db().collection("users").doc(auth.user.uid);

    // increment() est atomique : deux matchs terminés en même temps ne
    // s'écrasent pas l'un l'autre, contrairement à un read-modify-write.
    await ref.update({
      [field]: FieldValue.increment(1),
      goldCoins: FieldValue.increment(reward.coins),
      allTimePoints: FieldValue.increment(reward.points),
      lastSeenAt: FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();

    return NextResponse.json({ ok: true, profile: updated.data() });
  } catch (error) {
    console.error("[stats POST]", error);
    return NextResponse.json(
      { error: "Enregistrement impossible." },
      { status: 500 }
    );
  }
}
