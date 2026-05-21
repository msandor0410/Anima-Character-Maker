# 0002 – Tech stack váltás: React (Vite) + Firebase (Auth + Firestore + Hosting)

- **Dátum:** 2025-12-08  
- **Státusz:**   

## Kontextus
Az **Anima Character Builder** szakdolgozati projekt célja egy **gyorsan publikálható, stabil, interneten azonnal használható MVP/prototípus**, amit folyamatosan lehet bővíteni (“work in progress”).

Az eredeti terv (**Angular + Spring Boot + MySQL**) technikailag jó irány volt relációs modellezéshez, viszont a szakdolgozati ütemezésben a teljes backend+DB üzemeltetés:
- több “moving part”-ot (API + DB + migrációk + deploy) jelent,
- lassítja az iterációt,
- és az “early easy deploy” célhoz képest aránytalanul nagy DevOps terhet ad.

A projekt aktuális állapotában a legfontosabb igények:
- **bejelentkezés**, user-szintű adatkezelés,
- **karakter mentés / betöltés**,
- **referencia adatok** (archetype/race/config) kezelése,
- gyors, egyszerű publikálás és frissítés.

A karakteralkotási “komplexitás” nagy része nem SQL JOIN-okon múlik, hanem **szabályokon / számításokon** (derived statok, validáció, előfeltételek ellenőrzése), amit **alkalmazáslogikában** (frontenden) kényelmesebb és gyorsabb iterálni.

## Miért lett váltás (Angular+Spring+MySQL → React+Firebase)?
**Röviden:** kevesebb infrastruktúra, gyorsabb MVP, egyszerűbb deploy, rugalmasabb fejlesztési ciklus.

**Konkrét okok:**
- **Early deploy:** Firebase Hosting + Auth + Firestore kombinációval az app gyorsan publikus, az auth és a per-user adatvédelem kész komponensek.
- **Kevesebb üzemeltetés:** nincs külön API szerver és nincs külön DB instance, nincs Flyway/JPA/Hibernate körüli karbantartás az MVP-ben.
- **Gyorsabb iteráció:** React+Vite minimalista, gyors build/dev loop.
- **WIP-barát adatmodell:** Firestore dokumentum alapú tárolás jól illik a “karakter mint dokumentum” mintához.
- **A relációs igény kezelhető SQL nélkül:** a *szabályfüggőségek* és a *kalkulációk* döntően kódban futnak; a Firestore pedig a per-user mentést és a referencia adatok tárolását biztosítja.

## Döntés

### Frontend
- **React 18 + TypeScript + Vite**
- Routing: **react-router-dom**
- UI: egyszerű CSS / komponens-struktúra (később bővíthető UI library-vel)

### Auth
- **Firebase Authentication**
  - E-mail/jelszó alapú bejelentkezés (később OAuth is hozzáadható)

### Adattárolás
- **Cloud Firestore**
  - **Per-user karakterek**: `users/{uid}/characters/{characterId}`
  - **Referencia adatok**: dedikált dokumentumok/kollekciók (pl. `config`, `archetypes`, `races`)
  - Biztonság: **Firestore Security Rules**

### Deploy
- **Firebase Hosting**
  - Egylépéses web deploy (CI/CD-vel automatizálható)

### Kiegészítő eszközök (repo-szinten)
- **Seed**: Firestore feltöltés seed adatokkal (`scripts/seed-firestore.mjs`, `seed-data/*`)
- **Export**: Firestore export JSON-ba (`scripts/export-firestore.mjs`)

## Hogyan lett “megoldva” relációs SQL adatbázis nélkül?
A megközelítés: **dokumentum-orientált modell + kontrollált denormalizáció + szabálymotor a kódban**.

### 1) “Character = egy dokumentum”
A karakter egy összetett állapot (attribútumok, képzettségek, választások, pontköltés, stb.), ami természetesen illik egy Firestore dokumentumba.
- Ezzel elkerülhető a sok N:M tábla + JOIN.
- A mentés/undo/history is könnyebben kezelhető (pl. snapshotok, log mezők).

### 2) Referencia adatok külön, stabil struktúrában
A szabálykönyvi jellegű “master data” külön kerül (archetype/race/config).  
A karakter dokumentum ezekre **ID-kkal** vagy “beégetett snapshot” mezőkkel hivatkozik (attól függően, hogy kell-e “verziózott” viselkedés).

### 3) Denormalizáció ott, ahol a UI-nak kell
SQL JOIN helyett:
- bizonyos megjelenítési adatok (pl. `name`, `archetypeName`) **denormalizáltan** tárolhatók a karakter dokumentumban,
- így listázásnál nem kell több lekérdezést láncolni.

### 4) Előfeltételek és függőségek: alkalmazáslogika
A “prerequisite” és validációs logika:
- kliens oldali számításokkal (pure TS függvények / rule-evaluator),
- és opcionálisan később Cloud Functions-szel “server authoritative” módon is megoldható, ha kell.

### 5) Konzisztencia és hozzáférés: Security Rules + struktúra
A hozzáférési modell egyszerű:
- a user csak a saját `users/{uid}/characters/*` dokumentumait érheti el,
- a referencia adatokat vagy read-only módon, vagy admin-only módon lehet kezelni.

## Megfontolt alternatívák
- **Angular + Spring Boot + MySQL (eredeti)**: erős relációs modell, de lassabb MVP és több üzemeltetés.
- **React + saját API (Laravel/Nest/Spring)**: rugalmas, de visszahozza az API+DB deploy terhét.
- **Firebase + Cloud Functions**: későbbre opció, ha kell szerveroldali validáció / export / riport.

## Következmények

### Előnyök
- **Nagyon gyors** MVP és publikálás (hosting + auth + DB kész).
- **Kevesebb infrastruktúra**, kevesebb hibaforrás.
- **Skálázható alap** kis költség/ráfordítás mellett.
- WIP esetén **rugalmas adatstruktúra** (dokumentumok evolúciója).

### Hátrányok / kockázatok
- **Nincs SQL JOIN/CTE**, komplex riportokhoz extra logika kell.
- Firestore lekérdezési korlátok → **adatmodell fegyelmet** igényel.
- **Vendor lock-in** (Firebase ökoszisztéma).
- Későbbi “szabálymotor-hardening” esetén felmerülhet a **server-side validáció** igénye.

## Implementációs jegyzetek (aktuális repo mintázat alapján)
- **Karakterek tárolása**: `users/{uid}/characters` alatti dokumentumok.
- **Seed mechanizmus**: `scripts/seed-firestore.mjs` + `seed-data/*` (config/archetypes/races).
- **Export**: `scripts/export-firestore.mjs` (biztonsági mentés / migrációs alap).
- **Rules**: `firestore.rules` – user ownership elv (szigorítható tovább).

## Migrációs megfontolás (ha később mégis SQL kell)
Ha a projekt későbbi fázisában szükség lesz relációs riportokra / komplex lekérdezésekre:
- a Firestore tartalom **exportálható JSON-ba** (export script),
- majd célzottan importálható PostgreSQL/MySQL adatmodellbe,
- a szabálylogika és domain modellek TypeScriptben továbbra is újrahasznosíthatók.

---
**Összegzés:** a váltás célja az volt, hogy a szakdolgozati MVP-t **minimális üzemeltetéssel, gyors iterációval és egyszerű deploy-jal** lehessen felépíteni, miközben a “relációs jellegű” szabályfüggőségeket **kódban (rule + calc)** kezeljük, és az adatbázis fő szerepe a **per-user állapotmentés** legyen.
