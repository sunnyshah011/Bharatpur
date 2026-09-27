import Place from "../models/Place.js";


/*
=====================================================
VALID OPTIONS
=====================================================
*/

const VALID_TRAVELING_WITH = [
    "Solo",
    "Couple",
    "Family",
    "Friends",
];


const VALID_TRANSPORTATION = [
    "Walking",
    "Bicycle",
    "Bus",
    "Car/Taxi",
];


const VALID_INTERESTS = [
    "Nature",
    "Wildlife",
    "Food",
    "Culture",
    "Adventure",
];


/*
=====================================================
BUDGET DEFINITIONS
=====================================================
*/

const BUDGETS = {

    "Rs. 2,000 – 5,000": {
        min: 2000,
        max: 5000,
    },

    "Rs. 5,000 – 10,000": {
        min: 5000,
        max: 10000,
    },

    "Rs. 10,000 – 20,000": {
        min: 10000,
        max: 20000,
    },

    "Rs. 20,000+": {
        min: 20000,
        max: 1000000,
    },

};


/*
=====================================================
TRANSPORT COST
=====================================================
*/

const TRANSPORT_COST = {

    Walking: 0,

    Bicycle: 300,

    Bus: 400,

    "Car/Taxi": 1000,

};


/*
=====================================================
GROUP KEYWORDS
=====================================================
*/

const GROUP_KEYWORDS = {

    Solo: [
        "solo",
        "single",
    ],

    Couple: [
        "couple",
        "romantic",
        "couples",
    ],

    Family: [
        "family",
        "families",
        "kids",
        "children",
    ],

    Friends: [
        "friend",
        "friends",
        "group",
    ],

};


/*
=====================================================
NORMALIZE
=====================================================
*/

function normalize(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase();

}


/*
=====================================================
PARSE BUDGET
=====================================================
*/

export function parseBudget(budget) {

    if (BUDGETS[budget]) {

        return BUDGETS[budget];

    }


    const numbers =
        String(budget ?? "")
            .replace(/,/g, "")
            .match(/\d+(?:\.\d+)?/g);


    if (
        !numbers ||
        numbers.length === 0
    ) {

        return {
            min: 0,
            max: 5000,
        };

    }


    const parsed =
        numbers.map(Number);


    if (parsed.length === 1) {

        return {

            min: parsed[0],

            max: parsed[0],

        };

    }


    return {

        min: parsed[0],

        max: parsed[1],

    };

}


/*
=====================================================
GET PLACE COST
=====================================================
*/

function getPlaceCost(place) {

    /*
    =============================================
    EXPLICIT ESTIMATED COST
    =============================================
    */

    if (
        Number.isFinite(
            place.estimatedCost
        ) &&
        place.estimatedCost >= 0
    ) {

        return place.estimatedCost;

    }


    /*
    =============================================
    DETAILS COST
    =============================================
    */

    const costText =
        place.details?.cost ?? "";


    const numbers =
        String(costText)
            .replace(/,/g, "")
            .match(/\d+(?:\.\d+)?/g);


    if (
        !numbers ||
        numbers.length === 0
    ) {

        return 0;

    }


    return Number(numbers[0]);

}


/*
=====================================================
GET VISIT DURATION
=====================================================
*/

function getVisitDuration(place) {

    if (
        Number.isFinite(
            place.estimatedVisitMinutes
        )
    ) {

        return Math.max(
            15,
            Math.min(
                720,
                place.estimatedVisitMinutes
            )
        );

    }


    return 120;

}


/*
=====================================================
GROUP MATCH
=====================================================
*/

function matchesTravelingGroup(
    place,
    travelingWith
) {

    const bestFor =
        normalize(
            place.details?.bestFor
        );


    if (!bestFor) {

        return false;

    }


    const keywords =
        GROUP_KEYWORDS[
            travelingWith
        ] || [];


    return keywords.some(
        (keyword) =>
            bestFor.includes(keyword)
    );

}


/*
=====================================================
PLACE SCORE
=====================================================
*/

