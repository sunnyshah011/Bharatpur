import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

// Distance from route before we consider the user off-route.
const OFF_ROUTE_DISTANCE = 50;

// Minimum time between automatic reroutes.
const REROUTE_COOLDOWN_MS = 15000;

// Refresh traffic-aware route every 3 minutes.
const ROUTE_REFRESH_MS = 180000;

// Ignore extremely inaccurate GPS readings.
const MAX_GPS_ACCURACY = 150;


/*
|--------------------------------------------------------------------------
| Coordinate validation
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| Haversine distance
|--------------------------------------------------------------------------
*/

function distanceBetween(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const R = 6371000;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLng =
    ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
      Math.sin(dLng / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}


/*
|--------------------------------------------------------------------------
| Point to line segment distance
|--------------------------------------------------------------------------
*/

function pointToSegmentDistance(
  point,
  start,
  end
) {
  const x = point.lng;
  const y = point.lat;

  const x1 = start.lng;
  const y1 = start.lat;

  const x2 = end.lng;
  const y2 = end.lat;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (
    dx === 0 &&
    dy === 0
  ) {
    return distanceBetween(
      y,
      x,
      y1,
      x1
    );
  }

  const t =
    (
      (x - x1) * dx +
      (y - y1) * dy
    ) /
    (
      dx * dx +
      dy * dy
    );

  const clamped =
    Math.max(
      0,
      Math.min(1, t)
    );

  const closestLng =
    x1 +
    clamped * dx;

  const closestLat =
    y1 +
    clamped * dy;

  return distanceBetween(
    y,
    x,
    closestLat,
    closestLng
  );
}


/*
|--------------------------------------------------------------------------
| Point to route distance
|--------------------------------------------------------------------------
*/

function pointToRouteDistance(
  point,
  path
) {
  if (
    !Array.isArray(path) ||
    path.length < 2
  ) {
    return Infinity;
  }

  let minimum =
    Infinity;

  for (
    let i = 0;
    i < path.length - 1;
    i++
  ) {
    const distance =
      pointToSegmentDistance(
        point,
        path[i],
        path[i + 1]
      );

    if (
      distance < minimum
    ) {
      minimum =
        distance;
    }
  }

  return minimum;
}


/*
|--------------------------------------------------------------------------
| Normalize Google route path point
|--------------------------------------------------------------------------
*/

function normalizePathPoint(
  point
) {
  if (!point) {
    return null;
  }

  /*
   * google.maps.LatLng
   */

  if (
    typeof point.lat ===
      "function" &&
    typeof point.lng ===
      "function"
  ) {
    const lat =
      Number(
        point.lat()
      );

    const lng =
      Number(
        point.lng()
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

  /*
   * LatLngLiteral
   */

  const lat =
    Number(point.lat);

  const lng =
    Number(point.lng);

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


/*
|--------------------------------------------------------------------------
| Normalize Google route
|--------------------------------------------------------------------------
*/

function normalizeRoute(
  route
) {
  if (!route) {
    return null;
  }

  const rawPath =
    Array.isArray(
      route.path
    )
      ? route.path
      : [];

  const path =
    rawPath
      .map(
        normalizePathPoint
      )
      .filter(Boolean);

  if (
    path.length < 2
  ) {
    return null;
  }

  const distanceMeters =
    Number(
      route.distanceMeters
    ) || 0;

  const durationMillis =
    Number(
      route.durationMillis
    ) || 0;

  return {
    path,
    distanceMeters,
    durationMillis,
    raw: route,
  };
}


/*
|--------------------------------------------------------------------------
| Normalize travel mode
|--------------------------------------------------------------------------
*/

function normalizeTravelMode(
  mode,
  TravelMode
) {
  switch (mode) {
    case "walking":
      return TravelMode.WALKING;

    case "bicycling":
      return TravelMode.BICYCLING;

    case "driving":
    default:
      return TravelMode.DRIVING;
  }
}


/*
|--------------------------------------------------------------------------
| useNavigation
|--------------------------------------------------------------------------
*/

export default function useNavigation({
  destination,
  mode = "driving",
  googleLoaded = false,
}) {
  /*
  |--------------------------------------------------------------------------
  | State
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
    route,
    setRoute,
  ] = useState(null);

  const [
    routes,
    setRoutes,
  ] = useState([]);

  const [
    selectedRoute,
    setSelectedRoute,
  ] = useState(0);

  const [
    loadingRoute,
    setLoadingRoute,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    offRoute,
    setOffRoute,
  ] = useState(false);

  const [
    speed,
    setSpeed,
  ] = useState(0);

  const [
    distanceToDestination,
    setDistanceToDestination,
  ] = useState(null);

  const [
    eta,
    setEta,
  ] = useState(null);

  const [
    snappedDestination,
    setSnappedDestination,
  ] = useState(null);


  /*
  |--------------------------------------------------------------------------
  | Refs
  |--------------------------------------------------------------------------
  */

  const destinationRef =
    useRef(destination);

  const routeRef =
    useRef(null);

  const positionRef =
    useRef(null);

  const watchIdRef =
    useRef(null);

  const navigatingRef =
    useRef(false);

  const startingNavigationRef =
    useRef(false);

  const lastRouteRequestRef =
    useRef(0);

  const lastRerouteRef =
    useRef(0);

  const routeRequestInFlightRef =
    useRef(false);

  const routeRequestIdRef =
    useRef(0);

  const quotaExhaustedRef =
    useRef(false);


  /*
  |--------------------------------------------------------------------------
  | Synchronize refs
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    destinationRef.current =
      destination;
  }, [
    destination,
  ]);

  useEffect(() => {
    routeRef.current =
      route;
  }, [
    route,
  ]);

  useEffect(() => {
    positionRef.current =
      position;
  }, [
    position,
  ]);


  /*
  |--------------------------------------------------------------------------
  | ETA
  |--------------------------------------------------------------------------
  */

  const calculateEta =
    useCallback(
      (routeData) => {
        if (
          !routeData ||
          !Number.isFinite(
            routeData.durationMillis
          ) ||
          routeData.durationMillis <=
            0
        ) {
          setEta(null);
          return;
        }

        const minutes =
          Math.max(
            1,
            Math.round(
              routeData.durationMillis /
                60000
            )
          );

        setEta(
          minutes
        );
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | Request Google Route
  |--------------------------------------------------------------------------
  */

  const requestRoute =
    useCallback(
      async (
        originOverride = null,
        options = {}
      ) => {
        const {
          force = false,
          automatic = false,
        } = options;


        /*
        |--------------------------------------------------------------------------
        | Google Maps ready?
        |--------------------------------------------------------------------------
        */

        if (
          !googleLoaded
        ) {
          console.warn(
            "⚠️ Google Maps is not loaded."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Quota exhausted?
        |--------------------------------------------------------------------------
        */

        if (
          quotaExhaustedRef.current
        ) {
          console.warn(
            "🚫 Google Routes quota exhausted. Skipping request."
          );

          if (
            automatic
          ) {
            return null;
          }

          setError(
            "Google Routes API daily quota has been exhausted."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Duplicate request?
        |--------------------------------------------------------------------------
        */

        if (
          routeRequestInFlightRef.current
        ) {
          console.log(
            "⏳ Route request already running. Skipping duplicate."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Destination
        |--------------------------------------------------------------------------
        */

        const currentDestination =
          destinationRef.current;

        if (
          !currentDestination
        ) {
          setError(
            "Destination is unavailable."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Google Place ID
        |--------------------------------------------------------------------------
        */

        const googlePlaceId =
          String(
            currentDestination.googlePlaceId ||
              ""
          ).trim();

        if (
          !googlePlaceId
        ) {
          setError(
            "This destination does not have a Google Place ID."
          );

          console.error(
            "❌ Missing Google Place ID:",
            currentDestination
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Destination coordinates
        |--------------------------------------------------------------------------
        */

        const destinationLat =
          Number(
            currentDestination.lat
          );

        const destinationLng =
          Number(
            currentDestination.lng
          );

        if (
          !isValidCoordinate(
            destinationLat,
            destinationLng
          )
        ) {
          setError(
            "Destination coordinates are invalid."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Origin
        |--------------------------------------------------------------------------
        */

        let originLat;
        let originLng;

        if (
          originOverride
        ) {
          originLat =
            Number(
              originOverride.lat
            );

          originLng =
            Number(
              originOverride.lng
            );
        } else if (
          positionRef.current
        ) {
          originLat =
            Number(
              positionRef.current.lat
            );

          originLng =
            Number(
              positionRef.current.lng
            );
        }

        if (
          !isValidCoordinate(
            originLat,
            originLng
          )
        ) {
          console.warn(
            "⚠️ Invalid GPS origin."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Automatic cooldown
        |--------------------------------------------------------------------------
        */

        const now =
          Date.now();

        if (
          automatic &&
          !force &&
          now -
            lastRouteRequestRef.current <
            REROUTE_COOLDOWN_MS
        ) {
          console.log(
            "⏱️ Automatic route cooldown active."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Lock request
        |--------------------------------------------------------------------------
        */

        routeRequestInFlightRef.current =
          true;

        const requestId =
          ++routeRequestIdRef.current;

        lastRouteRequestRef.current =
          now;

        setLoadingRoute(
          true
        );

        setError("");


        try {
          /*
          |--------------------------------------------------------------------------
          | Import Google libraries
          |--------------------------------------------------------------------------
          */

          if (
            typeof window ===
              "undefined" ||
            !window.google?.maps
              ?.importLibrary
          ) {
            throw new Error(
              "Google Maps JavaScript API is unavailable."
            );
          }

          const [
            {
              Route,
              TravelMode,
            },
            {
              Place,
            },
          ] =
            await Promise.all([
              window.google.maps.importLibrary(
                "routes"
              ),

              window.google.maps.importLibrary(
                "places"
              ),
            ]);


          /*
          |--------------------------------------------------------------------------
          | Travel mode
          |--------------------------------------------------------------------------
          */

          const travelMode =
            normalizeTravelMode(
              mode,
              TravelMode
            );


          /*
          |--------------------------------------------------------------------------
          | Destination = Google Place ID
          |--------------------------------------------------------------------------
          */

          const destinationPlace =
            new Place({
              id:
                googlePlaceId,
            });


          /*
          |--------------------------------------------------------------------------
          | Route request
          |--------------------------------------------------------------------------
          */

          const request = {
            origin: {
              lat:
                originLat,

              lng:
                originLng,
            },

            destination:
              destinationPlace,

            travelMode,

            computeAlternativeRoutes:
              true,

            fields: [
              "path",
              "distanceMeters",
              "durationMillis",
            ],
          };


          /*
          |--------------------------------------------------------------------------
          | Traffic-aware driving
          |--------------------------------------------------------------------------
          |
          | Do not set departureTime manually.
          |
          */

          if (
            mode ===
            "driving"
          ) {
            request.routingPreference =
              "TRAFFIC_AWARE_OPTIMAL";
          }


          /*
          |--------------------------------------------------------------------------
          | Debug
          |--------------------------------------------------------------------------
          */

          console.log(
            "🚗 GOOGLE ROUTE REQUEST",
            {
              requestId,

              origin: {
                lat:
                  originLat,

                lng:
                  originLng,
              },

              destinationGooglePlaceId:
                googlePlaceId,

              mode,

              routingPreference:
                request.routingPreference ||
                "DEFAULT",

              automatic,

              force,

              departureTime:
                request.departureTime ||
                "NOT_SET",
            }
          );


          /*
          |--------------------------------------------------------------------------
          | Compute routes
          |--------------------------------------------------------------------------
          */

          const result =
            await Route.computeRoutes(
              request
            );


          /*
          |--------------------------------------------------------------------------
          | Ignore stale response
          |--------------------------------------------------------------------------
          */

          if (
            requestId !==
            routeRequestIdRef.current
          ) {
            console.log(
              "⚠️ Ignoring stale route response."
            );

            return null;
          }


          /*
          |--------------------------------------------------------------------------
          | Validate response
          |--------------------------------------------------------------------------
          */

          if (
            !result ||
            !Array.isArray(
              result.routes
            ) ||
            result.routes.length ===
              0
          ) {
            throw new Error(
              "Google Maps did not return a route."
            );
          }


          /*
          |--------------------------------------------------------------------------
          | Normalize routes
          |--------------------------------------------------------------------------
          */

          const normalizedRoutes =
            result.routes
              .map(
                normalizeRoute
              )
              .filter(
                Boolean
              );

          if (
            normalizedRoutes.length ===
              0
          ) {
            throw new Error(
              "Google returned an invalid route."
            );
          }


          /*
          |--------------------------------------------------------------------------
          | Save routes
          |--------------------------------------------------------------------------
          */

          setRoutes(
            normalizedRoutes
          );

          setSelectedRoute(
            0
          );

          setRoute(
            normalizedRoutes[0]
          );

          routeRef.current =
            normalizedRoutes[0];


          /*
          |--------------------------------------------------------------------------
          | ETA
          |--------------------------------------------------------------------------
          */

          calculateEta(
            normalizedRoutes[0]
          );


          /*
          |--------------------------------------------------------------------------
          | Destination
          |--------------------------------------------------------------------------
          */

          setSnappedDestination({
            lat:
              destinationLat,

            lng:
              destinationLng,

            googlePlaceId,

            distanceFromInput:
              0,
          });


          /*
          |--------------------------------------------------------------------------
          | Success
          |--------------------------------------------------------------------------
          */

          console.log(
            "✅ GOOGLE ROUTE CREATED",
            {
              requestId,

              routeCount:
                normalizedRoutes.length,

              googlePlaceId,

              distanceMeters:
                normalizedRoutes[0]
                  .distanceMeters,

              durationMillis:
                normalizedRoutes[0]
                  .durationMillis,

              etaMinutes:
                normalizedRoutes[0]
                  .durationMillis
                  ? Math.round(
                      normalizedRoutes[0]
                        .durationMillis /
                        60000
                    )
                  : null,
            }
          );

          return normalizedRoutes;

        } catch (
          routeError
        ) {
          console.error(
            "❌ GOOGLE ROUTE ERROR:",
            routeError
          );


          /*
          |--------------------------------------------------------------------------
          | Error message
          |--------------------------------------------------------------------------
          */

          const message =
            String(
              routeError?.message ||
                ""
            );


          /*
          |--------------------------------------------------------------------------
          | Quota error
          |--------------------------------------------------------------------------
          */

          const quotaExceeded =
            message.includes(
              "RESOURCE_EXHAUSTED"
            ) ||
            message.includes(
              "Quota exceeded"
            ) ||
            message.includes(
              "429"
            );

          if (
            quotaExceeded
          ) {
            quotaExhaustedRef.current =
              true;

            setError(
              "Google Routes API daily quota has been exhausted. Check your Google Cloud quota and billing."
            );

            console.error(
              "🚫 ROUTES QUOTA EXHAUSTED."
            );

            return null;
          }


          /*
          |--------------------------------------------------------------------------
          | Timestamp error
          |--------------------------------------------------------------------------
          */

          if (
            message.includes(
              "Timestamp must be set to a future time"
            )
          ) {
            setError(
              "Google rejected the route time. The departure timestamp was invalid."
            );

            console.error(
              "🕐 INVALID GOOGLE DEPARTURE TIME"
            );

            return null;
          }


          /*
          |--------------------------------------------------------------------------
          | Normal route error
          |--------------------------------------------------------------------------
          */

          setError(
            message ||
              "Unable to calculate route."
          );

          return null;

        } finally {
          routeRequestInFlightRef.current =
            false;

          setLoadingRoute(
            false
          );
        }
      },
      [
        googleLoaded,
        mode,
        calculateEta,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Select alternative route
  |--------------------------------------------------------------------------
  */

  const selectRoute =
    useCallback(
      (index) => {
        if (
          !routes[index]
        ) {
          return;
        }

        setSelectedRoute(
          index
        );

        setRoute(
          routes[index]
        );

        routeRef.current =
          routes[index];

        calculateEta(
          routes[index]
        );

        setOffRoute(
          false
        );
      },
      [
        routes,
        calculateEta,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Handle GPS position
  |--------------------------------------------------------------------------
  */

  const handlePosition =
    useCallback(
      async (
        geoPosition
      ) => {
        const coords =
          geoPosition?.coords;

        if (!coords) {
          return;
        }

        const lat =
          Number(
            coords.latitude
          );

        const lng =
          Number(
            coords.longitude
          );

        const accuracy =
          Number(
            coords.accuracy
          );


        /*
        |--------------------------------------------------------------------------
        | Validate
        |--------------------------------------------------------------------------
        */

        if (
          !isValidCoordinate(
            lat,
            lng
          )
        ) {
          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Ignore poor GPS
        |--------------------------------------------------------------------------
        */

        if (
          Number.isFinite(
            accuracy
          ) &&
          accuracy >
            MAX_GPS_ACCURACY
        ) {
          console.warn(
            "⚠️ GPS accuracy too poor:",
            accuracy
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Current position
        |--------------------------------------------------------------------------
        */

        const currentPosition = {
          lat,

          lng,

          accuracy:
            Number.isFinite(
              accuracy
            )
              ? accuracy
              : null,
        };


        /*
        |--------------------------------------------------------------------------
        | Save position
        |--------------------------------------------------------------------------
        */

        positionRef.current =
          currentPosition;

        setPosition(
          currentPosition
        );


        /*
        |--------------------------------------------------------------------------
        | Speed
        |--------------------------------------------------------------------------
        */

        const gpsSpeed =
          Number(
            coords.speed
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


        /*
        |--------------------------------------------------------------------------
        | Distance to destination
        |--------------------------------------------------------------------------
        */

        const currentDestination =
          destinationRef.current;

        if (
          currentDestination
        ) {
          const destinationLat =
            Number(
              currentDestination.lat
            );

          const destinationLng =
            Number(
              currentDestination.lng
            );

          if (
            isValidCoordinate(
              destinationLat,
              destinationLng
            )
          ) {
            setDistanceToDestination(
              distanceBetween(
                lat,
                lng,
                destinationLat,
                destinationLng
              )
            );
          }
        }


        /*
        |--------------------------------------------------------------------------
        | Navigation not active
        |--------------------------------------------------------------------------
        */

        if (
          !navigatingRef.current
        ) {
          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Quota exhausted
        |--------------------------------------------------------------------------
        */

        if (
          quotaExhaustedRef.current
        ) {
          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Current route
        |--------------------------------------------------------------------------
        */

        const currentRoute =
          routeRef.current;


        /*
        |--------------------------------------------------------------------------
        | No route
        |--------------------------------------------------------------------------
        */

        if (
          !currentRoute ||
          !Array.isArray(
            currentRoute.path
          ) ||
          currentRoute.path.length <
            2
        ) {
          if (
            !routeRequestInFlightRef.current
          ) {
            console.log(
              "🗺️ No route → requesting route."
            );

            await requestRoute(
              currentPosition,
              {
                force:
                  true,

                automatic:
                  true,
              }
            );
          }

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Distance from route
        |--------------------------------------------------------------------------
        */

        const distanceFromRoute =
          pointToRouteDistance(
            currentPosition,
            currentRoute.path
          );


        /*
        |--------------------------------------------------------------------------
        | Dynamic threshold
        |--------------------------------------------------------------------------
        */

        const threshold =
          Math.max(
            OFF_ROUTE_DISTANCE,
            (
              accuracy ||
              0
            ) +
              20
          );

        const currentlyOffRoute =
          distanceFromRoute >
          threshold;

        setOffRoute(
          currentlyOffRoute
        );


        /*
        |--------------------------------------------------------------------------
        | Automatic rerouting
        |--------------------------------------------------------------------------
        */

        if (
          currentlyOffRoute &&
          navigatingRef.current &&
          !routeRequestInFlightRef.current
        ) {
          const now =
            Date.now();

          if (
            now -
              lastRerouteRef.current >=
            REROUTE_COOLDOWN_MS
          ) {
            lastRerouteRef.current =
              now;

            console.log(
              "🔄 OFF ROUTE → AUTOMATIC REROUTE",
              {
                distanceFromRoute,

                threshold,

                currentPosition,
              }
            );

            await requestRoute(
              currentPosition,
              {
                force:
                  true,

                automatic:
                  true,
              }
            );

            return;
          }
        }


        /*
        |--------------------------------------------------------------------------
        | Periodic route refresh
        |--------------------------------------------------------------------------
        */

        if (
          navigatingRef.current &&
          !routeRequestInFlightRef.current &&
          Date.now() -
            lastRouteRequestRef.current >=
            ROUTE_REFRESH_MS
        ) {
          console.log(
            "🔄 PERIODIC ROUTE REFRESH"
          );

          await requestRoute(
            currentPosition,
            {
              force:
                true,

              automatic:
                true,
            }
          );
        }
      },
      [
        requestRoute,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | GPS watcher
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !isNavigating
    ) {
      return undefined;
    }

    if (
      !navigator.geolocation
    ) {
      setError(
        "Geolocation is not supported by this browser."
      );

      return undefined;
    }


    const watchId =
      navigator.geolocation.watchPosition(
        handlePosition,

        (
          geoError
        ) => {
          console.error(
            "❌ GPS ERROR:",
            geoError
          );

          switch (
            geoError.code
          ) {
            case 1:
              setError(
                "Location permission was denied."
              );
              break;

            case 2:
              setError(
                "Your current location is unavailable."
              );
              break;

            case 3:
              setError(
                "GPS request timed out."
              );
              break;

            default:
              setError(
                "Unable to get your location."
              );
          }
        },

        {
          enableHighAccuracy:
            true,

          maximumAge:
            2000,

          timeout:
            15000,
        }
      );


    watchIdRef.current =
      watchId;


    return () => {
      navigator.geolocation.clearWatch(
        watchId
      );

      watchIdRef.current =
        null;
    };
  }, [
    isNavigating,
    handlePosition,
  ]);


  /*
  |--------------------------------------------------------------------------
  | Start navigation
  |--------------------------------------------------------------------------
  */

  const startNavigation =
    useCallback(
      async () => {

        /*
        |--------------------------------------------------------------------------
        | Prevent multiple starts
        |--------------------------------------------------------------------------
        */

        if (
          startingNavigationRef.current ||
          navigatingRef.current
        ) {
          console.log(
            "⚠️ Navigation already active."
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Quota exhausted
        |--------------------------------------------------------------------------
        */

        if (
          quotaExhaustedRef.current
        ) {
          setError(
            "Google Routes API daily quota has been exhausted."
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Destination
        |--------------------------------------------------------------------------
        */

        const currentDestination =
          destinationRef.current;

        if (
          !currentDestination
        ) {
          setError(
            "Destination is unavailable."
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Google Place ID
        |--------------------------------------------------------------------------
        */

        const googlePlaceId =
          String(
            currentDestination.googlePlaceId ||
              ""
          ).trim();

        if (
          !googlePlaceId
        ) {
          setError(
            "This destination does not have a Google Place ID."
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Coordinates
        |--------------------------------------------------------------------------
        */

        if (
          !isValidCoordinate(
            Number(
              currentDestination.lat
            ),
            Number(
              currentDestination.lng
            )
          )
        ) {
          setError(
            "Destination coordinates are invalid."
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Browser GPS
        |--------------------------------------------------------------------------
        */

        if (
          !navigator.geolocation
        ) {
          setError(
            "Geolocation is not supported."
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | Start
        |--------------------------------------------------------------------------
        */

        startingNavigationRef.current =
          true;

        navigatingRef.current =
          true;

        setIsNavigating(
          true
        );

        setError("");


        /*
        |--------------------------------------------------------------------------
        | Get initial GPS
        |--------------------------------------------------------------------------
        */

        navigator.geolocation.getCurrentPosition(
          async (
            geoPosition
          ) => {
            try {
              const coords =
                geoPosition.coords;

              const lat =
                Number(
                  coords.latitude
                );

              const lng =
                Number(
                  coords.longitude
                );

              const accuracy =
                Number(
                  coords.accuracy
                );


              if (
                !isValidCoordinate(
                  lat,
                  lng
                )
              ) {
                throw new Error(
                  "Your GPS coordinates are invalid."
                );
              }


              if (
                Number.isFinite(
                  accuracy
                ) &&
                accuracy >
                  MAX_GPS_ACCURACY
              ) {
                throw new Error(
                  "Your GPS accuracy is currently too poor to start navigation. Please wait a moment and try again."
                );
              }


              const initialPosition = {
                lat,

                lng,

                accuracy:
                  Number.isFinite(
                    accuracy
                  )
                    ? accuracy
                    : null,
              };


              positionRef.current =
                initialPosition;

              setPosition(
                initialPosition
              );


              /*
              |--------------------------------------------------------------------------
              | First route
              |--------------------------------------------------------------------------
              */

              await requestRoute(
                initialPosition,
                {
                  force:
                    true,

                  automatic:
                    false,
                }
              );

            } catch (
              startError
            ) {
              console.error(
                "❌ INITIAL NAVIGATION ERROR:",
                startError
              );

              navigatingRef.current =
                false;

              setIsNavigating(
                false
              );

              setError(
                startError?.message ||
                  "Unable to start navigation."
              );

            } finally {
              startingNavigationRef.current =
                false;
            }
          },

          (
            geoError
          ) => {
            console.error(
              "❌ INITIAL GPS ERROR:",
              geoError
            );

            navigatingRef.current =
              false;

            setIsNavigating(
              false
            );

            startingNavigationRef.current =
              false;

            switch (
              geoError.code
            ) {
              case 1:
                setError(
                  "Location permission was denied. Please allow location access."
                );
                break;

              case 2:
                setError(
                  "Your current location is unavailable."
                );
                break;

              case 3:
                setError(
                  "GPS request timed out. Please try again."
                );
                break;

              default:
                setError(
                  "Unable to get your current location. Please allow location access."
                );
            }
          },

          {
            enableHighAccuracy:
              true,

            maximumAge:
              0,

            timeout:
              15000,
          }
        );
      },
      [
        requestRoute,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Stop navigation
  |--------------------------------------------------------------------------
  */

  const stopNavigation =
    useCallback(
      () => {

        navigatingRef.current =
          false;

        startingNavigationRef.current =
          false;

        setIsNavigating(
          false
        );

        setLoadingRoute(
          false
        );

        setOffRoute(
          false
        );


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


        /*
        |--------------------------------------------------------------------------
        | Reset route request state
        |--------------------------------------------------------------------------
        */

        routeRequestIdRef.current +=
          1;

        routeRequestInFlightRef.current =
          false;


        /*
        |--------------------------------------------------------------------------
        | Reset navigation state
        |--------------------------------------------------------------------------
        */

        setRoute(null);

        setRoutes([]);

        setSelectedRoute(
          0
        );

        setEta(null);

        setDistanceToDestination(
          null
        );

        setSnappedDestination(
          null
        );


        console.log(
          "🛑 Navigation stopped."
        );
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | Manual recalculate
  |--------------------------------------------------------------------------
  */

  const recalculateRoute =
    useCallback(
      async () => {

        /*
        |--------------------------------------------------------------------------
        | Quota exhausted
        |--------------------------------------------------------------------------
        */

        if (
          quotaExhaustedRef.current
        ) {
          setError(
            "Google Routes API daily quota has been exhausted."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Request already running
        |--------------------------------------------------------------------------
        */

        if (
          routeRequestInFlightRef.current
        ) {
          console.log(
            "⏳ Route calculation already running."
          );

          return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Current position
        |--------------------------------------------------------------------------
        */

        const currentPosition =
          positionRef.current;

        if (
          !currentPosition
        ) {
          setError(
            "Current GPS location is not available yet."
          );

          return null;
        }


        return requestRoute(
          currentPosition,
          {
            force:
              true,

            automatic:
              false,
          }
        );
      },
      [
        requestRoute,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Cleanup
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      navigatingRef.current =
        false;

      startingNavigationRef.current =
        false;

      routeRequestIdRef.current +=
        1;

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
    };
  }, []);


  /*
  |--------------------------------------------------------------------------
  | Return public API
  |--------------------------------------------------------------------------
  */

  return {
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

    snappedDestination,

    startNavigation,

    stopNavigation,

    requestRoute,

    recalculateRoute,

    selectRoute,
  };
}