# 20) Security Documentation — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Közönség:** fejlesztők, konzulens/bírálók, DevOps/Ops (ha releváns)  

---

## 1. Cél és hatókör

Ez a dokumentum összefoglalja az Anima Character Builder MVP (React + Firebase) biztonsági megfontolásait, a jelenlegi állapot kockázatait, és a **minimálisan elvárt** (MVP-hez elégséges) kontrollokat.

**In-scope:**
- Firebase Authentication (email/jelszó) és kliensoldali auth guard
- Firestore adat-hozzáférés (különösen: *per-user ownership*)
- Firebase Hosting (SPA kiszolgálás)
- Lokális fejlesztés és tesztelés (Firebase Emulator Suite)
- CI szintű alap ellenőrzések (lint/typecheck/build/terraform validate/plan)

**Out-of-scope (MVP-ben nem cél, de később bővíthető):**
- Saját backend / Cloud Functions hardening
- Formalizált penetrációs teszt / külső audit
- Titkosított mezőszintű (client-side) encryption minden adatra
- Role Based Access Control (admin felület)

---

## 2. Biztonsági célok (MVP)

1. **Adatszeparáció (kritikus):** felhasználó csak a saját karaktereit érheti el.
2. **Minimális támadási felület:** nincs saját backend az MVP-ben; Firebase-managed szolgáltatások.
3. **Reprodukálható biztonsági teszt:** rules tesztelhetősége emulatorral (smoke/e2e).
4. **Alap titokkezelés:** ne kerüljenek érzékeny kulcsok/jelszavak repo-ba.
5. **Üzemeltetési higiénia:** “nyitott” Firestore rules **nem maradhat élesben**.

---

## 3. Fenyegetési modell (egyszerűsített)

### 3.1 Védendő eszközök (assets)

- **Felhasználói karakter adatok**: `users/{uid}/characters/{characterId}`
- **Felhasználói fiók** (Auth): email + jelszó (Firebase kezeli)
- **Referencia adatok** (pl. `config/*`, `races/*`, `classes/*`): integritás (ne lehessen írni)
- **Build/deploy pipeline**: integritás (ne lehessen rosszindulatú buildet deployolni)

### 3.2 Tipikus támadók / fenyegetések

- **Anonim látogató**: próbál olvasni/írni Firestore-ba auth nélkül
- **Bejelentkezett user**: próbál más user adataihoz hozzáférni (*IDOR*)
- **Kliens oldali manipuláció**: payload módosítás, extra mezők injektálása
- **Supply chain**: sérülékeny NPM dependency
- **Konfigurációs hiba**: túl engedékeny rules / rossz hosting beállítás

### 3.3 Fő kockázatok (top)

| Kockázat | Hatás | Valószínűség | Priorizálás | Mitigáció |
|---|---:|---:|---:|---|
| Firestore rules “kvázi nyitott” | Adatszivárgás / jogosulatlan írás | magas | **P1** | Ownership rules, emulator teszt, release gate |
| IDOR (`uid` path) | más user karakterei elérhetők | közepes | P1 | `request.auth.uid == uid` |
| Kliens payload túl nagy / rossz | költség / hibák | közepes | P2 | validáció, limitált mezők, `request.resource.data.keys()` |
| Dependency sérülékenység | runtime exploit | alacsony-közepes | P2 | `npm audit`, lockfile, dependabot |
| XSS / CSP hiány | session token visszaélés | alacsony | P3 | default escape, CSP, sanitization |

---

## 4. AuthN / AuthZ (hitelesítés és jogosultság)

### 4.1 Hitelesítés (Firebase Authentication)

- **Email/jelszó** alapú login/registration.
- A kliens alkalmazás auth állapotot figyel (`onAuthStateChanged`) és guardol.
- A biztonsági *source of truth* a Firestore Rules: `request.auth != null`.

**MVP elv:**  
- Auth guard UI szinten kényelmi/UX funkció, **nem biztonsági kontroll**.  
- A tényleges kontroll a Firestore rules.

### 4.2 Jogosultság (Firestore Rules – ownership alapú)

**Alapelv:** user csak a saját `users/{uid}` “namespace”-ében olvashat/írhat.

- `users/{uid}/characters/{characterId}`:
  - read/write: `request.auth.uid == uid`
- `config/*`, `races/*`, `classes/*`:
  - read: `true`
  - write: `false` (vagy később admin-only)

---

## 5. Firestore Rules — minimál “passing” szabálykészlet

> **Fontos:** Ha a repo-ban jelenleg “nyitott/lejáró” template rules van, azt **release előtt cserélni kell** erre (vagy szigorúbbra).