function scorePlace(
    place,
    interests,
    travelingWith,
    dailyBudget
) {

    const categories =
        (
            place.category || []
        ).map(normalize);


    const normalizedInterests =
        interests.map(normalize);


    /*
    =============================================
    INTEREST MATCH
    =============================================
    */

    const matchingInterests =
        interests.filter(
            (interest) =>
                categories.includes(
                    normalize(interest)
                )
        );


    let score =
        matchingInterests.length * 25;


    /*
    =============================================
    GROUP MATCH
    =============================================
    */

    const groupMatch =
        matchesTravelingGroup(
            place,
            travelingWith
        );


    if (groupMatch) {

        score += 10;

    }


    /*
    =============================================
    RATING
    =============================================
    */

    const rating =
        Number(place.rating) || 0;


    score += rating * 2;


    /*
    =============================================
    COST
    =============================================
    */

    const cost =
        getPlaceCost(place);


    if (
        cost <= dailyBudget
    ) {

        score += 8;

    } else {

        score -= 5;

    }


    /*
    =============================================
    FREE PLACE
    =============================================
    */

    if (cost === 0) {

        score += 3;

    }


    /*
    =============================================
    INTEREST SAFETY CHECK
    =============================================
    */

    const interestMatch =
        normalizedInterests.some(
            (interest) =>
                categories.includes(
                    interest
                )
        );


    if (!interestMatch) {

        score -= 15;

    }


    return {

        score,

        matchingInterests,

        cost,

        groupMatch,

    };

}


/*
=====================================================
CREATE REASON
=====================================================
*/

function createReason(
    matchingInterests,
    travelingWith,
    groupMatch
) {

    const reasons = [];


    if (
        matchingInterests.length > 0
    ) {

        reasons.push(
            `Matches your ${matchingInterests.join(
                " + "
            )} interest`
        );

    }


    if (groupMatch) {

        reasons.push(
            `Suitable for ${travelingWith.toLowerCase()} travel`
        );

    }


    if (
        reasons.length === 0
    ) {

        reasons.push(
            "Recommended based on place rating and availability"
        );

    }


    return (
        reasons.join(". ") + "."
    );

}


/*
=====================================================
TIME FORMAT
=====================================================
*/

function minutesToTime(
    totalMinutes
) {

    const hours =
        Math.floor(
            totalMinutes / 60
        );


    const minutes =
        totalMinutes % 60;


    const suffix =
        hours >= 12
            ? "PM"
            : "AM";


    const displayHour =
        hours % 12 || 12;


    return `${String(
        displayHour
    ).padStart(2, "0")}:${String(
        minutes
    ).padStart(2, "0")} ${suffix}`;

}


/*
=====================================================
DAY TITLE
=====================================================
*/

function createDayTitle(
    selectedPlaces,
    interests
) {

    const categoryCount = {};


    selectedPlaces.forEach(
        (item) => {

            (
                item.place.category || []
            ).forEach(
                (category) => {

                    const normalized =
                        normalize(category);


                    const original =
                        interests.find(
                            (interest) =>
                                normalize(
                                    interest
                                ) === normalized
                        );


                    if (original) {

                        categoryCount[
                            original
                        ] =
                            (
                                categoryCount[
                                    original
                                ] || 0
                            ) + 1;

                    }

                }
            );

        }
    );


    const sortedCategories =
        Object.entries(
            categoryCount
        )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .map(
                ([category]) =>
                    category
            );


    if (
        sortedCategories.length >= 2
    ) {

        return `${sortedCategories[0]} + ${sortedCategories[1]}`;

    }


    if (
        sortedCategories.length === 1
    ) {

        return sortedCategories[0];

    }


    if (
        selectedPlaces.length > 0
    ) {

        return "Bharatpur Exploration";

    }


    return "Free / Flexible Day";

}


/*
=====================================================
BUILD TRIP PLAN
=====================================================
*/

