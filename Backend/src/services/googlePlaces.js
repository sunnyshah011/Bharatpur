import { env } from "../config/env.js";

/*
|--------------------------------------------------------------------------
| Google Places
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Google Places is still kept ONLY for your existing destination resolver.
|
| Route recommendations DO NOT use Google Places anymore.
|
*/

const GOOGLE_PLACES_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

/*
|--------------------------------------------------------------------------
| OpenStreetMap / Overpass
|--------------------------------------------------------------------------
|
| Used for route-side recommendations:
|
| - Hotels
| - Guest houses
| - Cafes
| - Restaurants
| - Parks
| - Gardens
| - Camping
| - Tourist attractions
| - Viewpoints
| - Museums
|
*/

const OVERPASS_API_URL =
  "https://overpass-api.de/api/interpreter";

/*
|--------------------------------------------------------------------------
| Basic helpers
|--------------------------------------------------------------------------
*/

const slugify = (value) => {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

function isValidCoordinate(
  latitude,
  longitude
) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

/*
|--------------------------------------------------------------------------
| Distance between two coordinates
|--------------------------------------------------------------------------
*/

function distanceBetweenCoordinates(
  first,
  second
) {
  if (!first || !second) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusMeters =
    6371000;

  const toRadians = (value) =>
    (value * Math.PI) / 180;

  const latitude1 =
    toRadians(first.lat);

  const latitude2 =
    toRadians(second.lat);

  const deltaLatitude =
    toRadians(
      second.lat - first.lat
    );

  const deltaLongitude =
    toRadians(
      second.lng - first.lng
    );

  const a =
    Math.sin(
      deltaLatitude / 2
    ) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(
        deltaLongitude / 2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return (
    earthRadiusMeters * c
  );
}

/*
|--------------------------------------------------------------------------
| Existing destination resolver
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This function is NOT part of route recommendations.
| It continues using your existing Google Text Search implementation.
|
*/

export async function resolvePlaceWithGoogle(
  name
) {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is not configured on the backend."
    );
  }

  const cleanName =
    String(name || "").trim();

  if (!cleanName) {
    throw new Error(
      "Place name is required."
    );
  }

  const textQuery =
    `${cleanName}, Bharatpur, Chitwan, Nepal`;

  console.log(
    `🌐 Google Places search: "${textQuery}"`
  );

  const response =
    await fetch(
      GOOGLE_PLACES_SEARCH_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Goog-Api-Key":
            env.GOOGLE_MAPS_API_KEY,

          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
          ].join(","),
        },

        body: JSON.stringify({
          textQuery,

          languageCode:
            "en",

          regionCode:
            "NP",

          pageSize:
            5,

          locationBias: {
            circle: {
              center: {
                latitude:
                  27.5291,

                longitude:
                  84.3542,
              },

              radius:
                50000,
            },
          },
        }),
      }
    );

  const data =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    console.error(
      "❌ Google Places API error:",
      data
    );

    throw new Error(
      data?.error?.message ||
        "Google Places search failed."
    );
  }

  if (
    !Array.isArray(
      data.places
    ) ||
    data.places.length === 0
  ) {
    throw new Error(
      `Google could not find "${cleanName}" in Chitwan, Nepal.`
    );
  }

  const place =
    data.places[0];

  const googlePlaceId =
    place?.id || "";

  const latitude =
    Number(
      place?.location?.latitude
    );

  const longitude =
    Number(
      place?.location?.longitude
    );

  if (!googlePlaceId) {
    throw new Error(
      `Google returned no Place ID for "${cleanName}".`
    );
  }

  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    throw new Error(
      `Google returned invalid coordinates for "${cleanName}".`
    );
  }

  const resolvedName =
    place?.displayName?.text ||
    cleanName;

  const formattedAddress =
    place?.formattedAddress ||
    `${resolvedName}, Chitwan, Nepal`;

  return {
    name:
      resolvedName,

    slug:
      slugify(cleanName),

    googlePlaceId,

    formattedAddress,

    location:
      formattedAddress,

    latitude,

    longitude,

    category:
      Array.isArray(
        place?.types
      )
        ? place.types
        : [],

    locationSource:
      "google-places",

    providerPlaceId:
      "",

    rawPlace:
      place,
  };
}

