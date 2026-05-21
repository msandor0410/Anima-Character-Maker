# 12) Human–AI Collaboration Record — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1  
**Dátum:** 2026-01-29  
**Státusz:** Draft (értékelői átnézésre kész)  
**Közönség:** értékelők/bírálók, konzulens  
**Formátum:** Markdown  
**Források:** `ai_log.jsonl` + kapcsolódó dokumentáció (ADR/Spec)

---

## 1. Cél

Ez a dokumentum **rögzíti a Human-in-the-loop együttműködés módját**: milyen jellegű támogatást adott az AI, és **mely pontokon történt explicit emberi döntés, implementáció és validáció**.

**Kiemelt értékelői szempontok, amiket itt lefedünk:**
- felelősségi körök tisztasága (AI ≠ autonóm fejlesztő)
- validáció és reprodukálhatóság
- adatvédelem/etika (secrets, PII)
- traceability (artefaktok és napló)

---

## 2. Együttműködési modell (Human-in-the-loop)

### 2.1 Szerepek és felelősség

**AI szerepe:**
- gyors alternatívák és megoldási minták felajánlása
- dokumentum-struktúra és ellenőrző listák (SAD/SDD/DB/API)
- hibakeresési hipotézisek (pl. TypeScript typing)
- tooling lépések (Firestore export/seed, emulator futtatás)

**Emberi szerep (a szakdolgozat felelőse):**
- végső architektúra- és design döntések (ADR-ek)
- kód integrációja, refaktor, stílus és project-konvenciók betartása
- build/typecheck/test futtatás, hiba esetén javítás
- secrets/konfiguráció biztonságos kezelése
- dokumentumok véglegesítése és konzisztenciája

> **Elv:** AI javaslat csak akkor tekinthető “elfogadottnak”, ha az **implementálva** és **validálva** van a projekt eszközeivel.

---

## 3. Kontrollok és validáció (bizonyíthatóság)

### 3.1 Kötelező ellenőrzések AI-alapú módosítás után

- `npm run build` (TS compile + bundling)
- type-safety ellenőrzés (TS errorok: pl. indexelés / generikus kulcsok)
- releváns tesztek (unit/smoke/e2e, emulator)
- manuális smoke: login → dashboard → create character → list frissül

### 3.2 Reprodukálhatóság

- Vite dev server (`localhost:5173`)
- Opcionális Firebase Emulator Suite (Auth + Firestore), determinisztikus tesztekhez
- Tooling: seed/export scriptek dokumentált futtatása

---

## 4. Adatvédelem és etika

- **Nem kerül AI inputba:** jelszavak, privát kulcsok, API kulcsok, service account secret.
- Ha a repo-ban bármikor előfordulna secret jellegű fájl, azt **gitignore + rotáció + CI secret injection** irányba kell vinni.
- A dokumentumok és logok **nem tartalmaznak** PII-t; a fejlesztési outputok kizárólag technikai jellegűek.

---

## 5. Emberi hozzáadott érték (konkrétan, miben “több” a szakdolgozat)

### 5.1 Döntések és mérnöki trade-offok

- tech stack kiválasztás és indoklás (MVP gyors iteráció, alacsony üzemeltetés)
- Firestore adatmodell és per-user ownership célállapot
- plan-only IaC stratégia (Terraform validate/plan) a beadási követelményekhez

### 5.2 Minőségbiztosítás és hibakezelés

- AI “ötlet” → emberi implementáció → validáció → korrekció
- típushibák és edge case-ek projekt-kontextushoz igazítása (nem generikus sablon)

### 5.3 Dokumentációs koherencia

- dokumentumok egységes szerkezete és összhangja (SAD/SDD/DB/API/Infra/Deployment/Env)
- traceability: artefakt hivatkozások, napló összerendezése

---

## 6. Konkrét együttműködési példák (traceability)

**Összes AI-napló bejegyzés:** 49  
**Idősáv:** 2025-10-05 → 2026-01-28

