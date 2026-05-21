# User Documentation — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Célközönség:** végfelhasználók  

---

## 1. Mi ez az alkalmazás?

Az **Anima Character Builder** egy böngészőből használható karakterkészítő, amelynek célja, hogy **gyorsan és egyszerűen** létrehozz és kezelj Anima karaktereket:

- bejelentkezés / regisztráció
- saját karakterek listázása (Dashboard)
- új karakter létrehozása, mentése
- karakter megtekintése, szerkesztése
- „Game” nézet (játékközbeni használatra)
- Encyclopedia (races/classes/advantage/disadvantage referencia)

> Megjegyzés: ez egy MVP (minimálisan életképes verzió), amely később bővíthető.

---

## 2. Rendszerkövetelmények

- Modern böngésző: **Chrome / Edge / Firefox / Safari** friss verzió
- Stabil internetkapcsolat
- Ajánlott: asztali/laptop kijelző (mobilon is működhet, de a nagy űrlapok kényelmetlenebbek)

---

## 3. Első lépések: regisztráció és bejelentkezés

### 3.1 Regisztráció

1. Nyisd meg az alkalmazást a böngészőben.
2. Válaszd a **Register** oldalt.
3. Add meg az e-mail címed és jelszavad.
4. Sikeres regisztráció után lépj be.

### 3.2 Bejelentkezés

1. Válaszd a **Login** oldalt.
2. Add meg az e-mail címed és jelszavad.
3. Bejelentkezés után automatikusan a **Dashboard** oldalra kerülsz.

### 3.3 Kijelentkezés

- A fejlécben/menüben található **Logout** gombbal bármikor kijelentkezhetsz.

---

## 4. Navigáció röviden

A fő oldalak:

- **Dashboard** – a saját karaktereid listája, műveletek (Game / Details / Edit / Delete)
- **New Character** – új karakter létrehozása
- **Encyclopedia** – referencia adatok (races/classes/advantages/disadvantages)
- **Profile** – fiókkezelés (jelszócsere, fiók törlése, aktivitás)

---

## 5. Dashboard (Karakterlista)

A Dashboard a bejelentkezett felhasználó **saját** karaktereit mutatja.

### 5.1 Karakterek listázása

A táblázat jellemzően tartalmazza:

- **Name** (név)
- **Archetype**
- **Level**
- **UpdatedAt** (utolsó módosítás)

### 5.2 Műveletek egy karakteren

Minden sorban elérhető:

- **Game** – játékközbeni nézet (gyors használat)
- **Details** – részletes megtekintés
- **Edit** – szerkesztés
- **Delete** – törlés (megerősítést kér)

> Törlésnél a rendszer rákérdez: **“Delete this character?”**. Jóváhagyás után a karakter végleg törlődik.

### 5.3 Karakter limit

Az alkalmazás MVP-ben limitet alkalmazhat (pl. a Dashboard alján számláló látható):

- **Characters: X / MAX**

Ha elérted a limitet, előfordulhat, hogy új karaktert már nem enged létrehozni, amíg nem törölsz egy régit.

---

## 6. Új karakter létrehozása (New Character)

A **New Character** oldalon egy több lépéses űrlapon hozol létre karaktert. A mezők és szekciók a beállított szabályoktól és referencia adatoktól függhetnek, de jellemzően az alábbi logikát követik.

### 6.1 Alapadatok megadása

1. Add meg a karakter **nevét**.
2. Válassz **fajt (Race)** és **osztályt (Class)**.
3. Állítsd be az alap **szinteket / archetype** mezőket (ha a felület kéri).

### 6.2 Attribútumok / statok

- A rendszer bizonyos értékeket automatikusan számol (pl. módosítók, derived statok).
- Ha a felület engedi, állítsd be a szükséges alap attribútumokat (pl. STR/DEX/INT stb.).

### 6.3 Képességek / skillek

- A skillek csoportokba lehetnek sorolva (athletics, vigor, perception, intellectual, social, creative, subterfuge, …).
- A felület a kiválasztott osztály és szabályok alapján számolhat bónuszokat.

### 6.4 Előnyök / hátrányok (Advantages / Disadvantages)

