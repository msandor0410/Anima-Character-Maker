# 3) Database Design Document (DDD) — *Anima Character Builder* (Firestore)

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 MVP-hez)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Közönség:** fejlesztők  

---

## 1. Áttekintés

Az MVP adatperzisztenciája **Cloud Firestore**-on alapul. A Firestore dokumentum-orientált, NoSQL adatbázis; a design célja:

- **Per-user adatelkülönítés**: karakterek user alatti subcollection-ben (`users/{uid}/characters/*`)
- **Referencia/master adatok**: külön kollekciókban (`classes/*`, `races/*`, `config/*`)
- **Kliensoldali szabálymotor**: a “komplexitás” többsége a frontenden (`characterCalc.ts`), a DB főleg állapot-tárolásra szolgál

**Megjegyzés a diagramokról:** képfájlok helyett **szöveges (Mermaid) diagramokat** használunk.

---

## 2. Logikai adatmodell (entitások)

### 2.1 Entitáslista

- **User** *(Firebase Auth)*: azonosítás `uid` alapján
- **Character**: user által létrehozott karakterlap (egy Firestore dokumentum)
- **ClassDef**: kaszt definíció (seedelt master data)
- **RaceDef**: faj definíció (seedelt master data)
- **Config**: szabály és meta konfigurációk (skills, movement, fatigue, levelrules, advantages, disadvantages, baselife, stb.)

### 2.2 Kapcsolatok (konceptuális)

- User 1—N Character
- Character N—1 ClassDef (hivatkozás: `classId`)
- Character N—1 RaceDef (hivatkozás: `raceId`)
- Character N—N Advantage/Disadvantage definíciók (listában tárolt választások; definíciók `config/*` alatt)

---

## 3. Gyűjtemények és útvonalak (Collections & Paths)

### 3.1 Master / referencia adatok

- `classes/{classId}`
- `races/{raceId}`
- `config/{configId}`

**Seed fájlok a repo-ban:** `scripts/seed-data/*.json`  
Példák:
- `scripts/seed-data/classes.warrior.json`
- `scripts/seed-data/races.jayan.json`
- `scripts/seed-data/config.skills.json`
- `scripts/seed-data/config.characterTemplate.json` (minta karakter dokumentum sémához)

### 3.2 User scoped adatok

- `users/{uid}/characters/{characterId}`

**Design döntés:** a karakterek **subcollection**-ben vannak, így az ownership és a query-k egyszerűek.

---

## 4. Diagramok (szöveges)

### 4.1 „ER-szerű” áttekintés

```mermaid
erDiagram
  USER ||--o{ CHARACTER : "owns"
  CLASSDEF ||--o{ CHARACTER : "selected by"
  RACEDEF  ||--o{ CHARACTER : "selected by"
  CONFIG   ||--o{ CHARACTER : "drives rules"

  USER {
    string uid PK
  }

  CHARACTER {
    string id PK
    string creatorUid
    string name
    string classId
    string raceId
    int level
    timestamp updatedAt
  }

  CLASSDEF {
    string id PK
    string name
    string archetype
  }

  RACEDEF {
    string id PK
    string name
  }

  CONFIG {
    string id PK
    int version
  }
```

### 4.2 Firestore path struktúra

```mermaid
flowchart TB
  root[(Firestore)]
  root --> C1[classes/{classId}]
  root --> C2[races/{raceId}]
  root --> C3[config/{configId}]
  root --> U[users/{uid}]
  U --> CH[characters/{characterId}]
```

---

## 5. Dokumentum-sémák (Document Schemas)

> A típusok TypeScript jellegűek (dokumentációs célból). A valós adatok JSON-ként tárolódnak Firestore-ban.

### 5.1 `classes/{classId}` — ClassDef

**Forrás:** `scripts/seed-data/classes.*.json`

**Fő mezők (minta):**
- `id: string` *(pl. `"warrior"`)*
- `name: string` *(pl. `"Warrior"`)*
- `archetype: string` *(kaszt kategória)*
- `limits: { combat: number; supernatural: number; psychic: number }`
- `dpCosts: { ... }` *(DP költségek struktúrája)*
- `levelBonuses: Array<{ every: number; ... }>`
- `Flavor: string` *(lore / leírás)*

