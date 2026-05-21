# 11) AI Tool Usage Report — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1  
**Dátum:** 2026-01-29  
**Státusz:** Draft (értékelésre kész)  
**Közönség:** konzulens, bírálók, értékelők  
**Formátum:** Markdown *(PDF-be konvertálható)*  
**Kapcsolódó dokumentum:** `AI_Development_Log_Anima.md` (10)

---

## 1. Vezetői összefoglaló

A szakdolgozati MVP fejlesztése során AI eszközt **támogató jelleggel** használtam: tervezési alternatívák gyors feltérképezésére, dokumentáció strukturálására, hibajavítási irányok azonosítására és a Firestore/Emulator tooling pontosítására.

**Döntési és felelősségi elv:** az AI javaslatok **nem automatikusan kerültek integrálásra**. Minden beépített változtatás emberi kontroll mellett történt (build, typecheck, tesztek, lokális futtatás / emulator), és a felhasználói adatbiztonságra (különösen Firestore rules) kiemelt figyelmet kapott.

**Használt AI eszközök:**  
- **ChatGPT** (összes bejegyzés: 49/49) — lásd `ai_log.jsonl`

---

## 2. Használt AI eszközök és szerepük

### 2.1 ChatGPT (szöveg + kód-asszisztens)

**Tipikus felhasználások:**
- dokumentumok (SAD/SDD/DB design/API spec) vázlatolása és egységesítése
- TypeScript típushibák, interfész/typing problémák (pl. TS7053 jellegű) megoldási irányai
- Firestore path/modellezési döntések tisztázása (doc vs collection)
- seed/export scriptek (Admin SDK) és emulator alapú tesztfuttatás pontosítása
- deployment opciók összehasonlítása (Firebase Hosting vs Cloud Run/DO minták) — döntési input ADR-ekhez

**Nem használtam:**
- autonóm kódgenerálást emberi review nélkül
- automatikus exploit/“break-in” jellegű instrukciókat
- érzékeny kulcsok/jelszavak megosztását AI-val

---

## 3. Használati hatókör (scope) és kontrollok

### 3.1 SDLC fázisok szerinti lefedettség (összesítés)

| Fázis | Bejegyzések (db) | Tipikus output |
|---|---:|---|
| Discovery & Requirements | 5 | interjú kérdések, piaci összehasonlítás, user story/PRD frissítés |
| Architecture & Decisions | 1 | ADR-ek, stack / platform / IaC döntések indoklása |
| Implementation (Frontend) | 15 | TS/React logika, oldalak, számítási segédfüggvények |
| Tooling & Data Ops | 1 | export/seed scriptek, Firestore admin műveletek |
| Testing & QA | 0 | emulator + smoke/e2e futtatás, teszt-stratégia váz |
| Deployment & Infra | 6 | Hosting/deploy minták, terraform plan-only keret |
| Other | 21 | vegyes, de dokumentált fejlesztési support |

> Megjegyzés: a bejegyzések artefakt-útvonalai alapján az AI használat **dokumentált és visszakereshető**.

### 3.2 Reprezentatív példák (minták)

