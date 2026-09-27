import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";

import placesRoutes from "./routes/places.routes.js";
import tripsRoutes from "./routes/trips.routes.js";
import plannerRoutes from "./routes/planner.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";

//ai routes
import aiRoutes from "./routes/ai.routes.js";

import { apiLimiter } from "./middleware/rateLimit.js";

import {
    notFound,
    errorHandler,
} from "./middleware/error.js";


const app = express();


/*
=====================================================
BASIC SECURITY
=====================================================
*/

app.disable("x-powered-by");


app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
    })
);


/*
=====================================================
CORS
=====================================================
*/

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ],

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
    })
);


/*
=====================================================
COMPRESSION
=====================================================
*/

app.use(compression());


/*
=====================================================
BODY PARSING
=====================================================
*/

app.use(
    express.json({
        limit: "100kb",
    })
);


app.use(
    express.urlencoded({
        extended: false,
        limit: "50kb",
    })
);


/*
=====================================================
HTTP LOGGER
=====================================================
*/

app.use(pinoHttp());


/*
=====================================================
CLERK AUTHENTICATION
=====================================================
*/

app.use(clerkMiddleware());


/*
=====================================================
API RATE LIMITER
=====================================================
*/

app.use("/api", apiLimiter);
app.use("/api/ai", aiRoutes);
app.use("/api/reviews", reviewsRoutes);

/*
=====================================================
HEALTH CHECK
=====================================================
*/

app.get(
    "/health",
    (req, res) => {
        res.json({
            success: true,
            service: "bharatpur-ai-api",
            timestamp: new Date().toISOString(),
        });
    }
);


/*
=====================================================
API ROUTES
=====================================================
*/

app.use(
    "/api/places",
    placesRoutes
);


app.use(
    "/api/trips",
    tripsRoutes
);


/*
=====================================================
AI / SMART TRIP PLANNER
=====================================================
*/

app.use(
    "/api/planner",
    plannerRoutes
);


/*
=====================================================
404
=====================================================
*/

app.use(notFound);


/*
=====================================================
ERROR HANDLER
=====================================================
*/

app.use(errorHandler);


export default app;