# SpaceLab V6.7 — MapLibre Olsztyn LAB

## Cel

Bezpieczny, eksperymentalny moduł LAB z lekką, interaktywną mapą Olsztyna.
Otwierany z docka SpaceLab przyciskiem **„🗺️ Mapa LAB"**. Pokazuje mapę miasta z
kilkoma własnymi punktami POI. Kliknięcie znacznika otwiera dziecięco-przyjazną
kartę informacyjną.

To jest moduł **LAB**. Nie zastępuje Terra Mode i nie wpływa na Solar System,
Asset LAB, City Builder, Badge Gallery ani inne systemy.

## Co zawiera

- `src/maplab/MapLab.jsx` — overlay z mapą (MapLibre GL), markery POI, karta info,
  przycisk zamknięcia, obsługa błędów i komunikat fallback.
- `src/maplab/olsztynPois.js` — wewnętrzny, ręcznie opisany zbiór POI.
- Wpięcie w `src/CopernixSpaceLab3D_v4.jsx` (import, stan `mapLabOpen`, przycisk
  w docku, render overlaya).

## Zależność

- Dodano **tylko** `maplibre-gl` (jedyna wymagana zależność).
- Brak dodatkowych pluginów, brak Cesium, brak Google Maps API, brak backendu.

## Źródło mapy i POI

- Kafelki mapy: **OpenStreetMap** (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`),
  dane otwarte (ODbL). Atrybucja „© OpenStreetMap contributors" jest pokazywana
  przez MapLibre i w stopce panelu.
- POI: **internal manually curated POI** — nazwy, kategorie i opisy napisane
  ręcznie na potrzeby SpaceLab. Współrzędne są przybliżone, dobrane pod podgląd
  miasta.

## Lista POI

1. **Katedra św. Jakuba** — Zabytek
2. **Rzeka Łyna** — Przyroda
3. **Most / Park nad Łyną** — Park
4. **Planetarium Olsztyn** — Nauka
5. **Zamek / Stare Miasto** — Historia

Każdy POI ma: `id`, `name`, `category`, krótki dziecięco-przyjazny opis,
opcjonalny `missionHint`, `coordinates` oraz `source: "internal manually curated POI"`.

## Reguły prawne i bezpieczeństwa

To jest twarda zasada modułu Mapa LAB:

- **Nie** używamy treści Google Maps.
- **Nie** używamy zrzutów Google Street View.
- **Nie** używamy zrzutów satelitarnych (Google ani innych).
- **Nie** kopiujemy opisów, recenzji ani zdjęć z Google.
- **Nie** używamy kafelków Google ani Google Places.
- Używamy wyłącznie **własnych, ręcznie opisanych** danych POI.
- Mapa podkładowa pochodzi z OpenStreetMap (otwarte dane) z wymaganą atrybucją.

### Google Maps tylko jako link zewnętrzny

Google Maps może być użyte **wyłącznie jako zewnętrzny link** (np. „otwórz w Google
Maps" w nowej karcie), a **nigdy** jako źródło osadzonych assetów: kafelków, zdjęć,
zrzutów ekranu, opisów czy danych Places. Osadzanie takich treści w aplikacji jest
zabronione. Jeśli kiedyś dodamy przycisk do Google Maps, ma on tylko otwierać
oficjalny adres URL miejsca, bez pobierania i przechowywania treści Google.

## Bezpieczeństwo działania

- Inicjalizacja mapy jest w `try/catch`. Jeśli mapa lub kontener zawiodą, overlay
  pokazuje czytelny komunikat fallback zamiast się wysypać.
- Błędy ładowania kafelków (np. brak internetu) są logowane jako ostrzeżenia i
  **nie** zatrzymują aplikacji — markery i karty nadal działają.
- Mapa jest sprzątana (`map.remove()`) przy zamknięciu overlaya.

## Mobile / UX

- Layout dopasowany do ~390px (panel na całą szerokość, duże przyciski dotykowe).
- Markery 📍 mają powiększony obszar kliknięcia (40px), kontrolki nawigacji 38px.
- Styl ciemny/cyan zgodny z resztą SpaceLab, widoczna etykieta LAB, tekst
  przyjazny dzieciom.

## Walidacja

```
npm.cmd run build
```

Ręcznie:

1. Otwórz aplikację.
2. Kliknij „🗺️ Mapa LAB".
3. Sprawdź, że overlay się otwiera, a mapa lub fallback pojawiają się bezpiecznie.
4. Kliknij każdy marker POI i sprawdź karty z opisami.
5. Zamknij overlay i sprawdź, że SpaceLab, Terra Mode i Asset LAB nadal działają.
6. Sprawdź szerokość ~390px.

## Rollback

Jeśli moduł sprawia problemy: usuń przycisk „🗺️ Mapa LAB" z docka oraz render
`{mapLabOpen && <MapLab .../>}` w `CopernixSpaceLab3D_v4.jsx`. Moduł jest
izolowany — nie dotyka Terra Mode ani Solar System.

## V6.7.1 — Olsztyn POI Stories

Rozszerzenie Mapa LAB o krótkie, edukacyjne karty-opowieści dla dzieci. Każdy POI
ma teraz sekcję „🌙 Opowieść Luny", rozwijaną pod kartą informacyjną. Nie dodano
żadnych zależności (`package.json` / `package-lock.json` bez zmian), nie ruszano
Asset LAB, Terra Mode ani plików GLB.

### Nowe pola w `olsztynPois.js`

Dla każdego POI:

- `storyTitle` — tytuł krótkiej opowieści
- `story` — krótka, oryginalna, dziecięco-przyjazna historia / wyjaśnienie
- `curiosity` — jedna ciekawostka „czy wiesz, że..." napisana od zera
- `observationTask` — drobne zadanie obserwacyjne do wykonania w realu
- `childQuestion` — otwarte pytanie pobudzające myślenie dziecka
- `lunaNarration` — ta sama myśl w ciepłym głosie narratorki Luny
- `storyStatus` — status redakcyjny, `"draft"` do czasu recenzji
- `contentSource` — `"internal educational text"`

### Zmiany w `MapLab.jsx`

- Karta POI zyskuje przycisk „🌙 Opowieść Luny" (expand/collapse), domyślnie
  zwinięty, aby karta startowała kompaktowo (ważne na ~390px).
- Po rozwinięciu pokazuje: tytuł, opowieść, ciekawostkę, zadanie, pytanie do
  dziecka oraz narrację Luny.
- Karta ma teraz `maxHeight` + `overflowY: auto`, więc dłuższy tekst przewija się
  w obrębie mapy zamiast wychodzić poza ekran.
- Kliknięcie markera resetuje stan opowieści (każdy POI otwiera się czysto);
  zachowanie zamykania overlaya i karty pozostaje bez zmian.

### Reguły treści (V6.7.1)

- Cały tekst opowieści jest **oryginalny** i napisany ręcznie na potrzeby SpaceLab.
- **Nie** kopiujemy treści z Google Maps, Wikipedii, stron turystycznych, opisów
  OSM, recenzji ani zdjęć.
- **Brak** twierdzeń medycznych/terapeutycznych.
- **Brak** obiecywanych efektów nauki (teksty są zabawą i zachętą do obserwacji,
  nie gwarancją wyniku).
- Szczegóły i pełna treść: `docs/OLSZTYN_POI_STORIES_V6_7_1.md`.
