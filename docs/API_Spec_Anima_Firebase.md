# 4) API Specification — *Anima Character Builder* (Firebase SDK + Firestore Data API)

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Közönség:** fejlesztők  
**Formátum javaslat:** **Markdown** (elsődleges) + opcionálisan **PDF export** (bírálóknak)

---

## 1. Mit jelent itt az „API”?

Az MVP-ben **nincs külön HTTP backend**, így a “rendszer API-ja” két részből áll:

1) **Firebase Authentication API** (külső szolgáltatás, JS SDK-n keresztül)  
2) **Cloud Firestore Data API** (adatműveletek Firestore SDK-n keresztül, jól definiált path-okkal és dokumentum-sémákkal)

Ezt a specifikációt ezért **SDK-szintű** (client-side) API-ként dokumentáljuk.

> **Szabványos formátum (klasszikus REST API esetén):** OpenAPI 3.1 (YAML/JSON).  
> **Ebben a projektben (backend nélkül):** a leghasznosabb és reális deliverable egy **Markdown API spec**.  
> Később, ha lesz Cloud Functions / REST gateway, akkor ebből egy OpenAPI specifikáció könnyen levezethető.

---

## 2. Terminológia és konvenciók

- `uid`: Firebase Auth user azonosító (`auth.currentUser.uid`)
- **User scoped path**: `users/{uid}/...` (ownership alap)
- **Timestamp mezők**: Firestore `serverTimestamp()` ajánlott
- **Doc verziózás**: `version: number` mező a dokumentumokban

---

## 3. Külső API: Firebase Authentication (Auth)

### 3.1 AuthService wrapper (projekt-specifikus)

A projektben az Auth SDK hívásai az `src/authService.ts` fájlban vannak becsomagolva.

#### 3.1.1 `loginWithEmail`

**Signature (TS):**
```ts
loginWithEmail(email: string, password: string, rememberMe?: boolean): Promise<UserCredential>
```

**Leírás:**
- Email+jelszó bejelentkezés.
- `rememberMe=true` → `browserLocalPersistence`
- `rememberMe=false` → `browserSessionPersistence`

**Példa:**
```ts
await loginWithEmail("user@example.com", "secret", true);
```

---

#### 3.1.2 `registerWithEmail`

**Signature (TS):**
```ts
registerWithEmail(email: string, password: string, rememberMe?: boolean): Promise<UserCredential>
```

**Leírás:**
- Email+jelszó regisztráció.
- Persistencia megegyezik a `loginWithEmail`-lel.

---

#### 3.1.3 `loginWithGoogle`

**Signature (TS):**
```ts
loginWithGoogle(rememberMe?: boolean): Promise<UserCredential>
```

**Leírás:**
- Google popup login `signInWithPopup` + `GoogleAuthProvider`.

---

#### 3.1.4 `logout`

**Signature (TS):**
```ts
logout(): Promise<void>
```

**Leírás:** `signOut(auth)`.

---

### 3.2 Auth state (guard és session)

**Minta:** `onAuthStateChanged(auth, callback)`

- Ha `user=null` → protected route redirect `/login`
- Ha `user!=null` → `/dashboard` elérhető

---

### 3.3 Auth hibák (gyakori)

- `auth/invalid-email`
- `auth/user-not-found`
- `auth/wrong-password`
- `auth/email-already-in-use`
- `auth/popup-closed-by-user`

**Kezelés MVP-ben:** UI alert + konzol log; később toast és normalizált error mapping.

---

## 4. Külső API: Cloud Firestore (Data API)

### 4.1 Gyűjtemények és útvonalak

#### 4.1.1 Master / referencia adatok (read-only cél)

- `classes/{classId}`
- `races/{raceId}`
- `config/{configId}`  
  Tipikus `configId`: `skills`, `levelrules`, `baselife`, `movement`, `fatigue`, `advantages`, `disadvantages`

#### 4.1.2 User scoped adatok (MVP core)

- `users/{uid}/characters/{characterId}`

---

### 4.2 Data contracts (fő erőforrások)

> A részletes sémát a **3) Database Design Document** tartalmazza; itt a legfontosabb API-szempontú mezők vannak.

#### 4.2.1 Character document (minimum elvárt mezők)

```ts
type CharacterDoc = {
  version: number;
  name: string;

  level: number;
  classId: string;
  className: string;
  archetype: string;
  raceId: string | null;

  xp: number;

  rulesSnapshot: {
    class: any;              // normalizált ClassDef snapshot
    race: any | null;        // opcionális RaceDef snapshot
    levelrulesRef: "config/levelrules";
    skillsRef: "config/skills";
    baseLifeRef: "config/baselife";
  };

  primary: Record<string, number>;
  secondary: { skillBase: Record<string, number> };

  combat: {
    attack: { base: number; spent: number };
    block: { base: number; spent: number };
    dodge: { base: number; spent: number };
    wearArmor: { base: number; spent: number };
    lifePoints: { multiples: number };
  };

  dp: {
    total: number;
    usedPrimary: number;
    usedSecondary: number;
    used: number;
    remaining: number;
  };

  creationPoints: {
    baseTotal: number;
    earnedCap: number;
    earnedRaw: number;
    earnedEffective: number;
    spentOnAdvantages: number;
    remainingTotal: number;
    baseSpent: number;
    baseRemaining: number;
    earnedSpent: number;
    earnedRemaining: number;
  };

  advantages: any[];
  disadvantages: any[];

  createdAt: any;   // Firestore Timestamp (serverTimestamp)
  updatedAt: any;   // Firestore Timestamp (serverTimestamp)
};
```