/*
|--------------------------------------------------------------------------
| OpenStreetMap recommendation category metadata
|--------------------------------------------------------------------------
|
| These keys MUST match the frontend filters:
|
| hotel
| cafe
| park
| camping
| food
| attraction
|
*/

const OSM_CATEGORY_METADATA = {
  hotel: {
    key:
      "hotel",

    label:
      "Hotel",

    icon:
      "🏨",
  },

  guest_house: {
    key:
      "hotel",

    label:
      "Guest House",

    icon:
      "🏡",
  },

  hostel: {
    key:
      "hotel",

    label:
      "Hostel",

    icon:
      "🏨",
  },

  motel: {
    key:
      "hotel",

    label:
      "Motel",

    icon:
      "🏨",
  },

  chalet: {
    key:
      "hotel",

    label:
      "Chalet",

    icon:
      "🏡",
  },

  resort: {
    key:
      "hotel",

    label:
      "Resort",

    icon:
      "🏨",
  },

  cafe: {
    key:
      "cafe",

    label:
      "Café",

    icon:
      "☕",
  },

  restaurant: {
    key:
      "food",

    label:
      "Restaurant",

    icon:
      "🍽️",
  },

  fast_food: {
    key:
      "food",

    label:
      "Fast Food",

    icon:
      "🍔",
  },

  park: {
    key:
      "park",

    label:
      "Park",

    icon:
      "🌳",
  },

  garden: {
    key:
      "park",

    label:
      "Garden",

    icon:
      "🌿",
  },

  nature_reserve: {
    key:
      "park",

    label:
      "Nature Reserve",

    icon:
      "🌲",
  },

  camp_site: {
    key:
      "camping",

    label:
      "Camping",

    icon:
      "⛺",
  },

  attraction: {
    key:
      "attraction",

    label:
      "Tourist Attraction",

    icon:
      "📸",
  },

  viewpoint: {
    key:
      "attraction",

    label:
      "Viewpoint",

    icon:
      "🏞️",
  },

  museum: {
    key:
      "attraction",

    label:
      "Museum",

    icon:
      "🏛️",
  },

  picnic_site: {
    key:
      "attraction",

    label:
      "Picnic Area",

    icon:
      "🧺",
  },
};

/*
|--------------------------------------------------------------------------
| Determine OSM category
|--------------------------------------------------------------------------
*/

function getOsmCategory(
  tags = {}
) {
  const tourism =
    String(
      tags.tourism || ""
    ).toLowerCase();

  const amenity =
    String(
      tags.amenity || ""
    ).toLowerCase();

  const leisure =
    String(
      tags.leisure || ""
    ).toLowerCase();

  /*
   * Accommodation
   */

  if (
    OSM_CATEGORY_METADATA[
      tourism
    ]
  ) {
    return OSM_CATEGORY_METADATA[
      tourism
    ];
  }

  /*
   * Cafe
   */

  if (
    OSM_CATEGORY_METADATA[
      amenity
    ]
  ) {
    return OSM_CATEGORY_METADATA[
      amenity
    ];
  }

  /*
   * Parks / gardens / nature areas
   */

  if (
    OSM_CATEGORY_METADATA[
      leisure
    ]
  ) {
    return OSM_CATEGORY_METADATA[
      leisure
    ];
  }

  return {
    key:
      "attraction",

    label:
      "Place",

    icon:
      "📍",
  };
}

/*
|--------------------------------------------------------------------------
| Build route metrics
|--------------------------------------------------------------------------
|
| Converts the actual navigation route into measurable data.
|
*/

function buildRouteMetrics(
  route
) {
  if (
    !Array.isArray(route) ||
    route.length < 2
  ) {
    return null;
  }

  const points =
    route
      .map(
        (point) => ({
          lat:
            Number(
              point?.lat
            ),

          lng:
            Number(
              point?.lng
            ),
        })
      )
      .filter(
        (point) =>
          isValidCoordinate(
            point.lat,
            point.lng
          )
      );

  if (
    points.length < 2
  ) {
    return null;
  }

  const cumulativeDistances =
    [0];

  let totalDistance =
    0;

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    totalDistance +=
      distanceBetweenCoordinates(
        points[index - 1],
        points[index]
      );

    cumulativeDistances.push(
      totalDistance
    );
  }

  return {
    points,

    cumulativeDistances,

    totalDistance,
  };
}

/*
|--------------------------------------------------------------------------
| Find closest point on route segment
|--------------------------------------------------------------------------
*/

