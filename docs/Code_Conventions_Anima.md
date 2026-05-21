# Code Conventions Document — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2)  
**Dátum:** 2026-01-29  
**Státusz:** Draft  
**Célközönség:** Fejlesztők, értékelők/bírálók  

---

## 1. Cél

A dokumentum célja, hogy egységes, következetes kódstílust és fejlesztési gyakorlatot rögzítsen a projektben, különös tekintettel:

- React + TypeScript komponensekre (Vite)
- Firebase Auth + Firestore integrációra
- tesztelhetőségre (unit/smoke/e2e)
- értékelhetőségre (reproducibilitás, következetes minőség)

A szabályok célja nem „szépség”, hanem: **kevesebb hiba, gyorsabb review, stabilabb build, jobb szakdolgozati értékelhetőség**.

---

## 2. Eszközök és kötelező quality gate-ek

### 2.1 Kötelező futtatások (PR/MR előtt)

- `npm run lint` — ESLint: hibamentes
- `npm run build` — TypeScript + bundler: hibamentes
- (ha van) `npm run test` vagy `npm run test:unit` — legalább unit suite zöld
- (ha van) emulator alapú smoke/e2e — legalább a kritikus user flow (login + create + list)

### 2.2 Ajánlott automatizmusok

- Pre-commit hook (pl. lint-staged) — opcionális, de ajánlott
- CI pipeline ugyanazokat a kapukat futtatja

---

## 3. Nyelvi és formázási alapelvek

### 3.1 TypeScript (kötelező)

- **`any` kerülése**: csak indokolt esetben, kommenttel (miért szükséges).
- `unknown` preferált `any` helyett (kényszerített type narrowing).
- Explicit típusok ott, ahol:
  - publikus függvény/komponens API
  - Firestore dokumentum modell
  - utility modulok

### 3.2 Formázás (egységes)

- Indent: **2 space** (frontend standard)
- Sorvége: LF
- String: preferált **double quotes** TS/JS-ben, kivéve ha lint másként írja elő
- Trailing comma: ahol a formatter/linter kéri (stabil diffek miatt)
- Maximum line length: a lint/prettier beállítás szerint (általában 100–120)

> A projektben a linter/formatter az „igazság forrása”. Ha konfliktus van: **a konfigurációt követjük**.

---

## 4. Naming conventions

### 4.1 Fájl- és mappanevek

- React komponensek: `PascalCase.tsx`  
  Példa: `DashboardPage.tsx`, `CharacterCreatorPage.tsx`
- Utility / service modulok: `camelCase.ts`  
  Példa: `authService.ts`, `firebase.ts`, `characterCalc.ts`
- Tesztek: `*.test.ts` / `*.test.tsx` vagy a project standardja szerint

### 4.2 Szimbólumok

- React komponens: `PascalCase`
- Hook: `useSomething`
- Const: `UPPER_SNAKE_CASE` (globális konstansoknál), különben `camelCase`
- Type/Interface: `PascalCase` (`Character`, `UserProfile`, stb.)

### 4.3 URL/Route

- Route path: kebab-case vagy rövid, beszédes  
  Példa: `/dashboard`, `/characters/new`

---

## 5. React konvenciók

### 5.1 Komponens felépítés (ajánlott sorrend)

1. importok
2. type definíciók (props, local model)
3. helper függvények (csak ha lokális)
4. komponens (default export / named export a projekt standard szerint)
5. kisegítő komponensek (ha kell)

### 5.2 State és side effect

- `useState` csak szükség esetén (kerüljük a redundáns state-et).
- `useEffect`-ben:
  - dependency array legyen korrekt
  - async műveletet wrapper függvénybe tegyük
  - cleanup kötelező, ha subscription van (`onSnapshot`, event listener)

### 5.3 Firebase/Firestore hívások UI-ban

- UI komponens **nem tartalmazhat** szétszórt Firestore logikát mindenhol.
- Preferált: központosítás service/helper szinten (pl. `services/characters.ts`)  
  *(ha jelenleg még nincs, új fejlesztésnél már ide tereljük).*

