# SpaceLab V6.6 - to3D Asset Pipeline LAB

## Cel

Ten moduł przygotowuje bezpieczne laboratorium dla przyszłych modeli 3D tworzonych z obrazów w narzędziach typu to3D, image-to-3D lub podobnych. Asset LAB nie zastępuje planet, Terra Mode, Aurory, City Buildera ani żadnego obecnego gameplayu.

LAB służy do testowania jednego lekkiego modelu naraz, zanim jakikolwiek asset trafi do głównej sceny.

## Workflow

1. Obraz referencyjny.
2. Konwersja w to3D lub podobnym narzędziu.
3. Eksport do GLB/glTF.
4. Ręczna kontrola rozmiaru, geometrii i tekstur.
5. Umieszczenie pliku testowego w `public/assets3d/lab/`.
6. Dopisanie wpisu w `src/assetlab/assetManifest.js`.
7. Test w Asset LAB viewer.
8. Dopiero po akceptacji: decyzja, czy asset może wejść do konkretnego trybu gry.

## Struktura folderów

```text
public/
  assets3d/
    lab/
      .gitkeep
      example-model.glb

src/
  assetlab/
    AssetViewer.jsx
    assetManifest.js

docs/
  TO3D_ASSET_PIPELINE_V6_6.md
```

## Nazewnictwo assetów

Używaj krótkich, małych nazw bez spacji:

```text
olsztyn-cathedral-v001.glb
lyna-bridge-v001.glb
copernix-probe-v001.glb
```

Zasady:
- tylko małe litery,
- słowa rozdzielone myślnikiem,
- numer wersji `v001`, `v002`, `v003`,
- bez polskich znaków w nazwach plików,
- jeden model testowy na raz.

## Limity mobilne

Pierwszy test mobilny:
- GLB poniżej 3 MB,
- tekstury maksymalnie 1024 px,
- preferowany low-poly,
- bez dużych skanów fotogrametrycznych,
- bez ciężkich materiałów PBR na start,
- jeden model w Asset LAB na raz.

Docelowo model musi działać na szerokości około 390 px bez czarnego ekranu, utraty sterowania i widocznego spadku płynności.

## Limity GLB i tekstur

Rekomendacje:
- pierwszy model: poniżej 3 MB,
- późniejsze eksperymenty: każdy przypadek osobno,
- tekstury: 1024 px max,
- geometria: low-poly lub ręcznie uproszczona,
- materiały: proste, bez nadmiaru map,
- preferowany pojedynczy plik `.glb`.

## Czego nie commitować

Nie commituj:
- dużych GLB,
- pełnych dumpów fotogrametrii,
- plików źródłowych z narzędzi 3D,
- tekstur 2K/4K/8K,
- eksportów roboczych typu `final-final-2.glb`,
- paczek ZIP z assetami,
- plików z licencją niejasną albo niezweryfikowaną.

Duże assety powinny trafić do osobnego procesu assetowego, nie do głównej sceny gry.

## Ryzyka

- Duży GLB może zablokować mobile GPU.
- Zbyt ciężkie tekstury zwiększą czas ładowania i zużycie pamięci.
- Modele z image-to-3D mogą mieć brudną geometrię.
- Asset może wyglądać dobrze w miniaturze, ale źle w scenie 3D.
- Automatyczne modele mogą mieć problemy z licencją lub podobieństwem do źródłowego zdjęcia.
- Włączenie ciężkiego modelu do głównej sceny może zepsuć obecny SpaceLab flow.

## V6.6.1 Safe Preview Loader

Asset LAB ma teraz opcjonalny, bezpieczny podgląd GLB oparty o istniejące zależności `@react-three/fiber` i `@react-three/drei`. Loader używa `useGLTF`, ale działa tylko wtedy, gdy wybrany wpis manifestu ma niepuste pole `file`.

### Jak działa ładowanie GLB

1. Asset LAB otwiera się jako osobny overlay.
2. Lista assetów pochodzi z `src/assetlab/assetManifest.js`.
3. Jeśli wpis ma `file: ""`, viewer pokazuje komunikat placeholder.
4. Jeśli wpis ma `file`, viewer tworzy lekki podgląd w Canvas i próbuje wczytać GLB.
5. W czasie ładowania pokazuje status `Ładowanie modelu GLB...`.
6. Po sukcesie pokazuje `Podgląd GLB aktywny`.
7. Przy błędzie pokazuje komunikat błędu w panelu, a aplikacja nie powinna się wysypać.

### Gdy plik nie istnieje

Jeśli manifest wskazuje plik, którego nie ma w `public/assets3d/lab/`, Asset LAB przełączy podgląd w stan błędu. To jest oczekiwane zachowanie testowe. Brak albo uszkodzony GLB nie może zatrzymać SpaceLab.

### Jak dodać jeden mały testowy GLB

