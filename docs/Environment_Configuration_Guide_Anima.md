# 8) Environment Configuration Guide — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Közönség:** fejlesztők  
**Formátum:** Markdown

---

## 1. Cél

Ez a dokumentum összefoglalja a projekt **környezeti konfigurációját**:

- lokális fejlesztés (Vite)
- lokális teszt (Firebase Emulator Suite)
- “prod” (Firebase Hosting)
- szükséges `VITE_*` env változók
- tipikus futtatási parancsok és hibák

---

## 2. Környezetek áttekintése

| Környezet | Cél | Frontend futtatás | Backend szolgáltatások | Konfiguráció |
|---|---|---|---|---|
| **Local Dev** | gyors fejlesztés | `npm run dev` (Vite) | Firebase **prod** (alap) vagy emulator (opcionális) | `.env` |
| **Local Test (Emulator)** | determinisztikus tesztek | Vite + e2e runner | Auth + Firestore emulator | `VITE_USE_EMULATORS=true` |
| **CI** | build/test pipeline | headless futtatás | emulator (tesztekhez), terraform plan-only | CI variables |
| **Prod** | publikus használat | Firebase Hosting | Firebase Auth + Firestore (prod) | Hosting build-time env |

> Megjegyzés: mivel SPA + Firebase BaaS a stack, a “környezetek” főleg **env flag + Firebase project** alapján különülnek el.

---

## 3. Vite env változók (kötelezők)

A Vite csak a `VITE_` prefixszel kezdődő változókat teszi elérhetővé a kliensben.

### 3.1 Firebase web app config

Ezeket a Firebase Console → Project settings → “Your apps” részéből veszed:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` *(ha van)*

### 3.2 Emulator kapcsoló (ajánlott)

- `VITE_USE_EMULATORS=true|false`

**Elv:**
- `true` → `connectAuthEmulator`, `connectFirestoreEmulator` (lokális)
- `false` → prod Firebase szolgáltatások

---

## 4. `.env` fájlok és minta

### 4.1 Javasolt fájlszerkezet

- `.env.local` → lokális fejlesztői értékek (gitignore)
- `.env.test` → teszt futtatáshoz (gitignore, vagy CI-ben variables)
- `.env.production` → prod build-hez (általában CI variables; ne legyen publikus repo-ban)

### 4.2 Példa `.env.local`

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
VITE_FIREBASE_PROJECT_ID=anima-builder
VITE_FIREBASE_STORAGE_BUCKET=...appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

VITE_USE_EMULATORS=false
```

### 4.3 Példa `.env.test` (emulator)

```env
VITE_USE_EMULATORS=true
```

> A teszt környezetben a web app config maradhat ugyanaz, mert emulator mellett a service endpointok úgyis lokálisra vannak átirányítva.

---

## 5. Firebase Emulator konfiguráció

### 5.1 Alap host/portok (projekt konvenció)

- Auth emulator: `127.0.0.1:9099`
- Firestore emulator: `127.0.0.1:8080`

### 5.2 Indítás (tipikus)

```bash
firebase emulators:start --only auth,firestore
```

Ha Hosting preview is kell:
```bash
firebase emulators:start --only auth,firestore,hosting
```

### 5.3 Frontend oldalán (firebase init)

A `firebase.ts`-ben tipikusan így néz ki:

```ts
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
```

---

## 6. Parancsok környezetenként

### 6.1 Local Dev (prod Firebase-re mutatva)

```bash
npm install
npm run dev
```

### 6.2 Local Test (Emulator)

1) emulátor indítás:
```bash
firebase emulators:start --only auth,firestore
```

2) app / teszt futtatás:
```bash
VITE_USE_EMULATORS=true npm run test:smoke
# vagy
npm run test:e2e:all
```

### 6.3 Prod build

```bash
npm ci
npm run build
```

Deploy:
```bash
firebase deploy --only hosting
```

---

## 7. Konfigurációk: mi “secret” és mi nem?

### 7.1 Firebase web app config

- `apiKey` stb. **nem klasszikus titok** (frontendben amúgy is benne van)
- ettől függetlenül:
  - ne logold ki
  - rendezetten kezeld `.env`-ben / CI variables-ben

### 7.2 Service account JSON (Admin SDK)

Ha a `scripts/` használja a Firebase Admin SDK-t:

- **secret** (privát kulcs)
- **nem kerülhet public repo-ba**
- CI-ben: secret fileként injektáld
- lokálisan: `GOOGLE_APPLICATION_CREDENTIALS=/abs/path/key.json`

---

## 8. Környezetfüggő viselkedések

### 8.1 Auth persistence (Remember me)

A login wrapper a persistenciát állíthatja:

- session: böngésző bezárásig
- local: újraindítás után is bejelentkezve marad

Ez **nem env**, de config/UX aspektus.

### 8.2 Logging / debug

Ajánlott:
- dev: verbose log
- prod: minimal log + user-friendly error

---

## 9. Gyakori hibák és gyors diagnózis

### 9.1 „Failed to connect to emulator” / „ECONNREFUSED”

- `VITE_USE_EMULATORS=true`, de az emulator nincs elindítva
- **Fix:** indítsd az emulátort, vagy kapcsold ki a flag-et.

### 9.2 „Missing or insufficient permissions”

- Firestore rules (prod) túl szigorú / auth hiányzik
- Emulatorban lehet, hogy más rules fut
- **Fix:** ellenőrizd `auth.currentUser`, rules, és teszteld emulatorral.

### 9.3 „VITE_* undefined”

- a `.env` nincs betöltve vagy rossz prefix
- **Fix:** csak `VITE_` prefix működik; restart Vite dev server.

### 9.4 „Google login popup blocked”

- böngésző popup blocker
- Firebase Console-ban Google provider nincs engedélyezve
- **Fix:** engedélyezés + user instrukció.

---

## 10. Ajánlott minimál baseline (MVP)

- `.env.local` fejlesztőknek
- `VITE_USE_EMULATORS` kapcsoló dokumentálva
- emulátor portok fixek
- CI-ben ugyanaz a konfiguráció reprodukálható (variables + emulator)

---
