import { searchGoogleText } from "./googlePlaces.service.js";

import { filterBharatpurPlaces } from "./bharatpurBoundary.service.js";

/*
========================================
KEYWORDS THAT INDICATE LIVE PLACE SEARCH
========================================
*/

const LIVE_PLACE_KEYWORDS = [
    "hotel",
    "hotels",

    "cafe",
    "cafes",
    "coffee",

    "restaurant",
    "restaurants",

    "food",
    "eat",

    "hospital",
    "hospitals",

    "pharmacy",
    "pharmacies",

    "clinic",
    "clinics",

    "bank",
    "banks",

    "atm",
    "atms",

    "fuel",
    "petrol",
    "gas",

    "school",
    "schools",

    "college",
    "colleges",

    "shopping",
    "shop",
    "shops",

    "mall",
    "malls",

    "gym",
    "gyms",

    "spa",

    "salon",
    "salons",

    "museum",
    "museums",

    "temple",
    "temples",

    "mosque",
    "church",

    "tourist",
    "attraction",
    "attractions",

    "parking",
    "police",

    "fire",
    "airport",
];


/*
========================================
ESCAPE REGEX CHARACTERS
========================================
*/

function escapeRegex(value) {
    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


/*
========================================
DETECT WHETHER LIVE GOOGLE DATA IS NEEDED
========================================
*/

export function needsLivePlaceSearch(message) {
    const text = String(message || "")
        .toLowerCase()
        .trim();

    if (!text) {
        return false;
    }

    return LIVE_PLACE_KEYWORDS.some((keyword) => {
        const regex = new RegExp(
            `\\b${escapeRegex(keyword)}\\b`,
            "i"
        );

        return regex.test(text);
    });
}


/*
========================================
BUILD GOOGLE SEARCH QUERY
========================================

Example:

"give me best hotel or restaurant for
thakali food"

becomes approximately:

"hotel restaurant thakali food in Bharatpur Nepal"

We remove conversational/filler words
but preserve important search terms.
========================================
*/

function buildSearchQuery(message) {
    let query = String(message || "")
        .toLowerCase()
        .trim();

    if (!query) {
        return "";
    }


    /*
    ----------------------------------------
    Remove Bharatpur/Chitwan location phrases
    ----------------------------------------
    */

    query = query
        .replace(
            /\b(in|inside|around|near)\s+(bharatpur metropolitan city|bharatpur|chitwan)\b/gi,
            " "
        )
        .replace(
            /\b(bharatpur metropolitan city|bharatpur|chitwan)\b/gi,
            " "
        );


    /*
    ----------------------------------------
    Remove conversational/filler phrases
    ----------------------------------------
    */

    query = query.replace(
        /\b(give\s+me|find\s+me|show\s+me|suggest|suggestions|recommend|recommendation|recommendations|can\s+you|could\s+you|please|i\s+want|i\s+need|looking\s+for|tell\s+me|where\s+can\s+i\s+find|what\s+is|what\s+are|best|good|top|nearby|near\s+me)\b/gi,
        " "
    );


    /*
    ----------------------------------------
    Remove unnecessary grammatical words
    ----------------------------------------
    */

    query = query.replace(
        /\b(the|a|an|for|me|to|of|in|around|near|please)\b/gi,
        " "
    );


    /*
    ----------------------------------------
    Remove duplicate spaces
    ----------------------------------------
    */

    query = query
        .replace(/\s+/g, " ")
        .trim();


    /*
    ----------------------------------------
    Add business type when necessary
    ----------------------------------------
    */

    /*
----------------------------------------
Normalize food/business search
----------------------------------------
*/

    const lowerQuery = query.toLowerCase();

    if (
        lowerQuery.includes("thakali") &&
        !lowerQuery.includes("restaurant")
    ) {
        query += " restaurant";
    }

    if (
        lowerQuery.includes("thakali") &&
        !lowerQuery.includes("food")
    ) {
        query += " food";
    }

    const hasBusinessType =
        /\b(hotel|restaurant|cafe|coffee|food)\b/i.test(
            lowerQuery
        );

    if (!hasBusinessType) {
        query += " restaurant";
    }


    /*
    ----------------------------------------
    Add Bharatpur location
    ----------------------------------------
    */

    return `${query} in Bharatpur Nepal`;
}


/*
========================================
GET LIVE GOOGLE PLACES CONTEXT
========================================
*/

export async function getLivePlacesContext(message) {

    /*
    ----------------------------------------
    Check whether live search is required
    ----------------------------------------
    */

    if (!needsLivePlaceSearch(message)) {
        return {
            places: [],
            context: "",
        };
    }


    /*
    ----------------------------------------
    Build Google search query
    ----------------------------------------
    */

    const query = buildSearchQuery(message);

    console.log(
        "🔎 Google Places search query:",
        query
    );


    if (!query) {
        return {
            places: [],
            context: "",
        };
    }


    /*
    ----------------------------------------
    Search Google Places
    ----------------------------------------
    */

    const googlePlaces = await searchGoogleText(
        query,
        {
            maxResultCount: 20,
        }
    );


    console.log(
        `📍 Google returned ${googlePlaces.length} places`
    );


    /*
    ----------------------------------------
    Apply actual Bharatpur boundary
    ----------------------------------------

    Google search area is only the preliminary
    geographic restriction.

    The actual Bharatpur Metropolitan City
    polygon is applied here.
    ----------------------------------------
    */

    const bharatpurPlaces =
        filterBharatpurPlaces(googlePlaces);

    console.log(
        `📍 Google places: ${googlePlaces.length}`
    );

    console.log(
        `📍 Inside Bharatpur boundary: ${bharatpurPlaces.length}`
    );

    if (googlePlaces.length > 0) {
        console.log(
            "📍 Google place sample:"
        );

        console.log(
            googlePlaces
                .slice(0, 5)
                .map((place) => ({
                    name: place.name,
                    address: place.address,
                    latitude: place.latitude,
                    longitude: place.longitude,
                }))
        );
    }


    /*
    ----------------------------------------
    Remove duplicate Google Place IDs
    ----------------------------------------
    */

    const uniquePlaces = Array.from(
        new Map(
            bharatpurPlaces
                .filter(
                    (place) =>
                        place &&
                        place.googlePlaceId
                )
                .map(
                    (place) => [
                        place.googlePlaceId,
                        place,
                    ]
                )
        ).values()
    );


    /*
    ----------------------------------------
    Build context for Gemini
    ----------------------------------------

    We send maximum 12 places to Gemini,
    while returning all unique places
    to the route for fallback handling.
    ----------------------------------------
    */

    const context = uniquePlaces
        .slice(0, 12)
        .map((place) => {
            return `
LIVE GOOGLE PLACE:

Name: ${place.name || "Not available"}

Address: ${place.address ||
                place.formattedAddress ||
                "Not available"
                }

Google Place ID: ${place.googlePlaceId ||
                "Not available"
                }

Type: ${place.primaryType ||
                place.types?.join(", ") ||
                "Not available"
                }

Rating: ${place.rating ??
                "Not available"
                }

Rating Count: ${place.userRatingCount ??
                "Not available"
                }

Business Status: ${place.businessStatus ??
                "Not available"
                }

Phone: ${place.phone ||
                "Not available"
                }

Website: ${place.website ||
                "Not available"
                }

Latitude: ${place.latitude ??
                "Not available"
                }

Longitude: ${place.longitude ??
                "Not available"
                }

Source: Google Places
`;
        })
        .join(
            "\n-------------------------\n"
        );


    /*
    ----------------------------------------
    Return BOTH places and context
    ----------------------------------------

    places:
    Used by fallback response.

    context:
    Used by Gemini.
    ----------------------------------------
    */

    return {
        places: uniquePlaces,
        context,
    };
}