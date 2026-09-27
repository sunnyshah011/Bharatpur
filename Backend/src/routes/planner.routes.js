import express from "express";
import mongoose from "mongoose";

import GeneratedTrip from "../models/GeneratedTrip.js";

import {
    buildTripPlan,
} from "../services/tripPlanner.js";


const router = express.Router();


/*
=====================================================
GET CURRENT CLERK USER
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


/*
=====================================================
GENERATE TRIP
=====================================================
*/

router.post(
    "/generate",
    async (req, res, next) => {

        try {

            const userId =
                getUserId(req);


            /*
            =============================================
            AUTH
            =============================================
            */

            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "You must be signed in to generate a trip.",

                });

            }


            /*
            =============================================
            REQUEST DATA
            =============================================
            */

            const {
                days,
                budget,
                travelingWith,
                transportation,
                interests,
            } = req.body;


            /*
            =============================================
            BUILD PLAN
            =============================================
            */

            const plan =
                await buildTripPlan({

                    days,
                    budget,
                    travelingWith,
                    transportation,
                    interests,

                });


            /*
            =============================================
            SAVE GENERATED TRIP
            =============================================
            */

            const generatedTrip =
                await GeneratedTrip.create({

                    userId,

                    preferences:
                        plan.preferences,

                    estimatedCost:
                        plan.estimatedCost,

                    budgetWithinLimit:
                        plan.budgetWithinLimit,

                    budgetNote:
                        plan.budgetNote,

                    days:
                        plan.days,

                });


            /*
            =============================================
            POPULATE PLACES
            =============================================
            */

            const populatedTrip =
                await GeneratedTrip
                    .findById(
                        generatedTrip._id
                    )
                    .populate(
                        "days.places.placeId"
                    )
                    .lean();


            /*
            =============================================
            RESPONSE
            =============================================
            */

            return res.status(201).json({

                success: true,

                message:
                    "Trip generated successfully.",

                trip:
                    populatedTrip,

            });

        } catch (error) {

            next(error);

        }

    }
);


/*
=====================================================
GET TRIP HISTORY
=====================================================
*/

router.get(
    "/history",
    async (req, res, next) => {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Unauthorized.",

                });

            }


            const trips =
                await GeneratedTrip
                    .find({
                        userId,
                    })
                    .sort({
                        createdAt: -1,
                    })
                    .limit(20)
                    .populate(
                        "days.places.placeId"
                    )
                    .lean();


            return res.json({

                success: true,

                trips,

            });

        } catch (error) {

            next(error);

        }

    }
);


/*
=====================================================
GET SINGLE GENERATED TRIP
=====================================================
*/

router.get(
    "/:id",
    async (req, res, next) => {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Unauthorized.",

                });

            }


            const { id } =
                req.params;


            if (
                !mongoose.Types.ObjectId.isValid(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid trip ID.",

                });

            }


            const trip =
                await GeneratedTrip
                    .findOne({

                        _id: id,

                        userId,

                    })
                    .populate(
                        "days.places.placeId"
                    )
                    .lean();


            if (!trip) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Trip not found.",

                });

            }


            return res.json({

                success: true,

                trip,

            });

        } catch (error) {

            next(error);

        }

    }
);


export default router;