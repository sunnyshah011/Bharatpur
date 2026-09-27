const GOOGLE_PLACES_URL =
    "https://places.googleapis.com/v1/places:searchNearby";

const GOOGLE_TEXT_SEARCH_URL =
    "https://places.googleapis.com/v1/places:searchText";

const GOOGLE_MAPS_API_KEY =
    process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
    console.warn(
        "⚠️ GOOGLE_MAPS_API_KEY is not configured"
    );
}

/*
========================================
BHARATPUR SEARCH AREA
========================================

This is intentionally used only as the
initial Google search area.

The exact Bharatpur boundary is applied
after Google returns the places.
========================================
*/

const BHARATPUR_CENTER = {
    latitude: 27.6833,
    longitude: 84.4333,
};

/*
Google Places allows a maximum radius
of 50,000 meters for Nearby Search.
*/

const BHARATPUR_SEARCH_RADIUS = 25000;

/*
========================================
FIELD MASK
========================================

Only request fields we actually need.

Google requires a field mask for Places API
(New), and requesting unnecessary fields can
increase processing/billing.
*/

const PLACE_FIELD_MASK = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.types",
    "places.primaryType",
    "places.rating",
    "places.userRatingCount",
    "places.businessStatus",
    "places.regularOpeningHours",
    "places.nationalPhoneNumber",
    "places.websiteUri",
].join(",");

/*
========================================
NORMALIZE GOOGLE PLACE
========================================
*/

function normalizeGooglePlace(place) {
    const latitude =
        place?.location?.latitude;

    const longitude =
        place?.location?.longitude;

    return {
        source: "google_places",

        googlePlaceId:
            place?.id || "",

        name:
            place?.displayName?.text ||
            "Unknown place",

        address:
            place?.formattedAddress ||
            "",

        latitude,
        longitude,

        types:
            Array.isArray(place?.types)
                ? place.types
                : [],

        primaryType:
            place?.primaryType ||
            "",

        rating:
            place?.rating ??
            null,

        userRatingCount:
            place?.userRatingCount ??
            null,

        businessStatus:
            place?.businessStatus ||
            null,

        openingHours:
            place?.regularOpeningHours ||
            null,

        phone:
            place?.nationalPhoneNumber ||
            null,

        website:
            place?.websiteUri ||
            null,
    };
}

/*
========================================
NEARBY SEARCH
========================================
*/

export async function searchGoogleNearby({
    includedTypes = [],
    maxResultCount = 20,
} = {}) {
    if (!GOOGLE_MAPS_API_KEY) {
        throw new Error(
            "GOOGLE_MAPS_API_KEY is not configured"
        );
    }

    const body = {
        maxResultCount: Math.min(
            Math.max(maxResultCount, 1),
            20
        ),

        rankPreference:
            "POPULARITY",

        locationRestriction: {
            circle: {
                center:
                    BHARATPUR_CENTER,

                radius:
                    BHARATPUR_SEARCH_RADIUS,
            },
        },
    };

    if (
        Array.isArray(includedTypes) &&
        includedTypes.length > 0
    ) {
        body.includedTypes =
            includedTypes.slice(0, 10);
    }

    const response =
        await fetch(
            GOOGLE_PLACES_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "X-Goog-Api-Key":
                        GOOGLE_MAPS_API_KEY,

                    "X-Goog-FieldMask":
                        PLACE_FIELD_MASK,
                },

                body:
                    JSON.stringify(body),
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        console.error(
            "Google Nearby Search error:",
            data
        );

        throw new Error(
            data?.error?.message ||
            "Google Places Nearby Search failed"
        );
    }

    return Array.isArray(data?.places)
        ? data.places.map(
            normalizeGooglePlace
        )
        : [];
}

/*
========================================
TEXT SEARCH
========================================

Useful for questions such as:

"hotels in Bharatpur"
"cafes in Bharatpur"
"restaurants in Bharatpur"
"pharmacies in Bharatpur"
========================================
*/

export async function searchGoogleText(
    query,
    {
        maxResultCount = 20,
    } = {}
) {
    if (!GOOGLE_MAPS_API_KEY) {
        throw new Error(
            "GOOGLE_MAPS_API_KEY is not configured"
        );
    }

    const body = {
        textQuery:
            `${query} in Bharatpur, Nepal`,

        pageSize: Math.min(
            Math.max(maxResultCount, 1),
            20
        ),

        locationRestriction: {
            rectangle: {
                low: {
                    latitude: 27.58,
                    longitude: 84.30,
                },

                high: {
                    latitude: 27.82,
                    longitude: 84.58,
                },
            },
        },

        languageCode: "en",

        regionCode: "NP",
    };

    const response =
        await fetch(
            GOOGLE_TEXT_SEARCH_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "X-Goog-Api-Key":
                        GOOGLE_MAPS_API_KEY,

                    "X-Goog-FieldMask":
                        PLACE_FIELD_MASK,
                },

                body:
                    JSON.stringify(body),
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        console.error(
            "Google Text Search error:",
            data
        );

        throw new Error(
            data?.error?.message ||
            "Google Places Text Search failed"
        );
    }

    return Array.isArray(data?.places)
        ? data.places.map(
            normalizeGooglePlace
        )
        : [];
}