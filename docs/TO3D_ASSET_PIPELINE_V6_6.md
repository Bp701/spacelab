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
