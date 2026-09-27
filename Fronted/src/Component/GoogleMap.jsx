import {
    useEffect,
    useRef,
} from "react";

import { loadGoogleMaps } from "../lib/googleMaps";

const BHARATPUR = {
    lat: 27.6833,
    lng: 84.4333,
};

export default function GoogleMap({
    center = BHARATPUR,
    zoom = 13,
    places = [],
}) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);

    useEffect(() => {
        let cancelled = false;

        async function initializeMap() {
            try {
                const {
                    Map,
                    AdvancedMarkerElement,
                } = await loadGoogleMaps();

                if (cancelled || !mapRef.current) {
                    return;
                }

                const map = new Map(mapRef.current, {
                    center,
                    zoom,
                    mapId: "DEMO_MAP_ID",
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    zoomControl: true,
                });

                mapInstanceRef.current = map;

                markersRef.current.forEach((marker) => {
                    marker.map = null;
                });

                markersRef.current = [];

                places.forEach((place) => {
                    if (
                        typeof place.latitude !== "number" ||
                        typeof place.longitude !== "number"
                    ) {
                        return;
                    }

                    const marker =
                        new AdvancedMarkerElement({
                            map,
                            position: {
                                lat: place.latitude,
                                lng: place.longitude,
                            },
                            title: place.name,
                        });

                    markersRef.current.push(marker);
                });
            } catch (error) {
                console.error(
                    "Google Maps initialization failed:",
                    error
                );
            }
        }

        initializeMap();

        return () => {
            cancelled = true;

            markersRef.current.forEach((marker) => {
                marker.map = null;
            });

            markersRef.current = [];
            mapInstanceRef.current = null;
        };
    }, [center.lat, center.lng, zoom, places]);

    return (
        <div
            ref={mapRef}
            style={{
                width: "100%",
                height: "500px",
                borderRadius: "16px",
                overflow: "hidden",
            }}
        />
    );
}