**Példa (rövidített):**
```json
{
  "id": "warrior",
  "name": "Warrior",
  "archetype": "Warrior",
  "limits": { "combat": 0.6, "supernatural": 0.5, "psychic": 0.5 }
}
```

---

### 5.2 `races/{raceId}` — RaceDef

**Forrás:** `scripts/seed-data/races.*.json`

**Fő mezők (minta):**
- `id: string`
- `name: string`
- `modifiers: { ... }` *(attribútum / stat módosítók)*
- `bonuses: { ... }` *(bónuszok)*
- `needs: { ... }` *(szükségletek / special rule-ok)*
- `Flavor: string`

---

### 5.3 `config/{configId}` — konfigurációs dokumentumok

A `config` kollekcióban több különböző dokumentum-séma van, közös jellemzővel:

- `version: number` *(konfig verziózás)*
- további mezők a config típusától függően

**5.3.1 `config/skills` (forrás: `config.skills.json`)**
- `skillGroups: Record<string, string[]>`
- `skillToGroup: Record<string, string>`

**5.3.2 `config/levelrules`**
- `maxLevel: number`
- `progressionByLevel: ...`
- `characteristicPoints: ...`
- `characteristicValueToModifier: ...`

**5.3.3 `config/movement`**
- `movement: { baseStat: string; caps: ...; table21: ...; notes: ... }`

**5.3.4 `config/fatigue`**
- `fatigue: { ... }`

**5.3.5 `config/advantages`**
- `advMax: number`
- `advantages: AdvantageDef[]`

**5.3.6 `config/disadvantages`**
- `disadvMax: number`
- `disadvantages: DisadvantageDef[]`

**5.3.7 `config/baselife`**
- `baseLifePointsByConstitution: number[] | Record<string, number>`

**5.3.8 `config/heighAndWeight`**
- `sizeHeightWeightBySize: ...` *(méret → magasság/tömeg tábla)*

**5.3.9 `config/characterTemplate`**
- ez nem „runtime” konfig, hanem **minta** a karakter dokumentum sémájához (lásd 5.4)

---

### 5.4 `users/{uid}/characters/{characterId}` — Character (MVP)

**Forrás (séma-minta):** `scripts/seed-data/config.characterTemplate.json`

#### 5.4.1 Fő meta mezők
- `version: number` *(karakter dokumentum verzió)*
- `creatorUid: string` *(owner; redundáns a path mellett, de audit/ellenőrzéshez hasznos)*
- `name: string`
- `classId: string`
- `raceId: string`
- `level: number`
- `xp: number`
- `updatedAt: timestamp` *(serverTimestamp ajánlott)*
- *(opcionális: `createdAt: timestamp` — ajánlott hozzáadni)*

#### 5.4.2 Pontok / összesítők
- `dp: { max: number; used: number; remainder: number }`
- `cp: { advMax: number; adv: number; disadv: number }`
- `lp: { base: number; multiples: number }`
- `points: { initBase: number; initClass: number; initSpecial: number; fatigue: number }`

#### 5.4.3 Primary attribútumok
- `attributes: { STR:number; DEX:number; AGI:number; CON:number; INT:number; POW:number; WP:number; PER:number }`  
  *(a template-ben rövid kulcsok: `str/dex/...` — a kód legyen konzisztens a használt kulcsokkal)*

#### 5.4.4 Movement / Presence / Resistances
- `movement: { base:number; pen:number; bon:number; act:number }`
- `presence: { base:number; bon:number; act:number }`
- `resistances: { physical:number; disease:number; poison:number; magic:number; psychic:number }`

#### 5.4.5 Combat blokk
- `combat.limits: { ca:number; sa:number; pa:number }`
- `combat.wearArmor: { base:number; spent:number }`
- `combat.attack/block/dodge: { base:number; spent:number }`

#### 5.4.6 Ki/Magic/Psychic blokkok
- `ki: { mk:number; str:number; agi:number; dex:number; con:number; wp:number; pow:number }`
- `magic: { mAcu:number; zeon:number; proj:number }`
- `psychic: { potential:number; points:number; proj:number }`

#### 5.4.7 Skills (rövid kulcsokkal)
- `skills: Record<SkillKey, number>`  
  *(példák a template alapján: `acro`, `ath`, `ste`, `pers`, `occ`, `thef`, stb.)*

