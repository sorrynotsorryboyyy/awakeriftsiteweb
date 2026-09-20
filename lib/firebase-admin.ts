import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * SDK admin — côté serveur uniquement.
 *
 * FIREBASE_SERVICE_ACCOUNT contient une clé privée qui donne un accès total au
 * projet : elle ne doit jamais atteindre le navigateur. Ce module n'est importé
 * que depuis des route handlers, qui s'exécutent sur le serveur.
 *
 * Valeur attendue : le JSON du compte de service, sur une seule ligne.
 * Firebase Console > Paramètres > Comptes de service > Générer une clé privée.
 */
function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT absent. Ajoutez-le dans les variables " +
        "d'environnement Vercel (et dans .env.local en développement)."
    );
  }

  try {
    const parsed = JSON.parse(raw);

    // Les sauts de ligne de la clé privée sont souvent échappés lors du
    // copier-coller dans un champ de formulaire.
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }

    return parsed;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide. " +
        "Collez le contenu du fichier de clé sur une seule ligne."
    );
  }
}

export function getAdminApp(): App {
  if (getApps().length) return getApp();

  return initializeApp({
    credential: cert(getServiceAccount()),
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
