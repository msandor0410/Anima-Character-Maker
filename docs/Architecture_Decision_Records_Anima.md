# Architecture Decision Records (ADR) — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Státusz:** Draft (Sprint 2 baseline)  
**Célközönség:** fejlesztők, architekt, konzulens/bírálók  

---

## 0. Mi az ADR és hogyan használjuk ebben a projektben?

Az **Architecture Decision Record (ADR)** egy rövid, verziózható döntésnapló bejegyzés, amely rögzíti:

- a döntési helyzetet (**Context / Problem**),
- a választott megoldást (**Decision**),
- a hatásokat (**Consequences**),
- és a mérlegelt alternatívákat (**Alternatives**).

### 0.1 Konvenciók

- Azonosító: `ADR-###` (pl. `ADR-001`)
- Státusz: `Proposed | Accepted | Deprecated | Superseded`
- Minden ADR önállóan olvasható, mégis hivatkozhat más doksikra (SAD/SDD/Req/Threat model).

### 0.2 Elhelyezés (javasolt repo-struktúra)

> Ha külön fájlokba bontod később, ez a szerkezet ajánlott.

- `docs/adr/README.md` — ADR index (ez a dokumentum)
- `docs/adr/ADR-001-firebase-baas.md`
- `docs/adr/ADR-002-no-backend-mvp.md`
- stb.

Ebben a leadható csomagban a könnyebb kezelhetőség miatt **egyben, egy fájlban** szerepel az összes ADR.

---

## 1. ADR index

| ADR | Cím | Státusz | Dátum |
|---:|---|---|---|
| ADR-001 | SPA + Firebase (BaaS) architektúra választása az MVP-hez | Accepted | 2026-01-29 |
| ADR-002 | Dedicated backend elhagyása (MVP: client-only + BaaS) | Accepted | 2026-01-29 |
| ADR-003 | Per-user Firestore adatmodell: `users/{uid}/characters` | Accepted | 2026-01-29 |
| ADR-004 | Domain/szabálylogika a frontenden (`characterCalc.ts`) | Accepted | 2026-01-29 |
| ADR-005 | Firebase Emulator Suite használata lokális fejlesztésben/tesztekben | Accepted | 2026-01-29 |
| ADR-006 | IaC stratégia: Terraform **plan-only** a CI-ben (Sprint 2) | Accepted | 2026-01-29 |
| ADR-007 | Firestore Security Rules: ownership elv + referencia adatok read-only | Accepted | 2026-01-29 |
| ADR-008 | API-spec megközelítés: “Client ↔ Firebase interactions” (nem REST) | Accepted | 2026-01-29 |

---

## ADR-001 — SPA + Firebase (BaaS) architektúra választása az MVP-hez

**Státusz:** Accepted  
**Dátum:** 2026-01-29  

### Context / Problem
A szakdolgozati MVP célja, hogy **gyorsan publikálható**, minimális üzemeltetési overhead-del működő webalkalmazás készüljön, amely interneten keresztül demonstrálható. A fejlesztési idő korlátos (Sprint 2 MVP szelet), a fókusz a felhasználói flow-n van: auth + karakter mentés + karakter lista.

### Decision
Az MVP architektúra:  
- **React + TypeScript + Vite SPA** (kliensoldali alkalmazás)  
- **Firebase Auth** (azonosítás)  
- **Cloud Firestore** (perzisztencia)  
- **Firebase Hosting** (static hosting)  

### Consequences
**Pozitív:**
- Gyors deploy / alacsony ops overhead (nincs szerver üzemeltetés).
- Beépített auth + adatbázis, gyors iteráció.
- Egységes ökoszisztéma (hosting + auth + db).

**Negatív / kockázat:**
- Vendor lock-in (Firebase).
- Firestore rules és security hardening kritikus (publikus deploy előtt kötelező).

### Alternatives considered
- Saját backend (Node/Express, Laravel, Spring) + SQL DB: nagyobb ops és időigény.
- Serverless backend (Cloud Functions) már MVP-ben: plusz komplexitás.
- Más BaaS (Supabase, Appwrite): migrációs költség és eltérő toolchain.

---

## ADR-002 — Dedicated backend elhagyása (MVP: client-only + BaaS)

**Státusz:** Accepted  
**Dátum:** 2026-01-29  

### Context / Problem
A vertikális szelet demonstrációjához nincs üzleti igény komplex szerveroldali logikára. A Firestore és Auth képes lefedni az MVP szükségleteit (CRUD + auth guard).

### Decision
**Nem épül dedikált backend** az MVP-ben.  
A későbbi bővítési opció: Cloud Functions / saját API akkor, ha:
- komplex riportok, aggregációk,
- admin workflow,
- vagy szabálymotor szerveroldali validáció szükséges.

### Consequences
- A kliens nagyobb felelősséget visz (validáció + domain logika).
- Biztonság a rules-on és kliens fegyelmen múlik → rules hardening + emulator tesztek kötelezők.

### Alternatives considered
- Minimál backend csak “save/load”-ra: fölöslegesen növeli a scope-ot Sprint 2-ben.

---

## ADR-003 — Per-user Firestore adatmodell: `users/{uid}/characters`

**Státusz:** Accepted  
**Dátum:** 2026-01-29  

### Context / Problem
A rendszer fő adatobjektuma a karakter. Az MVP-ben a fő security követelmény: **felhasználó csak saját karaktereit érje el**.

