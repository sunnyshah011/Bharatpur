import express from "express";
import mongoose from "mongoose";

import Place from "../models/Place.js";

import {
  resolvePlaceWithGoogle,
} from "../services/googlePlaces.js";

const router = express.Router();


// ========================================
// Helpers
// ========================================

function isValidCoordinate(
  latitude,
  longitude
) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(
      latitude === 0 &&
      longitude === 0
    )
  );
}


const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");


const escapeRegex = (value) =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );


// ========================================
// POST /api/places/resolve
// ========================================

router.post(
  "/resolve",
  async (req, res) => {
    try {
      const {
        name,
        slug,
      } = req.body;

      const searchName =
        String(
          name || slug || ""
        ).trim();

      if (!searchName) {
        return res.status(400).json({
          success: false,
          error:
            "Place name is required.",
        });
      }

      console.log(
        `🔎 Resolving: ${searchName}`
      );


      // ==================================
      // 1. Search MongoDB
      // ==================================

      let place =
        await Place.findOne({
          $or: [
            {
              slug:
                slugify(searchName),
            },

            {
              name: {
                $regex:
                  `^${escapeRegex(
                    searchName
                  )}$`,

                $options: "i",
              },
            },
          ],
        });


      // ==================================
      // 2. Existing Google place
      // ==================================

      if (
        place &&
        place.googlePlaceId
      ) {
        console.log(
          `✅ Existing Google Place ID: ${place.googlePlaceId}`
        );

        return res.json({
          success: true,
          place,
        });
      }


      // ==================================
      // 3. Resolve through Google
      // ==================================

      console.log(
        `🌐 Searching Google Places: ${searchName}`
      );

      const resolved =
        await resolvePlaceWithGoogle(
          searchName
        );


      if (
        !resolved ||
        !resolved.googlePlaceId
      ) {
        throw new Error(
          "Google did not return a valid Place ID."
        );
      }


      console.log(
        `✅ Google result: ${resolved.name}`
      );

      console.log(
        `📍 Google Place ID: ${resolved.googlePlaceId}`
      );


      // ==================================
      // 4. Update existing record
      // ==================================

      if (place) {
        place.name =
          resolved.name;

        place.slug =
          resolved.slug;

        place.location =
          resolved.formattedAddress;

        place.googlePlaceId =
          resolved.googlePlaceId;

        place.formattedAddress =
          resolved.formattedAddress;

        place.locationPoint = {
          type: "Point",

          coordinates: [
            resolved.longitude,
            resolved.latitude,
          ],
        };

        place.locationSource =
          "google-places";

        place.providerPlaceId =
          "";

        place.lastVerifiedAt =
          new Date();

        await place.save();

        console.log(
          `💾 Updated MongoDB place: ${place._id}`
        );
      }


      // ==================================
      // 5. Create new record
      // ==================================

      else {
        place =
          await Place.create({
            name:
              resolved.name,

            slug:
              resolved.slug,

            location:
              resolved.formattedAddress,

            googlePlaceId:
              resolved.googlePlaceId,

            formattedAddress:
              resolved.formattedAddress,

            locationPoint: {
              type: "Point",

              coordinates: [
                resolved.longitude,
                resolved.latitude,
              ],
            },

            locationSource:
              "google-places",

            providerPlaceId:
              "",

            lastVerifiedAt:
              new Date(),

            category:
              Array.isArray(
                resolved.category
              )
                ? resolved.category
                : [],
          });

        console.log(
          `💾 Created MongoDB place: ${place._id}`
        );
      }


      // ==================================
      // 6. Return
      // ==================================

      return res.json({
        success: true,

        place,
      });

    } catch (error) {
      console.error(
        "❌ Place resolution error:",
        error
      );

      return res.status(500).json({
        success: false,

        error:
          error.message ||
          "Failed to resolve place.",
      });
    }
  }
);


// ========================================
// GET /api/places/nearby/search
// ========================================

router.get(
  "/nearby/search",
  async (req, res, next) => {
    try {
      const latitude =
        Number(req.query.lat);

      const longitude =
        Number(req.query.lng);

      const radius =
        Number(req.query.radius) ||
        10000;


      if (
        !isValidCoordinate(
          latitude,
          longitude
        )
      ) {
        return res.status(400).json({
          success: false,

          error:
            "Invalid latitude or longitude.",
        });
      }


      const places =
        await Place.find({
          locationPoint: {
            $near: {
              $geometry: {
                type: "Point",

                coordinates: [
                  longitude,
                  latitude,
                ],
              },

              $maxDistance:
                radius,
            },
          },
        });


      return res.json({
        success: true,

        count:
          places.length,

        places,
      });

    } catch (error) {
      next(error);
    }
  }
);


// ========================================
// GET /api/places/:id
// ========================================

router.get(
  "/:id",
  async (req, res, next) => {
    try {
      const { id } =
        req.params;

      let place = null;


      // MongoDB ObjectId
      if (
        mongoose.isValidObjectId(id)
      ) {
        place =
          await Place.findById(id);
      }

      // Slug
      else {
        place =
          await Place.findOne({
            slug: id,
          });
      }


      if (!place) {
        return res.status(404).json({
          success: false,

          error:
            "Place not found.",
        });
      }


      const placeData =
        place.toJSON();


      const latitude =
        Number(
          placeData.latitude
        );

      const longitude =
        Number(
          placeData.longitude
        );


      if (
        !isValidCoordinate(
          latitude,
          longitude
        )
      ) {
        return res.status(422).json({
          success: false,

          error:
            "This place has invalid location coordinates.",
        });
      }


      // ==================================
      // Google Place ID required
      // ==================================

      if (
        !placeData.googlePlaceId
      ) {
        return res.status(422).json({
          success: false,

          error:
            "This place does not have a Google Place ID yet.",

          place: {
            ...placeData,

            latitude,

            longitude,

            lat:
              latitude,

            lng:
              longitude,
          },
        });
      }


      return res.json({
        success: true,

        place: {
          ...placeData,

          latitude,

          longitude,

          lat:
            latitude,

          lng:
            longitude,

          googlePlaceId:
            placeData.googlePlaceId,
        },
      });

    } catch (error) {
      next(error);
    }
  }
);


export default router;