function getClosestPointOnSegment(
  point,
  start,
  end
) {
  const averageLatitude =
    (
      point.lat +
      start.lat +
      end.lat
    ) / 3;

  const longitudeScale =
    Math.cos(
      averageLatitude *
        (Math.PI / 180)
    ) || 1;

  const startX =
    start.lng *
    longitudeScale;

  const startY =
    start.lat;

  const endX =
    end.lng *
    longitudeScale;

  const endY =
    end.lat;

  const pointX =
    point.lng *
    longitudeScale;

  const pointY =
    point.lat;

  const deltaX =
    endX - startX;

  const deltaY =
    endY - startY;

  const lengthSquared =
    deltaX * deltaX +
    deltaY * deltaY;

  let fraction =
    0;

  if (
    lengthSquared > 0
  ) {
    fraction =
      (
        (pointX - startX) *
          deltaX +
        (pointY - startY) *
          deltaY
      ) /
      lengthSquared;

    fraction =
      Math.max(
        0,
        Math.min(
          1,
          fraction
        )
      );
  }

  const projectedPoint = {
    lat:
      startY +
      (endY - startY) *
        fraction,

    lng:
      (
        startX +
        (endX - startX) *
          fraction
      ) /
      longitudeScale,
  };

  return {
    point:
      projectedPoint,

    fraction,

    distanceMeters:
      distanceBetweenCoordinates(
        point,
        projectedPoint
      ),
  };
}

/*
|--------------------------------------------------------------------------
| Find where a place sits on route
|--------------------------------------------------------------------------
*/

function getClosestRoutePosition(
  point,
  routeMetrics
) {
  if (
    !point ||
    !routeMetrics
  ) {
    return null;
  }

  let best =
    null;

  for (
    let index = 0;
    index <
    routeMetrics.points.length -
      1;
    index += 1
  ) {
    const start =
      routeMetrics.points[
        index
      ];

    const end =
      routeMetrics.points[
        index + 1
      ];

    const projection =
      getClosestPointOnSegment(
        point,
        start,
        end
      );

    const segmentDistance =
      routeMetrics
        .cumulativeDistances[
          index + 1
        ] -
      routeMetrics
        .cumulativeDistances[
          index
        ];

    const progressMeters =
      routeMetrics
        .cumulativeDistances[
          index
        ] +
      segmentDistance *
        projection.fraction;

    if (
      !best ||
      projection.distanceMeters <
        best.distanceFromRouteMeters
    ) {
      best = {
        progressMeters,

        distanceFromRouteMeters:
          projection.distanceMeters,

        projectedPoint:
          projection.point,
      };
    }
  }

  return best;
}

/*
|--------------------------------------------------------------------------
| Get point at specific distance along route
|--------------------------------------------------------------------------
*/

function getPointAtRouteDistance(
  distanceMeters,
  routeMetrics
) {
  if (!routeMetrics) {
    return null;
  }

  if (
    distanceMeters <= 0
  ) {
    return routeMetrics
      .points[0];
  }

  if (
    distanceMeters >=
    routeMetrics.totalDistance
  ) {
    return routeMetrics.points[
      routeMetrics.points.length -
        1
    ];
  }

  for (
    let index = 1;
    index <
    routeMetrics
      .cumulativeDistances
      .length;
    index += 1
  ) {
    if (
      routeMetrics
        .cumulativeDistances[
          index
        ] >=
      distanceMeters
    ) {
      const previousDistance =
        routeMetrics
          .cumulativeDistances[
            index - 1
          ];

      const segmentDistance =
        routeMetrics
          .cumulativeDistances[
            index
          ] -
        previousDistance;

      const fraction =
        segmentDistance > 0
          ? (
              distanceMeters -
              previousDistance
            ) /
            segmentDistance
          : 0;

      const start =
        routeMetrics.points[
          index - 1
        ];

      const end =
        routeMetrics.points[
          index
        ];

      return {
        lat:
          start.lat +
          (
            end.lat -
            start.lat
          ) *
            fraction,

        lng:
          start.lng +
          (
            end.lng -
            start.lng
          ) *
            fraction,
      };
    }
  }

  return routeMetrics.points[
    routeMetrics.points.length -
      1
  ];
}