1. Przygotuj plik poniżej 3 MB.
2. Upewnij się, że tekstury mają maksymalnie 1024 px.
3. Nazwij plik bez spacji i polskich znaków, np. `copernix-probe-v001.glb`.
4. Umieść go w `public/assets3d/lab/copernix-probe-v001.glb`.
5. Dopisz wpis w `src/assetlab/assetManifest.js`:

```js
{
  id: "copernix-probe-v001",
  name: "Copernix Probe v001",
  file: "copernix-probe-v001.glb",
  type: "glb",
  status: "lab",
  description: "Pierwszy mały testowy model GLB w Asset LAB."
}
```

6. Testuj model tylko w Asset LAB, nie w głównej scenie.

### Mobile safety checklist

- Szerokość testowa: około 390 px.
- Pierwszy GLB poniżej 3 MB.
- Jeden model naraz.
- Tekstury maksymalnie 1024 px.
- Brak dużych skanów fotogrametrycznych.
- Sprawdź, czy overlay nadal da się zamknąć.
- Sprawdź, czy po zamknięciu SpaceLab dalej działa.
- Sprawdź, czy Terra Mode i Badge Gallery nadal działają.

### Rollback rule

Jeśli model psuje płynność, powoduje czarny ekran albo zawiesza mobile, najpierw usuń lub wyczyść wpis `file` w `assetManifest.js`. Nie zaczynaj od przerabiania głównej sceny. Asset LAB ma być bezpiecznym bezpiecznikiem: manifest decyduje, czy model w ogóle próbuje się ładować.

## Plan integracji

Faza LAB:
- viewer pokazuje manifest i metadane,
- brak wpływu na główną scenę,
- brak ciężkich modeli w gameplayu.

Faza preview:
- dodać bezpieczne ładowanie GLB tylko po otwarciu Asset LAB,
- obsłużyć brak pliku i błąd ładowania,
- dodać limit jednego modelu.

Faza gameplay:
- wybrać jeden sprawdzony asset,
- dodać go do konkretnego trybu, nie globalnie,
- przetestować desktop i mobile,
- zostawić fallback proceduralny.

## Obecny status V6.6

Asset LAB jest trybem eksperymentalnym. W tej wersji viewer jest placeholder-only i nie ładuje jeszcze GLB. Dzięki temu pipeline jest bezpieczny, lekki i nie wpływa na planety, Terra Mode, Aurorę, City Builder, Badge Gallery, Debug Panel ani Guided Demo.

## V6.6.3 First Micro GLB Test Asset

Pierwszy realny, lekki model GLB w Asset LAB. Powstał w pełni proceduralnie, lokalnie i offline — żeby sprawdzić ścieżkę podglądu GLB na prawdziwym pliku, bez żadnych zewnętrznych assetów.

### Dane modelu

- Nazwa: **Sonda Copernix v001**
- Plik: `public/assets3d/lab/copernix-probe-v001.glb`
- Wpis w manifeście: `id: "copernix-probe-v001"`, `type: "glb"`, `status: "test"`
- Generowany proceduralnie skryptem: `scripts/generate-copernix-probe-v001.mjs`

### Z czego się składa

Niskopoligonowa, czytelna sonda zbudowana wyłącznie z brył podstawowych (box, cylinder, sphere, cone):
- centralny korpus (grafit/ciemny szary),
- dwa panele słoneczne na ramionach (granat/niebieski),
- maszt anteny z jasnoszarą końcówką,
- akcent cyan/teal (pasek + sensor),
- mały dysz/thruster z tyłu.

Kolory są płaskie (flat shading), bez tekstur obrazkowych.

### Pochodzenie i licencja

- 100% proceduralny — geometria budowana w kodzie.
- Brak modeli z Sketchfab, Poly Pizza, NASA ani innych źródeł third-party.
- Brak pobierania z internetu (skrypt działa offline).
- Brak tekstur, brak animacji.
- Czysty licencyjnie — model należy do projektu.

### Generacja (eksport GLB)

Eksport używa `GLTFExporter` z Three.js w trybie binarnym. Ponieważ skrypt działa w Node (bez DOM), dołączony jest minimalny offline polyfill `FileReader` oparty na natywnym `Blob.arrayBuffer()` — bez nowych zależności i bez sieci.

Regeneracja:

```
node scripts/generate-copernix-probe-v001.mjs
```

### Limity mobilne (oczekiwane)

- Rozmiar pliku: ~22 KB (cel < 200 KB, twardy limit < 1 MB) — z dużym zapasem.
- Bez tekstur (0 obrazów), bez animacji.
- Niska liczba wierzchołków (kilka brył) — bezpieczne dla telefonów ~390px.
- Ładowany tylko po otwarciu Asset LAB i wybraniu modelu (lazy), nie w głównej scenie.

### Jak usunąć model, jeśli powoduje problemy z wydajnością

