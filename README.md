# Anima Character Builder

## Karakteralkotó és karakterkezelő webalkalmazás

**Szegedi Tudományegyetem – Informatikai Intézet**  
**Szakdolgozat, 2026**

**Készítette:** Mikó Sándor  
**Szak:** Programtervező informatikus BSc  
**Témavezető:** Dr. Bilicki Vilmos, egyetemi docens  

---

## A projekt rövid leírása

Az **Anima Character Builder** egy böngészőből használható karakteralkotó és karakterkezelő webalkalmazás, amely az **Anima Beyond Fantasy** asztali szerepjáték-rendszer karaktereinek létrehozását, mentését, megtekintését és későbbi használatát támogatja.

A projekt célja, hogy az Anima Beyond Fantasy összetettebb karakteralkotási folyamatát digitális felületen tegye átláthatóbbá. A rendszer segíti a felhasználót a karakteradatok rögzítésében, a saját karakterek kezelésében, valamint bizonyos szabályalapú értékek kiszámításában.

A webalkalmazás szakdolgozati MVP-ként készült, ezért elsősorban a legfontosabb karakterkezelési funkciókra fókuszál: regisztráció, bejelentkezés, saját karakterlista, új karakter létrehozása, karakteradatok mentése és későbbi megjelenítése.

---

## A szakdolgozat témája

Az asztali szerepjátékokban a karakteralkotás gyakran több egymásra épülő döntésből és számításból áll. Az Anima Beyond Fantasy esetében a játékosnak figyelembe kell vennie többek között a karakter faját, kasztját, tulajdonságait, képzettségeit, előnyeit, hátrányait és a különböző szabályalapú módosítókat.

A szakdolgozatban bemutatott alkalmazás célja, hogy ezt a folyamatot egy webes karakteralkotó és karakterkezelő rendszerrel támogassa. Az alkalmazás nem csupán adatbeviteli felületként működik, hanem központi TypeScript-alapú számítási logikát is használ a karakterhez kapcsolódó értékek kezelésére.

---

## Fő funkciók

- Felhasználói regisztráció és bejelentkezés
- Google-alapú hitelesítés támogatása
- Védett, bejelentkezéshez kötött karakterkezelő felületek
- Saját karakterlista megjelenítése a dashboard oldalon
- Új karakter létrehozása
- Karakteradatok mentése Cloud Firestore adatbázisba
- Meglévő karakterek részletes megtekintése
- Karakterek szerkesztése és törlése
- Aktív játékot segítő karakteroldal
- Enciklopédia jellegű referenciafelület
- Reszponzív, sötét fantasy hangulatú felhasználói felület
- Szabályalapú karakterérték-számítások központi alkalmazáslogikával

---

## Alkalmazott technológiák

A projekt kliensoldali webalkalmazásként készült, külön saját backend szerver nélkül. A backend jellegű funkciókat Firebase-szolgáltatások biztosítják.

**Frontend:**

- React
- TypeScript
- Vite

**Backend as a Service:**

- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Firebase Local Emulator Suite

**Tesztelés és minőségbiztosítás:**

- Vitest
- Playwright
- Cucumber / Gherkin jellegű E2E forgatókönyvek

**Egyéb eszközök:**

- WebStorm
- Figma
- Mermaid
- Terraform

---

## Architektúra

Az alkalmazás egy kliensoldali egyoldalas alkalmazásként, vagyis **SPA-ként** működik. A React-alapú frontend közvetlenül a Firebase SDK-n keresztül kommunikál a Firebase szolgáltatásaival.

A rendszerben nincs külön REST API vagy saját szerveralkalmazás. A hitelesítést a Firebase Authentication, az adattárolást a Cloud Firestore, az alkalmazás publikálását pedig a Firebase Hosting biztosítja.

A karakterek felhasználónként elkülönítve kerülnek tárolásra a Firestore adatbázisban:

```text
users/{uid}/characters/{characterId}
```

Ez a struktúra támogatja azt az alapelvet, hogy minden bejelentkezett felhasználó csak a saját karaktereit érhesse el.

---

## Adatkezelés és jogosultság

A projekt egyik fontos célja a felhasználóhoz kötött karaktertárolás megvalósítása. A karakterek nem közös, publikus karakterlistában szerepelnek, hanem minden felhasználó a saját Firestore útvonala alatt tárolja őket.

A jogosultságkezelés alapelve:

```text
request.auth.uid == uid
```

Ez azt jelenti, hogy egy felhasználó csak akkor olvashatja vagy módosíthatja az adott karakterdokumentumot, ha a bejelentkezett Firebase-felhasználó azonosítója megegyezik az adatútvonalban szereplő felhasználói azonosítóval.

A referenciaadatok, például fajok, kasztok és konfigurációs adatok külön kollekciókban tárolhatók:

```text
races/{raceId}
classes/{classId}
config/{docId}
```

---

## Karakteralkotási logika

A rendszer nemcsak eltárolja a karakteradatokat, hanem több helyen szabályalapú számításokat is végez. Ezek a számítások a karakter tulajdonságaira, képzettségeire, kasztjára, szintjére és egyéb választásaira épülnek.

A számítási logika központi helyen, a következő fájlban található:

```text
src/characterCalc.ts
```

