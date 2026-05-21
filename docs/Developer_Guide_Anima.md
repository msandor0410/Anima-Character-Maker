# Developer Guide — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Célközönség:** Fejlesztők, konzulens/bírálók  

---

## 1. Cél és olvasói útmutató

Ez a dokumentum fejlesztőknek és értékelőknek szól, és a következőket biztosítja:

- a projekt **lokális futtatása** (Vite dev server)
- **Firebase Auth + Firestore** integráció fejlesztői módja (emulator opció)
- **kódstruktúra** és fő modulok áttekintése
- **tesztfuttatás** (unit / smoke / e2e) alapok
- **deploy** és környezeti beállítások hivatkozása (külön dokumentumokban részletezve)
- **hibakeresés**: tipikus problémák + megoldások

---

## 2. Előfeltételek

### 2.1 Kötelező

- **Node.js** (LTS ajánlott)
- **npm**
- Git

### 2.2 Opcionális (ajánlott)

- **Firebase CLI** (emulator és deploy miatt)
- **Terraform CLI** (ha az IaC mappát is validálni/plan-elni szeretnéd)

---

## 3. Projektstruktúra (magas szint)

A repository fő elemei (MVP fókusz szerint):

- `src/` — React + TypeScript alkalmazás forráskód
- `scripts/` — seed/export és egyéb utility scriptek
- `tests/` / `e2e/` — automatizált tesztek (elnevezés a repo szerint)
- `infra/` (vagy hasonló) — Terraform plan-only infrastruktúra
- `docs/adr/` — ADR-ek (architektúra döntések indoklása)

> Megjegyzés: a pontos elérési utak a zip-ben található tényleges struktúrához igazodnak; a dokumentáció célja, hogy a logikai részeket „hol találsz mit” szinten biztosan lefedje.

---

## 4. Lokális futtatás

### 4.1 Telepítés

```bash
npm install
```

### 4.2 Fejlesztői szerver indítása (Vite)

```bash
npm run dev
```

Alapértelmezett URL: `http://localhost:5173`

### 4.3 Build (produkciós csomagolás)

```bash
npm run build
```

### 4.4 Preview (build ellenőrzése)

```bash
npm run preview
```

---

## 5. Firebase integráció fejlesztői módban

### 5.1 Firebase projektek és környezetek

A projekt Firebase-re épül:
- **Firebase Hosting**: statikus front-end host
- **Firebase Authentication**: login/logout
- **Cloud Firestore**: per-user karakter adatok + referencia adatok

A környezeti konfiguráció részletei az **Environment Configuration Guide (#8)** dokumentumban találhatók.

### 5.2 Emulator (opcionális, de értékeléshez erősen ajánlott)

**Miért jó?**
- determinisztikus tesztkörnyezet (auth + firestore)
- security rules validálás
- CI-ban is futtatható smoke/e2e

Tipikusan:
```bash
firebase emulators:start
```

> Ha a projekt külön `npm` scriptet ad az emulator indítására (pl. `npm run emu`), akkor azt használd — a pontos script neve a repo `package.json`-jából olvasható.

### 5.3 Emulator vs production switch (kódszinten)

A repo-ban jellemzően van:
- `firebase.ts` (init + connectEmulator)
- környezeti flag (`VITE_USE_EMULATOR` vagy hasonló)

Elv: **fejlesztéshez/testhez emulator**, deploy-hoz éles Firebase projekt.

---

## 6. Kód-architektúra (részletezés fejlesztői nézőpontból)

### 6.1 UI oldalak / route-ok

MVP-ben kritikus oldalak:

- **Login / Register**: Firebase Auth hívások
- **Dashboard**: karakterek listázása `users/{uid}/characters`
- **Character Creator**: kliensoldali validáció + `addDoc`

### 6.2 Integrációs réteg

- `authService.ts`: `signIn`, `signUp`, `signOut`, esetleg email verification
- `firebase.ts`: Firebase init, Auth/Firestore instance, emulator kapcsolás

### 6.3 Domain logika

- `characterCalc.ts`: számított mezők, derived statok, segédfüggvények
- elv: **a szabálymotor később bővíthető**, MVP-ben a menthető állapot az első

---

## 7. Adatkezelés (Firestore) fejlesztői elvek

### 7.1 Per-user adatok

- **útvonal:** `users/{uid}/characters/{characterId}`
- javasolt mezők:
  - `name`, `archetype`, `level`
  - `createdAt`, `updatedAt`

### 7.2 Referencia / master adatok

- `config/*`, `races/*`, `classes/*`

> A Firestore logikai modell részletezve a **Database Design Document (#3)** dokumentumban.

---

## 8. Tesztelés (fejlesztői futtatás)

A repo-ban tipikusan több szint van:

- **Unit**: gyors, izolált (pl. `characterCalc`)
- **Smoke**: minimális integráció (Firestore emulator + alap CRUD)
- **E2E**: user flow (Login → Create → Save → List), gyakran Cucumber/Gherkin

Általános futtatás (ha standard scriptek vannak):
```bash
npm test
npm run test:unit
npm run test:smoke
npm run test:e2e
```

> A pontos parancsok a `package.json` scripts szekciójában vannak; a részletes tesztstratégia és bizonyítékok a **Testing Documentation (#19)** dokumentumban.

---

## 9. Minőségi kapuk (Quality Gates) — értékelőknek is

A Sprint 2 „átmegy” kritériumhoz erősen ajánlott minimum:

- `npm run lint` hibamentes
- `npm run build` hibamentes
- legalább 2 automatizált e2e teszt zöld (emulatorral)
- Terraform: `fmt` + `validate` + `plan` zöld (plan-only)

---

## 10. Hibakeresési gyorslista

### 10.1 „Missing env var” / Firebase config hiba

- Ellenőrizd a `.env` / `.env.local` fájlokat és a `VITE_` prefixeket.
- Győződj meg róla, hogy a Vite valóban betölti a változókat (újraindítás kellhet).

### 10.2 Firestore permission denied

- Security rules: nyitott template vs ownership rules ütközés.
- Emulatorban ellenőrizd a `request.auth.uid` viselkedést.

### 10.3 Emulator nem indul / port ütközés

- futó process/port foglalás (Auth/Firestore/Hosting emu portok)
- `firebase.json` port beállítások ellenőrzése

### 10.4 E2E flakey / random hiba

- seed legyen determinisztikus
- várakozások (explicit wait) minimalizálása, inkább state-re várás
- emulator reset / clean state futtatás tesztek előtt

---

## 11. Contributing (fejlesztési workflow)

Javasolt minimál fejlesztési folyamat:

1. `main`/`master` stabil
2. feature branch név: `feature/<topic>` vagy `fix/<issue>`
3. PR/MR leírás tartalmazza:
   - mit változtat
   - hogyan tesztelted (parancsok)
   - ha érint: Firestore rules / data model / UI flow

---

## 12. Kapcsolódó dokumentumok

- **SAD (#1)** — architektúra + C4
- **SDD (#2)** — komponens-szintű design
- **Database Design (#3)** — Firestore modell, indexek
- **API Spec (#4)** — Firebase-központú „API surface”
- **Infrastructure Doc (#5)** — Terraform plan-only, erőforrások
- **Deployment Guide (#7)** — deploy lépések
- **Environment Configuration (#8)** — env változók, projektek
- **Testing Documentation (#19)** — tesztstratégia + evidenciák
- **Security Documentation (#20)** — rules, threat model, mitigációk
