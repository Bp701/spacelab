// Olsztyn POI dataset for Mapa LAB (V6.7).
//
// LEGAL / SAFETY:
// All points below are an internal, manually curated set. Names, categories and
// descriptions were written by hand for SpaceLab. They do NOT come from Google
// Maps, Google Places, Street View, reviews, photos or any third-party scraped
// content. Coordinates are approximate, hand-picked for a city overview only.
//
// Each POI:
// - id           short stable id
// - name         display name (PL)
// - category     simple child-friendly category
// - description  short child-friendly description
// - missionHint  optional playful "mission" hint (or null)
// - coordinates  { lng, lat } (WGS84)
// - source       provenance note

// Map view centered on Olsztyn old town area.
export const OLSZTYN_CENTER = { lng: 20.481, lat: 53.778 };
export const OLSZTYN_ZOOM = 13;

const SOURCE_NOTE = "internal manually curated POI";

export const OLSZTYN_POIS = [
  {
    id: "katedra-sw-jakuba",
    name: "Katedra św. Jakuba",
    category: "Zabytek",
    description:
      "Wielki, ceglany kościół w sercu starego Olsztyna. Jego wysoka wieża widoczna jest z daleka.",
    missionHint: "Policz, ile okien ma wieża, gdy patrzysz na nią z rynku.",
    coordinates: { lng: 20.4806, lat: 53.7783 },
    source: SOURCE_NOTE,
  },
  {
    id: "rzeka-lyna",
    name: "Rzeka Łyna",
    category: "Przyroda",
    description:
      "Rzeka, która spokojnie płynie przez całe miasto. Czasem widać na niej kaczki i łabędzie.",
    missionHint: "Znajdź miejsce, gdzie rzeka skręca, i pomachaj wodzie.",
    coordinates: { lng: 20.4762, lat: 53.7758 },
    source: SOURCE_NOTE,
  },
  {
    id: "most-park-nad-lyna",
    name: "Most / Park nad Łyną",
    category: "Park",
    description:
      "Zielony park nad rzeką z mostkami i ścieżkami. Świetne miejsce na spacer i odpoczynek.",
    missionHint: "Przejdź przez mostek i poszukaj największego drzewa w parku.",
    coordinates: { lng: 20.4731, lat: 53.7741 },
    source: SOURCE_NOTE,
  },
  {
    id: "planetarium-olsztyn",
    name: "Planetarium Olsztyn",
    category: "Nauka",
    description:
      "Miejsce, gdzie pod wielką kopułą można oglądać gwiazdy i planety jak w prawdziwym kosmosie.",
    missionHint: "Wyobraź sobie, że lecisz sondą Copernix nad kopułą planetarium.",
    coordinates: { lng: 20.4918, lat: 53.7826 },
    source: SOURCE_NOTE,
  },
  {
    id: "zamek-stare-miasto",
    name: "Zamek / Stare Miasto",
    category: "Historia",
    description:
      "Stary zamek i kolorowe kamienice. Dawno temu mieszkał tu Mikołaj Kopernik i patrzył w niebo.",
    missionHint: "Poszukaj na murach śladów, które zostawił dawny astronom.",
    coordinates: { lng: 20.4775, lat: 53.7779 },
    source: SOURCE_NOTE,
  },
];

export default OLSZTYN_POIS;
