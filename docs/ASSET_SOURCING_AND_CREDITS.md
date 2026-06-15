# SpaceLab — Asset Sourcing & Credits

Ten dokument opisuje, skąd mogą (i nie mogą) pochodzić assety 3D w SpaceLab oraz
jak je kredytować. Obowiązuje razem z quality gate z `docs/TO3D_ASSET_PIPELINE_V6_6.md`
(sekcja „V6.6.4 Asset LAB Quality Gate").

Złota zasada: **żaden asset nie wchodzi do manifestu bez jasnej, weryfikowalnej
licencji.** W razie wątpliwości — nie commituj.

## Preferowane: assety proceduralne / wewnętrzne

- Najbezpieczniejsze źródło to geometria budowana w kodzie (np. skrypt generujący
  `copernix-probe-v001.glb`).
- Należą w całości do projektu, nie mają problemów licencyjnych ani podobieństwa
  do cudzych zdjęć.
- `sourceType: "procedural"`, `license: "internal procedural asset"`.

## Dozwolone źródła zewnętrzne

Tylko z czytelną, otwartą licencją i zapisanym dowodem:

- **CC0** (public domain) — najwygodniejsze, atrybucja nieobowiązkowa, ale i tak
  warto zapisać źródło. `sourceType: "cc0"`.
- **CC-BY** — dozwolone pod warunkiem podania atrybucji (autor + link + licencja)
  w sekcji „Credits" poniżej. `sourceType: "cc-by"`.

Dla każdego assetu zewnętrznego zapisz: nazwę, autora, URL źródła, typ licencji
i datę pobrania.

## Zakazane źródła

- Modele bez podanej licencji lub z licencją niejasną/„do ustalenia".
- Assety „znalezione w internecie" bez dowodu pochodzenia.
- Modele z licencją niekomercyjną/„editorial only", jeśli kolidują z użyciem.
- Rip-y z gier, paczki o niepewnym pochodzeniu, re-uploady bez oryginalnej licencji.
- Duże skany fotogrametryczne i ciężkie tekstury 2K/4K/8K (poza limitami mobile).

## Ostrzeżenie: Google Maps / Street View / Earth

- **Nie** używaj zrzutów ani modeli pochodzących z Google Maps, Google Earth,
  Street View ani podobnych usług mapowych jako źródła assetów.
- Te dane są objęte warunkami usługi i prawami osób trzecich — to nie jest
  materiał o otwartej licencji.
- Nie konwertuj zdjęć/zrzutów z tych usług w narzędziach image-to-3D.

## Reguła: brak licencji = brak modelu

Jeśli nie potrafisz wskazać konkretnej, weryfikowalnej licencji dla pobranego
modelu, **nie** dodawaj go do `assetManifest.js` ani do `public/assets3d/`.
Zamiast tego rozważ wersję proceduralną.

## Credits

Lista atrybucji dla assetów CC-BY (uzupełniać przy dodawaniu):

| Asset | Autor | Źródło (URL) | Licencja | Data |
| ----- | ----- | ------------ | -------- | ---- |
| (brak — obecnie wszystkie assety są proceduralne) | — | — | — | — |
