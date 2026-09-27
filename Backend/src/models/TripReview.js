import mongoose from "mongoose";

const tripReviewSchema = new mongoose.Schema(
    {
        /*
        =============================================
        CLERK USER ID
        =============================================
        */

        userId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },


        /*
        =============================================
        GENERATED TRIP
        =============================================
        */

        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "GeneratedTrip",
            required: true,
        },


        /*
        =============================================
        STAR RATING
        =============================================
        */

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },


        /*
        =============================================
        USER REVIEW
        =============================================
        */

        review: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 2000,
        },
    },

    {
        timestamps: true,
    }
);


/*
=====================================================
ONE REVIEW PER USER PER GENERATED TRIP
=====================================================
*/

tripReviewSchema.index(
    {
        userId: 1,
        tripId: 1,
    },
    {
        unique: true,
    }
);


export default mongoose.model(
    "TripReview",
    tripReviewSchema
);