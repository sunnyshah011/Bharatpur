import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  GoogleMap,
  InfoWindow,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  useSearchParams,
  useParams,
} from "react-router-dom";

import placesData from "../data/places.json";

/*
|--------------------------------------------------------------------------
| GOOGLE MAPS
|--------------------------------------------------------------------------
*/

const GOOGLE_MAPS_LIBRARIES = [];

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = {
  lat: 27.5291,
  lng: 84.3542,
};

/*
|--------------------------------------------------------------------------
| FREE ROUTING
|--------------------------------------------------------------------------
*/

const OSRM_URL =
  "https://router.project-osrm.org";

/*
|--------------------------------------------------------------------------
| STATIC PLACES
|--------------------------------------------------------------------------
|
| Places come from places.json.
| No Google Places API.
| No recommendation API.
|--------------------------------------------------------------------------
*/

const MAX_STATIC_PLACES = 15;

/*
|--------------------------------------------------------------------------
| RIDER CATEGORIES
|--------------------------------------------------------------------------
*/

const PLACE_CATEGORIES = {
  all: {
    key: "all",
    label: "All",
    icon: "✦",
  },

  fuel: {
    key: "fuel",
    label: "Fuel",
    icon: "⛽",
  },

  cafe: {
    key: "cafe",
    label: "Café",
    icon: "☕",
  },

  food: {
    key: "food",
    label: "Food",
    icon: "🍲",
  },

  restroom: {
    key: "restroom",
    label: "Restroom",
    icon: "🚻",
  },

  medical: {
    key: "medical",
    label: "Medical",
    icon: "🏥",
  },

  bank: {
    key: "bank",
    label: "ATM / Bank",
    icon: "🏧",
  },

  charging: {
    key: "charging",
    label: "Charging",
    icon: "🔋",
  },

  workshop: {
    key: "workshop",
    label: "Workshop",
    icon: "🔧",
  },

  temple: {
    key: "temple",
    label: "Temple",
    icon: "🛕",
  },

  park: {
    key: "park",
    label: "Park",
    icon: "🌳",
  },

  view: {
    key: "view",
    label: "View",
    icon: "🌄",
  },
};

/*
|--------------------------------------------------------------------------
| CATEGORY ALIASES
|--------------------------------------------------------------------------
*/

const CATEGORY_ALIASES = {
  fuel: [
    "fuel",
    "petrol",
    "petrol pump",
    "gas station",
    "gasstation",
    "fuel station",
    "fuelstation",
    "pumps",
  ],

  cafe: [
    "cafe",
    "coffee",
    "coffee shop",
    "tea shop",
    "bakery",
  ],

  food: [
    "food",
    "restaurant",
    "eatery",
    "dining",
    "local food",
    "food place",
    "eat",
  ],

  restroom: [
    "restroom",
    "rest room",
    "toilet",
    "washroom",
    "public toilet",
    "bathroom",
  ],

  medical: [
    "medical",
    "hospital",
    "clinic",
    "pharmacy",
    "health",
    "medicine",
    "medical center",
  ],

  bank: [
    "atm",
    "bank",
    "cash",
    "finance",
    "banking",
  ],

  charging: [
    "charging",
    "ev charging",
    "ev charger",
    "electric charging",
    "charging station",
    "charger",
  ],

  workshop: [
    "workshop",
    "mechanic",
    "motorcycle repair",
    "motorcycle",
    "bike repair",
    "bike service",
    "repair",
    "puncture",
    "tyre",
    "tire",
    "garage",
    "service center",
  ],

  temple: [
    "temple",
    "gumba",
    "monastery",
    "shrine",
    "mandir",
  ],

  park: [
    "park",
    "nature",
    "forest",
    "garden",
    "green",
    "jungle",
  ],

  view: [
    "view",
    "viewpoint",
    "scenic",
    "scenic view",
    "lookout",
    "sunset",
    "lake",
    "lakeside",
    "riverside",
  ],
};

/*
|--------------------------------------------------------------------------
| SMALL CATEGORY DISPLAY
|--------------------------------------------------------------------------
*/