/*
|--------------------------------------------------------------------------
| Sample actual route
|--------------------------------------------------------------------------
|
| We don't search every route coordinate.
| Five route positions provide a useful corridor.
|
*/

function sampleRoute(
  routeMetrics,
  sampleCount = 5
) {
  if (!routeMetrics) {
    return [];
  }

  const count =
    Math.max(
      2,
      Math.min(
        sampleCount,
        8
      )
    );

  const samples =
    [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const ratio =
      index /
      (count - 1);

    const distance =
      routeMetrics.totalDistance *
      ratio;

    const point =
      getPointAtRouteDistance(
        distance,
        routeMetrics
      );

    if (point) {
      samples.push(
        point
      );
    }
  }

  return samples;
}

/*
|--------------------------------------------------------------------------
| Build OpenStreetMap / Overpass query
|--------------------------------------------------------------------------
|
| Search:
|
| Tourism:
| hotel, guest_house, hostel, motel, chalet, resort,
| camp_site, attraction, viewpoint, museum, picnic_site
|
| Amenities:
| cafe, restaurant, fast_food
|
| Leisure:
| park, garden, nature_reserve
|
*/

function buildOverpassQuery(
  routeSamples
) {
  const blocks =
    routeSamples
      .map(
        (center) => `
          nwr(
            around:3000,
            ${center.lat},
            ${center.lng}
          )[
            "tourism"~"^(hotel|guest_house|hostel|motel|chalet|resort|camp_site|attraction|viewpoint|museum|picnic_site)$"
          ];

          nwr(
            around:3000,
            ${center.lat},
            ${center.lng}
          )[
            "amenity"~"^(cafe|restaurant|fast_food)$"
          ];

          nwr(
            around:3000,
            ${center.lat},
            ${center.lng}
          )[
            "leisure"~"^(park|garden|nature_reserve)$"
          ];
        `
      )
      .join("\n");

  return `
    [out:json][timeout:25];

    (
      ${blocks}
    );

    out center tags;
  `;
}

/*
|--------------------------------------------------------------------------
| Search OpenStreetMap / Overpass
|--------------------------------------------------------------------------
*/

async function searchOpenStreetMapPlaces(
  routeSamples
) {
  if (
    !Array.isArray(
      routeSamples
    ) ||
    routeSamples.length === 0
  ) {
    return [];
  }

  const query =
    buildOverpassQuery(
      routeSamples
    );

  console.log(
    `🌍 OpenStreetMap search: ${routeSamples.length} route centers`
  );

  const response =
    await fetch(
      OVERPASS_API_URL,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",

          "User-Agent":
            "RouteTouristRecommendationDemo/1.0",
        },

        body:
          `data=${encodeURIComponent(
            query
          )}`,
      }
    );

  const responseText =
    await response
      .text()
      .catch(
        () => ""
      );

  if (!response.ok) {
    console.error(
      "❌ Overpass HTTP error:",
      response.status,
      responseText
    );

    throw new Error(
      `OpenStreetMap search failed (${response.status}).`
    );
  }

  let data;

  try {
    data =
      JSON.parse(
        responseText
      );
  } catch (error) {
    console.error(
      "❌ Invalid Overpass response:",
      responseText
    );

    throw new Error(
      "OpenStreetMap returned an invalid response."
    );
  }

  return Array.isArray(
    data?.elements
  )
    ? data.elements
    : [];
}

/*
|--------------------------------------------------------------------------
| Recommendation description
|--------------------------------------------------------------------------
*/

function getRecommendationDescription(
  categoryKey
) {
  switch (
    categoryKey
  ) {
    case "hotel":
      return "A stay option located close to your route.";

    case "cafe":
      return "A convenient stop for coffee, snacks and a short break.";

    case "park":
      return "A nearby green space or garden that can make a pleasant travel stop.";

    case "camping":
      return "An outdoor option for travellers interested in nature and camping.";

    case "food":
      return "A nearby food stop that can be useful during the journey.";

    case "attraction":
      return "An interesting place located close to your current route.";

    default:
      return "A recommended place located close to your current route.";
  }
}

/*
|--------------------------------------------------------------------------
| Build an address from OSM tags
|--------------------------------------------------------------------------
*/

function buildOsmAddress(
  tags = {}
) {
  const addressParts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:neighbourhood"],
    tags["addr:city"],
    tags["addr:town"],
    tags["addr:village"],
  ].filter(
    Boolean
  );

  return addressParts.join(
    ", "
  );
}

