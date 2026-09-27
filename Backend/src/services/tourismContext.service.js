import Place from "../models/Place.js";

/*
========================================
ESCAPE REGEX
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
GET TOURISM CONTEXT
========================================
*/

export async function getTourismContext(
    message
) {
    const cleanMessage =
        String(message || "").trim();

    if (!cleanMessage) {
        return "";
    }

    /*
    ========================================
    EXTRACT WORDS
    ========================================
    */

    const words =
        cleanMessage
            .toLowerCase()
            .replace(
                /[^\p{L}\p{N}\s-]/gu,
                " "
            )
            .split(/\s+/)
            .filter(
                (word) =>
                    word.length >= 3
            )
            .slice(0, 10);

    const conditions = [];

    /*
    ========================================
    BUILD SEARCH CONDITIONS
    ========================================
    */

    for (const word of words) {
        const regex =
            new RegExp(
                escapeRegex(word),
                "i"
            );

        conditions.push(
            { name: regex },
            { slug: regex },
            { location: regex },
            { description: regex },
            { category: regex },
            {
                "details.bestFor":
                    regex,
            },
            {
                "details.nearby":
                    regex,
            }
        );
    }

    let places = [];

    /*
    ========================================
    SEARCH MATCHING TOURISM PLACES
    ========================================
    */

    if (conditions.length > 0) {
        places =
            await Place.find({
                $or: conditions,

                /*
                If you later add:
                isTourismPlace: Boolean

                change this to:

                isTourismPlace: true
                */
            })
                .select(
                    [
                        "name",
                        "slug",
                        "location",
                        "formattedAddress",
                        "description",
                        "rating",
                        "reviews",
                        "category",
                        "details",
                        "estimatedCost",
                        "estimatedVisitMinutes",
                        "locationPoint",
                    ].join(" ")
                )
                .limit(8)
                .lean();
    }

    /*
    ========================================
    FALLBACK
    ========================================
    */

    if (places.length === 0) {
        places =
            await Place.find({})
                .select(
                    [
                        "name",
                        "slug",
                        "location",
                        "formattedAddress",
                        "description",
                        "rating",
                        "reviews",
                        "category",
                        "details",
                        "estimatedCost",
                        "estimatedVisitMinutes",
                        "locationPoint",
                    ].join(" ")
                )
                .sort({
                    rating: -1,
                })
                .limit(10)
                .lean();
    }

    /*
    ========================================
    BUILD CONTEXT
    ========================================
    */

    return places
        .map((place) => {
            const coordinates =
                place.locationPoint
                    ?.coordinates || [];

            const longitude =
                coordinates[0];

            const latitude =
                coordinates[1];

            return `
PLACE:

Name: ${place.name ||
                "Unknown"
                }

Location: ${place.location ||
                ""
                }

Address: ${place.formattedAddress ||
                ""
                }

Description: ${place.description ||
                ""
                }

Categories: ${Array.isArray(
                    place.category
                )
                    ? place.category.join(
                        ", "
                    )
                    : ""
                }

Rating: ${place.rating ??
                "Not available"
                }

Reviews: ${place.reviews ??
                "Not available"
                }

Estimated Cost: ${place.estimatedCost ??
                "Not available"
                }

Estimated Visit Minutes: ${place.estimatedVisitMinutes ??
                "Not available"
                }

Best For: ${place.details?.bestFor ||
                ""
                }

Suggested Time: ${place.details?.suggestedTime ||
                ""
                }

Nearby: ${place.details?.nearby ||
                ""
                }

Latitude: ${latitude ??
                "Not available"
                }

Longitude: ${longitude ??
                "Not available"
                }
`;
        })
        .join(
            "\n-------------------------\n"
        );
}