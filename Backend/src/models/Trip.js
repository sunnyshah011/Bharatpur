// import mongoose from "mongoose";

// const tripSchema =
//     new mongoose.Schema(
//         {
//             userId: {
//                 type: String,
//                 required: true,
//                 index: true,
//             },

//             placeId: {
//                 type: mongoose.Schema.Types.ObjectId,
//                 ref: "Place",
//                 required: true,
//             },

//             status: {
//                 type: String,
//                 enum: [
//                     "planned",
//                     "completed",
//                 ],
//                 default: "planned",
//             },
//         },

//         {
//             timestamps: true,
//         }
//     );

// tripSchema.index({
//     userId: 1,
//     placeId: 1,
// });

// export default mongoose.model(
//     "Trip",
//     tripSchema
// );


// import mongoose from "mongoose";

// const tripSchema = new mongoose.Schema(
//     {
//         // Clerk User ID
//         userId: {
//             type: String,
//             required: true,
//             index: true,
//             trim: true,
//         },

//         // MongoDB Place ID
//         placeId: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Place",
//             required: true,
//         },

//         status: {
//             type: String,
//             enum: ["planned", "completed"],
//             default: "planned",
//         },
//     },
//     {
//         timestamps: true,
//     }
// );

// // One user cannot save the same place twice
// tripSchema.index(
//     {
//         userId: 1,
//         placeId: 1,
//     },
//     {
//         unique: true,
//     }
// );

// export default mongoose.model("Trip", tripSchema);


import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        placeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Place",
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

/*
 * One user cannot save the same place twice.
 */
tripSchema.index(
    {
        userId: 1,
        placeId: 1,
    },
    {
        unique: true,
    }
);

const Trip = mongoose.model("Trip", tripSchema);

export default Trip;