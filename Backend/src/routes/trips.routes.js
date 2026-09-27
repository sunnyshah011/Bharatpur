import express from "express";

import mongoose from "mongoose";

import Trip from "../models/Trip.js";
import Place from "../models/Place.js";
import GeneratedTrip from "../models/GeneratedTrip.js";

import { generateTrip } from "../services/tripGenerator.js";

const router = express.Router();

/*
========================================
AUTH HELPER
========================================
*/

function getUserId(req) {
  const auth = req.auth();

  return auth?.userId;
}

/*
========================================
GET MY SAVED PLACES
========================================
*/

router.get("/", async (req, res, next) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const trips =
      await Trip.find({
        userId,
      })
        .populate({
          path: "placeId",
          model: Place,
        })
        .sort({
          createdAt: -1,
        });

    return res.json({
      success: true,
      count: trips.length,
      trips,
    });
  } catch (error) {
    next(error);
  }
});

/*
========================================
ADD PLACE TO MY TRIP
========================================
*/

router.post("/", async (req, res, next) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const { placeId } =
      req.body;

    if (
      !placeId ||
      !mongoose.Types.ObjectId.isValid(
        placeId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid placeId is required.",
      });
    }

    const place =
      await Place.findById(
        placeId
      );

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Place not found.",
      });
    }

    const existingTrip =
      await Trip.findOne({
        userId,
        placeId,
      });

    if (existingTrip) {
      return res.json({
        success: true,
        message:
          "Place is already in your trip.",
        trip: existingTrip,
      });
    }

    const trip =
      await Trip.create({
        userId,
        placeId,
      });

    await trip.populate({
      path: "placeId",
      model: Place,
    });

    return res.status(201).json({
      success: true,
      message:
        "Place added to your trip.",
      trip,
    });
  } catch (error) {
    next(error);
  }
});

/*
========================================
GENERATE MY TRIP
========================================
*/

router.post(
  "/generate",
  async (req, res, next) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const {
        days,
        budget,
        travelingWith,
        transportation,
        interests,
      } = req.body;

      /*
      ========================================
      VALIDATION
      ========================================
      */

      const parsedDays =
        Number(days);

      if (
        !Number.isInteger(
          parsedDays
        ) ||
        parsedDays < 1 ||
        parsedDays > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Days must be between 1 and 5.",
        });
      }

      if (!budget) {
        return res.status(400).json({
          success: false,
          message:
            "Budget is required.",
        });
      }

      const validTravelingWith = [
        "Solo",
        "Couple",
        "Family",
        "Friends",
      ];

      if (
        !validTravelingWith.includes(
          travelingWith
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid traveling option.",
        });
      }

      const validTransportation = [
        "Car / taxi",
        "Bus",
        "Bike",
        "Walking",
      ];

      if (
        !validTransportation.includes(
          transportation
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid transportation option.",
        });
      }

      if (
        !Array.isArray(
          interests
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Interests must be an array.",
        });
      }

      /*
      ========================================
      GENERATE
      ========================================
      */

      const generated =
        await generateTrip({
          days: parsedDays,
          budget,
          travelingWith,
          transportation,
          interests,
        });

      /*
      ========================================
      SAVE
      ========================================
      */

      const generatedTrip =
        await GeneratedTrip.create({
          userId,

          days: generated.days,

          budget:
            generated.budget,

          travelingWith:
            generated.travelingWith,

          transportation:
            generated.transportation,

          interests:
            generated.interests,

          itinerary:
            generated.itinerary,

          totalEstimatedCost:
            generated.totalEstimatedCost,

          status:
            "generated",
        });

      /*
      Populate places
      */

      await generatedTrip.populate({
        path:
          "itinerary.places.placeId",
        model: Place,
      });

      return res.status(201).json({
        success: true,

        message:
          "Trip generated successfully.",

        trip: generatedTrip,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
========================================
GET GENERATED TRIPS
========================================
*/

router.get(
  "/generated",
  async (req, res, next) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const trips =
        await GeneratedTrip.find({
          userId,
        })
          .populate({
            path:
              "itinerary.places.placeId",
            model: Place,
          })
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
        count: trips.length,
        trips,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
========================================
GET SINGLE GENERATED TRIP
========================================
*/

router.get(
  "/generated/:id",
  async (req, res, next) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const {
        id,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid trip ID.",
        });
      }

      const trip =
        await GeneratedTrip.findOne({
          _id: id,
          userId,
        }).populate({
          path:
            "itinerary.places.placeId",
          model: Place,
        });

      if (!trip) {
        return res.status(404).json({
          success: false,
          message:
            "Generated trip not found.",
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

/*
========================================
DELETE SAVED PLACE
========================================
*/

router.delete(
  "/:placeId",
  async (req, res, next) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const {
        placeId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          placeId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid place ID.",
        });
      }

      const deleted =
        await Trip.findOneAndDelete({
          userId,
          placeId,
        });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message:
            "Place was not in your trip.",
        });
      }

      return res.json({
        success: true,
        message:
          "Place removed from your trip.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
========================================
DELETE ALL SAVED PLACES
========================================
*/

router.delete(
  "/",
  async (req, res, next) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      await Trip.deleteMany({
        userId,
      });

      return res.json({
        success: true,
        message:
          "My trip cleared.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;