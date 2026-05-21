# 25) Fogalomtár és terminológia — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 baseline)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Célközönség:** minden érintett (fejlesztők, architekt, konzulens/bírálók, tesztelők)  

---

## 1. Cél és használat

Ez a fogalomtár egységesíti a projektben használt kifejezéseket, rövidítéseket és domain-fogalmakat, hogy a dokumentáció (SAD/SDD, követelmények, tesztek, AI-dokuk) **következetes** és **félreérthetetlen** legyen.

- A definíciók **MVP (Sprint 2)** scope-ra vannak optimalizálva.
- Ha később bővül a rendszer (pl. Cloud Functions backend), a fogalomtárat frissíteni kell.

---

## 2. Rövidítések (A–Z)

| Rövidítés | Jelentés | Definíció / Kontextus |
|---|---|---|
| ABF | *Anima Beyond Fantasy* | A karakteralkotó cél-rendszere (szabályrendszer). |
| ADR | Architecture Decision Record | Architektúra/döntési napló: miért és mikor döntöttünk így. |
| API | Application Programming Interface | Itt: kliens (SPA) ↔ Firebase szolgáltatások hívásai (SDK-n keresztül). |
| Auth | Authentication | Felhasználó azonosítás (Firebase Auth: email/jelszó). |
| BaaS | Backend as a Service | A backend feladatokat a Firebase adja (Auth + Firestore + Hosting). |
| CI | Continuous Integration | Automatikus ellenőrzések: lint, typecheck, build, tesztek, terraform validate/plan. |
| CRUD | Create/Read/Update/Delete | Adatkezelési műveletek Firestore dokumentumokra. |
| C4 | C4 Model | Kontextus–Konténer–Komponens–Kód szintű architektúra modellezés. |
| DoD | Definition of Done | Elkészült definíció: kész a feature, tesztelt, dokumentált, build zöld. |
| DoR | Definition of Ready | Elkezdés feltétele: tisztázott scope, AC-k, dependenciák. |
| E2E | End-to-End | Felhasználói folyamatot lefedő teszt (UI/flow), tipikusan emulatorral. |
| IaC | Infrastructure as Code | Infrastrukturális erőforrások kódból (Terraform). |
| MVP | Minimum Viable Product | Sprint 2 cél: login + új karakter mentés + saját lista megjelenítés. |
| RBAC | Role-Based Access Control | Szerepkör-alapú jogosultság (MVP-ben minimális / jövőbeni opció). |
| SAD | Software Architecture Document | Architektúra áttekintés (C4, döntések, quality attribútumok). |
| SDD | System Design Document | Részletes komponens- és moduldesign, adatfolyamok, hibakezelés. |
| SDK | Software Development Kit | Firebase Web SDK: kliensoldali integráció Auth/Firestore-hoz. |
| SPA | Single Page Application | React alapú kliensapp, route-olással (nincs hagyományos szerver oldali render). |
| STRIDE | Threat model keretrendszer | Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege. |
| TS | TypeScript | Statikusan típusos JavaScript, a React app nyelve. |
| UID | User ID | Firebase Auth által adott egyedi felhasználó-azonosító (`request.auth.uid`). |
| Vite | Build tool | Fejlesztői szerver + bundler a React/TS projekthez. |

---

## 3. Firebase / infrastruktúra fogalmak

| Fogalom | Definíció | Projektbeli használat |
|---|---|---|
| Firebase Hosting | Statikus hosting | SPA build (`dist/`) kiszolgálása interneten. |
| Firebase Authentication | Felhasználó azonosítás | Email/jelszó regisztráció, belépés, kijelentkezés. |
| Cloud Firestore | NoSQL dokumentum adatbázis | Per-user karaktertárolás + referencia adatok (config/races/classes). |
| Firebase Emulator Suite | Lokális Firebase szimuláció | Determinisztikus fejlesztés és teszt (Auth + Firestore). |
| `firebase.json` | Firebase projekt config | Hosting rewrite-ok, emulator beállítások (portok, szolgáltatások). |
| `firestore.rules` | Biztonsági szabályok | **Kritikus**: ownership szabályok (csak saját `uid` útvonal). |
| Firestore index | Lekérdezés gyorsítása | Kompozit index szükséges lehet többfeltételes query esetén. |
| `serverTimestamp()` | Szerver oldali időbélyeg | `createdAt/updatedAt` mezők konzisztens tárolásához. |

---

## 4. Firestore adatmodell fogalmak

