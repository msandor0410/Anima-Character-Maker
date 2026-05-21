# Requirements Specification (RS) — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Célközönség:** Stakeholderek, konzulens/bírálók, fejlesztők  

---

## 1. Cél és háttér

Az **Anima Character Builder** célja egy **gyorsan publikálható, interneten azonnal használható MVP**, amely bizonyítja a rendszer alappilléreit:

- **felhasználói autentikáció (Auth)**
- **karakter létrehozás és mentés (CRUD – create/list)**
- **UI flow**, amelyre később bővíthető szabálymotor és teljes karakterlap-funkcionalitás épülhet.

A Sprint 2 vertikális szelet fókusza: **„Új karakter létrehozása bejelentkezett felhasználóként, Firestore-ba mentéssel, majd megjelenítés a saját listában (`users/{uid}/characters`).”**

---

## 2. Terjedelem (Scope)

### 2.1 In Scope (Sprint 2 / MVP)

- **Login / Auth guard** (bejelentkezés szükséges a karakterkezeléshez)
- **Dashboard / karakterlista**: a user saját karakterei listázása
- **„Új karakter” flow**: űrlap/wizard alap, kötelező mezők validációja
- **Mentés Cloud Firestore-ba**: új dokumentum létrehozása, `createdAt`/`updatedAt`
- **Referencia adatok betöltése** Firestore-ból (minimum): `config/*`, `races/*`, `classes/*`
- **Minimális tesztelhetőség / CI kompatibilitás** (lint, typecheck, build, terraform validate/plan; emulator alapú smoke opcionális)

### 2.2 Out of Scope (Sprint 2-ben nem kötelező)

- Karakter módosítás (edit)
- Karakter törlés
- Haladó jogosultsági rendszer / admin UI
- Production hardening (rate limit, audit log, stb.)
- Teljes szabályrendszer lefedés (csak minimál menthető állapot)
- Performance / terhelés tesztek
- Komplex export (PDF / share link)

---

## 3. Stakeholderek és felhasználói csoportok

- **Végfelhasználó**: bejelentkezik, karaktert létrehoz/ment, a saját listáját nézi
- **Fejlesztő**: lokális dev-preview, emulator, tesztek és CI futtathatóság
- **Konzulens / bírálók**: követelmények, döntések (ADR), AI dokumentáció és DoD ellenőrizhetősége

---

## 4. Üzleti célok és sikerkritériumok

### 4.1 Üzleti célok

- MVP publikálható legyen **Firebase Hosting**-on
- Bizonyítsa a rendszer „gerincét” (Auth + per-user adatkezelés + UI flow)
- Legyen később bővíthető (szabálymotor, teljes karakterlap, export, stb.)

### 4.2 Sikerkritériumok (Sprint 2)

- A fő user flow végigvihető: **Login → Dashboard (lista) → Create Character → Save → vissza a listára**
- A karakter dokumentum ténylegesen létrejön Firestore-ban a megfelelő útvonalon
- A mentés után a lista frissül és az új karakter látszik

---

## 5. Funkcionális követelmények (FR)

> Jelölés: **FR-xx**. A követelmények az MVP-szeletre vannak skálázva.

### FR-01 — Felhasználói autentikáció

- A rendszer támogassa a felhasználói bejelentkezést és kijelentkezést.
- A bejelentkezési állapot perzisztáljon böngésző session-ök között a Firebase Auth alapértelmezett mechanizmusa szerint.

**Elfogadási kritérium:** a bejelentkezett felhasználó láthatja a saját Dashboardját; kijelentkezés után védett oldalak nem elérhetők.

---

### FR-02 — Auth guard védett oldalakhoz

- A védett route-ok (Dashboard, Create Character) csak bejelentkezés után legyenek elérhetők.
- Nem autentikált felhasználó esetén a rendszer loginra irányít (vagy blokkolja a hozzáférést).

**Elfogadási kritérium:** nem bejelentkezett felhasználó nem tud karaktert listázni vagy menteni.

---

### FR-03 — Karakterlista betöltése (per-user)

- A Dashboard a bejelentkezett felhasználó **saját** karaktereit listázza a Firestore-ból:
  - útvonal: `users/{uid}/characters`
- A listában minimum meta jelenjen meg:
  - `name`, opcionális `archetype`, `level`, `updatedAt`

**Elfogadási kritérium:** más felhasználó karakterei nem jelenhetnek meg (ownership elv).

---

### FR-04 — Üres állapot megjelenítése

- Ha a felhasználónak nincs karaktere, a UI jelenítse meg az üres állapotot:
  - „Nincs még karakter”
  - CTA: „Hozz létre egy új karaktert”

---

### FR-05 — „Új karakter” oldal megnyitása

- A CTA a karakter létrehozó oldalra navigál:
  - javasolt route: `/create-character`
- Az oldalon megjelenik a minimális űrlap/wizard alap.

---

### FR-06 — Kötelező mezők validációja

- A rendszer kliensoldali validációt végezzen a mentés előtt.
- Minimális kötelező mező: `name`
- Hibás/hiányos adat esetén:
  - hibaüzenet jelenjen meg
  - ne történjen Firestore mentés (`addDoc` nem fut)

---

### FR-07 — Karakter mentése Firestore-ba

- Érvényes űrlap esetén új karakter dokumentum jöjjön létre:
  - `addDoc(collection(db, "users", uid, "characters"), payload)`
