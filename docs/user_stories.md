# User Story-k (Sprint 2) — React + Firebase MVP

> Kontextus: A Sprint 2 MVP-szelet célja: **bejelentkezett felhasználóként új karakter létrehozása és Firestore-ba mentése**, majd a karakter megjelenítése a saját listában (`users/{uid}/characters`). :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}

---

## US-01 – Üres karakterlista megjelenítése

**Mint** bejelentkezett felhasználó  
**azt szeretném**, hogy lássam, ha még nincs egyetlen karakterem sem  
**azért**, hogy tudjam, mit kell tennem első lépésként.

### AC-k
- **AC1:** Üres lista esetén megjelenik az üzenet: **„Nincs még karakter”**.
- **AC2:** Látható a CTA: **„Hozz létre egy új karaktert”**.
- **AC3:** A lista kizárólag a felhasználó saját adataiból épül (`users/{uid}/characters`). :contentReference[oaicite:2]{index=2}

---

## US-02 – Karakter létrehozó oldal megnyitása

**Mint** bejelentkezett felhasználó  
**azt szeretném**, hogy megnyithassam az új karakter létrehozó oldalát  
**azért**, hogy elkezdhessem a karakter kitöltését.

### AC-k
- **AC1:** A CTA-ra kattintva az alkalmazás a **`/create-character`** oldalra navigál. :contentReference[oaicite:3]{index=3}
- **AC2:** A karakter űrlap / wizard alap megjelenik (minimál kötelező mezőkkel).
- **AC3:** Ha a felhasználó nincs bejelentkezve, a rendszer **auth guard** miatt loginra irányít (vagy tiltja a hozzáférést). :contentReference[oaicite:4]{index=4}

---

## US-03 – Érvényes karakter létrehozása és mentése Firestore-ba

**Mint** bejelentkezett felhasználó  
**azt szeretném**, hogy egy új karaktert hozhassak létre és elmenthessem  
**azért**, hogy elkezdhessem az Anima játékbeli szereplőm felépítését.

### AC-k
- **AC1:** Kötelező mezők kitöltése után a frontend **Firestore mentést** végez a `users/{uid}/characters` kollekcióba. :contentReference[oaicite:5]{index=5} :contentReference[oaicite:6]{index=6}
- **AC2:** A mentés payloadja érvényes JSON, minimum mezőkkel (pl. `name`, opcionális `archetype`, `level`) és timestamp mezőkkel (`createdAt`/`updatedAt`). :contentReference[oaicite:7]{index=7}
- **AC3:** Mentés után az új karakter megjelenik a listában (pl. `onSnapshot` alapú frissítéssel vagy újratöltéssel). :contentReference[oaicite:8]{index=8}

---

## US-04 – Hibakezelés érvénytelen bevitel esetén

**Mint** bejelentkezett felhasználó  
**azt szeretném**, hogy a rendszer figyelmeztessen a hiányzó adatokra  
**azért**, hogy helyesen tudjam kitölteni az űrlapot.

### AC-k
- **AC1:** Üres „name” mező esetén piros hibaüzenet jelenik meg: **„A név megadása kötelező”**. :contentReference[oaicite:9]{index=9}
- **AC2:** Érvénytelen űrlap esetén **nem történik Firestore mentés** (nincs `addDoc`). :contentReference[oaicite:10]{index=10}
- **AC3:** Mentési hiba (pl. permission / rules) esetén a rendszer felhasználóbarát hibaüzenetet ad (pl. „A mentés nem sikerült, próbáld újra”). *(MVP-szintű hiba UX)*

---

## US-05 – Létrehozott karakter visszajelzése és visszanavigálás

**Mint** bejelentkezett felhasználó  
**azt szeretném**, hogy sikeres mentés után visszakerüljek a listára  
**azért**, hogy azonnal lássam a létrehozott karakteremet.

### AC-k
- **AC1:** Sikeres mentés után az alkalmazás a karakterlistára navigál (pl. `/dashboard`). :contentReference[oaicite:11]{index=11}
- **AC2:** Az új karakter **azonnal látható** a listában (timestamp szerinti rendezéssel előre kerülhet). :contentReference[oaicite:12]{index=12}
- **AC3:** A listában legalább az alap meta megjelenik (pl. `name`, opcionális `archetype`, `level`, `updatedAt`). :contentReference[oaicite:13]{index=13}
