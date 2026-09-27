import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";


/*
========================================
FILE PATH
========================================
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const boundaryPath = path.join(
    __dirname,
    "../data/bharatpur-boundary.geojson"
);


/*
========================================
LOAD GEOJSON
========================================
*/

let bharatpurBoundary;

try {
    const file = fs.readFileSync(
        boundaryPath,
        "utf-8"
    );

    bharatpurBoundary = JSON.parse(file);

    console.log(
        "✅ Bharatpur boundary loaded"
    );

} catch (error) {
    console.error(
        "❌ Failed to load Bharatpur boundary:",
        error.message
    );

    throw error;
}


/*
========================================
CHECK WHETHER TWO COORDINATES MATCH
========================================
*/

function coordinatesEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
        return false;
    }

    return (
        a.length >= 2 &&
        b.length >= 2 &&
        a[0] === b[0] &&
        a[1] === b[1]
    );
}


/*
========================================
CLOSE A POLYGON RING
========================================

GeoJSON polygon rings must have the same
first and last coordinate.

If the source boundary forgot to repeat
the first coordinate at the end, we fix
that here.
========================================
*/

function closeRing(ring) {
    if (!Array.isArray(ring)) {
        return ring;
    }

    if (ring.length < 3) {
        return ring;
    }

    const first = ring[0];
    const last = ring[ring.length - 1];

    if (!coordinatesEqual(first, last)) {
        return [
            ...ring,
            [...first],
        ];
    }

    return ring;
}


/*
========================================
NORMALIZE POLYGON COORDINATES
========================================
*/

function normalizePolygonCoordinates(
    coordinates
) {
    if (!Array.isArray(coordinates)) {
        return coordinates;
    }

    return coordinates.map(
        (ring) => closeRing(ring)
    );
}


/*
========================================
NORMALIZE GEOJSON GEOMETRY
========================================
*/

function normalizeGeometry(geometry) {
    if (!geometry) {
        return geometry;
    }

    if (geometry.type === "Polygon") {
        return {
            ...geometry,
            coordinates:
                normalizePolygonCoordinates(
                    geometry.coordinates
                ),
        };
    }

    if (geometry.type === "MultiPolygon") {
        return {
            ...geometry,
            coordinates:
                geometry.coordinates.map(
                    (polygon) =>
                        normalizePolygonCoordinates(
                            polygon
                        )
                ),
        };
    }

    return geometry;
}


/*
========================================
NORMALIZE GEOJSON
========================================

Supports:

- Feature
- FeatureCollection
- Polygon
- MultiPolygon
========================================
*/

function normalizeGeoJSON(geojson) {
    if (!geojson) {
        return geojson;
    }


    /*
    Feature
    */

    if (geojson.type === "Feature") {
        return {
            ...geojson,
            geometry:
                normalizeGeometry(
                    geojson.geometry
                ),
        };
    }


    /*
    FeatureCollection
    */

    if (
        geojson.type ===
        "FeatureCollection"
    ) {
        return {
            ...geojson,

            features:
                geojson.features.map(
                    (feature) => ({
                        ...feature,

                        geometry:
                            normalizeGeometry(
                                feature.geometry
                            ),
                    })
                ),
        };
    }


    /*
    Direct Polygon / MultiPolygon
    */

    return normalizeGeometry(
        geojson
    );
}


bharatpurBoundary =
    normalizeGeoJSON(
        bharatpurBoundary
    );


/*
========================================
GET ACTUAL BOUNDARY GEOMETRY
========================================

booleanPointInPolygon expects a Polygon
or MultiPolygon Feature.

If the file is a FeatureCollection,
we check every feature.
========================================
*/

function getBoundaryFeatures() {
    if (
        bharatpurBoundary?.type ===
        "FeatureCollection"
    ) {
        return bharatpurBoundary.features
            .filter(
                (feature) =>
                    feature?.geometry &&
                    (
                        feature.geometry.type ===
                        "Polygon" ||
                        feature.geometry.type ===
                        "MultiPolygon"
                    )
            );
    }

    if (
        bharatpurBoundary?.type ===
        "Feature" &&
        bharatpurBoundary.geometry
    ) {
        return [
            bharatpurBoundary,
        ];
    }

    if (
        bharatpurBoundary?.type ===
        "Polygon" ||
        bharatpurBoundary?.type ===
        "MultiPolygon"
    ) {
        return [
            {
                type: "Feature",
                properties: {},
                geometry:
                    bharatpurBoundary,
            },
        ];
    }

    return [];
}


const boundaryFeatures =
    getBoundaryFeatures();


if (boundaryFeatures.length === 0) {
    throw new Error(
        "Bharatpur boundary GeoJSON does not contain a valid Polygon or MultiPolygon."
    );
}


console.log(
    `🗺️ Bharatpur boundary features: ${boundaryFeatures.length}`
);


/*
========================================
CHECK WHETHER POINT IS INSIDE BHARATPUR
========================================
*/

export function isInsideBharatpur(
    latitude,
    longitude
) {
    if (
        typeof latitude !== "number" ||
        typeof longitude !== "number"
    ) {
        return false;
    }


    /*
    Basic coordinate validation
    */

    if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return false;
    }


    /*
    GeoJSON coordinates use:

    [longitude, latitude]

    NOT:

    [latitude, longitude]
    */

    const placePoint = point([
        longitude,
        latitude,
    ]);


    /*
    Test against every Bharatpur
    boundary feature.
    */

    return boundaryFeatures.some(
        (feature) =>
            booleanPointInPolygon(
                placePoint,
                feature
            )
    );
}


/*
========================================
FILTER GOOGLE PLACES
========================================
*/

export function filterBharatpurPlaces(
    places = []
) {
    if (!Array.isArray(places)) {
        return [];
    }

    return places.filter(
        (place) => {
            if (!place) {
                return false;
            }

            const latitude =
                Number(place.latitude);

            const longitude =
                Number(place.longitude);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                return false;
            }

            return isInsideBharatpur(
                latitude,
                longitude
            );
        }
    );
}