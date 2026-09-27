import { env } from "../config/env.js";

const MAPBOX_GEOCODING_URL =
  "https://api.mapbox.com/search/geocode/v6/forward";

const slugify = (value) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const resolvePlaceWithMapbox = async (name) => {
  const query = `${name}, Chitwan, Nepal`;

  const params = new URLSearchParams({
    q: query,
    country: "np",
    language: "en",
    limit: "5",
    autocomplete: "false",
    permanent: "true",
    access_token: env.MAPBOX_ACCESS_TOKEN,
  });

  const response = await fetch(
    `${MAPBOX_GEOCODING_URL}?${params.toString()}`
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message || "Mapbox place resolution failed."
    );
  }

  if (!Array.isArray(data.features) || data.features.length === 0) {
    throw new Error(`Could not find "${name}" in Chitwan, Nepal.`);
  }

  /*
   * Prefer POI results when available.
   * Otherwise use the first relevant result.
   */
  const feature =
    data.features.find((item) =>
      Array.isArray(item.place_type) &&
      item.place_type.includes("poi")
    ) || data.features[0];

  const coordinates = feature?.geometry?.coordinates;

  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !Number.isFinite(Number(coordinates[0])) ||
    !Number.isFinite(Number(coordinates[1]))
  ) {
    throw new Error(
      `Mapbox returned an invalid location for "${name}".`
    );
  }

  const [lng, lat] = coordinates;

  const longitude = Number(lng);
  const latitude = Number(lat);

  if (
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      `Mapbox returned invalid coordinates for "${name}".`
    );
  }

  return {
    name:
      feature?.properties?.name ||
      feature?.text ||
      name,

    slug: slugify(name),

    formattedAddress:
      feature?.properties?.full_address ||
      feature?.properties?.address ||
      feature?.place_name ||
      `${name}, Chitwan, Nepal`,

    longitude,
    latitude,

    providerPlaceId:
      feature?.properties?.mapbox_id ||
      feature?.id ||
      "",

    locationSource: "mapbox-permanent-geocoding",

    rawFeature: feature,
  };
};