const CATEGORY_STYLE = {
  fuel: {
    label: "Fuel",
    icon: "⛽",
  },

  cafe: {
    label: "Café",
    icon: "☕",
  },

  food: {
    label: "Food",
    icon: "🍲",
  },

  restroom: {
    label: "Restroom",
    icon: "🚻",
  },

  medical: {
    label: "Medical",
    icon: "🏥",
  },

  bank: {
    label: "ATM / Bank",
    icon: "🏧",
  },

  charging: {
    label: "Charging",
    icon: "🔋",
  },

  workshop: {
    label: "Workshop",
    icon: "🔧",
  },

  temple: {
    label: "Temple",
    icon: "🛕",
  },

  park: {
    label: "Park",
    icon: "🌳",
  },

  view: {
    label: "View",
    icon: "🌄",
  },

  hidden: {
    label: "Hidden",
    icon: "✨",
  },

  other: {
    label: "Local",
    icon: "📍",
  },
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function getPlaceCoordinate(place) {
  if (!place) {
    return null;
  }

  let latitude =
    Number(place.latitude);

  let longitude =
    Number(place.longitude);

  if (
    isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return {
      lat: latitude,
      lng: longitude,
    };
  }

  if (
    place.coordinates &&
    isValidCoordinate(
      Number(place.coordinates.lat),
      Number(place.coordinates.lng)
    )
  ) {
    return {
      lat:
        Number(place.coordinates.lat),

      lng:
        Number(place.coordinates.lng),
    };
  }

  const geoCoordinates =
    place.locationPoint
      ?.coordinates;

  if (
    Array.isArray(
      geoCoordinates
    ) &&
    geoCoordinates.length >= 2
  ) {
    longitude =
      Number(
        geoCoordinates[0]
      );

    latitude =
      Number(
        geoCoordinates[1]
      );

    if (
      isValidCoordinate(
        latitude,
        longitude
      )
    ) {
      return {
        lat: latitude,
        lng: longitude,
      };
    }
  }

  latitude =
    Number(place.lat);

  longitude =
    Number(place.lng);

  if (
    isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return {
      lat: latitude,
      lng: longitude,
    };
  }

  return null;
}

function getPlaceSearchText(place) {
  const values = [
    place?.name,
    place?.title,
    place?.description,
    place?.category,
    place?.categoryKeys,
    place?.categories,
    place?.hiddenPlaceType,
    place?.location,
    place?.formattedAddress,
  ];

  return cleanText(
    values
      .flat(Infinity)
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();
}

/*
|--------------------------------------------------------------------------
| DETERMINE CATEGORY
|--------------------------------------------------------------------------
*/

function detectPlaceCategory(place) {
  const explicit =
    cleanText(
      place?.hiddenPlaceType
    ).toLowerCase();

  const searchText =
    getPlaceSearchText(place);

  /*
   * Explicit hidden-place type first.
   */

  if (
    explicit === "lake" ||
    explicit === "lakeside"
  ) {
    return "view";
  }

  if (
    explicit === "rest" ||
    explicit === "resting"
  ) {
    return "restroom";
  }

  if (
    explicit === "cafe" ||
    explicit === "coffee"
  ) {
    return "cafe";
  }

  if (
    explicit === "food" ||
    explicit === "restaurant" ||
    explicit === "local-food"
  ) {
    return "food";
  }

  if (
    explicit === "hotel" ||
    explicit === "stay" ||
    explicit === "homestay"
  ) {
    return "other";
  }

  if (
    explicit === "park" ||
    explicit === "nature" ||
    explicit === "forest"
  ) {
    return "park";
  }

  if (
    explicit === "temple" ||
    explicit === "gumba"
  ) {
    return "temple";
  }

  if (
    explicit === "view" ||
    explicit === "viewpoint"
  ) {
    return "view";
  }

  /*
   * General text matching.
   */

  const categoryKeys =
    Object.keys(
      CATEGORY_ALIASES
    );

  for (
    const categoryKey of categoryKeys
  ) {
    const aliases =
      CATEGORY_ALIASES[
        categoryKey
      ];

    const found =
      aliases.some(
        (alias) =>
          searchText.includes(
            alias
          )
      );

    if (found) {
      return categoryKey;
    }
  }

  return "other";
}

/*
|--------------------------------------------------------------------------
| CATEGORY DATA
|--------------------------------------------------------------------------
*/

function getCategoryDisplay(
  category,
  place
) {
  if (
    place?.isHidden === true ||
    place?.hiddenPlace === true
  ) {
    if (
      category === "other"
    ) {
      return CATEGORY_STYLE.hidden;
    }
  }

  return (
    CATEGORY_STYLE[
      category
    ] ||
    CATEGORY_STYLE.other
  );
}

/*
|--------------------------------------------------------------------------
| DESCRIPTION
|--------------------------------------------------------------------------
*/

function shortenDescription(
  description
) {
  const text =
    cleanText(
      description
    );

  if (!text) {
    return "A useful stop for your journey.";
  }

  /*
   * Keep it concise.
   */

  const sentences =
    text.split(
      /(?<=[.!?])\s+/
    );

  const first =
    sentences[0] || text;

  if (
    first.length <= 130
  ) {
    return first;
  }

  return `${first.slice(
    0,
    127
  )}...`;
}

/*
|--------------------------------------------------------------------------
| DISTANCE
|--------------------------------------------------------------------------
*/

function haversineDistanceMeters(
  from,
  to
) {
  if (!from || !to) {
    return Infinity;
  }

  const earthRadius =
    6371000;

  const radians = (
    value
  ) =>
    (value * Math.PI) /
    180;

  const lat1 =
    radians(from.lat);

  const lat2 =
    radians(to.lat);

  const deltaLat =
    radians(
      to.lat - from.lat
    );

  const deltaLng =
    radians(
      to.lng - from.lng
    );

  const a =
    Math.sin(
      deltaLat / 2
    ) **
      2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        deltaLng / 2
      ) **
        2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return (
    earthRadius * c
  );
}

function formatDistance(
  meters
) {
  if (
    !Number.isFinite(
      Number(meters)
    )
  ) {
    return "--";
  }

  const value =
    Number(meters);

  if (value < 1000) {
    return `${Math.round(
      value
    )} m`;
  }

  return `${(
    value / 1000
  ).toFixed(1)} km`;
}

function formatDuration(
  milliseconds
) {
  if (
    !Number.isFinite(
      Number(milliseconds)
    )
  ) {
    return "--";
  }

  const minutes =
    Math.max(
      0,
      Math.round(
        Number(
          milliseconds
        ) / 60000
      )
    );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remaining =
    minutes % 60;

  return remaining === 0
    ? `${hours} hr`
    : `${hours} hr ${remaining} min`;
}

/*
|--------------------------------------------------------------------------
| BUILD STATIC JOURNEY PLACES
|--------------------------------------------------------------------------
*/

function buildStaticJourneyPlaces() {
  const allPlaces =
    Array.isArray(
      placesData?.places
    )
      ? placesData.places
      : [];

  const validPlaces =
    allPlaces.filter(
      (place) =>
        Boolean(
          getPlaceCoordinate(
            place
          )
        )
    );

  /*
   * Put hidden places first,
   * then other useful places.
   */

  const hiddenPlaces =
    validPlaces.filter(
      (place) =>
        place?.isHidden === true ||
        place?.hiddenPlace === true ||
        Boolean(
          place?.hiddenPlaceType
        )
    );

  const normalPlaces =
    validPlaces.filter(
      (place) =>
        !(
          place?.isHidden === true ||
          place?.hiddenPlace === true ||
          Boolean(
            place?.hiddenPlaceType
          )
        )
    );

  const ordered =
    [
      ...hiddenPlaces,
      ...normalPlaces,
    ];

  const unique =
    [];

  const seen =
    new Set();

  for (
    const place of ordered
  ) {
    const id =
      String(
        place?.id ??
          place?._id ??
          place?.placeId ??
          `${place?.name}-${Math.random()}`
      );

    if (
      seen.has(id)
    ) {
      continue;
    }

    seen.add(id);

    const coordinates =
      getPlaceCoordinate(
        place
      );

    const category =
      detectPlaceCategory(
        place
      );

    const categoryData =
      getCategoryDisplay(
        category,
        place
      );

    unique.push({
      ...place,

      id,

      coordinates,

      category,

      categoryLabel:
        categoryData.label,

      categoryIcon:
        categoryData.icon,

      conciseDescription:
        shortenDescription(
          place?.description
        ),

      isHidden:
        place?.isHidden ===
          true ||
        place?.hiddenPlace ===
          true ||
        Boolean(
          place?.hiddenPlaceType
        ),
    });

    if (
      unique.length >=
      MAX_STATIC_PLACES
    ) {
      break;
    }
  }

  return unique;
}

const STATIC_JOURNEY_PLACES =
  buildStaticJourneyPlaces();

/*
|--------------------------------------------------------------------------
| ROUTE METRICS
|--------------------------------------------------------------------------
*/

function buildRouteMetrics(
  path
) {
  if (
    !Array.isArray(path) ||
    path.length < 2
  ) {
    return null;
  }

  const points =
    path
      .map((point) => ({
        lat: Number(
          point?.lat
        ),

        lng: Number(
          point?.lng
        ),
      }))
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

  const cumulativeMeters =
    [0];

  let totalDistanceMeters =
    0;

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    totalDistanceMeters +=
      haversineDistanceMeters(
        points[index - 1],
        points[index]
      );

    cumulativeMeters.push(
      totalDistanceMeters
    );
  }

  return {
    points,
    cumulativeMeters,
    totalDistanceMeters,
  };
}

/*
|--------------------------------------------------------------------------
| CLOSEST POINT ON SEGMENT
|--------------------------------------------------------------------------
*/