- Az **advantages** és **disadvantages** kiválasztása pontkerethez köthető.
- Egyes opciók többféle költséggel / hatással rendelkezhetnek.

### 6.5 Mentés

1. Ellenőrizd, hogy a kötelező mezők ki vannak-e töltve.
2. Nyomd meg a **Save / Create** jellegű gombot (a felület felirata verziótól függhet).
3. Sikeres mentés után a rendszer visszavisz a **Dashboard** oldalra, ahol az új karakter megjelenik a listában.

> Ha hiányzik kötelező mező vagy hibás adatot adtál meg, a rendszer validációs üzenetet ad.

---

## 7. Karakter megtekintése és szerkesztése

### 7.1 Details

A **Details** nézetben a karakter összesített adatai láthatók. Itt ellenőrizheted:

- a kiválasztott race/class beállításokat
- a számolt értékeket (derived statok, bónuszok)
- a skilleket / előnyöket / hátrányokat

### 7.2 Edit

Az **Edit** nézetben módosíthatod a karakter adatait. Mentés után a változások:

- frissítik a **UpdatedAt** mezőt,
- és a Dashboard listában is megjelennek.

### 7.3 Game

A **Game** nézet célja, hogy játékközben gyorsan elérd a releváns adatokat (alapértékek, fontos számolt statok, stb.).  
A megjelenített tartalom a verziótól függően bővülhet.

---

## 8. Profile (Fiókkezelés)

### 8.1 Jelszó módosítása (e-mail/jelszó fiókoknál)

A jelszócsere tipikusan ezt kéri:

- **Current password**
- **New password**
- **Confirm new password**

Szabályok:

- az új jelszó minimum **6 karakter**
- a két új jelszó mezőnek egyeznie kell

A rendszer a biztonság miatt **újrahitelesítést** végez (reauthentication), ezért a jelenlegi jelszót is kéri.

> Ha Google fiókkal jelentkeztél be, előfordulhat, hogy a jelszócsere nem elérhető ugyanígy.

### 8.2 Fiók törlése

A **Delete Account** gomb végleges művelet:

- törli a fiókot,
- és **minden karaktert** is töröl a saját tárolódból.

A rendszer rákérdez:  
**“This will permanently delete your account and ALL your characters. Are you sure?”**

Ha a rendszer „requires recent login” jellegű hibát ad, akkor újra be kell jelentkezned, majd ismét megpróbálni.

### 8.3 Support / Kapcsolat

A profil oldalon található support kontakt:

- **animabuilder@gmail.com**

---

## 9. Encyclopedia (Referencia)

Az **Encyclopedia** célja, hogy gyorsan böngészhető legyen a referencia tartalom:

- **Races**
- **Classes**
- **Advantages**
- **Disadvantages**

A tartalom a rendszerben tárolt konfigurációból töltődik (verziótól függően bővülhet).

---

## 10. Gyakori hibák és megoldások

### 10.1 „Permission denied” / „Missing or insufficient permissions”

Lehetséges okok:

- nincs bejelentkezve a felhasználó,
- vagy a biztonsági szabályok (rules) nem engedik a műveletet.

Megoldás:

- jelentkezz be újra,
- próbáld meg frissíteni az oldalt,
- ha tartós: jelezd a support e-mailen.

### 10.2 Mentés nem sikerül / „Network error”

- ellenőrizd az internetkapcsolatot,
- frissítsd az oldalt,
- próbáld meg újra a mentést.

### 10.3 Nem jelenik meg az új karakter a Dashboardon

- frissítsd az oldalt (F5),
- ha a mentés sikeres volt, néhány másodperc késleltetés után meg kell jelennie.

---

## 11. Adatkezelés (rövid)

- A karakterek a bejelentkezett felhasználó fiókjához kötötten tárolódnak.
- A **Delete Account** funkció a karaktereket is törli.

---

## 12. Verzió és ismert korlátok (MVP)

- A funkciók és referencia adatok bővülhetnek.
- Bizonyos részek (pl. Encyclopedia tartalom részletessége) verziófüggő.
- Karakterlimit létezhet (Dashboard számláló jelzi).

---

**Vége.**
