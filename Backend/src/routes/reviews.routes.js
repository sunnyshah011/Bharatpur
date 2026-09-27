import express from "express";
import mongoose from "mongoose";

import TripReview from "../models/TripReview.js";
import GeneratedTrip from "../models/GeneratedTrip.js";

const router = express.Router();


/*
=====================================================
GET CURRENT USER'S TRIP REVIEWS
=====================================================
*/

router.get("/", async (req, res, next) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        const reviews = await TripReview.find({
            userId,
        })
            .sort({ createdAt: -1 })
            .populate({
                path: "tripId",
                select: [
                    "preferences",
                    "estimatedCost",
                    "budgetWithinLimit",
                    "budgetNote",
                    "days",
                    "createdAt",
                ].join(" "),
                populate: {
                    path: "days.places.placeId",
                },
            })
            .lean();

        return res.json({
            success: true,
            reviews,
        });
    } catch (error) {
        next(error);
    }
});


/*
=====================================================
CREATE / UPDATE TRIP REVIEW
=====================================================
*/

router.post("/", async (req, res, next) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "You must be signed in to review a trip.",
            });
        }

        const {
            tripId,
            rating,
            review,
        } = req.body;


        /*
        =============================================
        VALIDATE TRIP ID
        =============================================
        */

        if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
            return res.status(400).json({
                success: false,
                message: "A valid trip ID is required.",
            });
        }


        /*
        =============================================
        VALIDATE RATING
        =============================================
        */

        const numericRating = Number(rating);

        if (
            !Number.isInteger(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5.",
            });
        }


        /*
        =============================================
        VALIDATE REVIEW
        =============================================
        */

        const cleanReview =
            typeof review === "string"
                ? review.trim()
                : "";

        if (cleanReview.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Please write at least 3 characters.",
            });
        }

        if (cleanReview.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Review cannot exceed 2000 characters.",
            });
        }


        /*
        =============================================
        MAKE SURE TRIP BELONGS TO USER
        =============================================
        */

        const trip = await GeneratedTrip.findOne({
            _id: tripId,
            userId,
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Generated trip not found.",
            });
        }


        /*
        =============================================
        CREATE OR UPDATE REVIEW
        =============================================
        */

        const savedReview = await TripReview.findOneAndUpdate(
            {
                userId,
                tripId,
            },
            {
                $set: {
                    rating: numericRating,
                    review: cleanReview,
                },
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        )
            .populate({
                path: "tripId",
                populate: {
                    path: "days.places.placeId",
                },
            })
            .lean();


        return res.status(200).json({
            success: true,
            message: "Trip review saved successfully.",
            review: savedReview,
        });
    } catch (error) {
        next(error);
    }
});


/*
|--------------------------------------------------------------------------
| PUBLIC REVIEWS
|--------------------------------------------------------------------------
| Anyone can read published trip reviews.
| No authentication required.
*/
router.get("/public", async (req, res, next) => {
    try {
        const reviews = await TripReview.find({})
            .sort({ createdAt: -1 })
            .limit(30)
            .populate({
                path: "tripId",
                select: "preferences estimatedCost createdAt",
            })
            .lean();

        return res.json({
            success: true,
            reviews,
        });
    } catch (error) {
        next(error);
    }
});

/*
=====================================================
DELETE CURRENT USER'S REVIEW
=====================================================
*/

router.delete("/:tripId", async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { tripId } = req.params;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(tripId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid trip ID.",
            });
        }

        const deleted = await TripReview.findOneAndDelete({
            userId,
            tripId,
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        return res.json({
            success: true,
            message: "Review deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
});


/*
=====================================================
CLERK USER ID
=====================================================
*/

function getUserId(req) {
    try {
        const auth = req.auth();
        return auth?.userId || null;
    } catch (error) {
        return null;
    }
}


export default router;