import express from "express";

import { generateGeminiResponse } from "../services/gemini.service.js";
import { getTourismContext } from "../services/tourismContext.service.js";

import {
    getLivePlacesContext,
    needsLivePlaceSearch,
} from "../services/livePlacesContext.service.js";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "bharatpur-ai-chatbot",
        message: "AI chatbot route is working",
    });
});


/*
|--------------------------------------------------------------------------
| Build a fallback answer from Google Places
|--------------------------------------------------------------------------
*/

function buildLivePlacesFallback(message, places = []) {
    if (!places.length) {
        return (
            "I couldn't find matching hotels or restaurants inside " +
            "Bharatpur Metropolitan City right now. Please try another " +
            "food or restaurant name."
        );
    }

    const lines = [];

    lines.push(
        `I found ${places.length} matching place${places.length === 1 ? "" : "s"
        } in Bharatpur Metropolitan City for your request:`
    );

    lines.push("");

    places.slice(0, 5).forEach((place, index) => {
        const name =
            place.name ||
            place.displayName ||
            "Unnamed place";

        const address =
            place.formattedAddress ||
            place.address ||
            "Address not available";

        const rating =
            place.rating !== undefined &&
                place.rating !== null
                ? `${place.rating}/5`
                : "Rating not available";

        const reviews =
            place.userRatingCount !== undefined &&
                place.userRatingCount !== null
                ? ` (${place.userRatingCount} reviews)`
                : "";

        const status =
            place.businessStatus ||
            place.openingStatus ||
            "";

        lines.push(
            `${index + 1}. ${name}\n` +
            `   Address: ${address}\n` +
            `   Rating: ${rating}${reviews}` +
            (status ? `\n   Status: ${status}` : "")
        );

        lines.push("");
    });

    lines.push(
        "These results are based on the live Google Places search for Bharatpur."
    );

    return lines.join("\n");
}


/*
|--------------------------------------------------------------------------
| Chat
|--------------------------------------------------------------------------
*/

router.post("/chat", async (req, res) => {
    try {
        const {
            message,
            history = [],
        } = req.body;

        if (
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Message is required",
            });
        }

        const cleanMessage = message.trim();

        console.log("");
        console.log("========================================");
        console.log("🤖 BHARATPUR AI CHAT");
        console.log("User:", cleanMessage);
        console.log("========================================");


        /*
        |--------------------------------------------------------------------------
        | 1. MongoDB tourism context
        |--------------------------------------------------------------------------
        */

        console.log("📚 Searching MongoDB...");

        const tourismContext =
            await getTourismContext(cleanMessage);

        console.log(
            "✅ MongoDB:",
            tourismContext
                ? "context found"
                : "no matching context"
        );


        /*
        |--------------------------------------------------------------------------
        | 2. Live Google Places
        |--------------------------------------------------------------------------
        */

        let livePlacesContext = "";
        let livePlaces = [];

        const liveSearch =
            needsLivePlaceSearch(cleanMessage);

        console.log(
            "🔎 Live place search:",
            liveSearch
        );


        if (liveSearch) {
            console.log(
                "🌍 Searching Google Places..."
            );

            const result =
                await getLivePlacesContext(cleanMessage);

            /*
             * Support BOTH possible return formats:
             *
             * 1. { context, places }
             *
             * 2. string
             */

            if (typeof result === "string") {
                livePlacesContext = result;
            } else {
                livePlacesContext =
                    result?.context || "";

                livePlaces =
                    Array.isArray(result?.places)
                        ? result.places
                        : [];
            }

            console.log(
                "✅ Google Places:",
                livePlaces.length,
                "places"
            );

            console.log(
                "Google context length:",
                livePlacesContext.length
            );
        }


        /*
        |--------------------------------------------------------------------------
        | 3. Gemini
        |--------------------------------------------------------------------------
        */

        console.log(
            "🧠 Sending request to Gemini..."
        );

        try {
            const answer =
                await generateGeminiResponse({
                    message: cleanMessage,
                    history,
                    tourismContext,
                    livePlacesContext,
                });

            console.log(
                "✅ Gemini response generated"
            );

            console.log(
                "========================================"
            );

            return res.json({
                success: true,
                answer,

                sources: {
                    mongodb: Boolean(tourismContext),
                    googlePlaces: livePlaces.length > 0,
                    gemini: true,
                },

                livePlaces,
            });

        } catch (geminiError) {

            console.error(
                "⚠️ Gemini failed:"
            );

            console.error(
                "Status:",
                geminiError?.status
            );

            console.error(
                "Message:",
                geminiError?.message
            );


            /*
            |--------------------------------------------------------------------------
            | 4. IMPORTANT FALLBACK
            |--------------------------------------------------------------------------
            |
            | If Google Places worked but Gemini is temporarily unavailable,
            | don't break the chatbot.
            |
            */

            if (
                liveSearch &&
                livePlaces.length > 0
            ) {
                console.log(
                    "🛟 Using Google Places fallback..."
                );

                const fallbackAnswer =
                    buildLivePlacesFallback(
                        cleanMessage,
                        livePlaces
                    );

                console.log(
                    "✅ Fallback answer generated"
                );

                console.log(
                    "========================================"
                );

                return res.json({
                    success: true,
                    answer: fallbackAnswer,

                    sources: {
                        mongodb: Boolean(tourismContext),
                        googlePlaces: true,
                        gemini: false,
                        fallback: true,
                    },

                    livePlaces,
                });
            }


            /*
            |--------------------------------------------------------------------------
            | 5. No fallback available
            |--------------------------------------------------------------------------
            */

            throw geminiError;
        }

    } catch (error) {

        console.error(
            "========================================"
        );

        console.error(
            "❌ AI CHAT ERROR"
        );

        console.error(
            "Message:",
            error?.message
        );

        console.error(
            "Status:",
            error?.status
        );

        console.error(
            "Stack:",
            error?.stack
        );

        console.error(
            "========================================"
        );


        const status =
            Number(error?.status);


        if (
            status === 429 ||
            status === 500 ||
            status === 502 ||
            status === 503 ||
            status === 504
        ) {
            return res.status(503).json({
                success: false,

                message:
                    "Bharatpur AI is temporarily busy. Please try again in a few seconds.",

                retryable: true,
            });
        }


        return res.status(500).json({
            success: false,

            message:
                "Sorry, I could not process your request right now.",

            error:
                process.env.NODE_ENV === "development"
                    ? error?.message
                    : undefined,
        });
    }
});


export default router;