Ez a fájl tartalmazza többek között:

- az elsődleges tulajdonságok kezelését,
- a tulajdonságbónuszok számítását,
- a képzettségekhez kapcsolódó kulcstulajdonságokat,
- a végleges képzettségértékek számítását,
- a kasztból származó bónuszok kezelését,
- egyes származtatott karakterértékek számítását.

A végleges képzettségérték számításának alapelve:

```text
végleges képzettségérték = alapérték + tulajdonságbónusz + kasztbónusz
```

---

## Felhasználói felület

Az alkalmazás több egymáshoz kapcsolódó oldalból áll. A nem bejelentkezett látogató csak a bejelentkezési és regisztrációs oldalakat érheti el. Sikeres hitelesítés után a felhasználó a dashboard oldalra kerül, ahonnan elérheti a karakterkezelő funkciókat.

Főbb oldalak:

- Bejelentkezési oldal
- Regisztrációs oldal
- Dashboard / saját karakterlista
- Új karakter létrehozása
- Karakter részletes oldala
- Karakter szerkesztése
- Aktív játékot segítő oldal
- Enciklopédia
- Profiloldal

A felület reszponzív kialakítású, így asztali gépen, laptopon, tableten és mobiltelefonon is használható.

---

## Tesztelés

A projekt tesztelése több szinten történik.

A számítási és formázási logikát Vitest-alapú unit tesztek ellenőrzik. Ezek főként a felülettől független TypeScript-függvények működését vizsgálják.

A Firebase-hez kapcsolódó működés lokális Firebase Emulator Suite környezetben is ellenőrizhető. Ez lehetővé teszi, hogy a hitelesítési és adatbázis-műveletek tesztelése ne az éles Firebase-projektet módosítsa.

A fő felhasználói folyamat end-to-end tesztekkel is ellenőrizhető:

1. a felhasználó bejelentkezik,
2. megnyitja a dashboardot,
3. új karaktert hoz létre,
4. elmenti a karaktert,
5. a karakter megjelenik a saját karakterlistájában.

---

## Lokális futtatás

### Telepítés

```bash
npm install
```

### Fejlesztői szerver indítása

```bash
npm run dev
```

Alapértelmezett helyi cím:

```text
http://localhost:5173
```

### Production build

```bash
npm run build
```

### Lokális preview

```bash
npm run preview
```

---

## Firebase emulátorok használata

Lokális fejlesztéshez és teszteléshez használható a Firebase Emulator Suite.

```bash
firebase emulators:start
```

A projekt `.env.local` fájljában engedélyezhető az emulátorok használata:

```bash
VITE_USE_EMULATORS=true
```

---

## Környezeti változók

A Firebase konfigurációs értékeket `.env.local` fájlban kell megadni. A fájl nem kerülhet verziókezelésbe.

Példa:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT=...

VITE_USE_EMULATORS=true
```

---

## Publikálás

Az alkalmazás Firebase Hosting segítségével publikálható.

```bash
npm run build
firebase deploy
```

A szakdolgozati projekt hosztolt változata:

```text
https://anima-builder.web.app/login
```

---

## Mesterséges intelligencia használata

A projekt fejlesztése során mesterséges intelligencián alapuló eszközök is támogató szerepet kaptak. Ezek az eszközök nem önálló fejlesztőként működtek, hanem dokumentációs, tervezési, magyarázati és problémamegoldási segítséget nyújtottak.

A fejlesztés során használt AI-eszközök közé tartozott többek között:

- ChatGPT
- Claude
- Gemini
- Figma AI
- Mermaid-alapú diagramgenerálás

Az AI által adott javaslatok nem kerültek automatikusan elfogadásra. A kódhoz, adatmodellhez, architektúrához és dokumentációhoz kapcsolódó döntések emberi ellenőrzés és validáció mellett készültek. Érzékeny adatok, például jelszavak, privát kulcsok vagy szolgáltatásfiók-kulcsok nem kerültek AI-eszközökbe.

---

## Továbbfejlesztési lehetőségek

A jelenlegi MVP-verzió az Anima Beyond Fantasy karakteralkotási folyamatának alapvető támogatását valósítja meg. Későbbi fejlesztési irány lehet:

- a teljesebb kaszt- és fajkezelés,
- részletesebb képzettség- és harcrendszer-támogatás,
- felszereléskezelés,
- karakterlap PDF-exportálása,
- karakterek megosztható linkkel való elérése,
- adminisztratív referenciaadat-kezelő felület,
- Cloud Functions vagy külön backend réteg bevezetése,
- szerveroldali validációk megvalósítása.

---

## Összefoglalás

Az Anima Character Builder egy szakdolgozati MVP-ként elkészített webalkalmazás, amely az Anima Beyond Fantasy karakteralkotását és karakterkezelését támogatja. A projekt React, TypeScript, Vite és Firebase technológiákra épül, és célja, hogy a papíralapú karakterkezelésnél áttekinthetőbb, kényelmesebb és több eszközön is használható digitális alternatívát biztosítson.

---

## Licenc

A projekt szakdolgozati és intézményi beadási célra készült.  
A felhasznált szerepjáték-rendszer, név és kapcsolódó szabályanyagok jogai az eredeti jogtulajdonosokat illetik.