export async function buildTripPlan(
    preferences
) {

    const {
        days,
        budget,
        travelingWith,
        transportation,
        interests,
    } = preferences;


    /*
    =============================================
    VALIDATE DAYS
    =============================================
    */

    const numberOfDays =
        Number(days);


    if (
        !Number.isInteger(
            numberOfDays
        ) ||
        numberOfDays < 1 ||
        numberOfDays > 7
    ) {

        const error =
            new Error(
                "Days must be between 1 and 7."
            );

        error.statusCode = 400;

        throw error;

    }


    /*
    =============================================
    VALIDATE GROUP
    =============================================
    */

    if (
        !VALID_TRAVELING_WITH.includes(
            travelingWith
        )
    ) {

        const error =
            new Error(
                "Invalid travelingWith option."
            );

        error.statusCode = 400;

        throw error;

    }


    /*
    =============================================
    VALIDATE TRANSPORT
    =============================================
    */

    if (
        !VALID_TRANSPORTATION.includes(
            transportation
        )
    ) {

        const error =
            new Error(
                "Invalid transportation option."
            );

        error.statusCode = 400;

        throw error;

    }


    /*
    =============================================
    VALIDATE INTERESTS
    =============================================
    */

    if (
        !Array.isArray(interests) ||
        interests.length === 0
    ) {

        const error =
            new Error(
                "Please select at least one interest."
            );

        error.statusCode = 400;

        throw error;

    }


    const validInterests =
        interests.filter(
            (interest) =>
                VALID_INTERESTS.includes(
                    interest
                )
        );


    if (
        validInterests.length === 0
    ) {

        const error =
            new Error(
                "No valid interests were selected."
            );

        error.statusCode = 400;

        throw error;

    }


    /*
    =============================================
    BUDGET
    =============================================
    */

    const budgetInfo =
        parseBudget(budget);


    const transportDailyCost =
        TRANSPORT_COST[
            transportation
        ] ?? 0;


    /*
    =============================================
    GET PLACES FROM MONGODB
    =============================================
    */

    const places =
        await Place
            .find({})
            .lean();


    if (
        places.length === 0
    ) {

        const error =
            new Error(
                "No places are available in the database."
            );

        error.statusCode = 404;

        throw error;

    }


    /*
    =============================================
    BUDGET CALCULATION
    =============================================
    */

    const totalTransportBudget =
        transportDailyCost *
        numberOfDays;


    const activityBudget =
        Math.max(
            0,
            budgetInfo.max -
                totalTransportBudget
        );


    const dailyActivityBudget =
        activityBudget /
        numberOfDays;


    /*
    =============================================
    SCORE PLACES
    =============================================
    */

    let candidates =
        places.map(
            (place) => {

                const result =
                    scorePlace(
                        place,
                        validInterests,
                        travelingWith,
                        dailyActivityBudget
                    );


                return {

                    place,

                    score:
                        result.score,

                    matchingInterests:
                        result.matchingInterests,

                    cost:
                        result.cost,

                    groupMatch:
                        result.groupMatch,

                };

            }
        );


    /*
    =============================================
    SORT
    =============================================
    */

    candidates.sort(
        (a, b) => {

            if (
                b.score !==
                a.score
            ) {

                return (
                    b.score -
                    a.score
                );

            }


            return (
                (b.place.rating || 0) -
                (a.place.rating || 0)
            );

        }
    );


    /*
    =============================================
    PLACES PER DAY
    =============================================
    */

    const maxPlacesPerDay =
        numberOfDays <= 2
            ? 3
            : 2;


    const remaining =
        [...candidates];


    const generatedDays = [];


    /*
    =============================================
    GENERATE DAYS
    =============================================
    */

    for (
        let dayIndex = 0;
        dayIndex < numberOfDays;
        dayIndex++
    ) {

        const daysRemaining =
            numberOfDays -
            dayIndex;


        const placesRemaining =
            remaining.length;


        const targetPlaces =
            Math.min(
                maxPlacesPerDay,

                Math.ceil(
                    placesRemaining /
                    daysRemaining
                )
            );


        const selected = [];


        let dayPlaceCost = 0;


        /*
        =============================================
        SELECT PLACES
        =============================================
        */

        for (
            let i = 0;
            i < targetPlaces;
            i++
        ) {

            if (
                remaining.length === 0
            ) {

                break;

            }


            const preferredInterest =
                validInterests[
                    dayIndex %
                    validInterests.length
                ];


            let bestIndex = 0;

            let bestScore =
                -Infinity;


            remaining.forEach(
                (
                    candidate,
                    index
                ) => {

                    let candidateScore =
                        candidate.score;


                    const categories =
                        (
                            candidate.place
                                .category ||
                            []
                        ).map(normalize);


                    /*
                    =================================
                    PREFERRED INTEREST
                    =================================
                    */

                    if (
                        categories.includes(
                            normalize(
                                preferredInterest
                            )
                        )
                    ) {

                        candidateScore += 10;

                    }


                    /*
                    =================================
                    AFFORDABILITY
                    =================================
                    */

                    if (
                        candidate.cost <=
                        dailyActivityBudget
                    ) {

                        candidateScore += 5;

                    }


                    /*
                    =================================
                    DAY BUDGET
                    =================================
                    */

                    if (
                        dayPlaceCost +
                            candidate.cost >
                        dailyActivityBudget
                    ) {

                        candidateScore -= 8;

                    }


                    if (
                        candidateScore >
                        bestScore
                    ) {

                        bestScore =
                            candidateScore;

                        bestIndex =
                            index;

                    }

                }
            );


            const chosen =
                remaining.splice(
                    bestIndex,
                    1
                )[0];


            /*
            =============================================
            BUDGET CHECK
            =============================================
            */

            const wouldExceed =
                dayPlaceCost +
                chosen.cost >
                dailyActivityBudget;


            if (
                wouldExceed &&
                selected.length > 0
            ) {

                const cheaperIndex =
                    remaining.findIndex(
                        (candidate) =>
                            dayPlaceCost +
                                candidate.cost <=
                            dailyActivityBudget
                    );


                if (
                    cheaperIndex !== -1
                ) {

                    const cheaper =
                        remaining.splice(
                            cheaperIndex,
                            1
                        )[0];


                    remaining.push(
                        chosen
                    );


                    selected.push(
                        cheaper
                    );


                    dayPlaceCost +=
                        cheaper.cost;


                    continue;

                }

            }


            selected.push(
                chosen
            );


            dayPlaceCost +=
                chosen.cost;

        }


        /*
        =============================================
        TRANSPORT COST
        =============================================
        */

        const transportCost =
            selected.length > 0
                ? transportDailyCost
                : 0;


        /*
        =============================================
        ITINERARY PLACES
        =============================================
        */

        const itineraryPlaces =
            selected.map(
                (
                    candidate,
                    index
                ) => {

                    const startMinutes =
                        index === 0
                            ? 9 * 60
                            : index === 1
                            ? 12 * 60 + 30
                            : 16 * 60;


                    const duration =
                        getVisitDuration(
                            candidate.place
                        );


                    return {

                        placeId:
                            candidate
                                .place
                                ._id,

                        startTime:
                            minutesToTime(
                                startMinutes
                            ),

                        durationMinutes:
                            duration,

                        estimatedCost:
                            candidate.cost,

                        reason:
                            createReason(
                                candidate.matchingInterests,
                                travelingWith,
                                candidate.groupMatch
                            ),

                    };

                }
            );


        /*
        =============================================
        DAY COST
        =============================================
        */

        const dayEstimatedCost =
            dayPlaceCost +
            transportCost;


        /*
        =============================================
        SAVE DAY
        =============================================
        */

        generatedDays.push({

            day:
                dayIndex + 1,

            title:
                createDayTitle(
                    selected,
                    validInterests
                ),

            estimatedCost:
                dayEstimatedCost,

            transportCost,

            places:
                itineraryPlaces,

        });

    }


    /*
    =============================================
    TOTAL COST
    =============================================
    */

    const estimatedCost =
        generatedDays.reduce(
            (
                total,
                day
            ) =>
                total +
                day.estimatedCost,

            0
        );


    /*
    =============================================
    BUDGET STATUS
    =============================================
    */

    const budgetWithinLimit =
        estimatedCost <=
        budgetInfo.max;


    let budgetNote = "";


    if (
        budgetWithinLimit
    ) {

        budgetNote =
            "This itinerary is within your selected budget.";

    } else {

        budgetNote =
            "This itinerary is above your selected budget because some recommended places have higher estimated costs.";

    }


    /*
    =============================================
    RETURN PLAN
    =============================================
    */

    return {

        preferences: {

            days:
                numberOfDays,

            budget,

            budgetMin:
                budgetInfo.min,

            budgetMax:
                budgetInfo.max,

            travelingWith,

            transportation,

            interests:
                validInterests,

        },


        estimatedCost,


        budgetWithinLimit,


        budgetNote,


        days:
            generatedDays,

    };

}