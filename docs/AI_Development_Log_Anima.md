# 10) AI Development Log — *Anima Character Builder*

**Projekt:** Anima Character Builder (szakdolgozati MVP)  
**Verzió:** v0.1 (Sprint 2 / Sprint 3 fejlesztési idősáv)  
**Dátum:** 2026-01-29  
**Státusz:** Draft (értékelői átnézésre kész)  
**Közönség:** fejlesztők, értékelők/bírálók  
**Formátum:** Markdown  
**Forrás:** `ai_log.jsonl` (strukturált napló)

---

## 1. Cél és értelmezés

Ez a napló **átláthatóan dokumentálja**, hogy a fejlesztés során **mikor, mire és milyen módon** lett AI eszköz (ChatGPT) használva.

A napló célja:

- **átláthatóság** (traceability): mely feladathoz milyen AI-támogatás kapcsolódott  
- **ellenőrizhetőség**: az eredmények visszakövethetők az `artifacts` mezőben hivatkozott fájlokra  
- **minőségbiztosítás**: rögzíti, hogy az AI-javaslatok **emberi validáció után** kerültek integrálásra

> Fontos: a napló *fejlesztési* jellegű (tervezés, implementáció, hibajavítás, dokumentálás). Nem helyettesíti a forráskódot, commit history-t vagy a teszteket — csak kiegészíti azokat.

---

## 2. Használati elvek (amit az értékelők tipikusan néznek)

### 2.1 Human-in-the-loop (emberi felelősség)

- Az AI által javasolt megoldások **mindig ember által ellenőrzöttek** (build/test futtatás, TypeScript típushibák javítása, lokális/emulator tesztek).
- Az AI output **nem kerül automatikusan** “copy-paste” módon élesbe; minden integráció után **validáció** történik.

### 2.2 Adatkezelés és érzékeny tartalmak

- A napló **nem tartalmaz** felhasználói PII-t vagy jelszavakat.
- Ha a repóban van érzékeny állomány (pl. service account JSON), azt **nem AI inputként** kezeljük, hanem *secret*-ként (gitignore/CI secret file).  
  *(Ez egyben “tanulság”: ilyen fájl public repo-ban nem maradhat.)*

### 2.3 Reprodukálhatóság

- A naplóban szereplő feladatokhoz kapcsolódó outputok visszakereshetők az `artifacts` útvonalak alapján.
- A lokális reprodukálhatóság kulcsa: **Vite + (opcionális) Firebase Emulator Suite**.

---

## 3. Napló formátuma (mezők)

A bejegyzések JSONL sorokból állnak, a mezők:

- `date`: YYYY-MM-DD
- `tool`: használt AI eszköz (itt: ChatGPT)
- `task`: rövid, egyértelmű feladat-azonosító
- `decision`: a javaslat integrálásának státusza (itt: `accepted`)
- `artifacts`: érintett fájlok/mappák útvonalai
- `notes`: rövid leírás (mit adott hozzá az AI, mire lett használva)

> Megjegyzés: több bejegyzésben szerepel „Utólag dokumentált, időablak-becslés.” — ezeknél a naplózás **retrospektív**, de explicit módon jelölt.

---

## 4. Összegzés (snapshot)

- **Bejegyzések száma:** 49
- **Idősáv:** 2025-10-05 → 2026-01-28
- **Eszköz:** ChatGPT (49/49 bejegyzés)

---

## 5. Időrendi bejegyzések