/*
|--------------------------------------------------------------------------
| Main route recommendation function
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This function NO LONGER requires Google Places.
|
| It receives:
|
| {
|   route: [
|     { lat, lng },
|     ...
|   ],
|
|   currentPosition: {
|     lat,
|     lng
|   }
| }
|
*/

export async function recommendPlacesAlongRoute({
  route,
  currentPosition =
    null,
}) {
  /*
   * IMPORTANT:
   *
   * There is deliberately NO:
   *
   * env.GOOGLE_MAPS_API_KEY
   *
   * check here.
   *
   * Google Places is not used by this function.
   */

  /*
   * Build measurable route.
   */

  const routeMetrics =
    buildRouteMetrics(
      route
    );

  if (
    !routeMetrics
  ) {
    throw new Error(
      "A valid route with at least two coordinates is required."
    );
  }

  /*
   * Validate current location.
   */

  const validatedCurrentPosition =
    currentPosition &&
    isValidCoordinate(
      Number(
        currentPosition.lat
      ),
      Number(
        currentPosition.lng
      )
    )
      ? {
          lat:
            Number(
              currentPosition.lat
            ),

          lng:
            Number(
              currentPosition.lng
            ),
        }
      : null;

  /*
   * If GPS is unavailable,
   * use route start.
   */

  const userPoint =
    validatedCurrentPosition ||
    routeMetrics.points[0];

  /*
   * Find user position along route.
   */

  const userRoutePosition =
    getClosestRoutePosition(
      userPoint,
      routeMetrics
    );

  const currentProgressMeters =
    userRoutePosition
      ?.progressMeters ||
    0;

  /*
   * Sample route.
   *
   * We start from the whole route because
   * recommendations should be known in advance.
   */

  const routeSamples =
    sampleRoute(
      routeMetrics,
      5
    );

  if (
    routeSamples.length === 0
  ) {
    return {
      totalRouteDistanceMeters:
        routeMetrics.totalDistance,

      currentRouteProgressMeters:
        currentProgressMeters,

      recommendations: [],
    };
  }

  /*
   * Search OpenStreetMap.
   *
   * ONE request containing all route sample areas.
   */

  let osmPlaces = [];

  try {
    osmPlaces =
      await searchOpenStreetMapPlaces(
        routeSamples
      );
  } catch (error) {
    console.error(
      "❌ OpenStreetMap recommendation search failed:",
      error?.message ||
        error
    );

    /*
     * Return an empty recommendation list
     * instead of breaking navigation.
     */

    return {
      totalRouteDistanceMeters:
        routeMetrics.totalDistance,

      currentRouteProgressMeters:
        currentProgressMeters,

      recommendations: [],
    };
  }

  console.log(
    `✅ OpenStreetMap returned ${osmPlaces.length} raw places`
  );

  /*
   * Deduplicate OSM elements.
   */

  const placesById =
    new Map();

  /*
   * Process each OSM place.
   */

  for (
    const osmPlace of osmPlaces
  ) {
    const tags =
      osmPlace?.tags ||
      {};

    /*
     * Nodes:
     *
     * lat/lon
     *
     * Ways/relations:
     *
     * center.lat/center.lon
     */

    const latitude =
      Number(
        osmPlace?.lat ??
          osmPlace?.center?.lat
      );

    const longitude =
      Number(
        osmPlace?.lon ??
          osmPlace?.center?.lon
      );

    if (
      !isValidCoordinate(
        latitude,
        longitude
      )
    ) {
      continue;
    }

    const placePoint = {
      lat:
        latitude,

      lng:
        longitude,
    };

    /*
     * Project place onto route.
     */

    const routePosition =
      getClosestRoutePosition(
        placePoint,
        routeMetrics
      );

    if (
      !routePosition
    ) {
      continue;
    }

    /*
     * Keep only places within 3 km
     * of the actual route.
     */

    if (
      routePosition.distanceFromRouteMeters >
      3000
    ) {
      continue;
    }

    /*
     * Calculate distance ahead.
     */

    const distanceAheadMeters =
      routePosition.progressMeters -
      currentProgressMeters;

    /*
     * Remove places behind tourist.
     */

    if (
      distanceAheadMeters <
      300
    ) {
      continue;
    }

    /*
     * Remove places beyond destination.
     */

    if (
      routePosition.progressMeters >
      routeMetrics.totalDistance +
        100
    ) {
      continue;
    }

    /*
     * Determine category.
     */

    const category =
      getOsmCategory(
        tags
      );

    /*
     * Stable OSM ID.
     */

    const osmId =
      `${osmPlace.type}-${osmPlace.id}`;

    /*
     * Ignore duplicates.
     */

    if (
      placesById.has(
        osmId
      )
    ) {
      continue;
    }

    /*
     * Place name.
     *
     * Prefer English name when available,
     * otherwise normal OSM name.
     */

    const name =
      tags["name:en"] ||
      tags.name ||
      `${category.label}`;

    /*
     * Address.
     */

    const address =
      buildOsmAddress(
        tags
      );

    /*
     * Optional information.
     */

    const openingHours =
      tags.opening_hours ||
      null;

    const website =
      tags.website ||
      tags["contact:website"] ||
      null;

    const phone =
      tags.phone ||
      tags["contact:phone"] ||
      null;

    /*
     * Stars.
     *
     * Some OSM accommodation objects have
     * a stars tag.
     */

    const starsValue =
      Number(
        tags.stars
      );

    const stars =
      Number.isFinite(
        starsValue
      ) &&
      starsValue > 0
        ? starsValue
        : null;

    /*
     * Cuisine information.
     */

    const cuisine =
      tags.cuisine ||
      null;

    /*
     * Store final recommendation.
     */

    placesById.set(
      osmId,
      {
        id:
          osmId,

        name,

        address,

        latitude,

        longitude,

        source:
          "openstreetmap",

        osmType:
          osmPlace.type,

        osmId:
          osmPlace.id,

        /*
         * Compatibility fields
         * for your frontend.
         */

        types: [],

        primaryType:
          tags.tourism ||
          tags.amenity ||
          tags.leisure ||
          "",

        rating:
          null,

        userRatingCount:
          0,

        /*
         * Frontend category filters.
         */

        categoryKeys: [
          category.key,
        ],

        categoryLabel:
          category.label,

        categoryIcon:
          category.icon,

        /*
         * Additional OSM data.
         */

        openingHours,

        website,

        phone,

        stars,

        cuisine,

        /*
         * Route analysis.
         */

        progressMeters:
          routePosition.progressMeters,

        distanceFromRouteMeters:
          routePosition
            .distanceFromRouteMeters,

        distanceAheadMeters,

        /*
         * Description.
         */

        description:
          getRecommendationDescription(
            category.key
          ),
      }
    );
  }

  /*
   * ------------------------------------------------------------------------
   * Rank recommendations
   * ------------------------------------------------------------------------
   *
   * Primary:
   *   Distance ahead along route.
   *
   * Secondary:
   *   Places containing useful OSM information.
   *
   */

  const recommendations =
    Array.from(
      placesById.values()
    )
      .sort(
        (
          first,
          second
        ) => {
          const distanceDifference =
            first.distanceAheadMeters -
            second.distanceAheadMeters;

          /*
           * Clearly separated locations:
           * distance wins.
           */

          if (
            Math.abs(
              distanceDifference
            ) >
            2500
          ) {
            return distanceDifference;
          }

          /*
           * When locations are relatively
           * close together, prefer places
           * with useful metadata.
           */

          const firstInformationScore =
            Number(
              Boolean(
                first.openingHours
              )
            ) +
            Number(
              Boolean(
                first.website
              )
            ) +
            Number(
              Boolean(
                first.address
              )
            ) +
            Number(
              first.stars || 0
            );

          const secondInformationScore =
            Number(
              Boolean(
                second.openingHours
              )
            ) +
            Number(
              Boolean(
                second.website
              )
            ) +
            Number(
              Boolean(
                second.address
              )
            ) +
            Number(
              second.stars || 0
            );

          if (
            firstInformationScore !==
            secondInformationScore
          ) {
            return (
              secondInformationScore -
              firstInformationScore
            );
          }

          return (
            distanceDifference
          );
        }
      )
      .slice(
        0,
        12
      );

  console.log(
    `✅ Final route recommendations: ${recommendations.length}`
  );

  return {
    totalRouteDistanceMeters:
      routeMetrics.totalDistance,

    currentRouteProgressMeters:
      currentProgressMeters,

    recommendations,
  };
}