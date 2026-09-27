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

import useNavigation from "../hooks/useNavigation";

/*
|--------------------------------------------------------------------------
| Google libraries
|--------------------------------------------------------------------------
|
| IMPORTANT:
| "places" has been removed.
|
| Google is now used only for:
| - displaying the map
| - calculating the navigation route
|
| Recommendations are loaded from our backend.
|
*/

const GOOGLE_MAPS_LIBRARIES = ["routes"];

/*
|--------------------------------------------------------------------------
| Map
|--------------------------------------------------------------------------
*/

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
| Recommendation settings
|--------------------------------------------------------------------------
|
| These affect only the frontend display.
| The actual place search is performed by the backend.
|
*/

const MAX_RECOMMENDATIONS = 12;
const MIN_AHEAD_DISTANCE_METERS = 250;

/*
|--------------------------------------------------------------------------
| Recommendation categories
|--------------------------------------------------------------------------
|
| These are now only used for filtering and displaying results.
| They are NOT sent to Google Places.
|
*/

const RECOMMENDATION_CATEGORIES = [
  {
    key: "all",
    label: "All",
    icon: "✨",
  },
  {
    key: "hotel",
    label: "Hotels",
    icon: "🏨",
  },
  {
    key: "cafe",
    label: "Cafés",
    icon: "☕",
  },
  {
    key: "park",
    label: "Parks & Gardens",
    icon: "🌳",
  },
  {
    key: "camping",
    label: "Camping",
    icon: "⛺",
  },
  {
    key: "food",
    label: "Food",
    icon: "🍽️",
  },
  {
    key: "attraction",
    label: "Attractions",
    icon: "📸",
  },
];

/*
|--------------------------------------------------------------------------
| Coordinate validation
|--------------------------------------------------------------------------
*/