| Dátum | Task | Decision | Artifacts | Notes |
|---|---|---|---|---|
| 2025-10-05 | interview_questions | accepted | sprints/01/interviews/ | Segítséggel összeállítottam az Anima: Beyond Fantasy játékosok számára készült kérdőívet, a karakteralkotás élményéről és nehézségeiről. |
| 2025-10-07 | interview_analysis | accepted | sprints/01/interviews/001-anna.json<br>sprints/01/interviews/002-bence.json<br>sprints/01/interviews/003-dorka.json | A kitöltött kérdőívek válaszait JSON formátumba rendeztem és a visszatérő mintákat azonosítottam. |
| 2025-10-09 | market_research | accepted | sprints/01/market/competitors.csv | Elemeztem három fő versenytársat (D&D Beyond, Dreonar, Pathbuilder 2e) és összefoglaltam az erősségeiket és gyengeségeiket CSV formátumban. |
| 2025-10-11 | adr_authoring | accepted | sprints/01/architecture/adr/0001-first-tech-choice.md | Kidolgoztam a technológiai döntést: Angular + Spring Boot + MySQL stack az MVP fejlesztéséhez, dokumentálva ADR formátumban. |
| 2025-10-13 | prd_update | accepted | sprints/01/prd.yaml | A PRD-t frissítettem az interjú- és piackutatási eredményekkel, kiegészítve új pain pointokkal és mérőszámokkal. |
| 2025-11-23 | abf_scope_alignment | accepted | sprints/01/discovery/abf_scope_notes.md | Rögzítettem a karakteralkotó webapp célját, a fő user flow-t (wizard jelleg), és a legfőbb kockázatokat (szabálykönyv pontosság, számítások, UX). |
| 2025-12-08 | thesis_stack_validation_react_php_mysql | accepted | sprints/02/thesis/stack/01-react-php-mysql-rationale.md | Szakdolgozati stack validálása: 3-rétegű felépítés (React UI → PHP/Laravel API → MySQL), és milyen szakmai mélységek teszik ‘védhetővé’ (API tervezés, biztonság, DB tervezés, teszt, deployment). (Utólag dokumentált, időablak-becslés.) |
| 2025-12-09 | backend_framework_choice_laravel_over_plain_php | accepted | sprints/02/thesis/backend/02-laravel-choice.md | Backend keretezés: miért Laravel (routing, kontrollerek/service réteg, ORM/migration, validáció, auth, tesztelhetőség), és miért legyen a React egy tiszta SPA, a PHP pedig tiszta JSON API. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-10 | auth_strategy_outline_token_vs_cookie | accepted | sprints/02/thesis/security/03-auth-strategy.md | SPA+API auth irányok: token alapú (Sanctum/JWT) vs cookie+CSRF; kockázatok (XSS token tárolás), és szakdolgozati szempontból jól kommunikálható minimál biztonsági csomag. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-11 | api_endpoints_mvp_design | accepted | sprints/02/thesis/api/04-endpoints.md | MVP endpoint váz: auth (register/login/logout), rulesets lekérés, character CRUD (draft/finalize), validate, export (PDF), és egységes hibamodell javaslat (code/message/path/severity). (Utólag dokumentált, időablak-becslés.) |
| 2025-12-12 | deployment_option_do_single_domain_reverse_proxy | accepted | sprints/02/thesis/deploy/05-do-single-domain.md | DigitalOcean éles felállás minták: egy domain alatt React statikus kiszolgálás + /api alatt Laravel (Nginx→php-fpm) + MySQL csak belső hálón; előnyök (nincs CORS, egyszerűbb auth), és alternatíva (külön subdomain). (Utólag dokumentált, időablak-becslés.) |
| 2025-12-13 | deployment_option_docker_compose_skeleton_plan | accepted | sprints/02/thesis/deploy/06-docker-compose-plan.md | Docker Compose-os stack terv: nginx (reverse proxy + React statikus), php-fpm (Laravel), mysql (belső), opcionális redis/cache + TLS; cél: reprodukálható telepítés (bírálóknál plusz pont). (Utólag dokumentált, időablak-becslés.) |
| 2025-12-14 | firebase_with_mysql_reality_check | accepted | sprints/02/thesis/cloud/07-firebase-mysql.md | Firebase + MySQL együtt: React nem csatlakozik közvetlen DB-re; minták: Firebase Hosting + Cloud Run/Functions backend + Cloud SQL for MySQL; alternatíva: Data Connect SQL de Postgres. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-15 | gcp_architecture_hosting_cloudrun_cloudsql | accepted | sprints/02/thesis/cloud/08-hosting-cloudrun-cloudsql.md | GCP út: Firebase Hosting (React) → Cloud Run (konténeres API) → Cloud SQL (Postgres/MySQL); /api proxyzás Hostingból; DB elérés env változókkal és privát kapcsolati mintákkal. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-16 | apache_vs_nginx_tradeoffs_for_api_container | accepted | sprints/02/thesis/deploy/09-apache-vs-nginx.md | Apache+mod_php vs Nginx+php-fpm konténerben: gyors indulás vs ipari standard/komponens-szétválasztás; döntési szabály ‘minél hamarabb működjön’ vs ‘későbbi több szolgáltatás’. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-17 | extensibility_rules_engine_separation | accepted | sprints/02/thesis/architecture/10-rules-engine-separation.md | Bővíthetőség alapelvek: szabálymotor kiszervezése (CharacterBuildService/RulesetService/ValidationService), migráció + seed, versionált ruleset, és számításokra regression tesztek. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-18 | abf_character_creator_scope_to_wizard_steps | accepted | sprints/02/abf/wizard/11-wizard-steps.md | ABF karakteralkotó wizard lépések konkretizálása (MVP): alapadatok → faj/kaszt/background → attribútum/pontelosztás → skill/secondary → előny/hátrány → review+mentés → karakterlap nézet + export. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-19 | firestore_domain_model_minimum | accepted | sprints/02/abf/data/12-firestore-domain-model.md | Minimál adatmodell: users/{uid}/characters alá karakter dokumentumok; config/skills + config/levelrules; races/classes kollekciók; draft mentési pontok a wizardban. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-20 | dashboard_list_view_requirements | accepted | sprints/02/abf/ui/13-dashboard-requirements.md | Dashboard követelmények: karakterlista (name/archetype/level/updatedAt), CRUD gombok, reszponzív kártya/lista, dátumformázás Timestamp→ISO, és jogosultság: csak saját UID alatt. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-21 | firestore_query_patterns_for_character_list | accepted | sprints/02/abf/data/14-firestore-query-patterns.md | Lekérdezési minták: collection(users/{uid}/characters) + orderBy(updatedAt desc) + limit; opcionális where szűrők; valós idejű frissítéshez onSnapshot. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-22 | character_calc_module_scaffold | accepted | sprints/02/abf/calc/15-characterCalc-scaffold.ts | Számítási modul alapozása: safeNumber, statBonus, derived értékek (LP, fatigue, initiative, movement, resistances, presence), és skill számítás váz (base + class bonus + stat). (Utólag dokumentált, időablak-becslés.) |
| 2025-12-23 | skill_meta_and_labels_mapping | accepted | sprints/02/abf/calc/16-skill-meta-labels.ts | SKILL_META és STAT_LABEL mapping kialakítása: skillId→(név, keyStat); stat kulcsok egységesítése StatKey típussal; UI-ban konzisztens címkék és számítási paraméterek. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-24 | class_costs_schema_alignment | accepted | sprints/02/abf/rules/17-class-schema.md | Kaszt JSON séma rögzítése: limits (combat/supernatural/psychic), dpCosts (primary/secondaryGroups/lp), reducedCosts (skills), és levelBonuses struktúra a számoló logika egységes kezeléséhez. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-26 | warrior_class_json_completion | accepted | sprints/02/abf/rules/classes/warrior.json | Warrior kaszt kiegészítése a konzisztens sémára: dpCosts primary és secondaryGroups egységesítése, reducedCosts (pl. fea), és a levelBonuses tömb előkészítése. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-28 | advantages_extraction_structuring | accepted | sprints/02/abf/rules/advantages/18-advantages-extract.md | Előnyök (advantages) strukturálása mezőkre: name/cost/effects/restrictions/special; példák listázása és a későbbi CP költés + automatikus módosítók előkészítése. (Utólag dokumentált, időablak-becslés.) |
| 2025-12-29 | advantage_model_json_draft | accepted | sprints/02/abf/rules/advantages/advantage_model.json | Advantage modell váz: id/slug, name, cost (több opció), effects (szöveg + gépesíthető tag-ek), restrictions/special; cél: UI-ban kiválasztható, számításokra alkalmazható. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-02 | rulebook_ingestion_plan_for_accuracy | accepted | sprints/02/abf/rules/19-ingestion-plan.md | Szabálykönyv feldolgozási terv: mely táblázatok/oldalak kritikusak a számítási pontossághoz, olvashatósági követelmények (táblák), és hogyan lesz belőle UI ‘worksheet’ struktúra. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-06 | ai_web_builders_landscape_scan | accepted | sprints/03/research/20-ai-builders-overview.md | AI/No-code + React export tájkép: v0 (prompt→UI), Builder.io (vizuális + CMS), Plasmic (vizuális builder + export), Locofy/Anima (Figma→React); mire jók és mire nem (app logika vs UI váz). (Utólag dokumentált, időablak-becslés.) |
| 2026-01-07 | figma_to_react_codegen_limitations | accepted | sprints/03/uiux/21-figma-codegen-limitations.md | Figma→kód realitások: a codegen tipikusan csak layoutot ad; hiányzó részek: routing, state, validáció, mentés, domain modell; javaslat: design-spec és app logika szétválasztása. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-08 | figma_export_quality_checklist | accepted | sprints/03/uiux/22-figma-export-checklist.md | Export-minőség checklist: Auto Layout, variants, normális layer naming, abszolút pozicionálás minimalizálása; cél: tisztább generált React/Tailwind kód és könnyebb refaktor. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-09 | ui_wireframe_tailwind_strategy | accepted | sprints/03/uiux/23-tailwind-wireframe-strategy.md | Wireframe stratégia: első iterációban 1–2 képernyő (Login/Dashboard) export; kerülni a marketing landing blokkokat; wizard UI alap komponensek (stepper, form layout, cards). (Utólag dokumentált, időablak-becslés.) |
| 2026-01-10 | vite_react_tailwind_setup_plan | accepted | sprints/03/frontend/setup/24-vite-tailwind-setup.md | Vite+React projekt setup terv: Tailwind telepítés, tailwind.config content, global CSS bekötés, gyors preview a generált UI-hoz; cél: exportált komponensek ‘életre keltése’ normális projektstruktúrában. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-11 | recommended_workflow_ai_refactor_pass | accepted | sprints/03/research/25-ai-refactor-workflow.md | Ajánlott workflow: Figma UI → Anima/Locofy export (UI váz) → AI-vezérelt refaktor (router oldalak, Zustand store, React Hook Form + Zod), számítási modulok és mentési réteg integrálása. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-14 | deployment_routes_decision_matrix | accepted | sprints/03/architecture/26-deploy-decision-matrix.md | Publikálási döntési mátrix: ‘ingyen és gyors’ (Firebase Hosting + Firestore) vs ‘SQL kell’ (Supabase Postgres / Cloud SQL) vs ‘PHP+MySQL kötelező’ (Cloud Run + Cloud SQL MySQL vagy DO VPS). (Utólag dokumentált, időablak-becslés.) |
| 2026-01-15 | react_firebase_mvp_backbone_finalize | accepted | sprints/03/architecture/adr/0002-react-firebase-choice.md | MVP gerinc rögzítése: React/TS + Firebase Auth + Firestore; wizard logika külön calc/rules rétegben; minimál karaktermentés és későbbi bővíthetőség (ruleset verzió). (Utólag dokumentált, időablak-becslés.) |
| 2026-01-16 | ts7053_error_identification | accepted | sprints/03/frontend/bugs/27-ts7053-identify.md | TS7053 hiba azonosítása: dinamikus kulcs (string) indexel Record<StatKey,...>-en; tipikus helyek: STAT_LABEL map, Object.keys iterációk, komponens-oldali mapping. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-17 | ts7053_reproduction_min_case | accepted | sprints/03/frontend/bugs/28-ts7053-min-repro.ts | Minimál reprodukció: ‘Element implicitly has an any type… can’t be used to index type Record<StatKey,string>’; a hiba oka: a key típusa string, nem StatKey. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-18 | record_key_narrowing_fix_design | accepted | sprints/03/frontend/fixes/29-record-key-narrowing.md | Javítási minta: kulcsok szűkítése (as StatKey[] / type guard), helper függvények safeNumber/normalizálás, és ahol kell: Record helyett explicit map + biztos kulcs. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-19 | character_creator_typing_cleanup | accepted | sprints/03/frontend/src/CharacterCreatorPage.tsx<br>sprints/03/frontend/src/characterCalc.ts | Komponens- és helper-típusok rendezése: StatKey, PrimaryStats, CombatAbilityKey, BaseLifeConfig; a dinamikus indexelések kitakarítása a TS7053 megelőzéséhez. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-20 | stat_label_access_safe_helper | accepted | sprints/03/frontend/src/characterCalc.ts | STAT_LABEL biztonságos elérés: getStatLabel(stat: StatKey) wrapper, illetve Object.entries/keys bejárásnál kulcsok típusszűkítése; cél: ‘any’ implicit tiltás megszüntetése. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-21 | final_ts7053_fix_application | accepted | sprints/03/frontend/src/CharacterCreatorPage.tsx<br>sprints/03/frontend/src/characterCalc.ts | TS7053 fix alkalmazása: Record<StatKey,...> indexelés csak StatKey kulccsal, type guard/assertek; a komponensben a dinamikus stat mezők renderelése típushelyesen. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-22 | dashboard_firestore_listing_impl | accepted | sprints/03/frontend/src/DashboardPage.tsx | Dashboard implementáció: auth state figyelés, Firestore query (orderBy/limit/where), CharacterRow mezők, formatDate Timestamp→Date→YYYY-MM-DD; reszponzív lista váz. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-23 | creator_config_parallel_loading_impl | accepted | sprints/03/frontend/src/CharacterCreatorPage.tsx | Config betöltés párhuzamosítva Promise.all-al: races/classes kollekciók + config/skills + config/levelrules; cfgLoading/cfgError state és safe async cleanup ‘alive’ flaggel. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-24 | creator_ui_sections_refine_impl | accepted | sprints/03/frontend/src/CharacterCreatorPage.tsx | UI szekciók finomítása: Secondary Abilities grid, skill sorok, final érték ‘pill’ UI, dashboardra vissza-navigáció, debug JSON blokk ellenőrzéshez. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-25 | derived_stats_breakdown_display | accepted | sprints/03/frontend/src/CharacterCreatorPage.tsx<br>sprints/03/frontend/src/characterCalc.ts | Derived statok és skill bontások megjelenítése: Base + Bonus + Class per level; clamp/floor safeNumber-rel; a getFinalSkillValue és getClassSkillBonusPerLevel egységes használata UI-ban. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-26 | class_data_consistency_pass | accepted | sprints/03/rules/classes/warrior.json<br>sprints/03/rules/classes/schema.md | Kaszt adatok konzisztencia pass: limits/dpCosts/levelBonuses szerkezet egységesítése, hogy a számoló réteg minden kasztot ugyanazzal a logikával tudjon kezelni. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-27 | abf_rulebook_ingestion_plan_finalize | accepted | sprints/03/rules/abf_ingestion/plan.md | ABF rulebook ingestion terv véglegesítése: kritikus táblázatok listája, pontossági ellenőrzési pontok, és a ‘worksheet’/UI struktúrává alakítás menete. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-28 | firestore_export_script_path_fix | accepted | sprints/03/tools/export-firestore-doc.mjs<br>sprints/03/tools/export-notes/firestore-paths.md | Firestore export hiba kezelése: doc() csak dokumentum-path-ra (páros komponensszám) működik; kollekció exporthoz listDocuments/getDocs minta; path validáció és hibaüzenet javítása. (Utólag dokumentált, időablak-becslés.) |
| 2026-01-28 | ts_indexing_hardening_post_fix | accepted | sprints/03/frontend/src/characterCalc.ts<br>sprints/03/frontend/src/types.ts | Utókeményítés: típusos map-ek (Record/const), kulcs-szűkítések standardizálása, hogy a TS7053-szerű indexelési hibák a későbbiekben se jöjjenek vissza. (Utólag dokumentált, időablak-becslés.) |

---

## 6. Rövid értékelői megjegyzések

- A log alapján az AI támogatás jellemzően **(1) specifikáció/döntési dokumentumok** (ADR/PRD), **(2) TypeScript típushibák** (TS7053), **(3) Firestore tooling** (export/seed) és **(4) UI/komponens bontás** területeken jelent meg.
- A kritikus részeknél (auth, firestore path-ok, security rules) az AI output csak akkor használható, ha **tesztelve** és **környezetben validálva** van (emulator/prod).
- A napló “traceability” jellegű: az `artifacts` mezőkből a reviewer vissza tudja keresni a konkrét implementációt.

---

## 7. Következő lépések a napló minőségének további javításához

- `decision` mező bővítése (`rejected`, `partially_accepted`)
- prompt/rövid input összefoglalók rögzítése (PII nélkül)
- automatikus naplózás a PR/commit linkeléssel (pl. commit hash)

---
