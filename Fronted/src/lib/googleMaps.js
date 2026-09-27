import {
    setOptions,
    importLibrary,
} from "@googlemaps/js-api-loader";


const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY;


if (!apiKey) {
    throw new Error(
        "VITE_GOOGLE_MAPS_API_KEY is missing from your .env file."
    );
}


/*
 * Configure Google Maps loader.
 *
 * This must be called only once.
 */
setOptions({
    key: apiKey,
    v: "weekly",
});


/*
 * Load Google Maps libraries when needed.
 */
export const loadGoogleMaps =
    async () => {

        const [
            mapsLibrary,
            markerLibrary,
        ] =
            await Promise.all([
                importLibrary("maps"),
                importLibrary("marker"),
            ]);


        return {
            Map:
                mapsLibrary.Map,

            AdvancedMarkerElement:
                markerLibrary.AdvancedMarkerElement,
        };
    };