function isValidCoordinate(
  lat,
  lng
) {
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

/*
|--------------------------------------------------------------------------
| Distance helpers
|--------------------------------------------------------------------------
*/

function haversineDistanceMeters(
  from,
  to
) {
  if (!from || !to) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusMeters =
    6371000;

  const toRadians = (
    degrees
  ) =>
    (degrees * Math.PI) /
    180;

  const lat1 =
    toRadians(from.lat);

  const lat2 =
    toRadians(to.lat);

  const deltaLat =
    toRadians(
      to.lat - from.lat
    );

  const deltaLng =
    toRadians(
      to.lng - from.lng
    );

  const a =
    Math.sin(deltaLat / 2) **
      2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) **
        2;

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

  const totalMinutes =
    Math.round(
      Number(milliseconds) /
        60000
    );

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

/*
|--------------------------------------------------------------------------
| Route geometry helpers
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

  if (points.length < 2) {
    return null;
  }

  const cumulativeMeters = [
    0,
  ];

  let totalDistanceMeters =
    0;

  for (
    let i = 1;
    i < points.length;
    i += 1
  ) {
    totalDistanceMeters +=
      haversineDistanceMeters(
        points[i - 1],
        points[i]
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

function getClosestPointOnSegment(
  point,
  start,
  end
) {
  const averageLatitudeRadians =
    ((start.lat +
      end.lat +
      point.lat) /
      3) *
    (Math.PI / 180);

  const longitudeScale =
    Math.cos(
      averageLatitudeRadians
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

  const segmentLengthSquared =
    dx * dx + dy * dy;

  let fraction = 0;

  if (
    segmentLengthSquared > 0
  ) {
    fraction =
      ((px - ax) * dx +
        (py - ay) * dy) /
      segmentLengthSquared;

    fraction = Math.max(
      0,
      Math.min(
        1,
        fraction
      )
    );
  }

  const projected = {
    lat:
      ay +
      (by - ay) *
        fraction,

    lng:
      (ax +
        (bx - ax) *
          fraction) /
      longitudeScale,
  };

  return {
    point: projected,

    distanceMeters:
      haversineDistanceMeters(
        point,
        projected
      ),

    fraction,
  };
}

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
    let i = 0;
    i <
    routeMetrics.points
      .length - 1;
    i += 1
  ) {
    const start =
      routeMetrics.points[
        i
      ];

    const end =
      routeMetrics.points[
        i + 1
      ];

    const projection =
      getClosestPointOnSegment(
        point,
        start,
        end
      );

    const segmentDistance =
      routeMetrics
        .cumulativeMeters[
          i + 1
        ] -
      routeMetrics
        .cumulativeMeters[i];

    const progressMeters =
      routeMetrics
        .cumulativeMeters[i] +
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

        point:
          projection.point,
      };
    }
  }

  return best;
}

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
    routeMetrics.totalDistanceMeters
  ) {
    return routeMetrics
      .points[
        routeMetrics.points
          .length - 1
      ];
  }

  for (
    let i = 1;
    i <
    routeMetrics
      .cumulativeMeters
      .length;
    i += 1
  ) {
    if (
      routeMetrics
        .cumulativeMeters[i] >=
      distanceMeters
    ) {
      const previousDistance =
        routeMetrics
          .cumulativeMeters[
            i - 1
          ];

      const segmentDistance =
        routeMetrics
          .cumulativeMeters[i] -
        previousDistance;

      const fraction =
        segmentDistance > 0
          ? (distanceMeters -
              previousDistance) /
            segmentDistance
          : 0;

      const start =
        routeMetrics.points[
          i - 1
        ];

      const end =
        routeMetrics.points[
          i
        ];

      return {
        lat:
          start.lat +
          (end.lat -
            start.lat) *
            fraction,

        lng:
          start.lng +
          (end.lng -
            start.lng) *
            fraction,
      };
    }
  }

  return routeMetrics
    .points[
      routeMetrics.points.length -
        1
    ];
}

/*
|--------------------------------------------------------------------------
| Recommendation metadata
|--------------------------------------------------------------------------
*/

function getCategoryDefinition(
  key
) {
  return (
    RECOMMENDATION_CATEGORIES.find(
      (category) =>
        category.key === key
    ) ||
    RECOMMENDATION_CATEGORIES[0]
  );
}

function getRecommendationDescription(
  categoryKey
) {
  switch (categoryKey) {
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
| Normalize recommendation returned by backend
|--------------------------------------------------------------------------
|
| Backend returns:
|
| {
|   id,
|   name,
|   address,
|   latitude,
|   longitude,
|   categoryKeys,
|   categoryLabel,
|   categoryIcon,
|   ...
| }
|
| The frontend converts it into the shape used by the UI.
|
*/

function normalizeRecommendation(
  item
) {
  if (!item) {
    return null;
  }

  const latitude =
    Number(item.latitude);

  const longitude =
    Number(item.longitude);

  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const categoryKeys =
    Array.isArray(
      item.categoryKeys
    ) &&
    item.categoryKeys.length > 0
      ? item.categoryKeys
      : [
          "attraction",
        ];

  const stars =
    Number(item.stars);

  const hasStars =
    Number.isFinite(stars) &&
    stars > 0;

  return {
    ...item,

    id:
      item.id ||
      `${latitude}-${longitude}`,

    place_id:
      item.id ||
      `${latitude}-${longitude}`,

    name:
      item.name ||
      "Recommended place",

    address:
      item.address ||
      "",

    vicinity:
      item.address ||
      "",

    latitude,

    longitude,

    coordinates: {
      lat: latitude,
      lng: longitude,
    },

    categoryKeys,

    description:
      item.description ||
      getRecommendationDescription(
        categoryKeys[0]
      ),

    rating:
      hasStars
        ? stars
        : null,

    /*
     * OpenStreetMap does not provide Google's review count.
     */

    user_ratings_total: 0,

    /*
     * We do NOT claim these are Google-popular places.
     *
     * This badge simply tells the tourist that
     * the location has been selected for the route.
     */

    popularEnough: false,

    source:
      item.source ||
      "openstreetmap",

    openingHours:
      item.openingHours ||
      null,

    website:
      item.website ||
      null,

    distanceAheadMeters:
      Number(
        item.distanceAheadMeters
      ) || 0,

    liveDistanceAheadMeters:
      Number(
        item.distanceAheadMeters
      ) || 0,

    progressMeters:
      Number(
        item.progressMeters
      ) || 0,

    distanceFromRouteMeters:
      Number(
        item.distanceFromRouteMeters
      ) || 0,

    categoryLabel:
      item.categoryLabel ||
      getCategoryDefinition(
        categoryKeys[0]
      ).label,

    categoryIcon:
      item.categoryIcon ||
      getCategoryDefinition(
        categoryKeys[0]
      ).icon,
  };
}

/*
|--------------------------------------------------------------------------
| Main component
|--------------------------------------------------------------------------
*/

export default function Placemap({
  apiUrl =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",
}) {
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
  | Google Maps
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
  | Place
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

  const [
    showDestinationInfo,
    setShowDestinationInfo,
  ] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | Load place from existing backend
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled =
      false;

    async function loadPlace() {
      if (!placeId) {
        setPlaceError(
          "Place ID is missing."
        );

        setPlaceLoading(
          false
        );

        return;
      }

      try {
        setPlaceLoading(true);
        setPlaceError("");

        const response =
          await fetch(
            `${apiUrl}/places/${placeId}`
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to load place."
          );
        }

        if (!data?.place) {
          throw new Error(
            "Place data is missing."
          );
        }

        if (!cancelled) {
          setPlace(
            data.place
          );
        }
      } catch (error) {
        console.error(
          "❌ PLACE LOAD ERROR:",
          error
        );

        if (!cancelled) {
          setPlaceError(
            error?.message ||
              "Failed to load place."
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

    loadPlace();

    return () => {
      cancelled = true;
    };
  }, [
    placeId,
    apiUrl,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Destination
  |--------------------------------------------------------------------------
  */

  const destination =
    useMemo(() => {
      if (!place) {
        return null;
      }

      const googlePlaceId =
        String(
          place.googlePlaceId ||
            ""
        ).trim();

      if (!googlePlaceId) {
        console.error(
          "❌ PLACE DOES NOT HAVE GOOGLE PLACE ID:",
          place
        );

        return null;
      }

      let latitude =
        Number(
          place.latitude
        );

      let longitude =
        Number(
          place.longitude
        );

      /*
       * GeoJSON fallback:
       * [longitude, latitude]
       */

      if (
        !isValidCoordinate(
          latitude,
          longitude
        )
      ) {
        const coordinates =
          place.locationPoint
            ?.coordinates;

        if (
          Array.isArray(
            coordinates
          ) &&
          coordinates.length >=
            2
        ) {
          longitude =
            Number(
              coordinates[0]
            );

          latitude =
            Number(
              coordinates[1]
            );
        }
      }

      /*
       * lat/lng fallback
       */

      if (
        !isValidCoordinate(
          latitude,
          longitude
        )
      ) {
        latitude =
          Number(place.lat);

        longitude =
          Number(place.lng);
      }

      if (
        !isValidCoordinate(
          latitude,
          longitude
        )
      ) {
        console.error(
          "❌ INVALID DESTINATION COORDINATES:",
          {
            place,
            latitude,
            longitude,
          }
        );

        return null;
      }

      return {
        lat: latitude,
        lng: longitude,
        googlePlaceId,
      };
    }, [place]);

  /*
  |--------------------------------------------------------------------------
  | EXISTING NAVIGATION SYSTEM
  |--------------------------------------------------------------------------
  |
  | DO NOT CHANGE.
  |
  */

  const {
    isNavigating,
    position,
    route,
    routes,
    selectedRoute,
    loadingRoute,
    error,
    offRoute,
    speed,
    distanceToDestination,
    eta,
    startNavigation,
    stopNavigation,
    recalculateRoute,
    selectRoute,
  } = useNavigation({
    destination,
    mode: "driving",
    googleLoaded: isLoaded,
  });

  const safeRoutes =
    Array.isArray(routes)
      ? routes
      : [];

  /*
  |--------------------------------------------------------------------------
  | Map center
  |--------------------------------------------------------------------------
  */

  const mapCenter =
    position
      ? {
          lat:
            position.lat,

          lng:
            position.lng,
        }
      : destination
        ? {
            lat:
              destination.lat,

            lng:
              destination.lng,
          }
        : DEFAULT_CENTER;

  /*
  |--------------------------------------------------------------------------
  | Map reference
  |--------------------------------------------------------------------------
  */

  const [map, setMap] =
    useState(null);

  const positionRef =
    useRef(position);

  positionRef.current =
    position;

  const onMapLoad =
    useCallback(
      (
        mapInstance
      ) => {
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
  | Existing route fitting
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !map ||
      !route?.path ||
      route.path.length === 0
    ) {
      return;
    }

    if (
      !window.google?.maps
    ) {
      return;
    }

    const bounds =
      new window.google.maps.LatLngBounds();

    route.path.forEach(
      (point) => {
        bounds.extend({
          lat: point.lat,
          lng: point.lng,
        });
      }
    );

    if (position) {
      bounds.extend({
        lat:
          position.lat,

        lng:
          position.lng,
      });
    }

    if (destination) {
      bounds.extend({
        lat:
          destination.lat,

        lng:
          destination.lng,
      });
    }

    map.fitBounds(
      bounds,
      80
    );
  }, [
    map,
    route,
    position,
    destination,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Dynamic route analysis
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

  const currentRouteProgressMeters =
    useMemo(() => {
      if (!routeMetrics) {
        return 0;
      }

      if (!position) {
        return 0;
      }

      return (
        getClosestRoutePosition(
          position,
          routeMetrics
        )?.progressMeters ||
        0
      );
    }, [
      position,
      routeMetrics,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Dynamic recommendation state
  |--------------------------------------------------------------------------
  */

  const [
    nearbyPlaces,
    setNearbyPlaces,
  ] = useState([]);

  const [
    nearbyLoading,
    setNearbyLoading,
  ] = useState(false);

  const [
    nearbyError,
    setNearbyError,
  ] = useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("all");

  const [
    selectedNearbyPlace,
    setSelectedNearbyPlace,
  ] = useState(null);

  const searchVersionRef =
    useRef(0);

  /*
  |--------------------------------------------------------------------------
  | Load route recommendations from YOUR BACKEND
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | There is NO:
  | - PlacesService
  | - nearbySearch
  | - Google Places request
  |
  | here anymore.
  |
  | The backend will search OpenStreetMap / Overpass.
  |--------------------------------------------------------------------------
  */

  const searchRouteRecommendations =
    useCallback(
      async () => {
        if (
          !apiUrl ||
          !routeMetrics
        ) {
          return;
        }

        const searchVersion =
          searchVersionRef.current +
          1;

        searchVersionRef.current =
          searchVersion;

        setNearbyLoading(
          true
        );

        setNearbyError("");

        setSelectedNearbyPlace(
          null
        );

        try {
          const latestPosition =
            positionRef.current;

          const currentProgress =
            latestPosition
              ? getClosestRoutePosition(
                  latestPosition,
                  routeMetrics
                )?.progressMeters ||
                0
              : 0;

          /*
           * Send the actual route to the backend.
           */

          const response =
            await fetch(
              `${apiUrl}/places/recommendations`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    route:
                      routeMetrics.points,

                    currentPosition:
                      latestPosition
                        ? {
                            lat:
                              Number(
                                latestPosition.lat
                              ),

                            lng:
                              Number(
                                latestPosition.lng
                              ),
                          }
                        : null,
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
            throw new Error(
              data?.message ||
                data?.error ||
                "Failed to load route recommendations."
            );
          }

          if (
            searchVersionRef.current !==
            searchVersion
          ) {
            return;
          }

          const backendPlaces =
            Array.isArray(
              data?.recommendations
            )
              ? data.recommendations
              : [];

          /*
           * Convert backend results into
           * the format used by the UI.
           */

          const normalizedPlaces =
            backendPlaces
              .map(
                (
                  item
                ) =>
                  normalizeRecommendation(
                    item
                  )
              )
              .filter(
                Boolean
              )
              .map(
                (item) => {
                  const distanceAhead =
                    item.progressMeters -
                    currentProgress;

                  return {
                    ...item,

                    distanceAheadMeters:
                      distanceAhead,

                    liveDistanceAheadMeters:
                      distanceAhead,
                  };
                }
              )
              .filter(
                (item) =>
                  item.progressMeters <=
                    routeMetrics.totalDistanceMeters +
                      250 &&
                  item.distanceAheadMeters >=
                    MIN_AHEAD_DISTANCE_METERS
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  first.distanceAheadMeters -
                  second.distanceAheadMeters
              )
              .slice(
                0,
                MAX_RECOMMENDATIONS
              );

          setNearbyPlaces(
            normalizedPlaces
          );
        } catch (error) {
          console.error(
            "❌ ROUTE RECOMMENDATION ERROR:",
            error
          );

          if (
            searchVersionRef.current ===
            searchVersion
          ) {
            setNearbyPlaces(
              []
            );

            setNearbyError(
              error?.message ||
                "Could not analyze places along this route."
            );
          }
        } finally {
          if (
            searchVersionRef.current ===
            searchVersion
          ) {
            setNearbyLoading(
              false
            );
          }
        }
      },
      [
        apiUrl,
        routeMetrics,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Run recommendation search when route changes
  |--------------------------------------------------------------------------
  |
  | GPS position is intentionally NOT a dependency.
  |
  | This prevents a backend/API request on every GPS update.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !routeMetrics
    ) {
      setNearbyPlaces(
        []
      );

      setNearbyError(
        ""
      );

      return;
    }

    searchRouteRecommendations();
  }, [
    routeMetrics,
    searchRouteRecommendations,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Manual refresh
  |--------------------------------------------------------------------------
  */

  const refreshRecommendations =
    useCallback(
      () => {
        searchRouteRecommendations();
      },
      [
        searchRouteRecommendations,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Re-sort existing recommendations as GPS progresses
  |--------------------------------------------------------------------------
  |
  | No new API request occurs here.
  |--------------------------------------------------------------------------
  */

  const visibleNearbyPlaces =
    useMemo(() => {
      return nearbyPlaces
        .map(
          (item) => ({
            ...item,

            liveDistanceAheadMeters:
              item.progressMeters -
              currentRouteProgressMeters,
          })
        )
        .filter(
          (item) =>
            item.liveDistanceAheadMeters >=
            MIN_AHEAD_DISTANCE_METERS
        )
        .filter((item) => {
          if (
            activeCategory ===
            "all"
          ) {
            return true;
          }

          return (
            Array.isArray(
              item.categoryKeys
            ) &&
            item.categoryKeys.includes(
              activeCategory
            )
          );
        })
        .sort(
          (
            first,
            second
          ) =>
            first.liveDistanceAheadMeters -
            second.liveDistanceAheadMeters
        )
        .slice(
          0,
          MAX_RECOMMENDATIONS
        );
    }, [
      nearbyPlaces,
      currentRouteProgressMeters,
      activeCategory,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Approximate stop time
  |--------------------------------------------------------------------------
  */

  const getApproximateStopTime =
    useCallback(
      (
        distanceMeters
      ) => {
        if (
          !Number.isFinite(
            distanceMeters
          ) ||
          distanceMeters <= 0
        ) {
          return "--";
        }

        const totalRemainingDistance =
          routeMetrics
            ? Math.max(
                1,
                routeMetrics.totalDistanceMeters -
                  currentRouteProgressMeters
              )
            : 1;

        if (
          eta !== null &&
          Number.isFinite(
            Number(eta)
          )
        ) {
          const ratio =
            Math.min(
              1,
              Math.max(
                0,
                distanceMeters /
                  totalRemainingDistance
              )
            );

          return `≈ ${Math.max(
            1,
            Math.round(
              Number(eta) *
                ratio
            )
          )} min`;
        }

        const usableSpeed =
          Number.isFinite(
            speed
          ) &&
          speed > 5
            ? speed
            : 30;

        const minutes =
          (distanceMeters /
            1000 /
            usableSpeed) *
          60;

        return `≈ ${Math.max(
          1,
          Math.round(
            minutes
          )
        )} min`;
      },
      [
        eta,
        speed,
        routeMetrics,
        currentRouteProgressMeters,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Selected recommendation category
  |--------------------------------------------------------------------------
  */

  const selectedCategory =
    selectedNearbyPlace
      ? getCategoryDefinition(
          selectedNearbyPlace
            .categoryKeys?.find(
              (key) =>
                key !== "all"
            ) ||
            "attraction"
        )
      : null;

  /*
  |--------------------------------------------------------------------------
  | Marker color
  |--------------------------------------------------------------------------
  */

  const getMarkerColor =
    useCallback(
      (categoryKey) => {
        switch (
          categoryKey
        ) {
          case "hotel":
            return "#2563eb";

          case "cafe":
            return "#b45309";

          case "park":
            return "#16a34a";

          case "camping":
            return "#7c3aed";

          case "food":
            return "#dc2626";

          case "attraction":
            return "#0891b2";

          default:
            return "#475569";
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (placeLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-5 py-4 shadow">
          Loading place...
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Google Maps error
  |--------------------------------------------------------------------------
  */

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-6">
        <div className="max-w-md rounded-xl bg-white p-5 shadow">
          <h2 className="font-semibold text-red-600">
            Google Maps failed to load
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Check your Google Maps
            API key and make sure
            the Maps JavaScript API
            and Routes API are
            available for your
            current configuration.
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Place error
  |--------------------------------------------------------------------------
  */

  if (placeError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-6">
        <div className="max-w-md rounded-xl bg-white p-5 shadow">
          <h2 className="font-semibold text-red-600">
            Unable to load place
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
  | Missing Google Place ID
  |--------------------------------------------------------------------------
  */

  if (
    place &&
    !place.googlePlaceId
  ) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-amber-50 p-6">
        <div className="max-w-md rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-amber-700">
            Google Place ID missing
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            This destination has
            not been resolved with
            Google Places yet.
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Place:{" "}
            {place.name}
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Missing destination
  |--------------------------------------------------------------------------
  */

  if (!destination) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-6">
        <div className="rounded-xl bg-white p-5 shadow">
          Invalid destination.
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="flex h-[calc(100vh-72px)] w-full flex-col overflow-hidden bg-slate-50 lg:flex-row">

      {/* ==================================================================
          LEFT RECOMMENDATION PANEL
          ================================================================== */}

      <aside className="flex h-[55%] w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:h-full lg:w-[420px] lg:border-b-0 lg:border-r xl:w-[450px]">

        {/* ----------------------------------------------------------------
            Destination header
            ---------------------------------------------------------------- */}

        <div className="shrink-0 border-b border-slate-200 px-5 pb-4 pt-5">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
              📍
            </div>

            <div className="min-w-0 flex-1">

              <div className="flex items-center justify-between gap-3">

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                  Your destination
                </p>

                {isNavigating && (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">
                    Navigating
                  </span>
                )}

              </div>

              <h2 className="mt-1 truncate text-xl font-bold text-slate-900">
                {place?.name ||
                  "Destination"}
              </h2>

              {place?.formattedAddress && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {
                    place.formattedAddress
                  }
                </p>
              )}

            </div>

          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">

            <div className="flex items-center gap-2">

              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                ✨
              </span>

              <p className="text-xs font-semibold text-slate-800">
                About this destination
              </p>

            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              A popular travel
              destination known for
              wildlife, nature, bird
              watching, rivers and
              memorable outdoor
              experiences.
            </p>

          </div>

          {/* Route summary */}

          <div className="mt-3 grid grid-cols-3 gap-2">

            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">

              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Route
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {formatDistance(
                  route?.distanceMeters
                )}
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">

              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Remaining
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {formatDistance(
                  distanceToDestination
                )}
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">

              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                ETA
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {eta !== null
                  ? `${eta} min`
                  : "--"}
              </p>

            </div>

          </div>

        </div>

        {/* ==================================================================
            DYNAMIC RECOMMENDATION SECTION
            ================================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          <div className="flex items-start justify-between gap-3 px-1">

            <div>

              <div className="flex items-center gap-2">

                <h3 className="text-sm font-bold text-slate-900">
                  Recommended stops
                </h3>

                {nearbyPlaces.length >
                  0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                    Route-aware
                  </span>
                )}

              </div>

              <p className="mt-0.5 text-[11px] text-slate-500">
                Places ahead on your
                route
              </p>

            </div>

            <button
              type="button"
              onClick={
                refreshRecommendations
              }
              disabled={
                nearbyLoading ||
                !routeMetrics
              }
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {nearbyLoading
                ? "Analyzing..."
                : "Refresh"}
            </button>

          </div>

          {/* Category filters */}

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

            {RECOMMENDATION_CATEGORIES.map(
              (
                category
              ) => {
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
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span aria-hidden="true">
                      {
                        category.icon
                      }
                    </span>

                    {
                      category.label
                    }
                  </button>
                );
              }
            )}

          </div>

          {/* Status */}

          <div className="mt-3 flex items-center gap-2 px-1">

            <span
              className={`h-2 w-2 rounded-full ${
                nearbyLoading
                  ? "animate-pulse bg-amber-400"
                  : nearbyPlaces.length >
                      0
                    ? "bg-green-500"
                    : routeMetrics
                      ? "bg-slate-300"
                      : "bg-blue-500"
              }`}
            />

            <p className="text-[10px] text-slate-400">

              {nearbyLoading
                ? "Analyzing the route and finding places ahead..."
                : nearbyPlaces.length >
                    0
                  ? "Results are ordered by where they appear on your journey"
                  : routeMetrics
                    ? "No suitable route-side places found yet"
                    : "Start navigation to analyze places along the route"}

            </p>

          </div>

          {/* Error */}

          {nearbyError && (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">

              <p className="text-[10px] leading-4 text-amber-700">
                {
                  nearbyError
                }
              </p>

            </div>
          )}

          {/* Loading */}

          {nearbyLoading &&
            nearbyPlaces.length ===
              0 && (
              <div className="mt-4 space-y-3">

                {[1, 2, 3].map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item
                      }
                      className="animate-pulse rounded-2xl border border-slate-100 p-3"
                    >

                      <div className="flex gap-3">

                        <div className="h-[68px] w-[74px] rounded-xl bg-slate-100" />

                        <div className="flex-1 space-y-2">

                          <div className="h-3 w-3/4 rounded bg-slate-100" />

                          <div className="h-3 w-1/3 rounded bg-slate-100" />

                          <div className="h-3 w-full rounded bg-slate-100" />

                          <div className="h-3 w-2/3 rounded bg-slate-100" />

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          {/* No route */}

          {!nearbyLoading &&
            !routeMetrics && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">

                <div className="text-2xl">
                  🧭
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Route analysis starts
                  with navigation
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Once a route is
                  calculated, this panel
                  will search for useful
                  places along it.
                </p>

              </div>
            )}

          {/* No recommendations */}

          {!nearbyLoading &&
            routeMetrics &&
            visibleNearbyPlaces.length ===
              0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">

                <div className="text-2xl">
                  🔎
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  No matching stops
                  found
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Try another category
                  or refresh the route
                  recommendations.
                </p>

              </div>
            )}

          {/* Dynamic recommendation cards */}

          {visibleNearbyPlaces.length >
            0 && (
            <div className="relative mt-4">

              <div className="pointer-events-none absolute bottom-5 left-[11px] top-2 w-px bg-slate-200" />

              <div className="space-y-4">

                {visibleNearbyPlaces.map(
                  (
                    item,
                    index
                  ) => {
                    const categoryKey =
                      item.categoryKeys?.find(
                        (
                          key
                        ) =>
                          key !==
                          "all"
                      ) ||
                      "attraction";

                    const category =
                      getCategoryDefinition(
                        categoryKey
                      );

                    const stopDistance =
                      Math.max(
                        0,
                        item.liveDistanceAheadMeters
                      );

                    return (
                      <div
                        key={
                          item.id
                        }
                        className="relative pl-7"
                      >

                        {/* Timeline marker */}

                        <div
                          className={`absolute left-0 top-12 flex h-[23px] w-[23px] items-center justify-center rounded-full border-4 border-white text-[9px] font-bold shadow-sm ${
                            index ===
                            0
                              ? "bg-blue-600 text-white"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {
                            index +
                              1
                          }
                        </div>

                        {/* Distance */}

                        <div className="mb-1.5 flex items-center justify-between px-1">

                          <span className="text-[11px] font-medium text-slate-500">
                            {
                              getApproximateStopTime(
                                stopDistance
                              )
                            }
                          </span>

                          <span className="text-[11px] font-bold text-slate-700">
                            {
                              formatDistance(
                                stopDistance
                              )
                            }{" "}
                            ahead
                          </span>

                        </div>

                        {/* Card */}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNearbyPlace(
                              item
                            );

                            if (
                              map
                            ) {
                              map.panTo(
                                item.coordinates
                              );

                              map.setZoom(
                                15
                              );
                            }
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                        >

                          <div className="flex gap-3">

                            {/* Category icon */}

                            <div className="flex h-[68px] w-[74px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">

                              <span className="text-2xl">
                                {
                                  category.icon
                                }
                              </span>

                            </div>

                            {/* Information */}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <div className="min-w-0">

                                  <h4 className="truncate text-sm font-bold text-slate-900">
                                    {
                                      item.name ||
                                      "Nearby place"
                                    }
                                  </h4>

                                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                                    {
                                      category.label
                                    }
                                  </p>

                                </div>

                                {item.source ===
                                  "openstreetmap" && (
                                  <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
                                    Route stop
                                  </span>
                                )}

                              </div>

                              {/* OSM star information if available */}

                              {Number.isFinite(
                                Number(
                                  item.rating
                                )
                              ) && (
                                <div className="mt-1.5">

                                  <span className="text-[10px] font-bold text-slate-700">
                                    {Number(
                                      item.rating
                                    ).toFixed(
                                      1
                                    )}{" "}
                                    ★
                                  </span>

                                </div>
                              )}

                              <p className="mt-1.5 line-clamp-2 text-[11px] leading-4.5 text-slate-500">
                                {
                                  item.description
                                }
                              </p>

                              {item.vicinity && (
                                <p className="mt-1 line-clamp-1 text-[10px] text-slate-400">
                                  {
                                    item.vicinity
                                  }
                                </p>
                              )}

                            </div>

                          </div>

                        </button>

                      </div>
                    );
                  }
                )}

              </div>

            </div>
          )}

        </div>

        {/* ==================================================================
            Navigation controls
            ================================================================== */}

        <div className="shrink-0 border-t border-slate-200 bg-white p-3.5">

          {!isNavigating ? (
            <button
              type="button"
              onClick={
                startNavigation
              }
              disabled={
                loadingRoute
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <span aria-hidden="true">
                ▶
              </span>

              {loadingRoute
                ? "Calculating route..."
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingRoute
                  ? "Loading..."
                  : "Recalculate"}
              </button>

              <button
                type="button"
                onClick={
                  stopNavigation
                }
                className="rounded-xl bg-red-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Stop Navigation
              </button>

            </div>
          )}

          {/* Alternative routes */}

          {safeRoutes.length >
            1 && (
            <div className="mt-3">

              <div className="mb-2 flex items-center justify-between">

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Alternative routes
                </p>

                <span className="text-[10px] text-slate-400">
                  {
                    safeRoutes.length
                  }{" "}
                  available
                </span>

              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">

                {safeRoutes.map(
                  (
                    routeItem,
                    index
                  ) => (
                    <button
                      key={
                        index
                      }
                      type="button"
                      onClick={() =>
                        selectRoute(
                          index
                        )
                      }
                      className={`min-w-[105px] rounded-xl border px-3 py-2 text-left transition ${
                        selectedRoute ===
                        index
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >

                      <p className="text-xs font-bold text-slate-900">
                        Route{" "}
                        {index +
                          1}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        {
                          formatDistance(
                            routeItem.distanceMeters
                          )
                        }
                      </p>

                      <p className="text-[10px] text-slate-500">
                        {
                          formatDuration(
                            routeItem.durationMillis
                          )
                        }
                      </p>

                    </button>
                  )
                )}

              </div>

            </div>
          )}

        </div>

      </aside>

      {/* ==================================================================
          RIGHT MAP
          ================================================================== */}

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

          {/* Destination marker */}

          <Marker
            position={{
              lat:
                destination.lat,

              lng:
                destination.lng,
            }}
            title={
              place?.name ||
              "Destination"
            }
            onClick={() =>
              setShowDestinationInfo(
                true
              )
            }
          />

          {/* Destination info */}

          {showDestinationInfo && (
            <InfoWindow
              position={{
                lat:
                  destination.lat,

                lng:
                  destination.lng,
              }}
              onCloseClick={() =>
                setShowDestinationInfo(
                  false
                )
              }
            >
              <div className="min-w-[190px]">

                <h3 className="font-semibold text-slate-900">
                  {
                    place?.name ||
                    "Destination"
                  }
                </h3>

                {place?.formattedAddress && (
                  <p className="mt-1 text-xs text-slate-500">
                    {
                      place.formattedAddress
                    }
                  </p>
                )}

              </div>
            </InfoWindow>
          )}

          {/* Current GPS marker */}

          {position && (
            <Marker
              position={{
                lat:
                  position.lat,

                lng:
                  position.lng,
              }}
              title="Your location"
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

          {/* Existing real route */}

          {route?.path?.length >
            1 && (
            <Polyline
              path={
                route.path
              }
              options={{
                strokeColor:
                  "#2563eb",

                strokeOpacity:
                  0.9,

                strokeWeight:
                  6,

                geodesic:
                  true,

                zIndex: 10,
              }}
            />
          )}

          {/* Dynamic recommendation markers */}

          {visibleNearbyPlaces.map(
            (item) => {
              const categoryKey =
                item.categoryKeys?.find(
                  (
                    key
                  ) =>
                    key !==
                    "all"
                ) ||
                "attraction";

              const selected =
                selectedNearbyPlace?.id ===
                item.id;

              return (
                <Marker
                  key={`recommendation-${item.id}`}
                  position={
                    item.coordinates
                  }
                  title={
                    item.name ||
                    "Recommended stop"
                  }
                  icon={{
                    path:
                      window.google
                        ?.maps
                        ?.SymbolPath
                        ?.CIRCLE,

                    scale:
                      selected
                        ? 9
                        : 6,

                    fillColor:
                      getMarkerColor(
                        categoryKey
                      ),

                    fillOpacity: 1,

                    strokeColor:
                      "#ffffff",

                    strokeWeight: 2,
                  }}
                  onClick={() =>
                    setSelectedNearbyPlace(
                      item
                    )
                  }
                />
              );
            }
          )}

          {/* Recommendation info window */}

          {selectedNearbyPlace && (
            <InfoWindow
              position={
                selectedNearbyPlace.coordinates
              }
              onCloseClick={() =>
                setSelectedNearbyPlace(
                  null
                )
              }
            >
              <div className="min-w-[220px]">

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <h3 className="font-semibold text-slate-900">
                      {
                        selectedNearbyPlace.name
                      }
                    </h3>

                    <p className="mt-1 text-xs font-medium text-blue-600">
                      {
                        selectedCategory?.label ||
                        "Nearby place"
                      }
                    </p>

                  </div>

                  {Number.isFinite(
                    Number(
                      selectedNearbyPlace.rating
                    )
                  ) && (
                    <span className="text-xs font-bold text-slate-700">
                      {Number(
                        selectedNearbyPlace.rating
                      ).toFixed(
                        1
                      )}{" "}
                      ★
                    </span>
                  )}

                </div>

                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {
                    formatDistance(
                      Math.max(
                        0,
                        selectedNearbyPlace.progressMeters -
                          currentRouteProgressMeters
                      )
                    )
                  }{" "}
                  ahead
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    getApproximateStopTime(
                      Math.max(
                        0,
                        selectedNearbyPlace.progressMeters -
                          currentRouteProgressMeters
                      )
                    )
                  }
                </p>

                {selectedNearbyPlace.vicinity && (
                  <p className="mt-1 text-xs text-slate-500">
                    {
                      selectedNearbyPlace.vicinity
                    }
                  </p>
                )}

              </div>
            </InfoWindow>
          )}

        </GoogleMap>

        {/* ==================================================================
            MAP HEADER
            ================================================================== */}

        <div className="pointer-events-none absolute left-4 right-4 top-4 z-20">

          <div className="rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-xl backdrop-blur">

            <div className="grid grid-cols-3 gap-2">

              <div className="rounded-xl bg-slate-50 px-3 py-2.5">

                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Direction
                </p>

                <p className="mt-1 truncate text-sm font-bold text-slate-900">
                  {
                    place?.name ||
                    "Destination"
                  }
                </p>

              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2.5">

                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Speed
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {Number.isFinite(
                    speed
                  )
                    ? `${speed.toFixed(
                        0
                      )} km/h`
                    : "--"}
                </p>

              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2.5">

                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  ETA
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {eta !== null
                    ? `${eta} min`
                    : "--"}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ==================================================================
            MAP LEGEND
            ================================================================== */}

        <div className="pointer-events-none absolute bottom-24 left-4 z-20 hidden md:block">

          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">

            <div className="flex items-center gap-3">

              <div className="flex items-center gap-1">

                <span className="h-3 w-3 rounded-full bg-blue-600 ring-2 ring-white" />

                <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />

                <span className="h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />

              </div>

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Smart recommendations
                </p>

                <p className="mt-0.5 text-xs text-slate-600">
                  Places found close to
                  your active route
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ==================================================================
            Existing off-route message
            ================================================================== */}

        {offRoute && (
          <div className="absolute left-4 right-4 top-24 z-30 md:left-auto md:w-[320px]">

            <div className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
              You are off route.
              Recalculating...
            </div>

          </div>
        )}

        {/* ==================================================================
            Existing navigation error
            ================================================================== */}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 z-30 md:left-auto md:w-[360px]">

            <div className="rounded-xl bg-white/95 px-4 py-3 text-sm text-red-700 shadow-lg backdrop-blur">
              {error}
            </div>

          </div>
        )}

      </section>

    </div>
  );
}