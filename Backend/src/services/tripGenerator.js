import Place from "../models/Place.js";

/*
========================================
BUDGET RANGES
========================================
*/

const budgetRanges = {
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
    max: Infinity,
  },
};

/*
========================================
TRANSPORTATION LIMITS
========================================
*/

const placesPerDay = {
  Walking: 2,
  Bike: 3,
  Bus: 3,
  "Car / taxi": 4,
};

/*
========================================
NORMALIZE
========================================
*/

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

/*
========================================
CALCULATE PLACE SCORE
========================================
*/

function calculatePlaceScore(
  place,
  interests,
  travelingWith
) {
  let score = 0;

  const placeCategories =
    place.category || [];

  /*
  Interest matching
  */

  for (const interest of interests) {
    const interestNormalized =
      normalize(interest);

    const matched =
      placeCategories.some(
        (category) =>
          normalize(category) ===
          interestNormalized
      );

    if (matched) {
      score += 10;
    }
  }

  /*
  Traveling-with matching
  */

  if (
    place.suitableFor?.some(
      (item) =>
        normalize(item) ===
        normalize(travelingWith)
    )
  ) {
    score += 5;
  }

  /*
  Rating
  */

  score +=
    Number(place.rating || 0) * 2;

  return score;
}

/*
========================================
GENERATE TRIP
========================================
*/

export async function generateTrip({
  days,
  budget,
  travelingWith,
  transportation,
  interests,
}) {
  const budgetRange =
    budgetRanges[budget];

  if (!budgetRange) {
    throw new Error(
      "Invalid budget selected."
    );
  }

  /*
  Get places
  */

  const places = await Place.find({
    locationPoint: {
      $exists: true,
    },
  }).lean();

  if (!places.length) {
    throw new Error(
      "No places are available for trip generation."
    );
  }

  /*
  Score places
  */

  const scoredPlaces = places
    .map((place) => ({
      place,
      score: calculatePlaceScore(
        place,
        interests,
        travelingWith
      ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score
    );

  /*
  Remove duplicates
  */

  const selectedPlaces = [];

  const usedIds = new Set();

  for (const item of scoredPlaces) {
    if (
      usedIds.has(
        item.place._id.toString()
      )
    ) {
      continue;
    }

    selectedPlaces.push(
      item.place
    );

    usedIds.add(
      item.place._id.toString()
    );

    if (
      selectedPlaces.length >=
      days *
        placesPerDay[
          transportation
        ]
    ) {
      break;
    }
  }

  /*
  ========================================
  DISTRIBUTE PLACES
  ========================================
  */

  const itinerary = [];

  let placeIndex = 0;

  let totalEstimatedCost = 0;

  for (
    let day = 1;
    day <= days;
    day++
  ) {
    const dayPlaces = [];

    const maximumPlaces =
      placesPerDay[
        transportation
      ] || 3;

    /*
    Distribute remaining places
    */

    for (
      let i = 0;
      i < maximumPlaces;
      i++
    ) {
      if (
        placeIndex >=
        selectedPlaces.length
      ) {
        break;
      }

      const place =
        selectedPlaces[
          placeIndex
        ];

      /*
      Budget check
      */

      const currentCost =
        place.estimatedCost || 0;

      if (
        totalEstimatedCost +
          currentCost <=
        budgetRange.max
      ) {
        dayPlaces.push(
          place
        );

        totalEstimatedCost +=
          currentCost;
      }

      placeIndex++;
    }

    /*
    ========================================
    DAY TITLE
    ========================================
    */

    const categories =
      dayPlaces.flatMap(
        (place) =>
          place.category || []
      );

    const uniqueCategories = [
      ...new Set(categories),
    ];

    const title =
      uniqueCategories.length
        ? uniqueCategories
            .slice(0, 2)
            .join(" + ")
        : "Bharatpur Exploration";

    /*
    ========================================
    TIMES
    ========================================
    */

    let currentMinutes =
      8 * 60;

    const itineraryPlaces =
      dayPlaces.map((place) => {
        const visitMinutes =
          Math.max(
            place.estimatedVisitMinutes ||
              60,
            30
          );

        const startTime =
          formatTime(
            currentMinutes
          );

        const endTime =
          formatTime(
            currentMinutes +
              visitMinutes
          );

        currentMinutes +=
          visitMinutes + 30;

        return {
          placeId:
            place._id,

          startTime,

          endTime,

          activity:
            `Explore ${place.name}`,

          estimatedCost:
            place.estimatedCost ||
            0,
        };
      });

    const estimatedDailyCost =
      itineraryPlaces.reduce(
        (sum, item) =>
          sum +
          Number(
            item.estimatedCost ||
              0
          ),
        0
      );

    itinerary.push({
      day,

      title,

      places:
        itineraryPlaces,

      estimatedDailyCost,
    });
  }

  /*
  ========================================
  RETURN
  ========================================
  */

  return {
    days,

    budget,

    travelingWith,

    transportation,

    interests,

    itinerary,

    totalEstimatedCost,
  };
}

/*
========================================
TIME FORMAT
========================================
*/

function formatTime(totalMinutes) {
  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  const normalizedHours =
    hours % 24;

  const suffix =
    normalizedHours >= 12
      ? "PM"
      : "AM";

  const displayHour =
    normalizedHours % 12 || 12;

  return `${String(
    displayHour
  ).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")} ${suffix}`;
}