#### 5.4.8 Meta (szerepjáték / leíró mezők)
- `meta: { age:number; gender:string; hair:string; eyes:string; height:number; weight:number; appearance:number; size:number; exp:number }`

#### 5.4.9 Előnyök / Hátrányok
- `advantages: Array<{ id: string; cost: number; params?: any }>`
- `disadvantages: Array<{ id: string; cost: number; params?: any }>`

**Megjegyzés:** az előny/hátrány definíciók a `config/advantages` és `config/disadvantages` alatt vannak; a karakter csak a **választott példányokat** tárolja.

---

## 6. Lekérdezési minták és indexelés

### 6.1 MVP-ben használt query-k

**Dashboard lista (user scoped):**
- Query: `users/{uid}/characters`
- Rendezés: `orderBy(updatedAt desc)`
- Limit: `limit(5)`

Ez a Firestore-ban **alapból támogatott** (single-field index).

**Character detail:**
- `getDoc(users/{uid}/characters/{characterId})`

**Master data betöltés:**
- `getDocs(collection(db, "classes"))`
- `getDocs(collection(db, "races"))`
- `getDoc(doc(db, "config", "<id>"))`

### 6.2 Javasolt jövőbeli query-k (és indexek)

Ha később bejön szűrés:
- `where("level", ">=", 5)` + `orderBy("updatedAt", "desc")`
- `where("classId", "==", "warrior")` + `orderBy("updatedAt", "desc")`

A Firestore ilyen esetekben **kompozit indexet** kérhet (Console-on felajánlja).  
A DDD-ben rögzítjük: **MVP-ben nincs szükség explicit kompozit indexre**, de bővítéskor tervezni kell vele.

---

## 7. Normalizáció vs denormalizáció

### 7.1 Döntés
- **Karakter = 1 dokumentum** (kontrollált denormalizáció)
- Master data külön, stabil kollekciókban

### 7.2 Indoklás
- Firestore-ban nincs join → a karakter „állapota” és a derived mezők gyorsan lekérhetők
- A szabálymotor frontenden fut → a karakter dokumentum tartalmazhat számított mezőket is (cache jelleggel)

### 7.3 Korlátok
- Firestore doksi max ~1 MiB → a karakter dokumentum nem nőhet túl nagyra  
  *(ha bővül: inventory/equipment log, history stb. külön subcollection-be érdemes tenni)*

---

## 8. Verziózás és migráció

- `config/*` dokumentumok: `version` mezővel
- `characters/*` dokumentumok: `version` mezővel

**Ajánlott migrációs minta:**
- kliens oldalon “schema upgrader” funkció, ami régi verziót újra hoz (pure function)
- nagyobb változásnál: Cloud Function / admin script migráció

---

## 9. Seed, export és admin tooling

### 9.1 Seed adatok
A repo tartalmaz seed JSON fájlokat: `scripts/seed-data/`  
Cél: determinisztikus fejlesztés és e2e tesztek (emulator) támogatása.

### 9.2 Export script
`scripts/export-firestore-doc.mjs` exportál Firestore **dokumentumot** JSON-ba.

**Fontos:** Firestore SDK-ban:
- dokumentum útvonal: páros számú komponens (pl. `config/skills`)
- kollekció útvonal: páratlan számú komponens (pl. `users/{uid}/characters`)

Kollekció exporthoz külön script szükséges (vagy a fenti script bővítése).

---

## 10. Biztonság (adatbázis szint)

**MVP cél:** user csak a saját karaktereit érje el.

**Minimum security rules elv (rögzített cél):**
- `match /users/{uid}/characters/{doc}` → read/write: `request.auth.uid == uid`
- `classes/*`, `races/*`, `config/*` → read-only

A konkrét rules blokk a **#20 Security Documentation** dokumentumba kerül.

---

## 11. Következő lépések (DDD-hez kapcsolódó)

1. `createdAt` bevezetése karakter dokumentumokban (audit + rendezés opció)
2. Index igények felmérése bővített query-khez (class/level filter)
3. Equipment/inventory bővítés esetén subcollection design (pl. `characters/{id}/items/*`)
4. Security rules hardening + emulator alapú teszt (CI-ben)

---
