# User Journeys

## Journey 1 — Bejelentkezés és új karakter létrehozása

**Persona:** Egy visszatérő játékos, aki gyorsan szeretne belépni és létrehozni egy új Anima karaktert.  
**Belépési pont:** S01 — Login

### Lépések

1. **S01 — Login**  
   A user megadja az email címét és jelszavát, majd a **Log In** gombra kattint.  
   **Rendszerválasz:** sikeres hitelesítés után a Dashboard oldal nyílik meg.  
   **Hibaág:** hibás hitelesítési adatok esetén hibaüzenet jelenik meg.

2. **S03 — Dashboard**  
   A user a **New Character** gombra kattint.  
   **Rendszerválasz:** megnyílik az új karakter létrehozó oldal.  
   **Hibaág:** ha elérte a karakterlimitet, az új karakter gomb le van tiltva.

3. **S04 — New Character**  
   A user kitölti az alapadatokat: név, szint, class, opcionálisan race, majd beállítja a karakter főbb tulajdonságait.  
   **Rendszerválasz:** a rendszer betölti a referenciaadatokat és számolja a derived értékeket.  
   **Hibaág:** ha a név hiányzik, vagy a level/class nincs kiválasztva, a mentés nem történik meg.

4. **S04 — New Character**  
   A user a **Save** műveletet indítja el.  
   **Rendszerválasz:** a karakter mentésre kerül Firestore-ba a felhasználó saját karakterei közé, majd a rendszer a karakter részletes oldalára navigál.  
   **Hibaág:** mentési vagy jogosultsági hiba esetén hibaüzenet jelenik meg.

5. **S05 — Character Details**  
   A user látja az újonnan létrehozott karakter részletes adatait.  
   **Sikerkritérium:** a karakter mentése sikeres, és a létrehozott karakter megnyitható.  

**Becsült idő:** kb. 30–90 másodperc, a kitöltés részletességétől függően.

---

## Journey 2 — Karakter megtekintése és szerkesztése

**Persona:** Egy játékos, aki egy korábban létrehozott karakterét szeretné megnyitni és módosítani.  
**Belépési pont:** S03 — Dashboard

### Lépések

1. **S03 — Dashboard**  
   A user kiválaszt egy meglévő karaktert, majd az **Edit** linkre kattint.  
   **Rendszerválasz:** megnyílik a karakter szerkesztő oldal.

2. **S06 — Character Edit**  
   A user módosítja a karakter adatait, például a statokat, skill értékeket vagy egyéb mezőket.  
   **Rendszerválasz:** a rendszer újraszámolja a kapcsolódó derived értékeket és DP összesítéseket.  
   **Hibaág:** ha kötelező mező hiányzik vagy a konfiguráció nem tölthető be, a mentés nem hajtható végre.

3. **S06 — Character Edit**  
   A user menti a módosításokat.  
   **Rendszerválasz:** a karakter Firestore dokumentuma frissül, az `updatedAt` mező módosul, majd a rendszer a részletek oldalra navigál.

4. **S05 — Character Details**  
   A user ellenőrzi a frissített karakteradatokat.  
   **Sikerkritérium:** a módosított adatok megjelennek a karakter részletes nézetében.

**Becsült idő:** kb. 15–60 másodperc.

---

## Journey 3 — Karakter használata játék közben

**Persona:** Egy aktív játékos, aki játék közben szeretné a karaktere aktuális állapotát követni és frissíteni.  
**Belépési pont:** S03 — Dashboard

### Lépések

1. **S03 — Dashboard**  
   A user a kiválasztott karakternél a **Game** linkre kattint.  
   **Rendszerválasz:** megnyílik a játék közbeni karakterkezelő nézet.

2. **S07 — Character Game**  
   A user módosítja az aktuális játékállapothoz kapcsolódó értékeket, például a fatigue, life point vagy XP értékeket.  
   **Rendszerválasz:** a módosítások helyileg megjelennek, és az oldal jelzi, hogy nem mentett lokális változtatások vannak.

3. **S07 — Character Game**  
   A user a **Commit** gombra kattint.  
   **Rendszerválasz:** a változtatások mentésre kerülnek a Firestore-ba.  
   **Hibaág:** mentési hiba esetén hibaüzenet jelenik meg.

4. **S07 — Character Game**  
   Opcionálisan a user elindíthatja a **level up** folyamatot, ha elég XP-je van.  
   **Rendszerválasz:** a rendszer ellenőrzi a feltételeket és lehetővé teszi az új szinthez tartozó módosításokat.

**Sikerkritérium:** a játék közbeni állapotváltozások menthetők és visszatöltődnek.  
**Becsült idő:** kb. 10–30 másodperc egy gyors állapotfrissítéshez.