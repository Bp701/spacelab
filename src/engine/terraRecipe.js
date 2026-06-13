import { createWorldRecipe } from "./worldRecipe";

export const terraRecipe = createWorldRecipe({
  id: "terra-olsztyn-v1",
  name: "AndromedaBridge Terra: Olsztyn",
  type: "terra",
  seed: "copernix-terra-olsztyn-001",
  location: {
    planet: "Ziemia",
    country: "Polska",
    region: "Warmia i Mazury",
    city: "Olsztyn",
    place: "Wyspa Tumska",
    latitude: 53.7784,
    longitude: 20.4801,
  },
  layers: [
    { id: "space", name: "Kosmos", type: "transition" },
    { id: "earth", name: "Ziemia", type: "planet" },
    { id: "poland", name: "Polska", type: "country" },
    { id: "warmia", name: "Warmia i Mazury", type: "region" },
    { id: "olsztyn", name: "Olsztyn", type: "city" },
    { id: "wyspa-tumska", name: "Wyspa Tumska", type: "local-area" },
  ],
  pointsOfInterest: [
    {
      id: "katedra",
      icon: "🏰",
      name: "Katedra św. Jakuba",
      palette: ["#263B7A", "#8F6B3A", "#FFD089"],
      image: "/terra/katedra.jpg",
      visual: "cathedral",
      route: "Katedra → przybliżenie → widok wnętrza → Luna",
      narration:
        "Witaj odkrywco. Przed tobą Katedra św. Jakuba, jeden z najmocniejszych punktów starego Olsztyna. Zatrzymaj się na chwilę i spójrz na jej wysoką bryłę jak na lokalną latarnię. Gotyckie mury nie są tylko tłem do zdjęcia. To zapis miasta, które rosło wokół rynku, zamku i warmińskich traktów. W jej cieniu przechodzili kupcy, mieszkańcy, muzycy i ludzie, którzy szukali orientacji w mieście tak samo jak ty po lądowaniu. Luna sugeruje: zacznij od wieży, potem przejdź wzrokiem do wejścia, a na końcu wyobraź sobie dźwięk organów odbijający się od cegieł. Ten punkt jest kotwicą misji.",
    },
    {
      id: "lyna",
      icon: "🌊",
      name: "Rzeka Łyna",
      palette: ["#123D5A", "#1FB8E0", "#9BE7FF"],
      image: "/terra/lyna.jpg",
      visual: "river",
      route: "Łyna → nurt rzeki → spływ kajakiem → Luna",
      narration:
        "Witaj odkrywco. Łyna jest wodną osią Olsztyna. Nie musisz mieć mapy satelitarnej, żeby poczuć jej kierunek. Rzeka prowadzi przez miasto spokojniej niż ulice, ale pamięta więcej niż większość budynków. Płynie obok zielonych skarp, pod mostami i blisko miejsc, w których Olsztyn zmienia tempo z miejskiego na parkowe. Luna podpowiada: słuchaj jej jak ścieżki. Jeśli kosmos daje szeroki plan, Łyna daje lokalny rytm. Tu zaczyna się zejście z orbity do konkretu: szum wody, cień drzew, wilgotne powietrze i Warmia widziana z poziomu człowieka.",
    },
    {
      id: "most",
      icon: "🌉",
      name: "Most / Park nad Łyną",
      palette: ["#241B3D", "#D9A441", "#5EE6A0"],
      image: "/terra/most.jpg",
      visual: "bridge",
      route: "Most → park nad Łyną → przejście piesze → Luna",
      narration:
        "Witaj odkrywco. Most i park nad Łyną są punktem przejścia: z jednego brzegu miasta na drugi, ale też z perspektywy kosmicznej do lokalnego świata. W AndromedaBridge most nie jest dekoracją. Jest decyzją. Stajesz na nim po lądowaniu i widzisz, że trasa nie kończy się na Olsztynie jako nazwie. Prowadzi dalej: do ścieżek, zieleni, rzeki, katedry, ludzi i pamięci miejsca. Luna mówi: przejdź powoli. Po jednej stronie zostawiasz orbitę, po drugiej zaczynasz Wirtualną Warmię. To tu moduł staje się mostem, a nie tylko kolejnym ekranem.",
    },
  ],
  narration: {
    guide: "Luna",
    intro: "Moduł lądowania: Kosmos → Ziemia → Warmia i Mazury → Olsztyn",
    entries: ["Katedra św. Jakuba", "Rzeka Łyna", "Most / Park nad Łyną"],
  },
  weather: {
    provider: "open-meteo",
    latitude: 53.7784,
    longitude: 20.4801,
    url: "https://api.open-meteo.com/v1/forecast?latitude=53.7784&longitude=20.4801&current_weather=true&wind_speed_unit=kmh",
    fallback: "Pogoda offline",
  },
  assets: {
    basePath: "/terra/",
    images: {
      katedra: "/terra/katedra.jpg",
      lyna: "/terra/lyna.jpg",
      most: "/terra/most.jpg",
      planetarium: "/terra/planetarium.jpg",
    },
  },
});
