# ADR 0003 – Platform döntés (Local Preview + Firebase)

## Kontextus

Az **Anima Character Builder** MVP jelenlegi technikai iránya: **React (Vite) + Firebase (Authentication + Firestore + Hosting)**.  
A cél Sprint szinten egy **stabil, könnyen reprodukálható lokális preview környezet**, ami:

- gyors iterációt ad (UI + számítási logika),
- támogatja a per-user adatkezelést (Auth),
- és minimalizálja a “moving part”-okat (nincs külön backend/API szerver az MVP-ben).

A projektben előforduló kritikus dev-flow-k:

- bejelentkezés / kijelentkezés,
- karakterek mentése / betöltése `users/{uid}/characters/{characterId}`,
- referencia adatok betöltése (pl. `config/*`, `races/*`, `classes/*`),
- seed / export scriptek futtatása.

## Döntés

A Sprint során **lokális preview környezetet** használunk:

- **Frontend (Vite dev server):** `http://localhost:5173`  
  *(ha a projektben más port van fixálva, akkor azt kell itt szerepeltetni)*
- **Auth + Firestore:**
  - alapértelmezetten **Firebase (dev projekt)** ellen fut
  - opcionálisan: **Firebase Emulator Suite** lokális fejlesztéshez (Auth/Firestore), ha offline vagy determinisztikus teszt kell
- **Seed/Export tooling:** `scripts/seed-firestore.mjs`, `scripts/export-firestore*.mjs` jellegű scriptek lokálisan futnak

## Indoklás

- **Gyorsabb iteráció:** React+Vite minimalista dev loop, gyors reload.
- **Kevesebb üzemeltetés:** nincs külön API + DB instance az MVP-ben, a Firebase biztosítja az auth+adatmentést.
- **Reprodukálhatóság:** a preview környezet egyetlen `npm install && npm run dev` típusú lépéssel indítható (plusz opcionális emulator).
- **Smoke teszt kompatibilitás:** CI-ben ellenőrizhető, hogy a frontend build/dev és az alap dependency-k rendben vannak, illetve (emulatorral) a per-user CRUD alapműködés is.

## Alternatívák

- **Angular + Spring Boot + MySQL lokálisan:** erős relációs modell, de túl nagy DevOps és iterációs overhead az MVP-hez.
- **Saját API (Laravel/Nest/Spring) + SQL:** visszahozza a külön backend deploy/karbantartási terhet.
- **Publikus preview deploy minden push-nál:** túl korai; a lokális dev + ritkább hosting deploy hatékonyabb Sprint fókuszhoz.

## Következmények

- A preview környezet **nem publikus**, fejlesztői gépre és CI-re optimalizált.
- CI-ben a smoke teszt fókusza:
  - `lint` / `typecheck` / `build` sikeressége
  - opcionálisan emulatorral: alap CRUD (create/list/load) futtatása teszt adatbázison
- A későbbi sprintekben szükség lehet:
  - Hosting preview környezetre (Firebase Hosting channel / staging)
  - erősebb “server-authoritative” validációra (Cloud Functions), ha a szabálymotor hardening indokolja.