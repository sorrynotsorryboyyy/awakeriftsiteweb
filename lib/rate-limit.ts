import { NextResponse } from "next/server";
import { db, FieldValue } from "./firestore";

/**
 * Limite de débit par compte, stockée dans Firestore.
 *
 * Sans elle, un script peut marteler une route et gonfler la facture : le
 * coût Firestore suit le nombre d'opérations, pas le nombre de joueurs.
 *
 * Les compteurs vivent dans une sous-collection du joueur plutôt que sur son
 * document principal, pour ne pas le réécrire à chaque appel — une écriture
 * vaut environ dix lectures.
 */

export interface RateLimit {
  /** Nombre d'appels autorisés dans la fenêtre. */
  max: number;

  /** Durée de la fenêtre, en secondes. */
  windowSeconds: number;
}

/**
 * Valeurs par route. Larges pour un joueur normal, bloquantes pour un script.
 */
export const LIMITS = {
  /** Sauvegarde de deck : un joueur en édite plusieurs d'affilée. */
  deckWrite: { max: 60, windowSeconds: 60 },

  /** Lecture des decks : appelée à chaque changement de scène. */
  deckRead: { max: 120, windowSeconds: 60 },

  /** Profil : lu au lancement, écrit rarement. */
  profile: { max: 60, windowSeconds: 60 },

  /** Choix du pseudo : une fois par compte, mais plusieurs essais possibles. */
  setup: { max: 10, windowSeconds: 60 },
} as const;

/**
 * Renvoie une réponse 429 si la limite est dépassée, sinon null.
 *
 * La fenêtre est glissante par tranche : on stocke le début de fenêtre et un
 * compteur, remis à zéro quand la fenêtre expire. Moins précis qu'une vraie
 * fenêtre glissante, mais une seule lecture et une seule écriture par appel.
 */
export async function checkRateLimit(
  uid: string,
  bucket: string,
  limit: RateLimit
): Promise<NextResponse | null> {
  const ref = db()
    .collection("users")
    .doc(uid)
    .collection("limits")
    .doc(bucket);

  try {
    const snapshot = await ref.get();
    const now = Date.now();

    if (!snapshot.exists) {
      await ref.set({ windowStart: now, count: 1 });
      return null;
    }

    const data = snapshot.data() ?? {};
    const windowStart = data.windowStart ?? 0;
    const elapsed = (now - windowStart) / 1000;

    if (elapsed >= limit.windowSeconds) {
      await ref.set({ windowStart: now, count: 1 });
      return null;
    }

    const count = data.count ?? 0;

    if (count >= limit.max) {
      const retryAfter = Math.ceil(limit.windowSeconds - elapsed);

      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans un instant.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    await ref.update({ count: FieldValue.increment(1) });
    return null;
  } catch (error) {
    // Un échec du compteur ne doit pas bloquer le joueur : on laisse passer
    // plutôt que de rendre le jeu inutilisable sur un incident Firestore.
    console.error(`[rate-limit] ${bucket}`, error);
    return null;
  }
}
