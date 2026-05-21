# GUI / UX Documentation — Anima Character Builder

Ez a mappa az **Anima Character Builder** szakdolgozati projekt grafikus felhasználói felületének (GUI) és felhasználói élményének (UX) dokumentációját tartalmazza.

A dokumentáció célja, hogy egységes, áttekinthető formában bemutassa:
- az alkalmazás képernyőit és navigációs folyamatait,
- a legfontosabb felhasználói feladatokat,
- a vizuális és interakciós megoldásokat,
- valamint a jelenlegi UI/UX állapot önértékelését.

## Projekt rövid leírása

Az **Anima Character Builder** egy webes karakteralkotó és karakterkezelő alkalmazás az **Anima Beyond Fantasy** szerepjáték-rendszerhez. A rendszer támogatja a felhasználói bejelentkezést és regisztrációt, a saját karakterek létrehozását, szerkesztését, részletes megtekintését, játék közbeni használatát, valamint referenciaadatok böngészését enciklopédia nézetben.

## Dokumentáció tartalma

- `pageflow.png` — az alkalmazás képernyő-térképe, a fő navigációs útvonalakkal
- `pageflow.mmd` — a pageflow szerkeszthető Mermaid forrása
- `screens.md` — a képernyők strukturált leírása
- `journeys.md` — a 3 legfontosabb user journey
- `design_system.md` — a vizuális nyelv és design rendszer rövid leírása
- `self_assessment.md` — UI/UX önértékelés
- `screenshots/` — képernyőképek az egyedi képernyőkről

## Képernyők listája

- **S01 — Login**
- **S02 — Register**
- **S03 — Dashboard**
- **S04 — New Character**
- **S05 — Character Details**
- **S06 — Character Edit**
- **S07 — Character Game**
- **S08 — Encyclopedia**
- **S09 — Profile**

## Fájlstruktúra

```text
docs/ux/
├── README.md
├── pageflow.png
├── pageflow.mmd
├── screens.md
├── journeys.md
├── design_system.md
├── self_assessment.md
└── screenshots/
    ├── S01_login.png
    ├── S02_register.png
    ├── S03_dashboard.png
    ├── S04_new_character.png
    ├── S05_character_details.png
    ├── S06_character_edit.png
    ├── S07_character_game.png
    ├── S08_encyclopedia.png
    └── S09_profile.png
