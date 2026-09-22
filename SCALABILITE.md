# Audit de scalabilité — AwakeRift

Revue de l'architecture backend pour un jeu multijoueur visant plusieurs
centaines de comptes, puis au-delà.

Date : 2026-09-20

---

## Verdict

L'architecture tient sans difficulté à quelques centaines de comptes, et
probablement jusqu'à quelques milliers. Les limites réelles ne sont pas
techniques mais économiques : le coût Firestore croît avec le nombre
d'écritures, pas avec le nombre de joueurs.

Les corrections critiques ont été appliquées. Ce qui reste est documenté
plus bas, par ordre d'urgence.

---

## Corrigé dans cette passe

### 1. Écriture à chaque lecture de profil

`getOrCreateProfile()` mettait `lastSeenAt` à jour à **chaque** appel.
Chez Firestore une écriture coûte environ dix fois une lecture : à 500
joueurs qui ouvrent leur profil cinq fois par session, cela faisait le
poste de dépense dominant, pour une donnée dont la précision à la seconde
n'a aucune valeur.

`lastSeenAt` n'est désormais rafraîchi qu'une fois par heure.

### 2. Services liés au SceneContext du menu

`AuthService` et `CloudProfileService` vivaient dans le conteneur Zenject
de la scène Menu, détruit au chargement de la partie. La session était
perdue en entrant en jeu, et rien ne pouvait remonter le résultat du match.

Ils vivent maintenant dans le `ProjectContext`, qui survit aux changements
de scène (`AuthProjectInstaller`).

### 3. Résultats de match jamais remontés

`ReportMatchAsync()` n'était appelé nulle part : les compteurs Firestore
restaient à zéro.

`MatchReporter` s'abonne désormais aux événements `OnWin`/`OnDefeat`/`OnDraw`
du système `MatchEnd`, retrouvé à chaque chargement de scène.

### 4. Decks non synchronisés

Le jeu écrivait ses decks en fichiers locaux : un joueur changeant de
machine les perdait.

`CloudDeckService` implémente `IDeckSaveSystem` et sert de cache en
mémoire au-dessus de l'API. **Conséquence assumée : le jeu n'est plus
jouable hors ligne.**

### 5. Aucun garde-fou sur les déclarations de match

Trois protections ajoutées à `POST /api/stats` :

| Protection | Effet |
|---|---|
| Limite de débit | 1 match / 30 s, 200 / jour |
| Déduplication | Un `matchId` ne peut être déclaré qu'une fois par joueur |
| Double déclaration | Les deux joueurs sont recoupés ; en cas d'incohérence, les gains sont retirés aux deux et le match marqué en litige |

---

### 6. Expiration du jeton en cours de session

Un `IdToken` Firebase vit une heure. Passé ce délai, les sauvegardes d'un
joueur en session longue échouaient silencieusement.

`BackendClient` rafraîchit désormais le jeton sur un 401 et rejoue la
requête une fois (`AuthService.RefreshAsync`).

### 7. `state` OAuth non vérifié

Le `state` était transmis et renvoyé, mais jamais comparé à celui émis :
une page ouverte au même moment pouvait appeler le port local du jeu et
lui faire accepter le code d'un autre compte.

`LoopbackListener` le vérifie et ignore toute réponse non concordante.

### 8. Écritures perdues en cas de coupure réseau

`SaveDeck()` et `ReportMatchAsync()` loggeaient un avertissement puis
abandonnaient : une coupure de quelques secondes suffisait à perdre un deck
ou le résultat d'un match, alors que l'interface avait confirmé l'opération.

`PersistentWriteQueue` sérialise désormais les écritures en attente dans les
`PlayerPrefs`, avec l'uid du propriétaire en garde. `WriteRetryService` les
rejoue toutes les 15 s et n'efface une entrée qu'après un envoi réussi — donc
elles survivent à la fermeture du jeu. Un bandeau en bas d'écran indique
combien d'écritures attendent.

### 9. Limites de débit absentes hors `/api/stats`

