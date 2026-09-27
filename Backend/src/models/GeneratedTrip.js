import mongoose from "mongoose";


/*
=====================================================
ITINERARY PLACE
=====================================================
*/

const itineraryPlaceSchema = new mongoose.Schema(
    {
        placeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Place",
            required: true,
        },

        startTime: {
            type: String,
            default: "",
        },

        durationMinutes: {
            type: Number,
            default: 120,
            min: 15,
        },

        estimatedCost: {
            type: Number,
            default: 0,
            min: 0,
        },

        reason: {
            type: String,
            default: "",
        },
    },
    {
        _id: false,
    }
);


/*
=====================================================
ITINERARY DAY
=====================================================
*/

const itineraryDaySchema = new mongoose.Schema(
    {
        day: {
            type: Number,
            required: true,
            min: 1,
        },

        title: {
            type: String,
            default: "",
        },

        estimatedCost: {
            type: Number,
            default: 0,
            min: 0,
        },

        transportCost: {
            type: Number,
            default: 0,
            min: 0,
        },

        places: {
            type: [itineraryPlaceSchema],
            default: [],
        },
    },
    {
        _id: false,
    }
);


/*
=====================================================
GENERATED TRIP
=====================================================
*/

const generatedTripSchema = new mongoose.Schema(
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
        USER PREFERENCES
        =============================================
        */

        preferences: {
            days: {
                type: Number,
                required: true,
                min: 1,
                max: 7,
            },

            budget: {
                type: String,
                required: true,
                trim: true,
            },

            budgetMin: {
                type: Number,
                default: 0,
                min: 0,
            },

            budgetMax: {
                type: Number,
                default: 0,
                min: 0,
            },

            travelingWith: {
                type: String,
                required: true,
                enum: [
                    "Solo",
                    "Couple",
                    "Family",
                    "Friends",
                ],
            },

            transportation: {
                type: String,
                required: true,
                enum: [
                    "Walking",
                    "Bicycle",
                    "Bus",
                    "Car/Taxi",
                ],
            },

            interests: {
                type: [String],
                default: [],
            },
        },


        /*
        =============================================
        TOTAL ESTIMATED COST
        =============================================
        */

        estimatedCost: {
            type: Number,
            default: 0,
            min: 0,
        },


        /*
        =============================================
        BUDGET STATUS
        =============================================
        */

        budgetWithinLimit: {
            type: Boolean,
            default: true,
        },


        budgetNote: {
            type: String,
            default: "",
        },


        /*
        =============================================
        GENERATED ITINERARY DAYS
        =============================================
        */

        days: {
            type: [itineraryDaySchema],
            default: [],
        },
    },

    {
        timestamps: true,
    }
);


/*
=====================================================
INDEX
=====================================================
*/

generatedTripSchema.index({
    userId: 1,
    createdAt: -1,
});


/*
=====================================================
MODEL
=====================================================
*/

export default mongoose.model(
    "GeneratedTrip",
    generatedTripSchema
);