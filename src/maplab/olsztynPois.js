// Olsztyn POI dataset for Mapa LAB (V6.7, stories added in V6.7.1).
//
// LEGAL / SAFETY:
// All points below are an internal, manually curated set. Names, categories,
// descriptions AND the educational story fields were written by hand for
// SpaceLab. They do NOT come from Google Maps, Google Places, Street View,
// Wikipedia, tourism sites, OSM descriptions, reviews, photos or any other
// third-party / scraped content. Coordinates are approximate, hand-picked for
// a city overview only. Texts make no medical/therapeutic claims and promise
// no learning outcomes.
//
// Each POI:
// - id             short stable id
// - name           display name (PL)
// - category       simple child-friendly category
// - description    short child-friendly description
// - missionHint    optional playful "mission" hint (or null)
// - coordinates    { lng, lat } (WGS84)
// - source         provenance note
//
// Story fields (V6.7.1):
// - storyTitle      title of the short educational story
// - story           short original child-friendly story / explanation
// - curiosity       one fun "did you know?" style fact, written from scratch
// - observationTask small thing a child can look for / do in real life
// - childQuestion   open question to spark the child's own thinking
// - lunaNarration   the same idea in Luna's warm narrator voice
// - storyStatus     editorial status, "draft" until reviewed
// - contentSource   provenance note for the story text

// Map view centered on Olsztyn old town area.
export const OLSZTYN_CENTER = { lng: 20.481, lat: 53.778 };
export const OLSZTYN_ZOOM = 13;

const SOURCE_NOTE = "internal manually curated POI";
const STORY_SOURCE = "internal educational text";

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
    storyTitle: "Ceglany strażnik miasta",
    story:
      "Dawno, dawno temu ludzie układali jedną cegłę na drugiej, aż powstała ta ogromna katedra. Jej wieża jest tak wysoka, że wygląda, jakby chciała dotknąć chmur. Przez wiele, wiele lat stoi w tym samym miejscu i spogląda na całe miasto jak spokojny, ceglany strażnik.",
    curiosity:
      "Każda cegła była kiedyś miękką, mokrą gliną, którą trzeba było wysuszyć i wypalić w gorącym piecu, żeby stała się twarda jak kamień.",
    observationTask:
      "Spróbuj policzyć, ile pięter okien ma wieża, patrząc na nią z dołu.",
    childQuestion:
      "Jak myślisz, ile cegieł trzeba ułożyć, żeby zbudować tak wysoką wieżę?",
    lunaNarration:
      "Spójrz w górę, odkrywco. Ta wieża czeka tu na gości dłużej, niż żyje ktokolwiek, kogo znasz. Wyobraź sobie wszystkie ręce, które ułożyły jej cegły.",
    storyStatus: "draft",
    contentSource: STORY_SOURCE,
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
    storyTitle: "Woda w podróży",
    story:
      "Łyna nigdy się nie zatrzymuje. Płynie i płynie przez miasto, dzień i noc, lato i zimę. Woda, którą dziś widzisz pod mostem, jutro będzie już daleko, w nowym miejscu. Rzeka to taka wodna ścieżka, która zawsze jest w podróży.",
    curiosity:
      "Kropla wody potrafi przepłynąć całą rzekę i nigdy nie wraca tą samą drogą — zawsze rusza dalej, do przodu.",
    observationTask:
      "Jeśli będziesz nad rzeką, popatrz, w którą stronę płynie woda, i poszukaj listka, który niesie nurt.",
    childQuestion:
      "Dokąd, jak myślisz, płynie ta woda, gdy znika ci z oczu za zakrętem?",
    lunaNarration:
      "Posłuchaj cichego szumu, odkrywco. Ta rzeka jest w nieustannej podróży — i nigdy się nie spieszy, a i tak dociera bardzo daleko.",
    storyStatus: "draft",
    contentSource: STORY_SOURCE,
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
    storyTitle: "Most, który łączy brzegi",
    story:
      "Bez mostu jeden brzeg rzeki byłby daleko od drugiego. Most jest jak wyciągnięta ręka — pozwala przejść na drugą stronę suchą stopą. W parku wokół rosną drzewa, a po ścieżkach spacerują ludzie, biegają psy i jeżdżą rowery. To miejsce, gdzie miasto się zatrzymuje i oddycha.",
    curiosity:
      "Most musi być mocny w środku, choć z wierzchu wygląda spokojnie — to dlatego, że trzyma na sobie wszystkich, którzy po nim przechodzą naraz.",
    observationTask:
      "W parku poszukaj najgrubszego drzewa i sprawdź, czy obejmiesz jego pień ramionami.",
    childQuestion:
      "Co czujesz, gdy stoisz na samym środku mostu i pod tobą płynie woda?",
    lunaNarration:
      "Każdy most to mała opowieść o łączeniu, odkrywco. Stań na środku i poczuj, że jesteś dokładnie pomiędzy dwoma brzegami.",
    storyStatus: "draft",
    contentSource: STORY_SOURCE,
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
    storyTitle: "Niebo pod kopułą",
    story:
      "Czasem w mieście świeci tak dużo świateł, że gwiazd prawie nie widać. Dlatego ludzie zbudowali planetarium — wielką, okrągłą salę z kopułą zamiast dachu. Wewnątrz robi się ciemno, a nad głową pojawiają się gwiazdy i planety, zupełnie jak na prawdziwym, nocnym niebie. To takie niebo, które można odwiedzić nawet w dzień.",
    curiosity:
      "Gwiazdy, które widzisz na niebie, są tak daleko, że ich światło leci do nas bardzo, bardzo długo, zanim trafi do twoich oczu.",
    observationTask:
      "Następnej pogodnej nocy poproś dorosłego o spacer i spróbuj znaleźć na niebie jedną najjaśniejszą gwiazdę.",
    childQuestion:
      "Gdybyś mógł polecieć do jednej planety, którą wybrałbyś i dlaczego?",
    lunaNarration:
      "Tu, pod kopułą, niebo zniża się tuż nad tobą, odkrywco. Zamknij na chwilę oczy i wyobraź sobie, że to my razem lecimy między gwiazdami.",
    storyStatus: "draft",
    contentSource: STORY_SOURCE,
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
    storyTitle: "Stare mury pełne opowieści",
    story:
      "Stare Miasto to najstarsza część Olsztyna — wąskie uliczki i kolorowe kamienice, które pamiętają bardzo dawne czasy. Stoi tu też zamek z grubymi, kamiennymi murami. Mówi się, że mieszkał w nim kiedyś człowiek, który całymi nocami patrzył w niebo i zastanawiał się, jak poruszają się gwiazdy i planety. Każdy kamień ma tu swoją cichą historię.",
    curiosity:
      "Dawniej zamki budowano z grubymi murami nie dla ozdoby, tylko po to, żeby były naprawdę mocne i trwałe przez setki lat.",
    observationTask:
      "Na starych murach poszukaj miejsca, gdzie kamienie albo cegły mają różne kształty i kolory.",
    childQuestion:
      "Gdyby te mury umiały mówić, jaką historię chciałbyś od nich usłyszeć?",
    lunaNarration:
      "Połóż dłoń na chłodnym murze, odkrywco. Dawno temu ktoś patrzył stąd w to samo niebo, w które i ty dziś spoglądasz.",
    storyStatus: "draft",
    contentSource: STORY_SOURCE,
  },
];

export default OLSZTYN_POIS;
