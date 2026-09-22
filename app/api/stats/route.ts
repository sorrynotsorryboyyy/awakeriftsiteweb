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

/** Un match dure rarement moins que ça : en dessous, c'est du spam. */
const MIN_SECONDS_BETWEEN_MATCHES = 30;

/** Plafond quotidien, large pour un joueur normal, bloquant pour un script. */
const MAX_MATCHES_PER_DAY = 200;

/**
 * Durée de conservation d'un match. Au-delà, la règle TTL de Firestore
 * supprime le document : les deux déclarations ont largement eu le temps
 * d'être recoupées.
 */
const MATCH_RETENTION_DAYS = 30;

/** Issue opposée, pour vérifier que les deux déclarations concordent. */
const OPPOSITE: Record<Outcome, Outcome> = {
  win: "loss",
  loss: "win",
  draw: "draw",
};

/**
 * POST /api/stats  { outcome, matchId? }
 *
 * Enregistre le résultat d'un match et crédite les gains.
 *
 * Trois protections, dans l'ordre où elles s'appliquent :
 *
 * 1. Limite de débit — un match toutes les 30 s, 200 par jour. Empêche
 *    qu'un script boucle sur cette route.
 * 2. Déduplication — un même matchId ne peut être déclaré qu'une fois par
 *    joueur, donc rejouer la requête ne crédite rien.
 * 3. Double déclaration — quand les deux joueurs ont déclaré le même match,
 *    le serveur compare. Si les issues sont incohérentes (deux victoires),
 *    le match est marqué en litige et les gains sont retirés aux deux.
 *
 * Reste possible sans serveur de jeu autoritaire : deux comptes complices
 * qui déclarent des résultats cohérents mais fictifs. La limite de débit
 * plafonne le gain d'une telle collusion.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const outcome = body.outcome;
    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";

    if (outcome !== "win" && outcome !== "loss" && outcome !== "draw") {
      return NextResponse.json(
        { error: "outcome doit valoir win, loss ou draw." },
        { status: 400 }
      );
    }

    const uid = auth.user.uid;
    const userRef = db().collection("users").doc(uid);

    const limited = await checkRateLimit(uid, userRef);
    if (limited) return limited;

    if (matchId) {
      const duplicate = await alreadyReported(uid, matchId);
      if (duplicate) {
        return NextResponse.json(
          { error: "Match déjà déclaré.", alreadyReported: true },
          { status: 409 }
        );
      }
    }

    const reward = REWARDS[outcome as Outcome];
    const field = FIELD_BY_OUTCOME[outcome as Outcome];

    // increment() est atomique : deux écritures concurrentes ne s'écrasent pas.
    await userRef.update({
      [field]: FieldValue.increment(1),
      goldCoins: FieldValue.increment(reward.coins),
      allTimePoints: FieldValue.increment(reward.points),
      lastMatchAt: FieldValue.serverTimestamp(),
      matchesToday: FieldValue.increment(1),
      lastSeenAt: FieldValue.serverTimestamp(),
    });

    if (matchId) {
      await recordClaim(uid, matchId, outcome as Outcome, reward);
    }

    const updated = await userRef.get();

    return NextResponse.json({ ok: true, profile: updated.data() });
  } catch (error) {
    console.error("[stats POST]", error);
    return NextResponse.json(
      { error: "Enregistrement impossible." },
      { status: 500 }
    );
  }
}

/**
 * Refuse les déclarations trop rapprochées ou trop nombreuses.
 * Le compteur quotidien est remis à zéro paresseusement, à la première
 * requête d'un nouveau jour : pas besoin de tâche planifiée.
 */
async function checkRateLimit(
  uid: string,
  userRef: FirebaseFirestore.DocumentReference
): Promise<NextResponse | null> {
  const snapshot = await userRef.get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() ?? {};
  const now = Date.now();

  const lastMatchAt = data.lastMatchAt?.toMillis?.() ?? 0;
  const secondsSince = (now - lastMatchAt) / 1000;

  if (lastMatchAt && secondsSince < MIN_SECONDS_BETWEEN_MATCHES) {
    return NextResponse.json(
      {
        error: "Trop de matchs déclarés trop vite.",
        retryAfter: Math.ceil(MIN_SECONDS_BETWEEN_MATCHES - secondsSince),
      },
      { status: 429 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  if (data.matchesDay !== today) {
    await userRef.update({ matchesDay: today, matchesToday: 0 });
    return null;
  }

  if ((data.matchesToday ?? 0) >= MAX_MATCHES_PER_DAY) {
    return NextResponse.json(
      { error: "Limite quotidienne atteinte." },
      { status: 429 }
    );
  }

  return null;
}

async function alreadyReported(uid: string, matchId: string): Promise<boolean> {
  const claim = await db()
    .collection("matches")
    .doc(matchId)
    .collection("claims")
    .doc(uid)
    .get();

  return claim.exists;
}

/**
 * Enregistre la déclaration et, si l'adversaire a déjà déclaré, vérifie la
 * concordance. Deux victoires sur le même match trahissent une triche : les
 * gains sont retirés aux deux et le match est marqué en litige.
 */
async function recordClaim(
  uid: string,
  matchId: string,
  outcome: Outcome,
  reward: { coins: number; points: number }
): Promise<void> {
  const matchRef = db().collection("matches").doc(matchId);

  await matchRef.collection("claims").doc(uid).set({
    outcome,
    coins: reward.coins,
    points: reward.points,
    at: FieldValue.serverTimestamp(),
  });

  // expiresAt alimente la règle TTL configurée dans la console Firestore :
  // un document par partie, jamais purgé, finirait par peser. La trace n'a
  // d'intérêt que le temps de recouper les deux déclarations.
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MATCH_RETENTION_DAYS);

  await matchRef.set(
    { lastClaimAt: FieldValue.serverTimestamp(), expiresAt },
    { merge: true }
  );

  const claims = await matchRef.collection("claims").get();
  if (claims.size < 2) return;

  const entries = claims.docs.map((doc) => ({
    uid: doc.id,
    outcome: doc.data().outcome as Outcome,
    coins: doc.data().coins as number,
    points: doc.data().points as number,
  }));

  const [a, b] = entries;
  const consistent = OPPOSITE[a.outcome] === b.outcome;

  await matchRef.set(
    { verified: consistent, resolvedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  if (consistent) return;

  // Litige : on retire ce qui a été crédité aux deux joueurs.
  console.warn(
    `[stats] Match ${matchId} incohérent : ${a.uid}=${a.outcome}, ${b.uid}=${b.outcome}`
  );

  const batch = db().batch();

  for (const entry of entries) {
    batch.update(db().collection("users").doc(entry.uid), {
      goldCoins: FieldValue.increment(-entry.coins),
      allTimePoints: FieldValue.increment(-entry.points),
      disputedMatches: FieldValue.increment(1),
    });
  }

  await batch.commit();
}