| Dátum | Fázis | Task | Artifacts (részlet) | Rövid leírás |
|---|---|---|---|---|
| 2025-10-11 | Architecture & Decisions | `adr_authoring` | sprints/01/architecture/adr/0001-first-tech-choice.md | Kidolgoztam a technológiai döntést: Angular + Spring Boot + MySQL stack az MVP fejlesztéséhez, dokumentálva ADR formátumban. |
| 2025-12-20 | Discovery & Requirements | `dashboard_list_view_requirements` | sprints/02/abf/ui/13-dashboard-requirements.md | Dashboard követelmények: karakterlista (name/archetype/level/updatedAt), CRUD gombok, reszponzív kártya/lista, dátumformázás Timestamp→ISO, és jogosultság: csak saját UID alatt. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-14 | Deployment & Infra | `deployment_routes_decision_matrix` | sprints/03/architecture/26-deploy-decision-matrix.md | Publikálási döntési mátrix: ‘ingyen és gyors’ (Firebase Hosting + Firestore) vs ‘SQL kell’ (Supabase Postgres / Cloud SQL) vs ‘PHP+MySQL kötelező’ (Cloud Run + Cloud SQL MySQL vagy DO VPS). (Utólag dokumentált, időablak-becslés.) |
| 2026-01-27 | Other | `abf_rulebook_ingestion_plan_finalize` | sprints/03/rules/abf_ingestion/plan.md | ABF rulebook ingestion terv véglegesítése: kritikus táblázatok listája, pontossági ellenőrzési pontok, és a ‘worksheet’/UI struktúrává alakítás menete. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-28 | Tooling & Data Ops | `firestore_export_script_path_fix` | sprints/03/tools/export-firestore-doc.mjs, sprints/03/tools/export-notes/firestore-paths.md | Firestore export hiba kezelése: doc() csak dokumentum-path-ra (páros komponensszám) működik; kollekció exporthoz listDocuments/getDocs minta; path validáció és hibaüzenet javítása. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-28 | Implementation (Frontend) | `ts_indexing_hardening_post_fix` | sprints/03/frontend/src/characterCalc.ts, sprints/03/frontend/src/types.ts | Utókeményítés: típusos map-ek (Record/const), kulcs-szűkítések standardizálása, hogy a TS7053-szerű indexelési hibák a későbbiekben se jöjjenek vissza. (Utólag dokumentált, időablak-becslés.) |

---

## 4. Minőségbiztosítás: hogyan lett validálva az AI output?

### 4.1 Kötelező validációs lépések (MVP baseline)

- **TypeScript ellenőrzés**: build / typecheck
- **Unit tesztek**: számítási logika és segédfüggvények
- **Smoke / E2E**: Firebase Emulator Suite + seed + Cucumber jellegű futtatás
- **Lokális futtatás**: Vite dev server (`localhost:5173`) és kézi smoke
- **Deploy ellenőrzés**: Hosting release után minimál flow (login → dashboard → create character)

### 4.2 “AI javaslat → merge” tipikus folyamat

1. Probléma/igény definiálása (hibaüzenet, feature cél)
2. AI javaslatok összevetése a repo struktúrával és a product spec-kel
3. Implementáció a kódbázisban
4. Futás: `npm run build` + releváns tesztek
5. Emulator/prod viselkedés ellenőrzés (ha Firestore/Auth érintett)
6. Dokumentálás (`ai_log.jsonl`, ADR, vagy érintett guide)

---

## 5. Etika, átláthatóság, megfelelőség (értékelői szemmel)

### 5.1 Plágium és eredetiség

- A szakdolgozatban bemutatott megoldások **saját integrációval** és **mérhető validációval** (tesztek, futtatás) kerülnek bemutatásra.
- Az AI output “ötlet / váz” jellegű támogatás, a végleges implementáció és felelősség **emberi**.

### 5.2 Prompt hygiene (adatvédelem)

- Nem kerültek AI inputba: jelszavak, API kulcsok, privát kulcsok, service account secret.
- **Kiemelt kockázat a repo struktúrából:** a `scripts/` alatt látható Firebase Admin SDK JSON típusú kulcs **érzékeny**.  
  **Mitigáció:** kulcs eltávolítása verziókezelésből, gitignore, kulcs rotáció a Firebase Console-ban, CI-ben secret file injektálás.

### 5.3 Traceability

- A használat visszakövethető: `ai_log.jsonl` + a generált dokumentumok és scriptek útvonalai.
- Az architektúra döntések ADR-ekben rögzítettek (pl. platform/stack/IaC).

---

## 6. Korlátok és kockázatok (AI használatból)

| Kockázat | Leírás | Mitigáció |
|---|---|---|
| Hallucináció / pontatlan javaslat | AI adhat nem illeszkedő megoldást | build/test, repo-olvasás, emulator validáció |
| Biztonsági félreértések | Firestore rules, auth flow hibák | ownership rules célállapot, Security doc, emulator tesztek |
| “Copy-paste” integráció | minőségi regresszió kockázat | review + egységes kódstílus + tesztek |
| Secret kezelés | kulcs/credential kiszivárgás | gitignore + secret store + rotáció |