- Minimum elvárt mezők a dokumentumban:
  - `name` (string)
  - opcionális: `archetype` (string), `level` (number)
  - `createdAt`, `updatedAt` (timestamp)
- Sikeres mentés után:
  - visszanavigálás a karakterlistára (pl. `/dashboard`)
  - az új karakter megjelenik a listában (snapshot frissítéssel vagy új lekérdezéssel)

---

### FR-08 — Referencia adatok betöltése

- A karakterkészítő oldal (vagy kapcsolódó UI) képes legyen referencia adatok betöltésére Firestore-ból:
  - `config/*`, `races/*`, `classes/*`
- MVP-ben elegendő a minimál használat (pl. dropdown alapértékek).

---

### FR-09 — Hibakezelés mentési hiba esetén

- Firestore műveleti hiba esetén (permission, hálózat):
  - felhasználóbarát hibaüzenet jelenjen meg (MVP-szinten)
  - a felhasználó próbálkozhasson újra

---

## 6. User Story-k és elfogadási kritériumok (AC)

Az MVP-szelethez tartozó user story-k:

- **US-01:** Üres karakterlista megjelenítése
- **US-02:** „Új karakter” oldal megnyitása
- **US-03:** Érvényes karakter mentése Firestore-ba
- **US-04:** Hibakezelés érvénytelen bevitel esetén
- **US-05:** Mentés után visszanavigálás + lista frissül

A story-khez tartozó **Given–When–Then** elfogadási kritériumok részletezve a Product Spec-ben és a User Story dokumentumban kerülnek fenntartásra.

---

## 7. Nem-funkcionális követelmények (NFR)

### NFR-01 — Fejlesztői reprodukálhatóság

- A projekt lokálisan futtatható:
  - `npm install`
  - `npm run dev` (Vite dev server)
- Opcionális: Firebase Emulator Suite Auth + Firestore-hoz determinisztikus tesztekhez.

### NFR-02 — CI stabilitás

- CI lépések (minimum):
  - lint + typecheck + build
  - terraform `fmt` + `validate` + `plan` (plan-only; apply nélkül)
- Elvárt: a pipeline tipikusan zöld (instabil, flakey tesztek kerülése).

### NFR-03 — UI visszajelzés és „észlelt” teljesítmény

- Mentés után az új karakter **< 2s** alatt megjelenik a listában (snapshot alapú frissítéssel elérhető).

### NFR-04 — Minimál tesztelhetőség

- Legalább 2 automatizált Gherkin teszt az MVP AC-kre.
- Unit/smoke/e2e tesztek strukturáltan elkülönítve (lásd Testing Documentation).

---

## 8. Biztonsági és adatvédelmi követelmények

### SEC-01 — Ownership elv (per-user elhatárolás)

- A célállapot: a felhasználó csak a saját `users/{uid}/...` útvonala alatt olvashat/írhat:
  - `request.auth.uid == uid`

### SEC-02 — Referencia adatok kezelése

- A referencia (master) adatok tipikusan read-only (vagy admin-only).
- MVP-ben: read=true, write=false modell a legbiztonságosabb alap.

> Megjegyzés: a jelenlegi `firestore.rules` mintapélda jellegű/nyitott lehet; éles környezetben ez nem maradhat így. A konkrét rules blokk és threat model a **Security Documentation (#20)** része.

---

## 9. Korlátozások és feltételezések

- **Kliensoldali validáció**: MVP-ben elfogadott, később server-authoritative validáció (pl. Cloud Functions) opcionális.
- **Firebase vendor lock-in**: vállalt kompromisszum az üzemeltetési overhead minimalizálásáért.
- **Firestore query korlátok**: MVP-ben egyszerű listázás (orderBy + limit); komplex riportok későbbi sprintben.

---

## 10. Traceability (követhetőség) — minimál mátrix

| User Story | Funkcionális követelmény(ek) | Kulcs AC | Teszt (példa) |
|---|---|---|---|
| US-01 | FR-03, FR-04 | Üres állapot + CTA | e2e: dashboard empty state |
| US-02 | FR-02, FR-05 | `/create-character` elérés | e2e: navigation + guard |
| US-03 | FR-06, FR-07 | Mentés Firestore-ba + lista frissül | e2e: create+save+list |
| US-04 | FR-06, FR-09 | Validáció + nincs addDoc | unit/e2e: required name |
| US-05 | FR-07 | Visszanavigálás + azonnali megjelenés | e2e: post-save redirect |

---

## 11. Definition of Done (DoD) — Sprint 2

- Minden Sprint 2 AC teljesül
- Min. 2 automatizált Gherkin teszt lefut és zöld
- Manuális ellenőrzés: minimum 5 sikeres teszt futtatás dokumentálva
- Terraform: `fmt` + `validate` + `plan` hibamentes
- CI minden kötelező lépése zöld
- Dokumentációk frissítve: SAD, SDD, Database Design, API Spec, Requirements Spec

---

## 12. Kapcsolódó dokumentumok

- **Product Spec v0.3** (Sprint 2 scope, AC-k, NFR-ek, DoD)
- **User Story-k (Sprint 2)** (US-01…US-05 AC-k)
- **SAD / SDD** (architektúra és komponensdesign)
- **Testing Documentation** (tesztszintek, futtatás, evidenciák)
- **Security Documentation** (rules, threat model, mitigációk)
