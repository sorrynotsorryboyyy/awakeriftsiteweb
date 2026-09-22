import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/firestore";
import { getAdminAuth } from "@/lib/firebase-admin";

/**
 * DELETE /api/account
 *
 * Supprime définitivement le compte et ses données. Obligation RGPD
 * (droit à l'effacement) dès lors qu'un joueur européen s'inscrit, et
 * prérequis pour une distribution Steam.
 *
 * L'opération est irréversible : le client doit confirmer avant d'appeler.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const uid = auth.user.uid;

  try {
    await deleteSubcollection(uid, "decks");
    await deleteSubcollection(uid, "inventory");
    await anonymizeMatchClaims(uid);

    await db().collection("users").doc(uid).delete();

    // En dernier : tant que le compte Auth existe, un jeton encore valide
    // permettrait de recréer le profil par un simple GET /api/profile.
    await getAdminAuth().deleteUser(uid);

    console.log(`[account DELETE] compte ${uid} supprimé`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account DELETE]", error);
    return NextResponse.json(
      { error: "Suppression impossible." },
      { status: 500 }
    );
  }
}

/**
 * Firestore ne supprime pas les sous-collections avec leur parent : il faut
 * les parcourir. Par lots, pour ne pas dépasser la limite de 500 opérations
 * par écriture groupée.
 */
async function deleteSubcollection(uid: string, name: string) {
  const ref = db().collection("users").doc(uid).collection(name);

  while (true) {
    const snapshot = await ref.limit(400).get();
    if (snapshot.empty) return;

    const batch = db().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size < 400) return;
  }
}

/**
 * Les déclarations de match sont anonymisées plutôt que supprimées.
 *
 * Un match lie deux joueurs : effacer les déclarations de l'un invaliderait
 * la vérification croisée et fausserait l'historique de l'autre. On retire
 * donc le lien vers la personne sans détruire la trace du match.
 *
 * Les claims sont identifiées par l'uid du joueur. On parcourt les matchs
 * récents plutôt que d'interroger par nom de document : une requête
 * collectionGroup sur __name__ demande un index dédié et échouerait
 * silencieusement en production.
 */
async function anonymizeMatchClaims(uid: string) {
  const matches = await db().collection("matches").limit(500).get();

  if (matches.empty) return;

  const batch = db().batch();
  let touched = 0;

  for (const match of matches.docs) {
    const claim = await match.ref.collection("claims").doc(uid).get();
    if (!claim.exists) continue;

    // Le document conserve l'issue du match, sans plus aucun lien vers la
    // personne : l'identifiant anonyme ne permet pas de remonter à elle.
    batch.set(match.ref.collection("claims").doc("anonymous-" + touched), {
      ...claim.data(),
      anonymized: true,
    });
    batch.delete(claim.ref);
    touched++;
  }

  if (touched > 0) {
    await batch.commit();
    console.log(`[account DELETE] ${touched} déclaration(s) anonymisée(s)`);
  }
}