1. W `src/assetlab/assetManifest.js` wyczyść pole `file` we wpisie `copernix-probe-v001` (ustaw `file: ""`) — viewer przestanie próbować go ładować i pokaże komunikat o braku modelu. To najszybszy bezpiecznik, bez ruszania głównej sceny.
2. Opcjonalnie usuń cały wpis `copernix-probe-v001` z manifestu.
3. Opcjonalnie usuń plik `public/assets3d/lab/copernix-probe-v001.glb` (można go odtworzyć skryptem).

Nigdy nie zaczynaj od modyfikacji głównej sceny Solar System / Terra — manifest jest jedynym przełącznikiem.

### Checklista testów

- [ ] `npm run build` przechodzi.
- [ ] Asset LAB otwiera się z doku (przycisk „🧊 Asset LAB").
- [ ] Wpis „Sonda Copernix v001" jest na liście (status `test`).
- [ ] Po wybraniu modelu podgląd GLB ładuje się i obraca.
- [ ] Wpisy placeholder / planned nadal nie wywołują crasha (pokazują „Brak modelu").
- [ ] Przycisk zamknięcia działa.
- [ ] Główna scena SpaceLab, Terra Mode i Badge Gallery działają jak wcześniej.
- [ ] Layout mobilny ~390px jest czytelny.

## V6.6.4 Asset LAB Quality Gate

Warstwa kontroli jakości dla Asset LAB. Każdy asset 3D musi czytelnie pokazywać
pochodzenie, licencję, rozmiar pliku, stan tekstur, status testu mobilnego oraz
status jakości i instrukcję fallback. To zadanie metadata/UI/dokumentacja — nie
dodaje nowych modeli GLB, nie zmienia gameplayu.

### Po co quality gate

- Zanim jakikolwiek asset zbliży się do gameplayu, musi przejść świadomą kontrolę.
- Brak metadanych = brak akceptacji. Pole „nie ustawiono" to sygnał ostrzegawczy.
- Quality gate chroni mobile (GPU, pamięć, płynność) i chroni projekt prawnie
  (jasna licencja, brak podejrzanych źródeł).
- Manifest pozostaje jedynym bezpiecznikiem: wyczyszczenie pola `file` natychmiast
  wyłącza ładowanie modelu, bez ruszania głównej sceny.

### Jakie metadane trzeba śledzić

Każdy wpis w `src/assetlab/assetManifest.js` powinien deklarować:

- `sourceType` — `"procedural" | "cc0" | "cc-by" | "unknown"`
- `license` — czytelny opis licencji (lub `null`)
- `fileSizeKb` — rozmiar pliku w KB (`number | null`)
- `textureStatus` — `"none" | "512" | "1024" | "unknown"`
- `mobileStatus` — `"pending" | "passed" | "failed"`
- `qualityStatus` — `"test" | "passed" | "failed"`
- `fallback` — instrukcja, co zrobić, gdy asset sprawia problemy (lub `null`)

Pola są opcjonalne — viewer pokazuje „nie ustawiono", gdy ich brak, więc wpisy
placeholder nigdy się nie wysypują.

### Jak zaakceptować asset (approve)

1. Uzupełnij wszystkie pola metadanych w manifeście (żadne nie powinno być puste).
2. Sprawdź licencję i pochodzenie (patrz `docs/ASSET_SOURCING_AND_CREDITS.md`).
3. Otwórz Asset LAB, wybierz model, potwierdź, że GLB ładuje się i obraca.
4. Wykonaj test mobilny (~390px). Po sukcesie ustaw `mobileStatus: "passed"`.
5. Gdy wszystko jest czyste, ustaw `qualityStatus: "passed"`.

### Jak odrzucić / wyłączyć asset (fail/disable)

1. Ustaw `qualityStatus: "failed"` (i `mobileStatus: "failed"`, jeśli to problem mobilny).
2. Wyczyść pole `file` (`file: ""`) — viewer przestanie próbować ładować model.
3. Opcjonalnie usuń cały wpis lub plik GLB.
4. Nigdy nie zaczynaj od modyfikacji głównej sceny — manifest jest przełącznikiem.

### Reguła testu mobilnego

Asset nie może dostać `qualityStatus: "passed"`, dopóki nie przejdzie testu na
szerokości około 390px: bez czarnego ekranu, bez utraty sterowania, bez widocznego
spadku płynności. Dopóki test mobilny się nie odbył, `mobileStatus` zostaje
`"pending"`.

### Reguła legalnego pochodzenia

- Preferowane są assety proceduralne / wewnętrzne (`sourceType: "procedural"`).
- Dozwolone tylko źródła z jasną licencją (CC0, CC-BY z atrybucją).
- Żaden pobrany model bez dowodu licencji nie wchodzi do manifestu.
- Szczegóły i zakazane źródła: `docs/ASSET_SOURCING_AND_CREDITS.md`.