function getClosestPointOnSegment(
  point,
  start,
  end
) {
  const averageLatitude =
    (
      start.lat +
      end.lat +
      point.lat
    ) /
    3 *
    (Math.PI / 180);

  const longitudeScale =
    Math.cos(
      averageLatitude
    ) || 1;

  const ax =
    start.lng *
    longitudeScale;

  const ay =
    start.lat;

  const bx =
    end.lng *
    longitudeScale;

  const by =
    end.lat;

  const px =
    point.lng *
    longitudeScale;

  const py =
    point.lat;

  const dx =
    bx - ax;

  const dy =
    by - ay;

  const lengthSquared =
    dx * dx + dy * dy;

  let fraction = 0;

  if (
    lengthSquared > 0
  ) {
    fraction =
      (
        (px - ax) * dx +
        (py - ay) * dy
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

  return {
    point: {
      lat:
        ay +
        (by - ay) *
          fraction,

      lng:
        (
          ax +
          (bx - ax) *
            fraction
        ) /
        longitudeScale,
    },

    fraction,
  };
}

/*
|--------------------------------------------------------------------------
| CLOSEST ROUTE POSITION
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

  let best = null;

  for (
    let index = 0;
    index <
    routeMetrics.points
      .length -
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

    const distance =
      haversineDistanceMeters(
        point,
        projection.point
      );

    const segmentDistance =
      routeMetrics
        .cumulativeMeters[
          index + 1
        ] -
      routeMetrics
        .cumulativeMeters[index];

    const progressMeters =
      routeMetrics
        .cumulativeMeters[
          index
        ] +
      segmentDistance *
        projection.fraction;

    if (
      !best ||
      distance <
        best.distanceFromRouteMeters
    ) {
      best = {
        progressMeters,

        distanceFromRouteMeters:
          distance,

        point:
          projection.point,
      };
    }
  }

  return best;
}

/*
|--------------------------------------------------------------------------
| OSRM
|--------------------------------------------------------------------------
*/

async function getOsrmRoutes(
  origin,
  destination
) {
  const coordinates =
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  const url =
    `${OSRM_URL}/route/v1/driving/${coordinates}` +
    "?alternatives=2" +
    "&overview=full" +
    "&geometries=geojson";

  const response =
    await fetch(url);

  if (
    !response.ok
  ) {
    throw new Error(
      `Routing server returned ${response.status}.`
    );
  }

  const data =
    await response.json();

  if (
    data?.code !== "Ok"
  ) {
    throw new Error(
      data?.message ||
        "No route found."
    );
  }

  const routes =
    Array.isArray(
      data.routes
    )
      ? data.routes
      : [];

  return routes
    .slice(0, 3)
    .map(
      (
        item,
        index
      ) => {
        const coordinates =
          item?.geometry
            ?.coordinates;

        const path =
          Array.isArray(
            coordinates
          )
            ? coordinates
                .map(
                  (point) => {
                    if (
                      !Array.isArray(
                        point
                      ) ||
                      point.length <
                        2
                    ) {
                      return null;
                    }

                    const lng =
                      Number(
                        point[0]
                      );

                    const lat =
                      Number(
                        point[1]
                      );

                    if (
                      !isValidCoordinate(
                        lat,
                        lng
                      )
                    ) {
                      return null;
                    }

                    return {
                      lat,
                      lng,
                    };
                  }
                )
                .filter(Boolean)
            : [];

        return {
          index,

          path,

          distanceMeters:
            Number(
              item?.distance
            ) || 0,

          durationMillis:
            (
              Number(
                item?.duration
              ) || 0
            ) * 1000,

          summary:
            item?.summary ||
            `Route ${
              index + 1
            }`,
        };
      }
    )
    .filter(
      (item) =>
        item.path.length >
        1
    );
}

/*
|--------------------------------------------------------------------------
| FALLBACK ROUTE
|--------------------------------------------------------------------------
*/

function createFallbackRoute(
  origin,
  destination
) {
  const points = [];

  const count = 70;

  for (
    let index = 0;
    index <= count;
    index += 1
  ) {
    const progress =
      index / count;

    points.push({
      lat:
        origin.lat +
        (
          destination.lat -
          origin.lat
        ) *
          progress,

      lng:
        origin.lng +
        (
          destination.lng -
          origin.lng
        ) *
          progress,
    });
  }

  const distance =
    haversineDistanceMeters(
      origin,
      destination
    );

  const duration =
    (
      distance / 1000 / 30
    ) *
    60 *
    60000;

  return [
    {
      index: 0,

      path: points,

      distanceMeters:
        distance,

      durationMillis:
        duration,

      summary:
        "Demo route",
    },
  ];
}

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function Placemap() {
  const [
    searchParams,
  ] = useSearchParams();

  const {
    id: routePlaceId,
  } = useParams();

  const placeId =
    routePlaceId ||
    searchParams.get("id");

  /*
  |--------------------------------------------------------------------------
  | GOOGLE MAP
  |--------------------------------------------------------------------------
  */

  const {
    isLoaded,
    loadError,
  } =
    useJsApiLoader({
      id:
        "bharatpur-ai-google-map",

      googleMapsApiKey:
        import.meta.env
          .VITE_GOOGLE_MAPS_API_KEY,

      libraries:
        GOOGLE_MAPS_LIBRARIES,
    });

  /*
  |--------------------------------------------------------------------------
  | DESTINATION
  |--------------------------------------------------------------------------
  */

  const [place, setPlace] =
    useState(null);

  const [
    placeLoading,
    setPlaceLoading,
  ] = useState(true);

  const [
    placeError,
    setPlaceError,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD DESTINATION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    async function loadDestination() {
      if (!placeId) {
        setPlaceError(
          "Place ID is missing."
        );

        setPlaceLoading(
          false
        );

        return;
      }

      const localPlaces =
        Array.isArray(
          placesData?.places
        )
          ? placesData.places
          : [];

      const localPlace =
        localPlaces.find(
          (item) =>
            String(
              item?.id
            ) ===
            String(
              placeId
            )
        );

      if (
        localPlace
      ) {
        if (!cancelled) {
          setPlace(
            localPlace
          );

          setPlaceLoading(
            false
          );
        }

        return;
      }

      try {
        const apiUrl =
          import.meta.env
            .VITE_API_URL ||
          "http://localhost:5000/api";

        const response =
          await fetch(
            `${apiUrl}/places/${encodeURIComponent(
              placeId
            )}`
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok
        ) {
          throw new Error(
            data?.error ||
              "Failed to load destination."
          );
        }

        if (
          !data?.place
        ) {
          throw new Error(
            "Destination data is missing."
          );
        }

        if (!cancelled) {
          setPlace(
            data.place
          );
        }
      } catch (error) {
        console.error(
          "DESTINATION ERROR:",
          error
        );

        if (!cancelled) {
          setPlaceError(
            error?.message ||
              "Unable to load destination."
          );
        }
      } finally {
        if (!cancelled) {
          setPlaceLoading(
            false
          );
        }
      }
    }

    loadDestination();

    return () => {
      cancelled = true;
    };
  }, [placeId]);

  /*
  |--------------------------------------------------------------------------
  | DESTINATION COORDINATES
  |--------------------------------------------------------------------------
  */

  const destination =
    useMemo(
      () =>
        getPlaceCoordinate(
          place
        ),
      [place]
    );

  /*
  |--------------------------------------------------------------------------
  | NAVIGATION STATE
  |--------------------------------------------------------------------------
  */

  const [
    isNavigating,
    setIsNavigating,
  ] = useState(false);

  const [
    position,
    setPosition,
  ] = useState(null);

  const [
    routes,
    setRoutes,
  ] = useState([]);

  const [
    route,
    setRoute,
  ] = useState(null);

  const [
    selectedRoute,
    setSelectedRoute,
  ] = useState(0);

  const [
    loadingRoute,
    setLoadingRoute,
  ] = useState(false);

  const [
    navigationError,
    setNavigationError,
  ] = useState("");

  const [
    offRoute,
    setOffRoute,
  ] = useState(false);

  const [
    speed,
    setSpeed,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | CATEGORY FILTER
  |--------------------------------------------------------------------------
  */

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("all");

  /*
  |--------------------------------------------------------------------------
  | DESCRIPTION EXPANSION
  |--------------------------------------------------------------------------
  */

  const [
    expandedPlaceId,
    setExpandedPlaceId,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | SELECTED PLACE
  |--------------------------------------------------------------------------
  */

  const [
    selectedPlace,
    setSelectedPlace,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | MAP
  |--------------------------------------------------------------------------
  */

  const [map, setMap] =
    useState(null);

  const watchIdRef =
    useRef(null);

  const positionRef =
    useRef(null);

  const recalculatingRef =
    useRef(false);

  useEffect(() => {
    positionRef.current =
      position;
  }, [position]);

  /*
  |--------------------------------------------------------------------------
  | STATIC PLACES
  |--------------------------------------------------------------------------
  */

  const staticPlaces =
    useMemo(
      () =>
        STATIC_JOURNEY_PLACES,
      []
    );

  /*
  |--------------------------------------------------------------------------
  | FILTERED PLACES
  |--------------------------------------------------------------------------
  */

  const filteredPlaces =
    useMemo(() => {
      if (
        activeCategory ===
        "all"
      ) {
        return staticPlaces;
      }

      return staticPlaces.filter(
        (item) =>
          item.category ===
          activeCategory
      );
    }, [
      activeCategory,
      staticPlaces,
    ]);

  /*
  |--------------------------------------------------------------------------
  | CATEGORY COUNTS
  |--------------------------------------------------------------------------
  */

  const categoryCounts =
    useMemo(() => {
      const counts = {};

      Object.keys(
        PLACE_CATEGORIES
      ).forEach(
        (key) => {
          counts[key] = 0;
        }
      );

      staticPlaces.forEach(
        (item) => {
          if (
            counts[
              item.category
            ] !== undefined
          ) {
            counts[
              item.category
            ] += 1;
          }
        }
      );

      counts.all =
        staticPlaces.length;

      return counts;
    }, [staticPlaces]);

  /*
  |--------------------------------------------------------------------------
  | MAP CALLBACKS
  |--------------------------------------------------------------------------
  */

  const onMapLoad =
    useCallback(
      (mapInstance) => {
        setMap(
          mapInstance
        );
      },
      []
    );

  const onMapUnmount =
    useCallback(() => {
      setMap(null);
    }, []);

  /*
  |--------------------------------------------------------------------------
  | LOCATION
  |--------------------------------------------------------------------------
  */

  const getCurrentLocation =
    useCallback(() => {
      return new Promise(
        (resolve) => {
          if (
            !navigator.geolocation
          ) {
            setPosition(
              DEFAULT_CENTER
            );

            resolve(
              DEFAULT_CENTER
            );

            return;
          }

          navigator.geolocation.getCurrentPosition(
            (geoPosition) => {
              const current = {
                lat:
                  Number(
                    geoPosition
                      .coords
                      .latitude
                  ),

                lng:
                  Number(
                    geoPosition
                      .coords
                      .longitude
                  ),
              };

              setPosition(
                current
              );

              const gpsSpeed =
                Number(
                  geoPosition
                    .coords
                    .speed
                );

              if (
                Number.isFinite(
                  gpsSpeed
                ) &&
                gpsSpeed >= 0
              ) {
                setSpeed(
                  gpsSpeed * 3.6
                );
              }

              resolve(
                current
              );
            },

            () => {
              setPosition(
                DEFAULT_CENTER
              );

              resolve(
                DEFAULT_CENTER
              );
            },

            {
              enableHighAccuracy:
                true,

              maximumAge:
                5000,

              timeout:
                10000,
            }
          );
        }
      );
    }, []);

  /*
  |--------------------------------------------------------------------------
  | LOCATION WATCH
  |--------------------------------------------------------------------------
  */

  const startLocationWatch =
    useCallback(() => {
      if (
        !navigator.geolocation
      ) {
        return;
      }

      if (
        watchIdRef.current !==
        null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }

      watchIdRef.current =
        navigator.geolocation.watchPosition(
          (geoPosition) => {
            const current = {
              lat:
                Number(
                  geoPosition
                    .coords
                    .latitude
                ),

              lng:
                Number(
                  geoPosition
                    .coords
                    .longitude
                ),
            };

            setPosition(
              current
            );

            const gpsSpeed =
              Number(
                geoPosition
                  .coords
                  .speed
              );

            if (
              Number.isFinite(
                gpsSpeed
              ) &&
              gpsSpeed >= 0
            ) {
              setSpeed(
                gpsSpeed * 3.6
              );
            }
          },

          () => {
            // Keep last location.
          },

          {
            enableHighAccuracy:
              true,

            maximumAge:
              3000,

            timeout:
              10000,
          }
        );
    }, []);

  /*
  |--------------------------------------------------------------------------
  | STOP LOCATION WATCH
  |--------------------------------------------------------------------------
  */

  const stopLocationWatch =
    useCallback(() => {
      if (
        watchIdRef.current !==
          null &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current =
          null;
      }
    }, []);

  /*
  |--------------------------------------------------------------------------
  | CALCULATE ROUTE
  |--------------------------------------------------------------------------
  */

  const calculateRoute =
    useCallback(
      async (
        origin,
        routeIndex = 0
      ) => {
        if (
          !origin ||
          !destination
        ) {
          throw new Error(
            "Current location or destination coordinates are missing."
          );
        }

        setLoadingRoute(
          true
        );

        setNavigationError("");

        try {
          let availableRoutes =
            [];

          try {
            availableRoutes =
              await getOsrmRoutes(
                origin,
                destination
              );
          } catch (
            error
          ) {
            console.warn(
              "OSRM unavailable. Using demo route.",
              error
            );

            availableRoutes =
              createFallbackRoute(
                origin,
                destination
              );
          }

          if (
            availableRoutes.length ===
            0
          ) {
            availableRoutes =
              createFallbackRoute(
                origin,
                destination
              );
          }

          const safeIndex =
            Math.max(
              0,
              Math.min(
                routeIndex,
                availableRoutes.length -
                  1
              )
            );

          setRoutes(
            availableRoutes
          );

          setSelectedRoute(
            safeIndex
          );

          setRoute(
            availableRoutes[
              safeIndex
            ]
          );

          return availableRoutes;
        } catch (error) {
          console.error(
            "ROUTE ERROR:",
            error
          );

          setNavigationError(
            error?.message ||
              "Unable to calculate route."
          );

          throw error;
        } finally {
          setLoadingRoute(
            false
          );
        }
      },
      [destination]
    );

  /*
  |--------------------------------------------------------------------------
  | START NAVIGATION
  |--------------------------------------------------------------------------
  */

  const startNavigation =
    useCallback(
      async () => {
        if (
          !destination
        ) {
          setNavigationError(
            "This destination does not have valid coordinates."
          );

          return;
        }

        try {
          setNavigationError("");

          const current =
            await getCurrentLocation();

          await calculateRoute(
            current,
            0
          );

          setIsNavigating(
            true
          );

          setExpandedPlaceId(
            null
          );

          startLocationWatch();
        } catch (error) {
          console.error(
            "START NAVIGATION ERROR:",
            error
          );

          setNavigationError(
            error?.message ||
              "Unable to start navigation."
          );
        }
      },
      [
        destination,
        getCurrentLocation,
        calculateRoute,
        startLocationWatch,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | STOP NAVIGATION
  |--------------------------------------------------------------------------
  */

  const stopNavigation =
    useCallback(() => {
      stopLocationWatch();

      setIsNavigating(
        false
      );

      setRoutes([]);

      setRoute(null);

      setSelectedRoute(
        0
      );

      setSpeed(null);

      setOffRoute(false);

      setNavigationError("");

      setSelectedPlace(
        null
      );

      setExpandedPlaceId(
        null
      );

      recalculatingRef.current =
        false;
    }, [
      stopLocationWatch,
    ]);

  /*
  |--------------------------------------------------------------------------
  | CLEANUP
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      stopLocationWatch();
    };
  }, [
    stopLocationWatch,
  ]);

  /*
  |--------------------------------------------------------------------------
  | ROUTE METRICS
  |--------------------------------------------------------------------------
  */

  const routeMetrics =
    useMemo(
      () =>
        buildRouteMetrics(
          route?.path
        ),
      [route?.path]
    );

  /*
  |--------------------------------------------------------------------------
  | CURRENT ROUTE POSITION
  |--------------------------------------------------------------------------
  */

  const currentRoutePosition =
    useMemo(() => {
      if (
        !position ||
        !routeMetrics
      ) {
        return null;
      }

      return getClosestRoutePosition(
        position,
        routeMetrics
      );
    }, [
      position,
      routeMetrics,
    ]);

  const currentProgressMeters =
    currentRoutePosition
      ?.progressMeters || 0;

  /*
  |--------------------------------------------------------------------------
  | PROGRESS
  |--------------------------------------------------------------------------
  */

  const currentProgressPercent =
    useMemo(() => {
      if (
        !routeMetrics ||
        routeMetrics
          .totalDistanceMeters <=
          0
      ) {
        return 0;
      }

      return Math.min(
        100,
        Math.max(
          0,
          (
            currentProgressMeters /
            routeMetrics
              .totalDistanceMeters
          ) *
            100
        )
      );
    }, [
      routeMetrics,
      currentProgressMeters,
    ]);

  /*
  |--------------------------------------------------------------------------
  | REMAINING DISTANCE
  |--------------------------------------------------------------------------
  */

  const distanceToDestination =
    useMemo(() => {
      if (
        routeMetrics
      ) {
        return Math.max(
          0,
          routeMetrics
            .totalDistanceMeters -
            currentProgressMeters
        );
      }

      if (
        position &&
        destination
      ) {
        return haversineDistanceMeters(
          position,
          destination
        );
      }

      return null;
    }, [
      routeMetrics,
      currentProgressMeters,
      position,
      destination,
    ]);

  /*
  |--------------------------------------------------------------------------
  | ETA
  |--------------------------------------------------------------------------
  */

  const eta =
    useMemo(() => {
      if (
        !route ||
        route.distanceMeters <=
          0 ||
        route.durationMillis <=
          0 ||
        !Number.isFinite(
          distanceToDestination
        )
      ) {
        return null;
      }

      const ratio =
        Math.min(
          1,
          Math.max(
            0,
            distanceToDestination /
              route.distanceMeters
          )
        );

      return Math.max(
        1,
        Math.round(
          (
            route.durationMillis /
            60000
          ) *
            ratio
        )
      );
    }, [
      route,
      distanceToDestination,
    ]);

  /*
  |--------------------------------------------------------------------------
  | OFF ROUTE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !isNavigating ||
      !routeMetrics ||
      !position
    ) {
      setOffRoute(false);

      return;
    }

    const closest =
      getClosestRoutePosition(
        position,
        routeMetrics
      );

    if (!closest) {
      setOffRoute(false);

      return;
    }

    setOffRoute(
      closest.distanceFromRouteMeters >
        150
    );
  }, [
    isNavigating,
    routeMetrics,
    position,
  ]);

  /*
  |--------------------------------------------------------------------------
  | AUTO RECALCULATE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !isNavigating ||
      !offRoute ||
      !position ||
      recalculatingRef.current
    ) {
      return;
    }

    recalculatingRef.current =
      true;

    const timeout =
      window.setTimeout(
        async () => {
          try {
            await calculateRoute(
              position,
              selectedRoute
            );
          } catch {
            // Existing error UI handles it.
          } finally {
            recalculatingRef.current =
              false;
          }
        },
        2000
      );

    return () =>
      window.clearTimeout(
        timeout
      );
  }, [
    isNavigating,
    offRoute,
    position,
    selectedRoute,
    calculateRoute,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SELECT ROUTE
  |--------------------------------------------------------------------------
  */

  const selectRoute =
    useCallback(
      (index) => {
        const nextRoute =
          routes?.[index];

        if (!nextRoute) {
          return;
        }

        setSelectedRoute(
          index
        );

        setRoute(
          nextRoute
        );

        setOffRoute(false);

        if (
          map &&
          nextRoute.path
            ?.length > 1 &&
          window.google?.maps
        ) {
          const bounds =
            new window.google.maps.LatLngBounds();

          nextRoute.path.forEach(
            (point) => {
              bounds.extend({
                lat:
                  point.lat,

                lng:
                  point.lng,
              });
            }
          );

          map.fitBounds(
            bounds,
            80
          );
        }
      },
      [routes, map]
    );

  /*
  |--------------------------------------------------------------------------
  | RECALCULATE
  |--------------------------------------------------------------------------
  */

  const recalculateRoute =
    useCallback(
      async () => {
        try {
          const origin =
            positionRef.current ||
            (await getCurrentLocation());

          await calculateRoute(
            origin,
            selectedRoute
          );
        } catch (error) {
          console.error(
            "RECALCULATE ERROR:",
            error
          );
        }
      },
      [
        calculateRoute,
        getCurrentLocation,
        selectedRoute,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | HIDDEN PLACE COORDINATES
  |--------------------------------------------------------------------------
  */

  const getStaticPlaceCoordinates =
    useCallback(
      (item) => {
        return (
          item?.coordinates ||
          getPlaceCoordinate(
            item
          )
        );
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | VIEW PLACE
  |--------------------------------------------------------------------------
  */

  const showPlaceOnMap =
    useCallback(
      (item) => {
        const coordinates =
          getStaticPlaceCoordinates(
            item
          );

        if (
          !coordinates
        ) {
          return;
        }

        setSelectedPlace({
          ...item,
          coordinates,
        });

        if (map) {
          map.panTo(
            coordinates
          );

          map.setZoom(15);
        }
      },
      [
        getStaticPlaceCoordinates,
        map,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | DIRECTIONS
  |--------------------------------------------------------------------------
  */

  const openDirections =
    useCallback(
      (item) => {
        const coordinates =
          getStaticPlaceCoordinates(
            item
          );

        if (
          !coordinates
        ) {
          return;
        }

        const url =
          `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`;

        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      },
      [
        getStaticPlaceCoordinates,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | MAP CENTER
  |--------------------------------------------------------------------------
  */

  const mapCenter =
    position ||
    destination ||
    DEFAULT_CENTER;

  /*
  |--------------------------------------------------------------------------
  | FIT ROUTE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !map ||
      !route?.path ||
      route.path.length < 2 ||
      !window.google?.maps
    ) {
      return;
    }

    const bounds =
      new window.google.maps.LatLngBounds();

    route.path.forEach(
      (point) => {
        bounds.extend({
          lat:
            point.lat,

          lng:
            point.lng,
        });
      }
    );

    map.fitBounds(
      bounds,
      80
    );
  }, [
    map,
    route,
  ]);

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (
    placeLoading
  ) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-6 py-5 text-sm font-semibold text-slate-700 shadow">
          Loading destination...
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | GOOGLE MAP ERROR
  |--------------------------------------------------------------------------
  */

  if (
    loadError
  ) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">

          <h2 className="text-lg font-bold text-red-600">
            Google Maps failed to load
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Check your
            VITE_GOOGLE_MAPS_API_KEY.
          </p>

        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAP LOADING
  |--------------------------------------------------------------------------
  */

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100">

        <div className="rounded-2xl bg-white px-6 py-5 text-center shadow">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            Loading map...
          </p>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DESTINATION ERROR
  |--------------------------------------------------------------------------
  */

  if (
    placeError
  ) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">

          <h2 className="text-lg font-bold text-red-600">
            Unable to load destination
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {placeError}
          </p>

        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | INVALID DESTINATION
  |--------------------------------------------------------------------------
  */

  if (
    !destination
  ) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-6">

        <div className="rounded-2xl bg-white p-6 shadow-xl">

          <h2 className="font-bold text-red-600">
            Invalid destination
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Valid latitude and longitude
            are required for navigation.
          </p>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <style>
        {`
          @keyframes cardEnter {
            from {
              opacity: 0;
              transform: translateY(8px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes softPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }

            50% {
              transform: scale(1.08);
              opacity: 0.8;
            }
          }

          @keyframes markerPulse {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.28);
            }

            50% {
              box-shadow: 0 0 0 10px rgba(37, 99, 235, 0);
            }
          }

          .journey-card {
            animation: cardEnter 0.3s ease-out both;
          }

          .route-location-dot {
            animation: markerPulse 2s infinite;
          }

          .category-icon-pulse {
            animation: softPulse 2.5s ease-in-out infinite;
          }
        `}
      </style>

      <div className="flex h-[calc(100vh-72px)] w-full flex-col overflow-hidden bg-slate-50 lg:flex-row">

        {/* ==============================================================
            LEFT PANEL
            ============================================================== */}

        <aside className="flex h-[62%] w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:h-full lg:w-[430px] lg:border-b-0 lg:border-r">

          {/* ============================================================
              HEADER
              ============================================================ */}

          <div className="shrink-0 border-b border-slate-200 bg-white px-4 pb-3.5 pt-4">

            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <span className="category-icon-pulse text-sm">
                    🏍️
                  </span>

                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">
                    Discover Bharatpur
                  </p>

                </div>

                <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                  Rider Stops
                </h1>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  Fuel, food, service and places
                  worth a stop.
                </p>

              </div>

              {isNavigating && (
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[9px] font-black text-green-700">
                  ● LIVE
                </span>
              )}

            </div>

            {/* Destination */}

            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-sm">
                ⚑
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  Destination
                </p>

                <p className="truncate text-[12px] font-extrabold text-slate-900">
                  {
                    place?.name ||
                    "Destination"
                  }
                </p>

              </div>

              {isNavigating && (
                <div className="shrink-0 text-right">

                  <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                    Left
                  </p>

                  <p className="text-[11px] font-black text-blue-600">
                    {
                      formatDistance(
                        distanceToDestination
                      )
                    }
                  </p>

                </div>
              )}

            </div>

            {/* =========================================================
                RIDER CATEGORY FILTER
                ========================================================= */}

            <div className="mt-3">

              <div className="mb-1.5 flex items-center justify-between">

                <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                  Quick categories
                </p>

                <p className="text-[8px] text-slate-400">
                  {staticPlaces.length} stops
                </p>

              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                {Object.values(
                  PLACE_CATEGORIES
                ).map(
                  (category) => {

                    const count =
                      categoryCounts[
                        category.key
                      ] || 0;

                    const active =
                      activeCategory ===
                      category.key;

                    return (
                      <button
                        key={
                          category.key
                        }
                        type="button"
                        onClick={() =>
                          setActiveCategory(
                            category.key
                          )
                        }
                        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold transition-all duration-200 ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >

                        <span>
                          {
                            category.icon
                          }
                        </span>

                        <span>
                          {
                            category.label
                          }
                        </span>

                        {count > 0 && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[7px] ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {count}
                          </span>
                        )}

                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* Route stats */}

            <div className="mt-2.5 grid grid-cols-3 gap-1.5">

              <div className="rounded-lg bg-slate-50 px-2 py-1.5">

                <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                  Route
                </p>

                <p className="mt-0.5 text-[10px] font-black text-slate-800">
                  {isNavigating
                    ? `#${selectedRoute + 1}`
                    : "--"}
                </p>

              </div>

              <div className="rounded-lg bg-slate-50 px-2 py-1.5">

                <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                  Progress
                </p>

                <p className="mt-0.5 text-[10px] font-black text-slate-800">
                  {isNavigating
                    ? `${Math.round(
                        currentProgressPercent
                      )}%`
                    : "--"}
                </p>

              </div>

              <div className="rounded-lg bg-slate-50 px-2 py-1.5">

                <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                  ETA
                </p>

                <p className="mt-0.5 text-[10px] font-black text-slate-800">
                  {isNavigating &&
                  eta !== null
                    ? `${eta}m`
                    : "--"}
                </p>

              </div>

            </div>

          </div>

          {/* ============================================================
              TIMELINE
              ============================================================ */}

          <div className="relative min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3.5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {!isNavigating ? (

              <div className="flex h-full items-center justify-center">

                <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
                    🏍️
                  </div>

                  <h2 className="mt-3 text-base font-extrabold text-slate-900">
                    Ready to ride?
                  </h2>

                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    Start navigation to open your
                    rider timeline and useful stops.
                  </p>

                </div>

              </div>

            ) : (

              <div className="relative pb-6">

                {/* ======================================================
                    VERTICAL TIMELINE
                    ====================================================== */}

                <div className="pointer-events-none absolute bottom-7 left-[22px] top-2 z-0 w-[3px] rounded-full bg-slate-200">

                  <div
                    className="absolute left-0 top-0 w-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{
                      height: `${Math.min(
                        100,
                        currentProgressPercent
                      )}%`,
                    }}
                  />

                  {/* Current position */}

                  <div
                    className="route-location-dot absolute left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow-lg transition-all duration-700"
                    style={{
                      top: `${Math.min(
                        100,
                        Math.max(
                          0,
                          currentProgressPercent
                        )
                      )}%`,
                    }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>

                  {/* Destination */}

                  <div className="absolute bottom-0 left-1/2 flex h-9 w-9 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-green-600 text-sm shadow-lg">
                    ⚑
                  </div>

                </div>

                {/* Current location */}

                <div className="relative z-10 mb-5 ml-10">

                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-2.5 py-1.5 text-[9px] font-bold text-blue-700 shadow-sm">

                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

                    Current location

                    {speed !== null && (
                      <span className="text-slate-400">
                        {speed.toFixed(0)} km/h
                      </span>
                    )}

                  </div>

                </div>

                {/* ======================================================
                    FILTERED PLACE CARDS
                    ====================================================== */}

                <div className="relative z-10 ml-10">

                  {filteredPlaces.map(
                    (
                      item,
                      index
                    ) => {

                      const isExpanded =
                        expandedPlaceId ===
                        item.id;

                      return (
                        <article
                          key={
                            item.id
                          }
                          className="journey-card relative mb-3.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                          style={{
                            animationDelay: `${
                              index * 50
                            }ms`,
                          }}
                        >

                          {/* Timeline connector */}

                          <div className="pointer-events-none absolute -left-[18px] top-7 h-px w-[18px] bg-slate-200" />

                          {/* Timeline node */}

                          <div
                            className={`absolute -left-[31px] top-[18px] flex h-6 w-6 items-center justify-center rounded-full border-4 border-slate-50 text-[8px] font-black text-white shadow ${
                              item.isHidden
                                ? "bg-violet-600"
                                : "bg-slate-700"
                            }`}
                          >
                            {
                              index +
                              1
                            }
                          </div>

                          {/* Category + Hidden */}

                          <div className="flex items-center justify-between gap-2">

                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[8px] font-bold text-slate-600">

                              <span>
                                {
                                  item.categoryIcon
                                }
                              </span>

                              {
                                item.categoryLabel
                              }

                            </span>

                            {item.isHidden && (
                              <span className="rounded-full bg-violet-50 px-2 py-1 text-[7px] font-black text-violet-600">
                                Hidden
                              </span>
                            )}

                          </div>

                          {/* Name / Location */}

                          <div className="mt-2.5 min-w-0">

                            <div className="flex items-start justify-between gap-2">

                              <h2 className="min-w-0 flex-1 text-[12px] font-extrabold leading-4 text-slate-900">
                                {
                                  item.name
                                }
                              </h2>

                              {isNavigating &&
                                item.coordinates &&
                                position && (
                                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-600">
                                    {
                                      formatDistance(
                                        haversineDistanceMeters(
                                          position,
                                          item.coordinates
                                        )
                                      )
                                    }
                                  </span>
                                )}

                            </div>

                            <p className="mt-0.5 line-clamp-1 text-[8px] text-slate-400">
                              {
                                cleanText(
                                  item.location ||
                                    item.formattedAddress ||
                                    "Bharatpur, Chitwan"
                                )
                              }
                            </p>

                          </div>

                          {/* Short description */}

                          <div className="mt-2">

                            {isExpanded ? (

                              <p className="text-[10px] leading-4 text-slate-500">
                                {
                                  cleanText(
                                    item.description ||
                                      item.conciseDescription
                                  )
                                }
                              </p>

                            ) : (

                              <p className="line-clamp-2 text-[10px] leading-4 text-slate-500">
                                {
                                  item.conciseDescription
                                }
                              </p>

                            )}

                            {cleanText(
                              item.description
                            ).length >
                              item.conciseDescription.length && (

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedPlaceId(
                                    (
                                      current
                                    ) =>
                                      current ===
                                      item.id
                                        ? null
                                        : item.id
                                  )
                                }
                                className="mt-1 inline-flex items-center gap-1 text-[8px] font-black text-blue-600"
                              >

                                {isExpanded
                                  ? "Show less"
                                  : "Read more"}

                                <span
                                  className={`transition-transform duration-200 ${
                                    isExpanded
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                >
                                  ↓
                                </span>

                              </button>

                            )}

                          </div>

                          {/* Compact actions */}

                          <div className="mt-2.5 flex gap-1.5">

                            <button
                              type="button"
                              onClick={() =>
                                showPlaceOnMap(
                                  item
                                )
                              }
                              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[8px] font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              👁 View
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDirections(
                                  item
                                )
                              }
                              className="flex-1 rounded-lg bg-blue-600 px-2 py-1.5 text-[8px] font-bold text-white transition hover:bg-blue-700"
                            >
                              🧭 Go
                            </button>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>

                {/* ======================================================
                    DESTINATION
                    ====================================================== */}

                <div className="relative z-10 ml-10 mt-6 flex items-center gap-2.5">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm text-white shadow">
                    ⚑
                  </div>

                  <div className="rounded-xl bg-white px-2.5 py-2 shadow-sm">

                    <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                      Destination
                    </p>

                    <p className="mt-0.5 max-w-[230px] truncate text-[10px] font-extrabold text-slate-800">
                      {
                        place?.name ||
                        "Destination"
                      }
                    </p>

                  </div>

                </div>

              </div>
            )}

          </div>

          {/* ============================================================
              NAVIGATION CONTROLS
              ============================================================ */}

          <div className="shrink-0 border-t border-slate-200 bg-white p-3">

            {!isNavigating ? (

              <button
                type="button"
                onClick={
                  startNavigation
                }
                disabled={
                  loadingRoute
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                🧭

                {loadingRoute
                  ? "Preparing route..."
                  : "Start Navigation"}

              </button>

            ) : (

              <div className="grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={
                    recalculateRoute
                  }
                  disabled={
                    loadingRoute
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >

                  {loadingRoute
                    ? "Loading..."
                    : "↻ Recalculate"}

                </button>

                <button
                  type="button"
                  onClick={
                    stopNavigation
                  }
                  className="rounded-xl bg-red-600 px-3 py-2.5 text-[10px] font-bold text-white transition hover:bg-red-700"
                >
                  ■ Stop
                </button>

              </div>

            )}

            {/* ==========================================================
                ROUTE 1 / 2 / 3
                ========================================================== */}

            {isNavigating &&
              routes.length >
                0 && (

              <div className="mt-2.5">

                <div className="mb-1.5 flex items-center justify-between">

                  <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                    Route options
                  </p>

                  <p className="text-[8px] text-slate-400">
                    {
                      routes.length
                    } available
                  </p>

                </div>

                <div className="grid grid-cols-3 gap-1.5">

                  {routes.map(
                    (
                      routeItem,
                      index
                    ) => {

                      const active =
                        selectedRoute ===
                        index;

                      return (
                        <button
                          key={
                            routeItem.index
                          }
                          type="button"
                          onClick={() =>
                            selectRoute(
                              index
                            )
                          }
                          className={`relative rounded-xl border px-2.5 py-2 text-left transition-all duration-200 ${
                            active
                              ? "border-blue-600 bg-blue-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-blue-300"
                          }`}
                        >

                          {active && (
                            <span className="absolute right-1.5 top-1.5 text-[8px] font-black text-blue-600">
                              ✓
                            </span>
                          )}

                          <p
                            className={`text-[9px] font-black ${
                              active
                                ? "text-blue-700"
                                : "text-slate-800"
                            }`}
                          >
                            Route{" "}
                            {index +
                              1}
                          </p>

                          <p className="mt-0.5 text-[8px] font-semibold text-slate-500">
                            {
                              formatDistance(
                                routeItem.distanceMeters
                              )
                            }
                          </p>

                          <p className="text-[8px] text-slate-400">
                            {
                              formatDuration(
                                routeItem.durationMillis
                              )
                            }
                          </p>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>

            )}

          </div>

        </aside>

        {/* ==============================================================
            MAP
            ============================================================== */}

        <section className="relative min-h-0 flex-1 bg-slate-100">

          <GoogleMap
            mapContainerStyle={
              MAP_CONTAINER_STYLE
            }
            center={
              mapCenter
            }
            zoom={14}
            onLoad={
              onMapLoad
            }
            onUnmount={
              onMapUnmount
            }
            options={{
              streetViewControl:
                false,

              mapTypeControl:
                false,

              fullscreenControl:
                true,

              clickableIcons:
                true,

              gestureHandling:
                "greedy",
            }}
          >

            {/* ==========================================================
                DESTINATION MARKER
                ========================================================== */}

            <Marker
              position={
                destination
              }
              title={
                place?.name ||
                "Destination"
              }
            />

            {/* ==========================================================
                CURRENT LOCATION
                ========================================================== */}

            {isNavigating &&
              position && (

              <Marker
                position={
                  position
                }
                title="Your current location"
                icon={{
                  path:
                    window.google
                      ?.maps
                      ?.SymbolPath
                      ?.CIRCLE,

                  scale: 8,

                  fillColor:
                    "#2563eb",

                  fillOpacity: 1,

                  strokeColor:
                    "#ffffff",

                  strokeWeight: 3,
                }}
              />

            )}

            {/* ==========================================================
                IMPORTANT:
                NO HIDDEN PLACE MARKERS / PURPLE DOTS
                ========================================================== */}

            {/* ==========================================================
                ALTERNATIVE ROUTES
                ========================================================== */}

            {isNavigating &&
              routes.map(
                (
                  routeItem,
                  index
                ) => {

                  if (
                    index ===
                    selectedRoute
                  ) {
                    return null;
                  }

                  if (
                    !routeItem.path ||
                    routeItem.path.length <
                      2
                  ) {
                    return null;
                  }

                  return (
                    <Polyline
                      key={`alternative-${index}`}
                      path={
                        routeItem.path
                      }
                      options={{
                        strokeColor:
                          "#94a3b8",

                        strokeOpacity:
                          0.42,

                        strokeWeight:
                          4,

                        geodesic:
                          true,

                        zIndex: 4,
                      }}
                    />
                  );
                }
              )}

            {/* ==========================================================
                SELECTED ROUTE
                ========================================================== */}

            {isNavigating &&
              route?.path?.length >
                1 && (

              <Polyline
                path={
                  route.path
                }
                options={{
                  strokeColor:
                    "#2563eb",

                  strokeOpacity:
                    0.92,

                  strokeWeight:
                    6,

                  geodesic:
                    true,

                  zIndex: 10,
                }}
              />

            )}

            {/* ==========================================================
                INFO WINDOW
                ========================================================== */}

            {selectedPlace?.coordinates && (

              <InfoWindow
                position={
                  selectedPlace.coordinates
                }
                onCloseClick={() =>
                  setSelectedPlace(
                    null
                  )
                }
              >

                <div className="min-w-[210px] max-w-[250px]">

                  <div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">

                    {
                      selectedPlace.categoryIcon
                    }{" "}

                    {
                      selectedPlace.categoryLabel
                    }

                  </div>

                  <h3 className="mt-1 text-sm font-bold text-slate-900">

                    {
                      selectedPlace.name
                    }

                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">

                    {
                      selectedPlace.conciseDescription ||
                      selectedPlace.description
                    }

                  </p>

                </div>

              </InfoWindow>

            )}

          </GoogleMap>

          {/* ============================================================
              MAP TOP STATUS
              ============================================================ */}

          <div className="pointer-events-none absolute left-3 right-3 top-3 z-20">

            <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">

              <span className="text-sm">
                🏍️
              </span>

              <div className="min-w-0">

                <p className="truncate text-[10px] font-black text-slate-800">
                  {
                    place?.name ||
                    "Bharatpur Journey"
                  }
                </p>

                <p className="text-[8px] text-slate-400">

                  {isNavigating
                    ? `Route ${
                        selectedRoute +
                        1
                      } • ${formatDistance(
                        distanceToDestination
                      )} left`
                    : "Ready to explore"}

                </p>

              </div>

            </div>

          </div>

          {/* ============================================================
              ACTIVE ROUTE
              ============================================================ */}

          {isNavigating &&
            routes.length >
              0 && (

            <div className="absolute bottom-3 left-3 z-20">

              <div className="rounded-xl border border-white/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">

                <div className="flex items-center gap-2">

                  <span className="h-2 w-2 rounded-full bg-blue-600" />

                  <span className="text-[9px] font-black text-slate-700">
                    Route{" "}
                    {selectedRoute +
                      1}
                  </span>

                  <span className="text-[8px] text-slate-400">
                    •
                  </span>

                  <span className="text-[9px] font-semibold text-slate-500">
                    {
                      formatDistance(
                        route?.distanceMeters
                      )
                    }
                  </span>

                </div>

              </div>

            </div>

          )}

          {/* ============================================================
              OFF ROUTE
              ============================================================ */}

          {offRoute && (

            <div className="absolute right-3 top-20 z-30">

              <div className="rounded-xl bg-red-600 px-3 py-2 text-[9px] font-bold text-white shadow-lg">

                Off route • Recalculating

              </div>

            </div>

          )}

          {/* ============================================================
              NAVIGATION ERROR
              ============================================================ */}

          {navigationError && (

            <div className="absolute bottom-3 right-3 z-30 max-w-[300px]">

              <div className="rounded-xl border border-red-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">

                <p className="text-[9px] font-bold text-red-700">
                  Navigation notice
                </p>

                <p className="mt-0.5 text-[9px] leading-4 text-red-600">
                  {
                    navigationError
                  }
                </p>

              </div>

            </div>

          )}

        </section>

      </div>
    </>
  );
}