### Decision
A karakterek per-user útvonalon tárolódnak:  
- `users/{uid}/characters/{characterId}`

Referencia/master adatok külön, read-only kollekciókban:  
- `config/*`, `races/*`, `classes/*`

### Consequences
- Egyszerű ownership szabály: `request.auth.uid == uid`
- Listázás egyszerű (Dashboard: `users/{uid}/characters`)
- Később “public share” / “party view” funkcióhoz új modell kellhet (ACL, share token, stb.)

### Alternatives considered
- Globális `characters` kollekció `ownerId` mezővel: működőképes, de a rules bonyolultabb és hibakockázatosabb.

---

## ADR-004 — Domain/szabálylogika a frontenden (`characterCalc.ts`)

**Státusz:** Accepted  
**Dátum:** 2026-01-29  

### Context / Problem
A karakter értékei részben deriváltak (statok, bónuszok, limit-ek), és gyors UI visszajelzés kell. MVP-ben nincs backend, ezért a számításoknak kliensoldalon kell futniuk.

### Decision
A szabály/számítás logika központi fájlban él: `src/characterCalc.ts` (vagy modulokba bontva).  
A UI komponensek ezt tisztán hívják (pure functions), így unit tesztelhető.

### Consequences
- Jó tesztelhetőség (Vitest unit tesztek).
- A validáció/szabályok kliensekben vannak → később szerveroldali validáció szükséges lehet, ha csalás/inkonzisztencia kritikus.

### Alternatives considered
- Szabálymotor backendben: MVP scope-on túl.

---

## ADR-005 — Firebase Emulator Suite használata lokális fejlesztésben/tesztekben

**Státusz:** Accepted  
**Dátum:** 2026-01-29  

### Context / Problem
Determinista tesztek és biztonsági szabályok validálása production projekt kockázata nélkül.

### Decision
Lokális fejlesztésben opcionálisan használjuk:
- Auth emulator
- Firestore emulator

Kapcsoló (példa): `VITE_USE_EMULATORS=true` (`.env.local`), és `firebase.ts`-ben conditional wiring.

### Consequences
- Tesztek stabilabbak, gyorsabb feedback.
- Javát igényelhet (emulator), de ez fejlesztői gépen tipikusan adott.

### Alternatives considered
- Csak live Firebase projekten futtatni mindent: lassabb, kockázatosabb, nehezebb reprodukálni.

---

## ADR-006 — IaC stratégia: Terraform **plan-only** a CI-ben (Sprint 2)

**Státusz:** Accepted  
**Dátum:** 2026-01-29  

### Context / Problem
A Sprint 2 követelmény a CI/IaC “kompatibilitás”, de nem cél automatikus production apply.

### Decision
CI-ben fut:
- `terraform fmt`
- `terraform validate`
- `terraform plan`  
**Apply nincs** (manual vagy külön környezetben történne).

### Consequences
- Biztonságos: nem módosít éles erőforrást.
- Bizonyítja az IaC minőségét és reprodukálhatóságát.

### Alternatives considered
- Auto-apply: túl nagy kockázat és nem követelmény Sprint 2-ben.

---

## ADR-007 — Firestore Security Rules: ownership elv + referencia adatok read-only

**Státusz:** Accepted  
**Dátum:** 2026-01-29  

### Context / Problem
A repo-ban található `firestore.rules` lehet permisszív template (időkorlátos “nyitott” szabályok). Publikus hosting mellett ez elfogadhatatlan.

### Decision
Minimum cél-szabályok (MVP):
- `users/{uid}/characters/{doc}`: read/write csak ha `request.auth.uid == uid`
- `config/*`, `races/*`, `classes/*`: read = true, write = false (vagy admin-only)

A szabályokat emulatorral tesztelni kell (pozitív/negatív esetek).

### Consequences
- Jelentősen csökken az adatszivárgás és jogosulatlan módosítás kockázata.
- Admin funkciókhoz később szerepkör modell kell (custom claims).

### Alternatives considered
- Nyitott szabályok “mert MVP”: publikusan nem vállalható.

---

## ADR-008 — API-spec megközelítés: “Client ↔ Firebase interactions” (nem REST)

**Státusz:** Accepted  
**Dátum:** 2026-01-29  

### Context / Problem
A rendszer nem rendelkezik REST/GraphQL backenddel. Mégis kell egy “API Spec” dokumentum az interfészekről.

### Decision
Az API Spec a Firebase SDK műveleteket dokumentálja:
- Auth műveletek: signUp/signIn/signOut/password reset/verify email (ha van)
- Firestore műveletek: create/read/update/delete/listen a megadott path-okon
- Adatmodellek: a Firestore doc struktúrák JSON-szerűen

Formátum: Markdown (később PDF-be exportálható).

### Consequences
- “API” itt a kliens-oldali integrációs szerződés.
- Könnyen összevethető a Security Rules-szal és az SDD-vel.

### Alternatives considered
- OpenAPI/Swagger: nincs klasszikus HTTP API, így mesterséges lenne (de későbbi backend esetén bevezethető).

---

## Kapcsolódó dokumentumok

- SAD — Software Architecture Document
- SDD — System Design Document
- Database Design Document (Firestore logical model)
- API Specification (Firebase interactions)
- Security Documentation (rules + threat model + mitigációk)
- Testing Documentation (emulator tesztek + E2E)