---

## 7. Javasolt leadási forma (mit érdemes beadni)

- **Elsődlegesen:** Markdown (repo-ban verziózva, review-zható)
- **Opcionálisan:** PDF export a beadandó csomaghoz (könnyebb bírálói olvasás)

**Konverzió javaslat:** Markdown → PDF (pl. VS Code / pandoc / GitLab render).  
*(A tartalom így is teljes értékű, a PDF csak prezentáció.)*

---

## 8. Melléklet A — Teljes időrendi kivonat (ai_log.jsonl)

| Dátum | Task | Fázis | Artifacts (részlet) | Notes (rövid) |
|---|---|---|---|---|
| 2025-10-05 | `interview_questions` | Discovery & Requirements | sprints/01/interviews/ | Segítséggel összeállítottam az Anima: Beyond Fantasy játékosok számára készült kérdőívet, a karakteralkotás élményéről és nehézségeiről. |
| 2025-10-07 | `interview_analysis` | Discovery & Requirements | sprints/01/interviews/001-anna.json, sprints/01/interviews/002-bence.json, sprints/01/interviews/003-dorka.json | A kitöltött kérdőívek válaszait JSON formátumba rendeztem és a visszatérő mintákat azonosítottam. |
| 2025-10-09 | `market_research` | Discovery & Requirements | sprints/01/market/competitors.csv | Elemeztem három fő versenytársat (D&D Beyond, Dreonar, Pathbuilder 2e) és összefoglaltam az erősségeiket és gyengeségeiket CSV formátumban. |
| 2025-10-11 | `adr_authoring` | Architecture & Decisions | sprints/01/architecture/adr/0001-first-tech-choice.md | Kidolgoztam a technológiai döntést: Angular + Spring Boot + MySQL stack az MVP fejlesztéséhez, dokumentálva ADR formátumban. |
| 2025-10-13 | `prd_update` | Other | sprints/01/prd.yaml | A PRD-t frissítettem az interjú- és piackutatási eredményekkel, kiegészítve új pain pointokkal és mérőszámokkal. |
| 2025-11-23 | `abf_scope_alignment` | Discovery & Requirements | sprints/01/discovery/abf_scope_notes.md | Rögzítettem a karakteralkotó webapp célját, a fő user flow-t (wizard jelleg), és a legfőbb kockázatokat (szabálykönyv pontosság, számítások… |
| 2025-12-08 | `thesis_stack_validation_react_php_mysql` | Other | sprints/02/thesis/stack/01-react-php-mysql-rationale.md | Szakdolgozati stack validálása: 3-rétegű felépítés (React UI → PHP/Laravel API → MySQL), és milyen szakmai mélységek teszik ‘védhetővé’ (AP… |
| 2025-12-09 | `backend_framework_choice_laravel_over_plain_php` | Other | sprints/02/thesis/backend/02-laravel-choice.md | Backend keretezés: miért Laravel (routing, kontrollerek/service réteg, ORM/migration, validáció, auth, tesztelhetőség), és miért legyen a R… |
| 2025-12-10 | `auth_strategy_outline_token_vs_cookie` | Other | sprints/02/thesis/security/03-auth-strategy.md | SPA+API auth irányok: token alapú (Sanctum/JWT) vs cookie+CSRF; kockázatok (XSS token tárolás), és szakdolgozati szempontból jól kommunikál… |
| 2025-12-11 | `api_endpoints_mvp_design` | Other | sprints/02/thesis/api/04-endpoints.md | MVP endpoint váz: auth (register/login/logout), rulesets lekérés, character CRUD (draft/finalize), validate, export (PDF), és egységes hiba… |
| 2025-12-12 | `deployment_option_do_single_domain_reverse_proxy` | Deployment & Infra | sprints/02/thesis/deploy/05-do-single-domain.md | DigitalOcean éles felállás minták: egy domain alatt React statikus kiszolgálás + /api alatt Laravel (Nginx→php-fpm) + MySQL csak belső háló… |
| 2025-12-13 | `deployment_option_docker_compose_skeleton_plan` | Deployment & Infra | sprints/02/thesis/deploy/06-docker-compose-plan.md | Docker Compose-os stack terv: nginx (reverse proxy + React statikus), php-fpm (Laravel), mysql (belső), opcionális redis/cache + TLS; cél: … |
| 2025-12-14 | `firebase_with_mysql_reality_check` | Deployment & Infra | sprints/02/thesis/cloud/07-firebase-mysql.md | Firebase + MySQL együtt: React nem csatlakozik közvetlen DB-re; minták: Firebase Hosting + Cloud Run/Functions backend + Cloud SQL for MySQ… |
| 2025-12-15 | `gcp_architecture_hosting_cloudrun_cloudsql` | Deployment & Infra | sprints/02/thesis/cloud/08-hosting-cloudrun-cloudsql.md | GCP út: Firebase Hosting (React) → Cloud Run (konténeres API) → Cloud SQL (Postgres/MySQL); /api proxyzás Hostingból; DB elérés env változó… |
| 2025-12-16 | `apache_vs_nginx_tradeoffs_for_api_container` | Deployment & Infra | sprints/02/thesis/deploy/09-apache-vs-nginx.md | Apache+mod_php vs Nginx+php-fpm konténerben: gyors indulás vs ipari standard/komponens-szétválasztás; döntési szabály ‘minél hamarabb működ… |
| 2025-12-17 | `extensibility_rules_engine_separation` | Other | sprints/02/thesis/architecture/10-rules-engine-separation.md | Bővíthetőség alapelvek: szabálymotor kiszervezése (CharacterBuildService/RulesetService/ValidationService), migráció + seed, versionált rul… |
| 2025-12-18 | `abf_character_creator_scope_to_wizard_steps` | Other | sprints/02/abf/wizard/11-wizard-steps.md | ABF karakteralkotó wizard lépések konkretizálása (MVP): alapadatok → faj/kaszt/background → attribútum/pontelosztás → skill/secondary → elő… |
| 2025-12-19 | `firestore_domain_model_minimum` | Other | sprints/02/abf/data/12-firestore-domain-model.md | Minimál adatmodell: users/{uid}/characters alá karakter dokumentumok; config/skills + config/levelrules; races/classes kollekciók; draft me… |
| 2025-12-20 | `dashboard_list_view_requirements` | Discovery & Requirements | sprints/02/abf/ui/13-dashboard-requirements.md | Dashboard követelmények: karakterlista (name/archetype/level/updatedAt), CRUD gombok, reszponzív kártya/lista, dátumformázás Timestamp→ISO,… |
| 2025-12-21 | `firestore_query_patterns_for_character_list` | Other | sprints/02/abf/data/14-firestore-query-patterns.md | Lekérdezési minták: collection(users/{uid}/characters) + orderBy(updatedAt desc) + limit; opcionális where szűrők; valós idejű frissítéshez… |
| 2025-12-22 | `character_calc_module_scaffold` | Implementation (Frontend) | sprints/02/abf/calc/15-characterCalc-scaffold.ts | Számítási modul alapozása: safeNumber, statBonus, derived értékek (LP, fatigue, initiative, movement, resistances, presence), és skill szám… |
| 2025-12-23 | `skill_meta_and_labels_mapping` | Implementation (Frontend) | sprints/02/abf/calc/16-skill-meta-labels.ts | SKILL_META és STAT_LABEL mapping kialakítása: skillId→(név, keyStat); stat kulcsok egységesítése StatKey típussal; UI-ban konzisztens címké… |
| 2025-12-24 | `class_costs_schema_alignment` | Other | sprints/02/abf/rules/17-class-schema.md | Kaszt JSON séma rögzítése: limits (combat/supernatural/psychic), dpCosts (primary/secondaryGroups/lp), reducedCosts (skills), és levelBonus… |
| 2025-12-26 | `warrior_class_json_completion` | Other | sprints/02/abf/rules/classes/warrior.json | Warrior kaszt kiegészítése a konzisztens sémára: dpCosts primary és secondaryGroups egységesítése, reducedCosts (pl. fea), és a levelBonuse… |
| 2025-12-28 | `advantages_extraction_structuring` | Other | sprints/02/abf/rules/advantages/18-advantages-extract.md | Előnyök (advantages) strukturálása mezőkre: name/cost/effects/restrictions/special; példák listázása és a későbbi CP költés + automatikus m… |
| 2025-12-29 | `advantage_model_json_draft` | Other | sprints/02/abf/rules/advantages/advantage_model.json | Advantage modell váz: id/slug, name, cost (több opció), effects (szöveg + gépesíthető tag-ek), restrictions/special; cél: UI-ban kiválaszth… |
| 2026-01-02 | `rulebook_ingestion_plan_for_accuracy` | Other | sprints/02/abf/rules/19-ingestion-plan.md | Szabálykönyv feldolgozási terv: mely táblázatok/oldalak kritikusak a számítási pontossághoz, olvashatósági követelmények (táblák), és hogya… |
| 2026-01-06 | `ai_web_builders_landscape_scan` | Implementation (Frontend) | sprints/03/research/20-ai-builders-overview.md | AI/No-code + React export tájkép: v0 (prompt→UI), Builder.io (vizuális + CMS), Plasmic (vizuális builder + export), Locofy/Anima (Figma→Rea… |
| 2026-01-07 | `figma_to_react_codegen_limitations` | Implementation (Frontend) | sprints/03/uiux/21-figma-codegen-limitations.md | Figma→kód realitások: a codegen tipikusan csak layoutot ad; hiányzó részek: routing, state, validáció, mentés, domain modell; javaslat: des… |
| 2026-01-08 | `figma_export_quality_checklist` | Implementation (Frontend) | sprints/03/uiux/22-figma-export-checklist.md | Export-minőség checklist: Auto Layout, variants, normális layer naming, abszolút pozicionálás minimalizálása; cél: tisztább generált React/… |
| 2026-01-09 | `ui_wireframe_tailwind_strategy` | Implementation (Frontend) | sprints/03/uiux/23-tailwind-wireframe-strategy.md | Wireframe stratégia: első iterációban 1–2 képernyő (Login/Dashboard) export; kerülni a marketing landing blokkokat; wizard UI alap komponen… |
| 2026-01-10 | `vite_react_tailwind_setup_plan` | Other | sprints/03/frontend/setup/24-vite-tailwind-setup.md | Vite+React projekt setup terv: Tailwind telepítés, tailwind.config content, global CSS bekötés, gyors preview a generált UI-hoz; cél: expor… |
| 2026-01-11 | `recommended_workflow_ai_refactor_pass` | Other | sprints/03/research/25-ai-refactor-workflow.md | Ajánlott workflow: Figma UI → Anima/Locofy export (UI váz) → AI-vezérelt refaktor (router oldalak, Zustand store, React Hook Form + Zod), s… |
| 2026-01-14 | `deployment_routes_decision_matrix` | Deployment & Infra | sprints/03/architecture/26-deploy-decision-matrix.md | Publikálási döntési mátrix: ‘ingyen és gyors’ (Firebase Hosting + Firestore) vs ‘SQL kell’ (Supabase Postgres / Cloud SQL) vs ‘PHP+MySQL kö… |
| 2026-01-15 | `react_firebase_mvp_backbone_finalize` | Other | sprints/03/architecture/adr/0002-react-firebase-choice.md | MVP gerinc rögzítése: React/TS + Firebase Auth + Firestore; wizard logika külön calc/rules rétegben; minimál karaktermentés és későbbi bőví… |
| 2026-01-16 | `ts7053_error_identification` | Other | sprints/03/frontend/bugs/27-ts7053-identify.md | TS7053 hiba azonosítása: dinamikus kulcs (string) indexel Record<StatKey,...>-en; tipikus helyek: STAT_LABEL map, Object.keys iterációk, ko… |
| 2026-01-17 | `ts7053_reproduction_min_case` | Implementation (Frontend) | sprints/03/frontend/bugs/28-ts7053-min-repro.ts | Minimál reprodukció: ‘Element implicitly has an any type… can’t be used to index type Record<StatKey,string>’; a hiba oka: a key típusa str… |
| 2026-01-18 | `record_key_narrowing_fix_design` | Other | sprints/03/frontend/fixes/29-record-key-narrowing.md | Javítási minta: kulcsok szűkítése (as StatKey[] / type guard), helper függvények safeNumber/normalizálás, és ahol kell: Record helyett expl… |
| 2026-01-19 | `character_creator_typing_cleanup` | Implementation (Frontend) | sprints/03/frontend/src/CharacterCreatorPage.tsx, sprints/03/frontend/src/characterCalc.ts | Komponens- és helper-típusok rendezése: StatKey, PrimaryStats, CombatAbilityKey, BaseLifeConfig; a dinamikus indexelések kitakarítása a TS7… |
| 2026-01-20 | `stat_label_access_safe_helper` | Implementation (Frontend) | sprints/03/frontend/src/characterCalc.ts | STAT_LABEL biztonságos elérés: getStatLabel(stat: StatKey) wrapper, illetve Object.entries/keys bejárásnál kulcsok típusszűkítése; cél: ‘an… |
| 2026-01-21 | `final_ts7053_fix_application` | Implementation (Frontend) | sprints/03/frontend/src/CharacterCreatorPage.tsx, sprints/03/frontend/src/characterCalc.ts | TS7053 fix alkalmazása: Record<StatKey,...> indexelés csak StatKey kulccsal, type guard/assertek; a komponensben a dinamikus stat mezők ren… |
| 2026-01-22 | `dashboard_firestore_listing_impl` | Implementation (Frontend) | sprints/03/frontend/src/DashboardPage.tsx | Dashboard implementáció: auth state figyelés, Firestore query (orderBy/limit/where), CharacterRow mezők, formatDate Timestamp→Date→YYYY-MM-… |
| 2026-01-23 | `creator_config_parallel_loading_impl` | Implementation (Frontend) | sprints/03/frontend/src/CharacterCreatorPage.tsx | Config betöltés párhuzamosítva Promise.all-al: races/classes kollekciók + config/skills + config/levelrules; cfgLoading/cfgError state és s… |
| 2026-01-24 | `creator_ui_sections_refine_impl` | Implementation (Frontend) | sprints/03/frontend/src/CharacterCreatorPage.tsx | UI szekciók finomítása: Secondary Abilities grid, skill sorok, final érték ‘pill’ UI, dashboardra vissza-navigáció, debug JSON blokk ellenő… |
| 2026-01-25 | `derived_stats_breakdown_display` | Implementation (Frontend) | sprints/03/frontend/src/CharacterCreatorPage.tsx, sprints/03/frontend/src/characterCalc.ts | Derived statok és skill bontások megjelenítése: Base + Bonus + Class per level; clamp/floor safeNumber-rel; a getFinalSkillValue és getClas… |
| 2026-01-26 | `class_data_consistency_pass` | Other | sprints/03/rules/classes/warrior.json, sprints/03/rules/classes/schema.md | Kaszt adatok konzisztencia pass: limits/dpCosts/levelBonuses szerkezet egységesítése, hogy a számoló réteg minden kasztot ugyanazzal a logi… |
| 2026-01-27 | `abf_rulebook_ingestion_plan_finalize` | Other | sprints/03/rules/abf_ingestion/plan.md | ABF rulebook ingestion terv véglegesítése: kritikus táblázatok listája, pontossági ellenőrzési pontok, és a ‘worksheet’/UI struktúrává alak… |
| 2026-01-28 | `firestore_export_script_path_fix` | Tooling & Data Ops | sprints/03/tools/export-firestore-doc.mjs, sprints/03/tools/export-notes/firestore-paths.md | Firestore export hiba kezelése: doc() csak dokumentum-path-ra (páros komponensszám) működik; kollekció exporthoz listDocuments/getDocs mint… |
| 2026-01-28 | `ts_indexing_hardening_post_fix` | Implementation (Frontend) | sprints/03/frontend/src/characterCalc.ts, sprints/03/frontend/src/types.ts | Utókeményítés: típusos map-ek (Record/const), kulcs-szűkítések standardizálása, hogy a TS7053-szerű indexelési hibák a későbbiekben se jöjj… |

---