| Fogalom | Definíció | Példa (MVP) |
|---|---|---|
| Collection (kollekció) | Dokumentumok halmaza | `users`, `config`, `races`, `classes` |
| Document (dokumentum) | JSON-szerű objektum, mezőkkel | `users/{uid}` vagy `users/{uid}/characters/{characterId}` |
| Subcollection (alkollekció) | Dokumentum alatti kollekció | `users/{uid}/characters` |
| Document ID | Egyedi azonosító | Firestore által generált `characterId` (`addDoc`) |
| Ownership path | Tulajdonosi útvonal | `users/{uid}/...` — itt ellenőrzünk `request.auth.uid == uid` |
| Denormalizáció | Adatredundancia olvasási egyszerűségért | Karakter dokumentumban tárolt „snapshot” mezők (pl. név, class, level). |
| Query | Lekérdezés feltételekkel | `where("updatedAt", "desc")`, `limit(20)`, stb. |
| Realtime listener | Valós idejű frissítés | `onSnapshot(...)` a dashboard listához. |

---

## 5. UI és alkalmazás-szintű fogalmak (projekt-specifikus)

| Fogalom | Definíció | Kapcsolódó modul/oldal |
|---|---|---|
| Dashboard | A felhasználó saját karakterlistája | `DashboardPage` |
| Character Creator | Új karakter létrehozása | `CharacterCreatorPage` + `characterCalc.ts` |
| Character Detail / Edit | Karakter megtekintés / módosítás | `CharacterDetail` / `Edit` (ha a repo-ban már létezik) |
| Reference data (master data) | Ritkán változó, közös adat | `config/*`, `races/*`, `classes/*` |
| Derived stat / számított érték | Bemeneti mezőkből számolt stat | `characterCalc.ts` (pl. LP, fatigue, initiative). |
| Validation (validáció) | Kötelező mezők, típus- és tartományellenőrzés | UI form kezelés mentés előtt. |
| Auth guard | Route védelem | Bejelentkezés nélkül nincs dashboard/creator elérés. |
| Draft karakter | Részben kitöltött, még nem véglegesített adat | Opcionális (ha van autosave / későbbi bővítés). |

---

## 6. Követelmények, tesztelés, minőség fogalmak

| Fogalom | Definíció | Projektbeli használat |
|---|---|---|
| User story | Felhasználói igény “As a … I want … so that …” | Requirements Spec / backlog |
| Acceptance Criteria (AC) | Elfogadási feltételek | Sprint 2 vertikális szelet: mentés + lista + auth guard |
| Smoke test | Alap működés ellenőrzés | Emulatorral: auth + egyszerű Firestore write/read |
| Unit test | Izolált függvények tesztje | `characterCalc.ts` számítások |
| Integration test | Modulok együttműködése | UI ↔ Firestore (emulator) minimál flow |
| Test data seeding | Tesztadatok betöltése | E2E futtatások determinisztikussá tétele |
| Non-functional requirement | Minőségi követelmény | Reprodukálhatóság, CI stabilitás, security rules |
| Technical debt | Tudatosan halasztott fejlesztés | Pl. permissive rules → hardening (prior 1) |

---

## 7. Biztonsági fogalmak (MVP fókusz)

| Fogalom | Definíció | Projektbeli használat |
|---|---|---|
| Least privilege | Minimális jogosultság elve | Firestore rules: csak ami kell (own path). |
| Security rules | Firestore hozzáférés-vezérlés | `request.auth.uid == uid` ownership ellenőrzés. |
| Public data | Mindenki által olvasható adat | `config/races/classes` jellemzően read-only. |
| Sensitive data | Védendő adat | Felhasználóhoz kötött karakterek, metaadatok. |
| Threat model | Fenyegetési modell | STRIDE-alapú áttekintés a Security Documentation-ban. |
| DoS | Szolgáltatásmegtagadás | Realtime listener / index hiány / költségtámadás kockázat. |
| Auditability | Visszakövethetőség | Dokumentáció + AI log + ADR-ek + commit history. |

---

## 8. AI-asszisztált fejlesztés fogalmak

| Fogalom | Definíció | Projektbeli használat |
|---|---|---|
| Prompt | AI felé intézett kérés/utasítás | AI Development Log-ban rögzítve |
| AI-assisted change | AI által javasolt módosítás | Kódban PR/commit formában review-olva |
| Human validation | Emberi ellenőrzés | Futás, tesztek, statikus analízis, kódreview |
| Traceability | Visszakövethetőség | Prompt → output → commit/issue → teszt bizonyíték |
| Hallucination risk | Hibás/valótlan javaslat kockázata | Kritikus részeknél (security, deployment) kötelező ellenőrzés |

---

## 9. Konvenciók (névhasználat)

A dokumentációban az alábbi konvenciókat használjuk:

- **Útvonalak**: `code` formában (pl. `users/{uid}/characters/{characterId}`)
- **Fájlnevek**: `code` formában (pl. `firestore.rules`, `firebase.json`)
- **Szolgáltatások**: nagy kezdőbetűvel (Firebase Auth, Cloud Firestore, Firebase Hosting)
- **Sprint hivatkozás**: “Sprint 2 MVP” mint baseline

---

## 10. Változásnapló (rövid)

- **v0.1 (2026-01-29):** első verzió, Sprint 2 MVP terminológia rögzítése.