### 5.1 Javasolt rules (MVP, ownership + readonly master data)

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    // --- User-owned data (MVP) ---
    match /users/{uid}/characters/{characterId} {
      allow read, write: if isOwner(uid);
    }

    // (Opcionális) user profil dokumentum
    match /users/{uid} {
      allow read, write: if isOwner(uid);
    }

    // --- Reference / master data (read-only) ---
    match /config/{docId} {
      allow read: if true;
      allow write: if false;
    }

    match /races/{docId} {
      allow read: if true;
      allow write: if false;
    }

    match /classes/{docId} {
      allow read: if true;
      allow write: if false;
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 5.2 (Ajánlott) mező-szintű és payload kontrollok

Ha szeretnéd szigorítani (P2), bevezethető:
- engedélyezett kulcslista (`request.resource.data.keys().hasOnly([...])`)
- típus ellenőrzés (`request.resource.data.field is string`)
- méretlimit (string length / map size) – Firestore rulesben korlátozottan

Példa (csak iránymutatás, a tényleges mezőlistát a Character schema alapján kell fixálni):

```rules
allow create: if isOwner(uid)
  && request.resource.data.keys().hasOnly([
      "name", "archetype", "level", "createdAt", "updatedAt", "sheet"
  ]);
```

---

## 6. Kliens oldali validáció és támadási felület

### 6.1 Input validáció

- Form mezők kötelező ellenőrzése (pl. név, archetype/level).
- Numerikus mezők normalizálása (`safeNumber` jelleg).
- UI oldali validáció *nem* helyettesíti a rules-t, de csökkenti a hibás adatok bekerülését.

### 6.2 XSS és content safety

- React alapértelmezetten escape-el.
- Kerüld a `dangerouslySetInnerHTML` használatát.
- Ha később Markdown/renderelt tartalom lesz (pl. Encyclopedia), használj sanitizer-t.

### 6.3 CSP / security headers

Firebase Hosting esetén javasolt biztonsági headerek:
- `Content-Security-Policy` (legalább baseline)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (minimál)

Ezek a `firebase.json` hosting headers részében adhatók meg (ha a repo-ban van ilyen, ott érdemes rögzíteni).

---

## 7. Titokkezelés és konfiguráció

### 7.1 Firebase web config

A Firebase web config (apiKey, authDomain, projectId, stb.) **nem titok**; publikus kliens config.

**Ami titok lehet és nem kerülhet gitbe:**
- szolgáltatásfiók JSON (Admin SDK)
- CI secret-ek (tokenek, deploy cred)
- bármilyen privát API kulcs külső szolgáltatáshoz

### 7.2 .env kezelés

- `/.env` fájlok: gitignore
- `/.env.example`: csak struktúra, dummy értékek
- Külön `dev` vs `prod` variánsok (ha kell), de minimalizálva.

---

## 8. Emulator-alapú security teszt (kötelező “pass” jelleggel)

**Cél:** automatikusan igazolni, hogy a rules nem enged jogosulatlan hozzáférést.

### 8.1 Minimál ellenőrzések (javasolt)

1. **Anonim olvasás tiltva** a `users/{uid}/characters` alatt
2. **Bejelentkezett user A** nem olvashat/írhat **user B** alá
3. **Tulajdonos** olvas/ír saját útvonalán

### 8.2 Példa teszt (pszeudo)

- Setup: emulator + seed
- Test:
  - authedA -> create char under users/A/characters ✅
  - authedA -> read users/B/characters ❌
  - unauth -> read users/A/characters ❌

A részletes implementáció a **Testing Documentation (#19)** része.

---

## 9. Függőségek és supply-chain

- Lockfile használat (`package-lock.json` vagy `pnpm-lock.yaml`)
- `npm audit` / `npm audit --production` időnként, CI-ben opcionális
- Dependabot / Renovate (ha engedélyezett) – főleg a szakdolgozati repo-ban jó plusz pont.

---

## 10. Logging, monitoring és incidenskezelés (MVP)

### 10.1 Logging

- Kliens oldali console log: fejlesztésben ok, productionban minimalizálni.
- Ne logolj PII-t vagy teljes karakter “sheet”-et debugként.

### 10.2 Monitoring

- Firebase Console: Auth/Firestore usage + Hosting metrics.
- Később (#21) “Monitoring & Observability Guide” fogja részletezni.

### 10.3 Incidens alap lépések (MVP checklista)

1. Firestore rules azonnali szigorítása (default deny)
2. Deploy és gyors regressziós smoke test
3. Logok/usage átnézés Firebase Console-ban
4. Érintett felhasználók értesítése (ha volt adatérintettség)

---

## 11. Compliance / adatvédelem (rövid)

- MVP-ben jellemzően nem tárol különleges személyes adatot; alap adat: email (Auth kezeli).
- Ha később felhasználói profil/adat kerül be:
  - privacy notice / adatkezelési tájékoztató (legalább egyszerű)
  - data export/delete (account deletion) terv

---

## 12. Release gate — “nem mehet ki élesbe, ha…”

**Release blokkoló:**
- Firestore rules nem ownership-elvű (nyitott / lejáró template).
- E2E smoke nem fut le emulatorral.
- Secrets bekerültek a repository-ba.

**Ajánlott (nem blokkoló, de jó):**
- CSP baseline header
- `npm audit` figyelés
- basic rate/size guard (rules vagy kliens)

---

## 13. Kapcsolódó dokumentumok

- **SAD (#1)** – architektúra + C4
- **SDD (#2)** – komponens tervek (authService, firebase.ts, page flows)
- **Database Design (#3)** – Firestore modell + index/javaslatok
- **Testing Documentation (#19)** – unit/smoke/e2e + emulator
- **Monitoring & Observability Guide (#21)** – metrikák, logok, alerting (ha kész)

---

## Appendix A — Quick “security hardening” TODO lista (MVP)

1. [P1] Firestore rules lecserélése ownership rules-ra (5.1)
2. [P1] Emulator tesztek: cross-user access tiltás
3. [P2] Read-only master data enforce
4. [P2] CSP + basic headers Firebase Hostingon
5. [P3] Dependency audit / update policy
