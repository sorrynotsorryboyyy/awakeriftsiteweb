import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";

export function db(): Firestore {
  return getFirestore(getAdminApp());
}

export { FieldValue };

/** Document principal du joueur. */
export interface UserProfile {
  email: string;
  displayName: string;
  avatarImageId: string;
  level: number;
  allTimePoints: number;
  goldCoins: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  lastSeenAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

/** Valeurs d'un profil à sa création. Alignées sur PlayerData côté Unity. */
export function defaultProfile(
  email: string,
  displayName: string
): Omit<UserProfile, "createdAt" | "lastSeenAt"> {
  return {
    email,
    displayName,
    avatarImageId: "",
    level: 1,
    allTimePoints: 0,
    goldCoins: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

/**
 * Récupère le profil, en le créant à la première connexion.
 * C'est le seul endroit qui crée un document utilisateur : le jeu et le site
 * passent tous deux par ici, ce qui évite deux chemins de création divergents.
 */
export async function getOrCreateProfile(
  uid: string,
  email: string,
  displayName: string
) {
  const ref = db().collection("users").doc(uid);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const profile = {
      ...defaultProfile(email, displayName),
      // Le joueur n'a pas encore choisi son pseudo : le jeu affichera
      // l'écran de configuration tant que ce drapeau est faux.
      setupCompleted: false,
      createdAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
    };

    await ref.set(profile);

    // serverTimestamp() n'est résolu qu'après écriture : on relit pour
    // renvoyer des dates réelles plutôt que des sentinelles.
    const created = await ref.get();
    return { id: uid, ...created.data() };
  }

  await ref.update({ lastSeenAt: FieldValue.serverTimestamp() });

  const data = snapshot.data();

  return {
    id: uid,
    ...data,
    // Les comptes créés avant l'ajout du drapeau n'ont pas le champ :
    // on les considère configurés pour ne pas leur réafficher l'écran.
    setupCompleted: data?.setupCompleted ?? true,
  };
}