---

## 5. Erőforrás műveletek (Operations)

### 5.1 Master data műveletek

#### 5.1.1 LIST Classes

**Cél:** kasztok listázása creatorhoz.  
**SDK hívás:** `getDocs(collection(db, "classes"))`

**Példa:**
```ts
const snaps = await getDocs(collection(db, "classes"));
const classes = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
```

---

#### 5.1.2 LIST Races

**SDK hívás:** `getDocs(collection(db, "races"))`

---

#### 5.1.3 GET Config document

**SDK hívás:** `getDoc(doc(db, "config", "<configId>"))`

**Példa:**
```ts
const skills = await getDoc(doc(db, "config", "skills"));
```

---

### 5.2 Character műveletek (MVP core)

#### 5.2.1 LIST Characters (Dashboard)

**Path:** `users/{uid}/characters`  
**Query:** `orderBy(updatedAt desc) + limit(MAX_CHARACTERS)`  
**Realtime:** `onSnapshot(query(...), cb)`

**Példa:**
```ts
const q = query(
  collection(db, "users", uid, "characters"),
  orderBy("updatedAt", "desc"),
  limit(5)
);

const unsub = onSnapshot(q, (snap) => {
  const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
});
```

---

#### 5.2.2 CREATE Character (CharacterCreator)

**Path:** `users/{uid}/characters`  
**SDK:** `addDoc(collection(...), payload)`  
**Timestamp:** `createdAt`, `updatedAt` = `serverTimestamp()`

**Példa (projektben használt minta):**
```ts
const payload = {
  version: 4,
  name: name.trim(),
  level,
  classId,
  className: selectedClass.name,
  archetype: selectedClass.archetype ?? "",
  raceId: raceId || null,
  xp: baseXp,
  rulesSnapshot: {
    class: selectedClass,
    race: selectedRace ?? null,
    levelrulesRef: "config/levelrules",
    skillsRef: "config/skills",
    baseLifeRef: "config/baselife",
  },
  primary,
  secondary: { skillBase },
  combat: {
    attack: { base: 10, spent: 0 },
    block: { base: 10, spent: 0 },
    dodge: { base: 10, spent: 0 },
    wearArmor: { base: 10, spent: 0 },
    lifePoints: { multiples: 15 }
  },
  dp: { total: 0, usedPrimary: 0, usedSecondary: 0, used: 0, remaining: 0 },
  creationPoints: { /* ... */ },
  advantages: [],
  disadvantages: [],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};

const ref = await addDoc(collection(db, "users", uid, "characters"), payload);
```

**Visszatérés:**
- `ref.id` = új `characterId`

---

#### 5.2.3 READ Character (Detail / Edit / Game)

**Path:** `users/{uid}/characters/{characterId}`  
**SDK:** `getDoc(doc(...))`

---

#### 5.2.4 UPDATE Character (Edit)

**Path:** `users/{uid}/characters/{characterId}`  
**SDK:** `updateDoc(ref, { ...payload, updatedAt: serverTimestamp() })`

**Példa:**
```ts
await updateDoc(doc(db, "users", uid, "characters", id), {
  ...payload,
  updatedAt: serverTimestamp(),
});
```

---

#### 5.2.5 DELETE Character (Dashboard)

**Path:** `users/{uid}/characters/{characterId}`  
**SDK:** `deleteDoc(doc(...))`

---

## 6. Hibakezelés (Firestore)

**Tipikus hibák:**
- permission denied (rules)
- offline / network error
- not found (read)
- invalid argument (pl. rossz path)

**MVP kezelési elv:**
- `try/catch` → `alert(err.message)` + `console.error(err)`.

---

## 7. Biztonság és hozzáférés (Rules elvárás)

**Célállapot (minimum):**
- `users/{uid}/characters/{doc}`: read/write csak `request.auth.uid == uid`
- `classes/*`, `races/*`, `config/*`: read-only

**Megjegyzés:** a repo-ban lévő `firestore.rules` időkorlátos „nyitott” minta — élesben **nem maradhat** így.

---

## 8. Verziózás

- `CharacterDoc.version`: dokumentumséma verziója
- `config/* .version`: konfig verziója

**Elv:** breaking változás esetén migrációs stratégia (client upgrader vagy admin script).

---

## 9. Tooling: Export script path-szabály (hasznos operátori tudás)

A `scripts/export-firestore-doc.mjs` dokumentum exportot csinál, ezért a **documentPath**-nak páros számú komponensből kell állnia.

-  Dokumentum: `config/skills`
-  Kollekció: `users/{uid}/characters` *(páratlan komponens → nem document)*

Kollekció exporthoz külön script vagy bővítés szükséges.

---

## 10. Milyen formában add le?

- **Alapértelmezett:** `API_Spec_Anima_Firebase.md` (Markdown)
- **Ha kell PDF:** a markdownot exportáld PDF-be (pl. VS Code Markdown PDF plugin, vagy GitLab / pandoc).

> Ha szeretnéd, a következő lépésben ezt a spec-et **OpenAPI 3.1 YAML**-lá is lefordítom egy *future REST gateway* modellre (Cloud Functions), de az MVP-ben ez opcionális.

---
