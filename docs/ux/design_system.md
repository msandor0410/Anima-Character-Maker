# Design System / Vizuális nyelv

## UI könyvtár / komponensrendszer

Az alkalmazás egyedi React komponensekre és saját CSS stílusokra épül.  
Külön külső UI framework, például MUI vagy Bootstrap nincs használatban.  
A felület React + TypeScript + Vite alapú SPA-ként működik.

## Színpaletta

A projekt jelenlegi UI-ja sötét témájú, fantasy hangulatú megjelenést használ.  
A pontos színek CSS változókból származnak, de a vizuális szerepek a következők:

- **Primary:** meleg kiemelő szín
- **Secondary:** sötét felületi háttér
- **Accent:** kiemelésekhez használt hangsúlyszín
- **Success:** implicit, főként pozitív állapotoknál
- **Warning:** figyelmeztető kiemelések
- **Error:** hibák és veszélyzóna elemek
- **Surface:** sötét kártya- és panelháttér
- **Text:** világos, jól olvasható szöveg

## Tipográfia

A felület egy egységes sans-serif tipográfiát használ.  
A szöveghierarchia fő elemei:

- nagy cím a főoldalak és szekciók tetején
- közepes alcímek a kártyák és szekciók fejléceiben
- normál törzsszöveg
- kisebb méretű segédszöveg és metaadatok

A betűvastagság elsősorban normál, medium és bold szinteken jelenik meg.

## Spacing / layout

Az alkalmazás központi kártyás elrendezést használ.  
A tartalom tipikusan:

- fix fejléc alatt jelenik meg
- középre rendezett fő tartalomterületben
- kártyás blokkokra bontva

A spacing következetes, 8–16–24 px jellegű ritmust követ.

## Sötét mód

A jelenlegi felület alapvetően sötét megjelenésű.  
Külön világos/sötét mód váltás jelenleg nincs.

## Reszponzivitás

Az alkalmazás elsősorban desktop használatra optimalizált, de a layout több helyen rugalmas konténereket és oszlopos blokkokat használ.  
A nagy adatbevitelre épülő oldalak, például a karakterkészítő és szerkesztő nézet, desktop nézetben használhatók a legkényelmesebben.

## Forrás / tervezési alap

A felület saját fejlesztésű, közvetlenül a projekt implementációja során alakult ki.  
A vizuális rendszer elsősorban az alkalmazás fantasy témájához, olvashatóságához és funkcionális használhatóságához igazodik.