Az alábbi táblázat a teljes napló reprezentatív kivonata (különböző fázisokból), ahol látszik:
- mit adott az AI (javaslat/struktúra/hipotézis)
- mit tett hozzá az ember (implementáció + validáció)
- milyen artefaktokra mutat vissza

| Dátum | Fázis | Task | AI hozzájárulás | Emberi hozzájárulás | Evidence (artefaktok) |
|---|---|---|---|---|---|
| 2025-10-05 | Discovery & Requirements | `interview_questions` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/01/interviews/ |
| 2025-10-07 | Discovery & Requirements | `interview_analysis` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/01/interviews/001-anna.json, sprints/01/interviews/002-bence.json, sprints/01/interviews/003-dorka.json |
| 2025-10-11 | Architecture & Decisions | `adr_authoring` | Struktúra/vázlat, alternatívák, megfogalmazás; checklist-ek a teljességhez. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/01/architecture/adr/0001-first-tech-choice.md |
| 2025-11-23 | Other | `abf_scope_alignment` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/01/discovery/abf_scope_notes.md |
| 2025-12-12 | Deployment & Infra | `deployment_option_do_single_domain_reverse_proxy` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/02/thesis/deploy/05-do-single-domain.md |
| 2025-12-20 | Discovery & Requirements | `dashboard_list_view_requirements` | Típushiba okának beazonosítása, lehetséges fixek és typing minták. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/02/abf/ui/13-dashboard-requirements.md |
| 2025-12-22 | Implementation (Frontend) | `character_calc_module_scaffold` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/02/abf/calc/15-characterCalc-scaffold.ts |
| 2026-01-14 | Deployment & Infra | `deployment_routes_decision_matrix` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/03/architecture/26-deploy-decision-matrix.md |
| 2026-01-15 | Architecture & Decisions | `react_firebase_mvp_backbone_finalize` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/03/architecture/adr/0002-react-firebase-choice.md |
| 2026-01-19 | Implementation (Frontend) | `character_creator_typing_cleanup` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/03/frontend/src/CharacterCreatorPage.tsx, sprints/03/frontend/src/characterCalc.ts |
| 2026-01-26 | Other | `class_data_consistency_pass` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/03/rules/classes/warrior.json, sprints/03/rules/classes/schema.md |
| 2026-01-27 | Other | `abf_rulebook_ingestion_plan_finalize` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/03/rules/abf_ingestion/plan.md |
| 2026-01-28 | Implementation (Frontend) | `ts_indexing_hardening_post_fix` | Általános megoldási irányok, ellenőrző lista, edge case-ek. | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/03/frontend/src/characterCalc.ts, sprints/03/frontend/src/types.ts |
| 2026-01-28 | Tooling & Data Ops | `firestore_export_script_path_fix` | Firestore path/model javaslatok, script váz + best practice (doc vs collection). | Implementáció a repóban; build/typecheck futtatás; lokális/emulator validáció; szükséges refaktor és végleges döntés. | sprints/03/tools/export-firestore-doc.mjs, sprints/03/tools/export-notes/firestore-paths.md |

> A teljes, részletes időrendi napló külön dokumentum: **10) AI Development Log**.

---

## 7. Megfelelőségi nyilatkozat (értékelői szemmel)

- Az AI használat **transzparens** (naplózott), és **nem helyettesíti** a mérnöki felelősséget.
- A szakdolgozatban bemutatott megoldások **tesztelhetők és reprodukálhatók** (Vite + emulator opció + tooling).
- A kritikus területek (Auth/Firestore/security) esetén az AI output csak **validáció után** tekintendő beépítettnek.

---

## 8. Melléklet — Kapcsolódó dokumentumok (nyomkövetés)

- `AI_Development_Log_Anima.md` (10) — teljes időrendi log
- `AI_Tool_Usage_Report_Anima.md` (11) — eszközök, scope, kockázatok/mitigációk
- ADR-ek (pl. platform/stack/IaC): `docs/adr/*` vagy a beadott ADR fájlok
- Specifikációk: `product_spec_v0.3.md`, `user_stories.md`

---
