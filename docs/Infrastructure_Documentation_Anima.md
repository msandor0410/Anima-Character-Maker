# 5) Infrastructure Documentation — *Anima Character Builder* (MVP)

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Közönség:** DevOps, fejlesztők  
**Formátum:** Markdown (+ kódrészletek)

---

## 1. Scope és cél

Ez a dokumentum az MVP infrastruktúra elemeit és üzemeltetési “kapcsolódási pontjait” írja le:

- **Firebase projekt** (Auth + Firestore + Hosting)
- **Hosting konfiguráció** (SPA rewrite, build artifact `dist/`)
- **Firestore rules/indexes** (jelenlegi állapot + cél)
- **Lokális fejlesztési infra** (Vite dev server, Emulator Suite a tesztekhez)
- **IaC**: Sprint 2-ben **Terraform plan-only** (kurzuskövetelmény miatt)
- **Konfigurációk / secretek** (mit hol tárolunk, mit nem commitálunk)

> Megjegyzés: Sprint 2-ben a valós Firebase erőforrások **nincsenek Terraformral provisionölve**. (Lásd ADR 0004.)

---

## 2. Infrastruktúra áttekintés (high-level)

```mermaid
flowchart LR
  U[Felhasználó böngésző] -->|HTTPS| HOST[Firebase Hosting]
  HOST --> SPA[Static SPA: React+Vite build (dist)]
  SPA --> AUTH[Firebase Authentication]
  SPA --> FS[Cloud Firestore]
```

**Stack:** React (Vite) + Firebase (Authentication + Firestore + Hosting)  
**Nincs külön backend** (később opció: Cloud Functions / API gateway).

---

## 3. Firebase projekt és erőforrások

### 3.1 Projekt azonosítók

A repo-ban a Firebase alap projekt alias:

- **`.firebaserc`**: `default = "anima-builder"`

### 3.2 Firebase Hosting

**Konfiguráció:** `firebase.json`

- `hosting.public = "dist"`
- SPA rewrite:
  - `source: "**" → destination: "/index.html"`

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

**Build artifact:**
- `npm run build` → `dist/` mappa

**Deploy (tipikus):**
```bash
firebase deploy --only hosting
```

> Hosting szolgálja ki a teljes SPA-t (route-ok kliensoldalon; ezért kell a rewrite).

---

### 3.3 Firebase Authentication

**Auth módok (MVP):**
- Email/password
- Google provider (popup)

**Infra-szempontból fontos:**
- Engedélyezett provider-ek beállítása Firebase Console-ban
- (Később) Authorized domains kezelése, ha saját domain kerül be

---

### 3.4 Cloud Firestore

#### 3.4.1 Adatmodell fő útvonalak (infra-szempontból)

- **User scoped:** `users/{uid}/characters/{characterId}`
- **Master data:** `classes/*`, `races/*`, `config/*`

#### 3.4.2 Firestore security rules (jelenlegi állapot)

A repo-ban található `firestore.rules` jelenleg **default “open template”**, időkorlátos engedéllyel:

- `allow read, write` mindenre `request.time < 2026-02-25`

**Ez élesben nem maradhat így.**  
A cél rules a **#20 Security Documentation** dokumentumban lesz részletesen, de infra szinten már itt rögzítjük az elvet:

- `users/{uid}/characters/{doc}`: read/write csak `request.auth.uid == uid`
- `classes/*`, `races/*`, `config/*`: read-only

**Rules deploy (tipikus):**
```bash
firebase deploy --only firestore:rules
```

#### 3.4.3 Firestore indexes

A repo-ban a `firestore.indexes.json` jelenleg üres (`indexes: []`).

**Indexes deploy (tipikus):**
```bash
firebase deploy --only firestore:indexes
```

MVP-ben a fő query (Dashboard listázás `orderBy(updatedAt desc)`) általában nem igényel extra kompozit indexet, de bővítéskor előjöhet.

---

## 4. Lokális fejlesztési infrastruktúra

### 4.1 Vite dev server

- `npm run dev`
- Alap URL: `http://localhost:5173`

### 4.2 Firebase Emulator Suite (Auth + Firestore)

A repo `package.json` szerint e2e futtatásban explicit módon használjuk:

- Auth emulator: `127.0.0.1:9099`
- Firestore emulator: `127.0.0.1:8080`
- Vite: `127.0.0.1:5173`

**Teljes e2e stack parancs (repo script):**
- `npm run test:e2e:all`

**Smoke test (emulator host env-ekkel):**
- `npm run test:smoke`

> Az emulator környezet célja: determinisztikus, CI-kompatibilis tesztelés.

---

## 5. Konfiguráció és secret kezelés

### 5.1 Frontend env (Vite)

A repo tartalmaz `.env` fájlt `VITE_FIREBASE_*` kulcsokkal (Firebase web app config).

**Ajánlás:**
- `.env` lokális devhez oké
- CI-ben ugyanezeket **CI secret/variable**-ként add meg
- A “Firebase Web API key” nem klasszikus titok, de kezeljük rendezett módon (ne szórjuk logokba)

### 5.2 Service Account (admin script / seed / export)

A `scripts/` alatt található egy **Firebase Admin SDK service account JSON** (pl. `...firebase-adminsdk-....json`).

**Ez érzékeny.**  
**Ajánlott szabály:**
- ne legyen public repo-ban
- CI-ben: secret fileként / secret managerből injektálva
- lokálisan: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

---

## 6. IaC (Terraform) — Sprint 2 Plan-Only

A `infra/terraform/` mappa tartalmazza a Sprint 2 IaC követelményhez szükséges plan-only konfigot.

- `terraform fmt -check`
- `terraform validate`
- `terraform plan -out=plan.out`

A `main.tf` csak “safe” provider-eket használ (`null`, `local`) és egy `local_file` artifactot tervez.

**Miért plan-only?**
- ADR 0004: `0004-iac-strategy.md`

> Fontos: Sprint 2-ben a Firebase erőforrások provisioningje NEM Terraformral történik.

---

## 7. Provisioning / Setup runbook (MVP)

### 7.1 Firebase projekt inicializálás

1. Firebase CLI login:
```bash
firebase login
```

2. Projekt kiválasztás (alias):
```bash
firebase use anima-builder
```

3. Hosting deploy (build után):
```bash
npm ci
npm run build
firebase deploy --only hosting
```

### 7.2 Firestore rules + indexes deploy (ha változik)

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 8. Operációs megfontolások

### 8.1 Költség / kvóták

- Hosting + Firestore + Auth tipikusan free tier barát MVP-hez
- Kockázat: ha rules nyitott, akkor a DB könnyen terhelhető (és adat is sérülhet)

### 8.2 Stabilitás

- SPA statikus → kevés mozgó alkatrész
- Firestore/Authentication managed service → alacsony ops overhead

---

## 9. Nyitott pontok (Sprint 2 után)

1. **Security rules hardening + tesztelés emulatorban (CI)**  
2. (Opcionális) saját domain, HTTPS config  
3. (Opcionális) Cloud Functions bevezetése (ha komplex lekérdezés / admin művelet kell)  
4. Monitoring/observability bővítés (error reporting, structured logs, analytics)

---
