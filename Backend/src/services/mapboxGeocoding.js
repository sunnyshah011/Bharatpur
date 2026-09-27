import { env } from "../config/env.js";

const MAPBOX_GEOCODING_URL =
    "https://api.mapbox.com/search/geocode/v6/forward";

export const geocodePlace = async ({
    query,
    proximity = null
}) => {
    if (!query) {
        throw new Error(
            "Place query is required."
        );
    }

    const params =
        new URLSearchParams({
            q: query,
            country: "np",
            language: "en",
            limit: "5",

            /*
             * IMPORTANT:
             * We are storing the result in MongoDB.
             */
            permanent: "true",

            access_token:
                env.MAPBOX_ACCESS_TOKEN
        });

    if (
        proximity &&
        Number.isFinite(proximity.lng) &&
        Number.isFinite(proximity.lat)
    ) {
        params.set(
            "proximity",
            `${proximity.lng},${proximity.lat}`
        );
    }

    const response =
        await fetch(
            `${MAPBOX_GEOCODING_URL}?${params.toString()}`
        );

    const data =
        await response
            .json()
            .catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Mapbox geocoding failed."
        );
    }

    if (
        !data.features ||
        data.features.length === 0
    ) {
        throw new Error(
            `Could not find "${query}".`
        );
    }

    return data.features;
};