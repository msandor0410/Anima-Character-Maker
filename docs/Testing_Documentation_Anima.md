# 19) Testing Documentation — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Közönség:** QA, fejlesztők, konzulens/bírálók  

---

## 1. Cél és hatókör

A dokumentum célja, hogy **auditálhatóan** bemutassa, hogyan teszteljük az Anima Character Builder MVP-t, különösen a Sprint 2 vertikális szeletet:

- **Auth** (login/logout, auth guard)
- **Karakterek CRUD-ja** (létrehozás és listázás a saját user namespace alatt)
- **Számított (derived) mezők** és szabálylogika (`characterCalc.ts`)

A tesztelés elsődleges fókusza: **helyes működés + regresszió elleni védelem + reprodukálhatóság** (emulátorok, determinisztikus futtatás, CI-kompatibilis parancsok).

---

## 2. Tesztstratégia áttekintés

### 2.1 Tesztpiramis

- **Unit tesztek (Vitest)**  
  *Gyors, determinisztikus, UI-tól független.*  
  Cél: szabálylogika, segédfüggvények, számított statok.

- **Smoke tesztek (Node script + Emulator hostok)**  
  *Kis számú, gyors integrációs ellenőrzés.*  
  Cél: Firestore / Auth emulátor elérhetőség + minimál CRUD folyamat (különösen a `users/{uid}/characters` namespace).

- **E2E tesztek (Cucumber + Playwright + Firebase emulátorok + seed)**  
  *Végponttól végpontig validáció.*  
  Cél: valódi UI flow-k (login → dashboard → create → list).

### 2.2 „Definition of Done” (teszt szempontból, Sprint 2)

Egy Sprint 2-hez tartozó story akkor tekinthető késznek, ha:

- a vonatkozó **unit** tesztek átmennek,
- a kritikus flow lefedett **e2e**-vel (legalább 1 end-to-end scenario),
- a futtatás **emulátorokkal reprodukálható**,
- a CI pipeline-ban a „test stage” futtatható (headless, interaktív input nélkül).

---

## 3. Eszközök és keretrendszerek

A repository alapján használt eszközök és parancsok:

- **Vitest**: unit tesztek  
- **Cucumber-JS**: BDD e2e tesztek (feature + step definitions)  
- **Playwright (chromium)**: böngésző automatizálás e2e-hez  
- **Firebase Emulator Suite**: Auth + Firestore emuláció  
- **firebase-admin**: e2e seed/cleanup (emulátor ellen)  
- **concurrently + wait-on**: e2e „all-in-one” futtatás  
- **cross-env**: környezeti változók platformfüggetlen kezelése

---

## 4. Futtatási módok (parancsok)

A `package.json` alapján:

### 4.1 Unit

```bash
npm run test:unit
```

> Megjegyzés: a repo scriptje `vitest --config vitest.config.ts`-t hív.  
> A `tessek.zip` tartalmában **nem található** `vitest.config.ts` fájl.  
> Megoldás: (a) add hozzá a configot, vagy (b) módosítsd a scriptet sima `vitest`-re.

### 4.2 Smoke

```bash
npm run test:smoke
```

Ez a script emulátor host változókat állít be és Node-ból futtat egy smoke tesztet.

> Megjegyzés: a `tests/smoke/firestore-smoke.mjs` fájl a zip-ben jelen van, viszont a tartalma jelenleg **nem egyértelműen smoke** (inkább unit-jellegű).  
> A Smoke teszt tartalmi elvárását a 6. fejezet rögzíti.

### 4.3 E2E (csak a Cucumber futtatás)

```bash
npm run test:e2e
```

A Cucumber futtatja a `tests/e2e/**/*.js` step-eket.

### 4.4 E2E „minden egyben” (emulátor + Vite + seed + e2e)

```bash
npm run test:e2e:all
```

Ez a script a következőket végzi:

1. `firebase emulators:start --only auth,firestore --project demo-anima`
2. `vite --host 127.0.0.1 --port 5173 --strictPort` (emulátor mód: `VITE_USE_EMULATORS=true`)
3. `wait-on` → megvárja az emulátor portokat + a Vite URL-t
4. `node tests/e2e/seed.mjs` → seedeli az e2e usert / adatokat
5. `npm run test:e2e` → lefuttatja a Cucumber scenario-kat

---

## 5. Környezet és konfiguráció

### 5.1 Emulátor hostok

Az e2e hook-ok alapján (defaults):

