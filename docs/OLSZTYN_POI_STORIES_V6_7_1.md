# SpaceLab V6.7.1 — Olsztyn POI Stories

Krótkie, edukacyjne karty-opowieści dla dzieci, dołączone do punktów POI w Mapa
LAB. Teksty są oryginalne, napisane ręcznie na potrzeby SpaceLab. Mają bawić i
zachęcać do obserwacji świata — **nie** są materiałem encyklopedycznym ani
przewodnikiem turystycznym.

## Skąd pochodzą teksty

- Źródło: **internal educational text** (pole `contentSource` w `olsztynPois.js`).
- Status redakcyjny: każdy wpis ma `storyStatus: "draft"` do czasu recenzji.
- **Nie** kopiowano treści z: Google Maps, Google Places, Street View, Wikipedii,
  stron turystycznych, opisów OpenStreetMap, recenzji ani zdjęć.

## Zasady pisania (content rules)

- Język prosty, ciepły, dziecięco-przyjazny.
- Każda opowieść tłumaczy jeden pomysł i zachęca do samodzielnej obserwacji.
- **Bez** twierdzeń medycznych lub terapeutycznych.
- **Bez** obietnic efektów nauki („dzięki temu nauczysz się…").
- Pytania są otwarte — nie mają jednej „poprawnej" odpowiedzi.
- Każdy POI ma głos narratorki **Luny** (`lunaNarration`) spójny z resztą gry.

## Struktura pól opowieści

| Pole | Rola |
| ---- | ---- |
| `storyTitle` | Tytuł krótkiej opowieści |
| `story` | Główna, oryginalna historia / wyjaśnienie |
| `curiosity` | Jedna ciekawostka „czy wiesz, że…" |
| `observationTask` | Drobne zadanie do wykonania w realnym świecie |
| `childQuestion` | Otwarte pytanie pobudzające myślenie |
| `lunaNarration` | Ta sama myśl w głosie Luny |
| `storyStatus` | `"draft"` do czasu recenzji |
| `contentSource` | `"internal educational text"` |

## Motywy POI

1. **Katedra św. Jakuba** — „Ceglany strażnik miasta": lokalna historia,
   architektura, stare miasto.
2. **Rzeka Łyna** — „Woda w podróży": przyroda, woda, rzeka w mieście.
3. **Most / Park nad Łyną** — „Most, który łączy brzegi": spacer, mosty, ruch.
4. **Planetarium Olsztyn** — „Niebo pod kopułą": astronomia, niebo, planety.
5. **Zamek / Stare Miasto** — „Stare mury pełne opowieści": historia, wyobraźnia,
   stare miasto.

## Jak to wygląda w aplikacji

- W karcie POI pojawia się przycisk **„🌙 Opowieść Luny"** (rozwiń/zwiń).
- Domyślnie sekcja jest zwinięta, aby karta startowała kompaktowo na małych
  ekranach (~390px).
- Po rozwinięciu widać: tytuł, opowieść, ciekawostkę, zadanie obserwacyjne,
  pytanie do dziecka oraz narrację Luny.

## Jak dodać lub zmienić opowieść

1. Otwórz `src/maplab/olsztynPois.js`.
2. Znajdź właściwy POI po polu `id`.
3. Edytuj pola opowieści, trzymając się zasad pisania powyżej.
4. Zostaw `storyStatus: "draft"`, dopóki tekst nie przejdzie recenzji.
5. Uruchom `npm.cmd run build` i sprawdź kartę w Mapa LAB.

## Rollback

Pola opowieści są opcjonalne — `MapLab.jsx` pokazuje sekcję tylko, gdy POI ma
pole `story`. Usunięcie pól opowieści z danego POI po prostu ukrywa przycisk
„🌙 Opowieść Luny" dla tego punktu, bez wpływu na mapę i markery.
