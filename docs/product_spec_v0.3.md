# Product Spec v0.3 (React + Firebase MVP)

## Cél
A Sprint 2 célja egy teljes, függőleges MVP-szelet leszállítása az **Anima Character Builder** rendszerhez:  
**„Új karakter létrehozása bejelentkezett felhasználóként, Firestore-ba mentéssel.”** :contentReference[oaicite:0]{index=0}

Ez a szelet bizonyítja, hogy a felhasználó:
- képes bejelentkezni,
- elindítani egy új karakter létrehozását (wizard / űrlap),
- a karaktert elmenteni a **Cloud Firestore**-ba,
- és a mentett karakter megjelenik a saját karakterlistájában (`users/{uid}/characters`). :contentReference[oaicite:1]{index=1}

Az MVP értéke: a rendszer rendelkezik egy működő alappillérrel (Auth + CRUD + UI flow), amire későbbi rule-engine és karakterlap funkciók építhetők.

---

## Scope (In/Out)

### In Scope (Sprint 2)
- **Login / Auth guard**: bejelentkezett felhasználó szükséges a karakterkezeléshez :contentReference[oaicite:2]{index=2}  
- **Dashboard / karakterlista**: a user saját karakterei listázása `users/{uid}/characters` alatt   
- **„Új karakter” flow**:
  - `/create-character` (vagy hasonló) route/oldal
  - működő React űrlap / wizard alap
  - kötelező mezők validációja és felhasználói visszajelzés
- **Mentés Firestore-ba**:
  - `addDoc(collection(db, "users", uid, "characters"), payload)`
  - `updatedAt`/`createdAt` timestamp mezők
- **Referencia adatok betöltése** Firestore-ból (minimum): pl. `config/*`, `races/*`, `classes/*`   
- **Smoke / CI ellenőrzések**:
  - `lint` / `typecheck` / `build` sikeressége
  - Terraform **plan-only** (`validate` + `plan`) :contentReference[oaicite:5]{index=5}  
  - opcionális: Firebase Emulator Suite alap CRUD smoke (create/list) :contentReference[oaicite:6]{index=6}
- **User Storyk + AC-k + legalább 2 automatizált Gherkin teszt**

### Out of Scope
- Karakter módosítás (edit)
- Karakter törlés
- Haladó jogosultsági rendszer (admin UI)
- Production hardening (rate limit, audit log, stb.)
- Teljes ruleset lefedés (csak minimál menthető karakter állapot)
- Performance / terhelés tesztek
- Komplex export (PDF / share link) – későbbi sprint

---

## User Story térkép
- **US-01:** Üres karakterlista megjelenítése a bejelentkezett felhasználónak
- **US-02:** „Új karakter” oldal megnyitása
- **US-03:** Érvényes karakter mentése → Firestore-ban létrejön új dokumentum
- **US-04:** Érvénytelen űrlap beküldése → hibaüzenet, nincs mentés
- **US-05:** Sikeres mentés után visszanavigálás és a karakter megjelenik a listában

---

## NFR-ek (mérhetők)
- **NFR-1:** UI interakciók első renderje dev-preview környezetben reszponzív (nincs “fagyás” tipikus használatnál)
- **NFR-2:** CI futás sikerarány ≥ 95% (lint + typecheck + build + terraform validate/plan)
- **NFR-3:** Firestore mentés után az új elem **< 2s** alatt megjelenik a listában (onSnapshot esetén)
- **NFR-4:** Minimál teszt lefedettség (ha mértek): ≥ 60% line coverage (frontenden)
- **NFR-5:** `terraform validate` és `terraform plan` hiba nélkül lefut :contentReference[oaicite:7]{index=7}

---

## Fő AC-k (Given–When–Then)

### AC-01 — Üres állapot
Given a felhasználó be van jelentkezve  
And nincs még karaktere a `users/{uid}/characters` alatt  
When betölt a Dashboard / karakterlista  
Then megjelenik: „Nincs még karakter”  
And látható a CTA: „Hozz létre egy új karaktert”

### AC-02 — Karakter létrehozó oldal megnyitása
Given az üres lista látható  
When a felhasználó rákattint a „Új karakter” gombra  
Then az alkalmazás a `/create-character` oldalra navigál  
And megjelenik a karakter űrlap / wizard

### AC-03 — Érvényes karakter létrehozása és mentése Firestore-ba
Given a felhasználó a `/create-character` oldalon van  
When minden kötelező mezőt helyesen kitölt  
And rákattint a „Mentés” gombra  
Then a frontend létrehoz egy új dokumentumot a `users/{uid}/characters` kollekcióban  
And a dokumentum tartalmaz érvényes JSON payloadot (minimál mezők + timestamp)  
And az alkalmazás visszanavigál a karakterlistára  
And az új karakter megjelenik a listában

### AC-04 — Érvénytelen bevitel
Given a felhasználó üresen hagyja a „name” mezőt  
When rákattint a „Mentés” gombra  
Then a rendszer piros hibaüzenetet jelenít meg: „A név megadása kötelező”  
And nem történik Firestore `addDoc` művelet

---

## Komponens áttekintés

### Frontend
- React 18 + TypeScript + Vite :contentReference[oaicite:8]{index=8}  
- Routing: `react-router-dom`
- Route-ok (minimál):
  - `/login` (vagy beágyazott login komponens)
  - `/dashboard`
  - `/create-character`
- Firestore műveletek:
  - Listázás: `query(collection(db,"users",uid,"characters"), orderBy("updatedAt","desc"), limit(N))`
  - Mentés: `addDoc(collection(db,"users",uid,"characters"), payload)`
- Dev preview: `npm run dev` → `http://localhost:5173` :contentReference[oaicite:9]{index=9}

### Backend
- **Nincs külön dedikált backend az MVP-ben** (Firebase a backend-szolgáltatás: Auth + Firestore). :contentReference[oaicite:10]{index=10}  
- Opcionális később: Cloud Functions “server-authoritative” validációhoz.

### Adattárolás
- Cloud Firestore :contentReference[oaicite:11]{index=11}  
- Per-user karakterek: `users/{uid}/characters/{characterId}`  
- Referencia adatok: `config/*`, `races/*`, `classes/*` (read-only jelleggel)

---

## Kockázatok & Mitigációk

| Kockázat | Mitigáció |
|---------|-----------|
| Firestore security rules hibás → más user adatai olvashatók | Rules: user ownership elv (`request.auth.uid == uid`) + teszt az emulatorral |
| Firestore query korlátok (orderBy/where index) | MVP-ben egyszerű listázás (orderBy + limit), szükséges indexeket később felvenni |
| Validáció csak kliensen → manipulálható payload | MVP-ben elfogadható; később Cloud Functions validáció (server-authoritative) |
| Reference data változik → régi karakterek “eltörnek” | Snapshot mezők a karakter doksiban vagy ruleset verziózás (későbbi sprint) |

---

## Definition of Done (DoD)

- Minden meghatározott AC teljesül
- Min. 2 automatizált AC teszt (Gherkin)
- Legalább 5 sikeres manuális teszt végrehajtva
- (Ha mértek) ≥ 60% tesztlefedettség
- Terraform: `fmt` + `validate` + `plan` OK :contentReference[oaicite:12]{index=12}
- CI minden lépése zöld
- PR létrehozva képernyőképekkel és rövid összefoglalóval