- `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
- `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`
- `FIREBASE_PROJECT_ID=demo-anima`

### 5.2 SPA (Vite) környezeti változók e2e-hez

A `test:e2e:all` script dummy Firebase értékeket állít be a Vite build-hez, pl.:

- `VITE_FIREBASE_PROJECT_ID=demo-anima`
- `VITE_USE_EMULATORS=true`
- további `VITE_FIREBASE_*` kulcsok „dummy” értékkel

Cél: az SPA inicializálása működjön, miközben a tényleges szolgáltatásokat az emulátor adja.

---

## 6. Tesztcsomagok részletezése

### 6.1 Unit tesztek (Vitest)

**Helyük:** `tests/unit/*`  
**Fókusz:** `characterCalc.ts` és tiszta függvények.

**Példa célok:**
- stat bonus számítások helyessége
- derived értékek (LP, fatigue, initiative, resistances) helyessége
- edge case-ek (null/undefined inputok, safeNumber)

**Minimális elvárás:**
- minden kritikus számító függvényhez legalább 1 pozitív és 1 határeset teszt
- determinisztikus futás, I/O nélkül

### 6.2 Smoke tesztek (Emulator + minimál CRUD)

**Helyük:** `tests/smoke/*`  
**Cél:** gyorsan megfogni azokat a hibákat, amikor
- nem fut az emulátor,
- rossz projekt id / host,
- a „per-user” adatútvonal hibás,
- az alap write/read megszakad.

**Elvárt smoke ellenőrzések (MVP):**
1. kapcsolódás Firestore emulátorhoz
2. írás `users/{uid}/characters` alá egy minimal payload-dal
3. visszaolvasás (get/query)
4. takarítás (delete) vagy „test namespace” használat

> A smoke nem e2e: nincs böngésző, nincs UI, nincs hosszú futás.

**Ajánlott minimal payload (MVP):**
- `name`, `archetype`, `level`, `createdAt`, `updatedAt`, `ownerUid` (opcionális)

### 6.3 E2E (Cucumber + Playwright + seed)

**Helyük:**
- Feature-k: `tests/e2e/features/*`
- Step-ek: `tests/e2e/steps/*`
- Support: `tests/e2e/support/*`
- Seed: `tests/e2e/seed.mjs`

**E2E cél (Sprint 2):**
- Auth guard működik
- Login sikeres (emulátor userrel)
- Dashboard megjeleníti a felhasználó karaktereit
- Új karakter létrehozható és menthető
- A létrehozott karakter azonnal látszik listában

**Környezeti paraméterek (world.js):**
- `E2E_BASE_URL` (default: `http://127.0.0.1:5173`)
- `E2E_EMAIL` (default: `e2e@example.com`)
- `E2E_PASSWORD` (default: `Password123!`)

**Adatkezelés e2e-ben:**
- hook-ban (firebase-admin) töröljük a user karaktereit a futás előtt/után
- seed script létrehozza az e2e usert és a minimális fixture adatokat

---

## 7. Tesztadat-stratégia

### 7.1 Alapelv

- Unit: inline fixture-ek (kicsik, átláthatók, determinisztikusak)
- Smoke: minimal payload + saját test namespace
- E2E: **seedelt user** + tiszta adatbázis a scenario-k előtt

### 7.2 „Ownership” elv (biztonsághoz kapcsolódás)

Az adatútvonal `users/{uid}/characters` eleve „ownership” szemantikát hordoz, és a security rules célja is erre épít.  
E2E-ben és smoke-ban a teszteknek **explicit** a saját uid alatti írást kell validálniuk.

---

## 8. CI ajánlás (minimál)

Ha van CI (GitLab / GitHub Actions), ajánlott lépések:

1. `npm ci`
2. `npm run lint` (ha van)
3. `npm run build` (tsc + vite build)
4. `npm run test:unit`
5. opcionális: `npm run test:e2e:all` (headless futtatással)

> Megjegyzés: e2e CI-ben „flaky” lehet, ezért a Sprint 2-ben elfogadható, ha csak manuális pipeline jobként fut (de a parancs reprodukálható).

---

## 9. Eredmények és riportálás

- Unit: vitest standard output (opcionálisan junit report később)
- E2E: cucumber konzol output (később html report exportálható)
- Hibák: issue-ben (lépések, expected/actual, log, screenshot ha UI)

---

## 10. Ismert hiányosságok / TODO-k

1. **`vitest.config.ts` hiányzik** a zip-ből → a `test:unit` script jelen formában hibára fut.  
2. **Smoke script tartalma tisztázandó** → a jelenlegi `tests/smoke/firestore-smoke.mjs` nem egyértelműen integrációs smoke.  
3. **Security rules tesztelése** (emulátor + rules-unit-test) külön dokumentumba kerül (#20), de erősen ajánlott.

---

## 11. Appendix

### 11.1 Minimál `vitest.config.ts` (ha szükséges)

> Tedd a projekt gyökerébe `vitest.config.ts` néven, vagy módosítsd a `package.json` scriptet.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
  },
});
```

### 11.2 Smoke teszt váz (irányelv)

```js
// tests/smoke/firestore-smoke.mjs (váz)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID || "demo-anima";
const app = initializeApp({ projectId, apiKey: "dummy" });
const db = getFirestore(app);

const uid = "smoke-user";
const colRef = collection(db, "users", uid, "characters");

const created = await addDoc(colRef, { name: "SmokeChar", level: 1 });
const snap = await getDocs(colRef);

if (snap.empty) throw new Error("Smoke failed: no docs in collection");

await deleteDoc(doc(db, "users", uid, "characters", created.id));
console.log("Smoke OK");
```

---

**Kapcsolódó dokumentumok:** SAD (#1), SDD (#2), Security Documentation (#20), Developer Guide (#17).
