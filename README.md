# AwakeRift — site de connexion

Passerelle d'authentification entre le jeu Unity et Firebase.
Le jeu ouvre ce site dans le navigateur, l'utilisateur se connecte avec Google,
et le site renvoie un jeton que le jeu échange contre une session.

## Le flux

1. Le jeu ouvre un port local et lance le navigateur sur
   `/login?redirect_uri=http://127.0.0.1:PORT/callback&state=XXX`
2. L'utilisateur se connecte avec Google (popup Firebase)
3. La page envoie l'ID token à `/api/auth/callback`
4. La route vérifie le token et crée un **custom token** Firebase
5. La page redirige vers `redirect_uri?code=CUSTOM_TOKEN&state=XXX`
6. Le jeu échange ce code contre une session (`signInWithCustomToken`)

Le détour par un custom token évite d'exposer la session web au jeu. Le token
est à usage unique et de courte durée, ce qui limite le risque lié à son
passage par une URL.

## Configuration

Copier `.env.example` vers `.env.local` et renseigner les valeurs.

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Console Firebase → Paramètres du projet → Vos applications → Web |
| `FIREBASE_SERVICE_ACCOUNT` | Console Firebase → Paramètres → Comptes de service → Générer une clé privée |

`FIREBASE_SERVICE_ACCOUNT` attend le JSON complet **sur une seule ligne**.

> Cette clé donne un accès administrateur au projet Firebase. Elle ne doit
> jamais être commitée ni exposée au navigateur. Les variables `NEXT_PUBLIC_*`
> sont publiques par conception — ce sont les règles Firestore qui protègent
> les données, pas le secret de ces clés.

## Développement

```bash
npm install
npm run dev
```

## Côté Firebase

- **Authentication** → activer le fournisseur **Google**
- **Authentication → Paramètres → Domaines autorisés** → ajouter le domaine Vercel

## Côté jeu

Dans `Auth Settings.asset` (projet Unity) :

- `_loginUrl` → `https://VOTRE-DOMAINE.vercel.app/login`
- `_firebaseApiKey` → la même valeur que `NEXT_PUBLIC_FIREBASE_API_KEY`
- `_useFakeBackend` → décocher

## Base de données

Schéma Firestore :

```
users/{uid}
  email, displayName, avatarImageId
  level, allTimePoints, goldCoins
  wins, losses, draws
  createdAt, lastSeenAt

users/{uid}/decks/{deckId}    name, hero, race, cards[], updatedAt
users/{uid}/inventory/cards   owned[]
```

Les règles de sécurité sont dans `firestore.rules`, à coller dans
Firebase Console → Firestore Database → Règles.

### API

Toutes les routes attendent `Authorization: Bearer <IdToken Firebase>`.
L'identité vient du jeton vérifié côté serveur, jamais du corps de la
requête : un client ne peut donc pas écrire dans le compte d'un autre.

| Route | Méthode | Rôle |
|---|---|---|
| `/api/profile` | GET | Profil, créé à la première connexion |
| `/api/profile` | PATCH | Pseudo et avatar uniquement |
| `/api/stats` | POST | Résultat de match + gains |
| `/api/decks` | GET / PUT / DELETE | Decks du joueur |
| `/api/account` | DELETE | Suppression du compte (RGPD) |
| `/api/account/export` | GET | Export des données (RGPD) |

`PATCH /api/profile` n'accepte que `displayName` et `avatarImageId`.
`goldCoins`, `wins`, `losses` et le niveau ne sont modifiables que par le
serveur — les exposer laisserait un client modifié s'attribuer monnaie et
victoires.

## Conformité

Trois pages publiques, liées depuis l'accueil et l'écran de connexion :

- `/privacy` — politique de confidentialité
- `/terms` — conditions d'utilisation
- `/account` — export et suppression du compte

`DELETE /api/account` efface le profil, les decks et l'inventaire, puis le
compte Firebase Auth — dans cet ordre, car un jeton encore valide
recréerait le profil tant que le compte existe.

Les déclarations de match sont **anonymisées** plutôt que supprimées : un
match lie deux joueurs, et les effacer fausserait l'historique de
l'adversaire ainsi que la vérification croisée.

## Points ouverts

- **Deux comptes complices peuvent fausser des résultats.** La double
  déclaration bloque la triche solitaire : les deux joueurs déclarent, le
  serveur compare, et retire les gains en cas d'incohérence. Mais rien
  n'empêche deux comptes de s'accorder sur un résultat fictif. La limite de
  débit (1 match / 30 s, 200 / jour) plafonne le gain sans l'empêcher. Seul un
  serveur de jeu autoritaire le résoudrait — ce qui suppose d'abandonner le
  Distributed Authority. Acceptable sans boutique ni classement public.
- **Limites de débit absentes sur `/api/decks` et `/api/profile`.** Seule
  `/api/stats` est protégée : un script pourrait gonfler la facture Firestore.
- **La collection `matches` n'est jamais purgée.** Un document par partie. Sans
  danger immédiat, mais le stockage se facture : prévoir un TTL Firestore.
- **La route `/api/auth/callback` valide la `redirect_uri`** (loopback, chemin
  `/callback`) mais pas le port, qui varie à chaque lancement du jeu.