`/api/decks`, `/api/profile` et `/api/profile/setup` acceptaient un nombre
illimité d'appels. `lib/rate-limit.ts` tient un compteur par uid et par
minute dans `users/{uid}/limits/{bucket}` — une sous-collection, pour ne pas
réécrire le document de profil à chaque appel.

Une panne du compteur laisse passer la requête : mieux vaut une facture un
peu plus salée qu'un joueur bloqué.

### 10. Croissance illimitée de `matches`

Un document par partie, jamais supprimé : à 1000 parties par jour, 365 000
documents par an. Sans impact sur les performances (les accès se font par
identifiant), mais le stockage se facture.

Chaque document porte maintenant un champ `expiresAt` à J+30, sur lequel
s'appuie une règle TTL Firestore. Les deux déclarations ont largement eu le
temps d'être recoupées d'ici là.

**La règle se crée en console, une seule fois** — le champ seul ne supprime
rien :

1. Console Firebase → **Firestore Database** → onglet **TTL**
2. **Créer une politique**
3. Groupe de collections : `matches`
4. Champ d'horodatage : `expiresAt`

La suppression se fait dans les 24 h suivant la date, sans compter comme
opération facturée. Les documents antérieurs à ce changement n'ont pas de
champ `expiresAt` et ne seront donc jamais purgés : ils sont peu nombreux et
peuvent rester.

---

## Ce qui reste, par urgence

### Moyenne

**Pas de pagination sur les decks.** `GET /api/decks` renvoie tout. Plafonné
à 50 decks par joueur, donc sans danger immédiat, mais la réponse grossit
linéairement.

**Le compteur quotidien est réinitialisé paresseusement.** `matchesToday`
est remis à zéro à la première requête d'un nouveau jour. Simple et sans
tâche planifiée, mais la remise à zéro consomme une écriture supplémentaire
ce jour-là.

### Faible

**Pas de monitoring.** Aucune alerte si le taux d'erreur grimpe ou si les
coûts s'envolent. Les logs Vercel existent mais personne ne les regarde.

**Pas de tests.** Aucun test sur les routes API. Une régression sur la
logique de gains passerait inaperçue.

**Firestore en région unique.** La latence pour un joueur hors Europe ou
Amérique du Nord sera sensible. Sans importance avant une audience
internationale.

---

## Ce qui ne passera pas à l'échelle sans refonte

**L'absence de serveur de jeu autoritaire.** L'architecture Distributed
Authority signifie qu'aucune machine n'arbitre la partie. La double
déclaration bloque la triche solitaire, mais **deux comptes complices
peuvent toujours déclarer des résultats cohérents et fictifs**. La limite
de débit plafonne le gain, elle ne l'empêche pas.

C'est acceptable aujourd'hui. Ça ne le sera plus avec une boutique, un
classement public ou des récompenses ayant une valeur réelle. Le passage à
un serveur autoritaire est un changement d'architecture majeur, à décider
avant d'avoir une base de joueurs, pas après.

**Le matchmaking par `QuerySessionsAsync`.** Le jeu liste les sessions avec
une place libre et rejoint la première. Sans critère de niveau ni de
latence, et avec un coût qui croît avec le nombre de sessions ouvertes. À
quelques centaines de joueurs simultanés, il faudra un vrai service de
matchmaking.

---

## Coûts estimés

Hypothèse : 500 joueurs actifs, 5 parties par jour chacun.

| Poste | Volume / jour | Coût mensuel estimé |
|---|---|---|
| Lectures | ~25 000 | Dans le quota gratuit |
| Écritures | ~12 500 | Dans le quota gratuit |
| Stockage | < 1 Go | Gratuit |

Le palier gratuit Firestore (50 000 lectures et 20 000 écritures par jour)
couvre cette charge. Le dépassement arrive vers 1000 à 1500 joueurs actifs,
pour un coût qui reste de l'ordre de quelques euros par mois.

Vercel Hobby suffit tant que le trafic reste modeste, mais **son usage
commercial n'est pas autorisé** : le passage à Pro (20 $/mois) sera
nécessaire dès qu'il y aura une boutique.
