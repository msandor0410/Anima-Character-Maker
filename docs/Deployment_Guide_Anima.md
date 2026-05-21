# 7) Deployment Guide — *Anima Character Builder* (Firebase Hosting)

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Közönség:** DevOps, Ops, fejlesztők  
**Formátum:** Markdown

---

## 1. Cél és scope

Ez a guide leírja, hogyan telepítjük az MVP-t **Firebase Hosting**-ra, és hogyan deploy-oljuk a kapcsolódó Firebase erőforrásokat (Firestore rules/indexek).  
**Sprint 2-ben nincs Terraform apply** (plan-only), ezért a tényleges provision/deploy Firebase CLI-vel történik.

---

## 2. Deployment modell (MVP)

### 2.1 Mit deploy-olunk?

1) **Frontend build** (React + Vite) → `dist/`  
2) **Firebase Hosting** → statikus fájlok + SPA rewrite  
3) *(opcionális, ha változott)* **Firestore rules**  
4) *(opcionális, ha változott)* **Firestore indexes**  

### 2.2 Mit NEM deploy-olunk?

- nincs dedikált backend (Cloud Functions nincs az MVP-ben)
- Terraform: csak `fmt/validate/plan` (apply nélkül)

---

## 3. Előfeltételek

### 3.1 Eszközök

- Node.js (LTS ajánlott)
- npm (vagy pnpm/yarn, de a repo npm scriptet használ)
- Firebase CLI (`firebase-tools`)

Telepítés:
```bash
npm i -g firebase-tools
firebase --version
```

### 3.2 Hozzáférések

- Firebase projekt hozzáférés (Console + Hosting/Firestore jogosultság)
- Firebase CLI login:
```bash
firebase login
```

### 3.3 Repo konfiguráció

Ellenőrizd:
- `.firebaserc` → `default = "anima-builder"`
- `firebase.json` → `hosting.public = "dist"` + SPA rewrite

---

## 4. Környezeti konfiguráció (env)

A Vite a `VITE_*` változókat build-time beégeti.

### 4.1 Szükséges változók

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` *(ha van)*
- `VITE_USE_EMULATORS` *(lokális/teszt környezetben)*

### 4.2 Ajánlott kezelés

- Lokálisan: `.env` (ne commitáld, ha érzékeny fájlokat is tartalmaz)
- CI-ben: pipeline secret / variable formában
- A Firebase web config nem klasszikus titok, de ne logold ki feleslegesen.

---

## 5. Standard deploy folyamat (prod)

### 5.1 Build (clean)

```bash
npm ci
npm run build
```

Ellenőrzés:
- `dist/` létrejött
- a build nem dob typecheck/lint hibát (ha a script része)

### 5.2 Firebase projekt kiválasztása

```bash
firebase use anima-builder
# vagy ha alias nincs:
# firebase use <projectId>
```

### 5.3 Hosting deploy

```bash
firebase deploy --only hosting
```

**Eredmény:**
- új release a Hostingon
- SPA route-ok működnek a rewrite miatt

---

## 6. Firestore deploy (rules/indexek) — ha érintett

> Erősen ajánlott, hogy a jelenlegi „open template” rules helyett a projekt minimum ownership rules-ra átálljon, mielőtt publikus.

### 6.1 Rules deploy

```bash
firebase deploy --only firestore:rules
```

### 6.2 Indexek deploy

```bash
firebase deploy --only firestore:indexes
```

---

## 7. Release workflow javaslat (operáció)

### 7.1 Release lépések (checklist)

1. `main` branch tiszta, build zöld
2. `npm ci && npm run build`
3. (ha változott) `firebase deploy --only firestore:rules`
4. (ha változott) `firebase deploy --only firestore:indexes`
5. `firebase deploy --only hosting`
6. Smoke check prod URL-en:
   - `/login` betölt
   - login után `/dashboard` működik
   - új karakter mentés (minimális) működik

### 7.2 Rollback (Hosting)

Firebase Hosting támogat **release history**-t (Console-ból).  
Rollback lépés:
- Firebase Console → Hosting → Release history → “Rollback”

CLI alternatíva (ha használod a release ID-kat):
- Console gyorsabb MVP-nél.

---

## 8. Lokális „deploy-szerű” validáció

### 8.1 Hosting emuláció (preview)

```bash
npm run build
firebase emulators:start --only hosting
```

### 8.2 Teljes lokális stack (Auth + Firestore + Hosting)

Ha a repo támogatja:
```bash
firebase emulators:start --only auth,firestore,hosting
```

A frontend a `VITE_USE_EMULATORS=true` kapcsolóval a lokális szolgáltatásokat éri el.

---

## 9. Troubleshooting

### 9.1 „404 on refresh” / route nem működik

**Tünet:** `/dashboard` refresh után 404.  
**Ok:** hiányzik a SPA rewrite.

**Fix:** `firebase.json`-ban legyen:
```json
"rewrites": [{ "source": "**", "destination": "/index.html" }]
```

Deployold újra:
```bash
firebase deploy --only hosting
```

### 9.2 Firestore „Missing or insufficient permissions”

**Tünet:** listázás/mentés permission denied.  
**Ok:** Firestore rules túl szigorú (vagy auth nincs).

**Teendő:**
- ellenőrizd, hogy be van-e jelentkezve a user
- ellenőrizd a rules logikát (`request.auth.uid == uid`)
- teszteld emulatorral (gyorsabb iteráció)

### 9.3 „Value for argument documentPath must point to a document”

**Tünet:** export script `users/{uid}/characters` útvonalra futtatva hibázik.  
**Ok:** ez kollekció útvonal (páratlan komponens). A script dokumentum export.

**Fix:**
- dokumentumot adj meg (pl. `config/skills`)
- kollekció exporthoz külön script kell

### 9.4 Google login nem működik

**Okok:**
- Google provider nincs engedélyezve Firebase Console-ban
- Authorized domain nincs hozzáadva (ha saját domain)

---

## 10. Biztonsági minimum a deploy előtt

Mielőtt publikusra teszed:

- Firestore rules ne legyen “open template” jellegű
- User scoped collection ownership legyen bekapcsolva
- Master data csak read-only

*(A részletes szabályokat a #20 Security Documentation tartalmazza.)*

---
