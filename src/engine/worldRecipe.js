export const worldRecipe = {
  id: "",
  name: "",
  type: "",
  seed: "",
  location: {
    planet: "",
    country: "",
    region: "",
    city: "",
    place: "",
    latitude: null,
    longitude: null,
  },
  layers: [],
  pointsOfInterest: [],
  narration: {
    guide: "Luna",
    intro: "",
    entries: [],
  },
  weather: {
    provider: "",
    latitude: null,
    longitude: null,
    url: "",
    fallback: "Pogoda offline",
  },
  assets: {
    basePath: "",
    images: {},
  },
};

export function createWorldRecipe(recipe) {
  return {
    ...worldRecipe,
    ...recipe,
    location: {
      ...worldRecipe.location,
      ...(recipe.location || {}),
    },
    narration: {
      ...worldRecipe.narration,
      ...(recipe.narration || {}),
    },
    weather: {
      ...worldRecipe.weather,
      ...(recipe.weather || {}),
    },
    assets: {
      ...worldRecipe.assets,
      ...(recipe.assets || {}),
    },
  };
}
