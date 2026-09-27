const MAPBOX_TOKEN =
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const PROFILE_MAP = {
    driving: "mapbox/driving-traffic",
    walking: "mapbox/walking",
    cycling: "mapbox/cycling",
};

const validateCoordinate = (value, min, max) => {
    return (
        Number.isFinite(value) &&
        value >= min &&
        value <= max
    );
};

export const getMapboxRoute = async ({
    origin,
    destination,
    mode = "driving",
    alternatives = true,
    bearing = null,
}) => {
    if (!MAPBOX_TOKEN) {
        throw new Error(
            "Mapbox access token is missing. Check VITE_MAPBOX_ACCESS_TOKEN in your .env file."
        );
    }

    if (!origin || !destination) {
        throw new Error(
            "Origin and destination are required."
        );
    }

    // Validate current location
    if (
        !validateCoordinate(origin.lat, -90, 90) ||
        !validateCoordinate(origin.lng, -180, 180)
    ) {
        throw new Error(
            "Invalid current location."
        );
    }

    // Validate destination
    if (
        !validateCoordinate(destination.lat, -90, 90) ||
        !validateCoordinate(destination.lng, -180, 180)
    ) {
        throw new Error(
            "Invalid destination location."
        );
    }

    const profile =
        PROFILE_MAP[mode] ||
        PROFILE_MAP.driving;

    const coordinates =
        `${origin.lng},${origin.lat};` +
        `${destination.lng},${destination.lat}`;

    const params = new URLSearchParams({
        alternatives: String(alternatives),
        steps: "true",
        overview: "full",
        geometries: "geojson",
        language: "en",
        banner_instructions: "true",
        voice_instructions: "true",
        voice_units: "metric",
        access_token: MAPBOX_TOKEN,
    });

    /*
     * If GPS provides a heading, tell Mapbox
     * the direction the user is currently travelling.
     *
     * bearings format:
     * heading,range
     */
    // mapbox.js
    if (
        Number.isFinite(bearing) &&
        bearing >= 0 &&
        bearing <= 360
    ) {
        params.set("bearings", `${bearing},45;`); // trailing ";" = destination bearing left unspecified
    }

    const url =
        `https://api.mapbox.com/directions/v5/` +
        `${profile}/${coordinates}?${params.toString()}`;

    const response = await fetch(url);

    const data =
        await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Mapbox routing request failed."
        );
    }

    if (
        data.code !== "Ok" ||
        !Array.isArray(data.routes) ||
        data.routes.length === 0
    ) {
        throw new Error(
            "No route was found between your current location and the destination."
        );
    }

    return data;
};

/*
 * Convert Mapbox route data into
 * the format our navigation hook uses.
 */
export const normalizeMapboxRoutes = (data) => {
    if (!data?.routes) {
        return [];
    }

    return data.routes.map(
        (route, index) => ({
            id: `route-${index}`,
            distance: route.distance,
            duration: route.duration,
            geometry: route.geometry,
            legs: route.legs || [],
            weight: route.weight,
            weight_name: route.weight_name,

            // Mapbox's road-snapped waypoints
            waypoints: route.waypoints || data.waypoints || [],
        })
    );
};