### 5.4 Hibakezelés és UX

- Auth/Firestore hibákat userbarát üzenettel kezelni kell.
- Loading state kötelező hálózati műveleteknél.
- „optimistic UI” csak akkor, ha könnyen visszagörgethető.

---

## 6. Adatmodellezési konvenciók (Firestore)

### 6.1 Dokumentum struktúra

- Per-user karakterek: `users/{uid}/characters/{characterId}`
- Minden karakter dokumentumban legyen:
  - `name: string`
  - `level: number`
  - `createdAt`, `updatedAt` (server timestamp ajánlott)
  - minimálisan szükséges meta a listázáshoz (`archetype`, `updatedAt`)

### 6.2 Timestamp

- Preferált Firestore `serverTimestamp()` mentéskor.
- UI-ban megjelenítéshez biztonságos konverzió (`Timestamp.toDate()` guard).

### 6.3 Denormalizáció

- MVP-ben elfogadott: „Character = egy dokumentum”.
- Master/reference adatok (races/classes) lehetnek külön kollekciókban, read-only jelleggel.

---

## 7. Biztonsági konvenciók (kódszinten)

### 7.1 Secret kezelése

- `.env*` fájlok:
  - lokális fejlesztéshez `.env.local` ajánlott
  - **semmilyen secret** ne kerüljön commitba
- Firebase client config nem „secret”, de:
  - környezeti változókba szervezve kezeljük
  - külön környezetek elkülönítése (dev/stage/prod)

### 7.2 Firestore Rules kompatibilitás

- Kód **nem támaszkodhat** „nyitott” rules-ra.
- Minden CRUD per-user útvonalon történjen (uid ownership).
- Emulator tesztekben ellenőrizzük a jogosultságokat.

---

## 8. Tesztkonvenciók

### 8.1 Unit tesztek

- Pure funkciók (pl. `characterCalc`) unit tesztelve legyenek:
  - determinisztikus input/output
  - edge case-ek: null/undefined/0 értékek, negatív, határérték

### 8.2 Integration/Smoke

- Emulatorral fut:
  - minimál CRUD: create → read → list
  - auth állapot mock vagy emulator auth

### 8.3 E2E (ha van Cucumber/Gherkin)

- „Happy path” legyen lefedve:
  - register/login
  - create character
  - character megjelenik a listában
- Step definíciók legyenek újrahasznosíthatók, ne duplikáljunk.

---

## 9. Git workflow és commit konvenciók

### 9.1 Branch naming

- `feature/<short-topic>`
- `fix/<short-topic>`
- `docs/<short-topic>`

### 9.2 Commit message (ajánlott)

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`

### 9.3 PR/MR minimum tartalma

- Rövid összefoglaló (mi változott, miért)
- Tesztelt parancsok listája
- Kapcsolódó issue/ADR hivatkozás, ha releváns

---

## 10. Dokumentációs konvenciók a kódban

- Komplexebb logika esetén:
  - rövid, lényegre törő komment **miért** (nem „mit csinál”)
- Public helper/service függvények:
  - JSDoc/TSdoc ajánlott (paraméterek, return, side effects)
- ADR-t igénylő változás: új ADR vagy meglévő frissítése

---

## 11. Példák (gyors minták)

### 11.1 Type-safe parse (kerüld az `any`-t)

```ts
function safeNumber(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}
```

### 11.2 Firestore timestamp render guard

```ts
import type { Timestamp } from "firebase/firestore";

export function formatDate(d: unknown): string {
  try {
    const date =
      typeof (d as any)?.toDate === "function" ? (d as Timestamp).toDate() : new Date(d as any);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
  } catch {
    return "";
  }
}
```

> A konkrét segédfüggvények neve és helye a projektben változhat, de a **guardolás elve** kötelező.

---

## 12. Kapcsolódó dokumentumok

- Developer Guide (#17)
- Testing Documentation (#19)
- Security Documentation (#20)
- Architecture Decision Records (#23)
- Environment Configuration Guide (#8)

