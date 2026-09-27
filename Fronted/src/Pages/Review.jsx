import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useAuth,
} from "@clerk/react";

import {
  getGeneratedTrips,
  getTripReviews,
  getPublicTripReviews,
  submitTripReview,
} from "../lib/api";


/*
|--------------------------------------------------------------------------
| STAR RATING
|--------------------------------------------------------------------------
*/

function StarRating({
  rating,
  onChange,
  size = "text-2xl",
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`${size} transition duration-150 hover:scale-110 ${star <= rating
              ? "text-[#f4b942]"
              : "text-[#d9dfdc]"
            }`}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}


/*
|--------------------------------------------------------------------------
| PUBLIC REVIEW CARD
|--------------------------------------------------------------------------
*/

function PublicReviewCard({ item }) {
  const trip = item?.tripId;

  const days =
    trip?.preferences?.days ||
    0;

  const travelingWith =
    trip?.preferences?.travelingWith ||
    "Traveler";

  const rating =
    Number(item?.rating) || 0;

  const date = item?.createdAt
    ? new Date(item.createdAt).toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    )
    : "";

  /*
   * We don't currently store the reviewer's display
   * name in TripReview, so use a friendly anonymous
   * label instead of exposing a Clerk user ID.
   */
  const reviewerName =
    item?.reviewerName ||
    "Bharatpur AI Traveler";

  return (
    <article className="rounded-2xl border border-[#e5ebe8] bg-white p-4 transition hover:border-[#cfdcd7] hover:shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f3ef] text-sm font-extrabold text-[#187967]">
            {reviewerName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-bold text-[#243d36]">
              {reviewerName}
            </p>

            <p className="text-xs text-[#8a9692]">
              {date}
            </p>

          </div>

        </div>

        <div className="shrink-0 text-sm font-bold text-[#187967]">
          {rating.toFixed(1)}
        </div>

      </div>


      <div className="mt-3">
        <StarRating
          rating={rating}
          onChange={() => { }}
          size="text-base"
        />
      </div>


      {item?.review && (
        <p className="mt-3 text-sm leading-6 text-[#596b67]">
          "{item.review}"
        </p>
      )}


      {trip && (
        <div className="mt-4 flex flex-wrap gap-2">

          <span className="rounded-full bg-[#eef6f3] px-3 py-1 text-[11px] font-bold text-[#187967]">
            {days} day
            {days !== 1 ? "s" : ""}
          </span>

          <span className="rounded-full bg-[#f5f7f6] px-3 py-1 text-[11px] font-semibold text-[#65736f]">
            {travelingWith}
          </span>

        </div>
      )}

    </article>
  );
}


/*
|--------------------------------------------------------------------------
| REVIEW PAGE
|--------------------------------------------------------------------------
*/

function Review() {

  const navigate = useNavigate();

  const { tripId } = useParams();

  const {
    isLoaded,
    isSignedIn,
    getToken,
  } = useAuth();


  const [trips, setTrips] =
    useState([]);

  const [reviews, setReviews] =
    useState({});

  const [publicReviews, setPublicReviews] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [publicReviewsLoading, setPublicReviewsLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState(null);

  const [error, setError] =
    useState("");

  /*
   * Which trip card is currently expanded.
   */
  const [expandedTrip, setExpandedTrip] =
    useState(tripId || null);


  /*
  |--------------------------------------------------------------------------
  | LOAD USER DATA
  |--------------------------------------------------------------------------
  */

  const loadData = useCallback(
    async () => {

      try {

        if (!isLoaded) {
          return;
        }

        if (!isSignedIn) {
          setTrips([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        const token =
          await getToken();

        if (!token) {
          throw new Error(
            "Authentication token is unavailable."
          );
        }


        /*
        |--------------------------------------------------------------------------
        | GENERATED TRIPS
        |--------------------------------------------------------------------------
        */

        const tripResult =
          await getGeneratedTrips(token);

        const tripData =
          Array.isArray(tripResult)
            ? tripResult
            : tripResult?.trips || [];

        setTrips(tripData);


        /*
        |--------------------------------------------------------------------------
        | CURRENT USER'S REVIEWS
        |--------------------------------------------------------------------------
        */

        const reviewResult =
          await getTripReviews(token);

        const reviewData =
          Array.isArray(reviewResult)
            ? reviewResult
            : reviewResult?.reviews || [];


        const reviewMap = {};

        reviewData.forEach((item) => {

          if (item?.tripId?._id) {

            reviewMap[item.tripId._id] = {
              rating:
                item.rating || 0,

              review:
                item.review || "",
            };

          }

        });

        setReviews(reviewMap);

      } catch (err) {

        console.error(
          "Failed to load review data:",
          err
        );

        setError(
          err?.message ||
          "Unable to load your generated trips."
        );

      } finally {

        setLoading(false);

      }

    },
    [
      isLoaded,
      isSignedIn,
      getToken,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | LOAD PUBLIC REVIEWS
  |--------------------------------------------------------------------------
  */

  const loadPublicReviews =
    useCallback(
      async () => {

        try {

          setPublicReviewsLoading(true);

          const result =
            await getPublicTripReviews();

          const data =
            Array.isArray(result)
              ? result
              : result?.reviews || [];

          setPublicReviews(data);

        } catch (error) {

          console.error(
            "Failed to load public reviews:",
            error
          );

        } finally {

          setPublicReviewsLoading(false);

        }

      },
      []
    );


  useEffect(() => {
    loadData();
  }, [loadData]);


  useEffect(() => {
    loadPublicReviews();
  }, [loadPublicReviews]);


  /*
  |--------------------------------------------------------------------------
  | UPDATE RATING
  |--------------------------------------------------------------------------
  */

  const updateRating = (
    currentTripId,
    rating
  ) => {

    setReviews((current) => ({
      ...current,

      [currentTripId]: {
        ...(current[currentTripId] || {}),
        rating,
      },
    }));

  };


  /*
  |--------------------------------------------------------------------------
  | UPDATE REVIEW TEXT
  |--------------------------------------------------------------------------
  */

  const updateReview = (
    currentTripId,
    text
  ) => {

    setReviews((current) => ({
      ...current,

      [currentTripId]: {
        ...(current[currentTripId] || {}),
        review: text,
      },
    }));

  };


  /*
  |--------------------------------------------------------------------------
  | SUBMIT REVIEW
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (trip) => {

    const currentTripId =
      trip?._id;

    const currentReview =
      reviews[currentTripId] || {};


    if (!currentReview.rating) {

      alert(
        "Please select a star rating."
      );

      return;
    }


    if (!currentReview.review?.trim()) {

      alert(
        "Please write your review."
      );

      return;
    }


    try {

      setSavingId(currentTripId);

      const token =
        await getToken();

      if (!token) {
        throw new Error(
          "Authentication token is unavailable."
        );
      }


      await submitTripReview(
        currentTripId,
        currentReview.rating,
        currentReview.review,
        token
      );


      /*
       * Refresh both user data and
       * public reviews.
       */
      await Promise.all([
        loadData(),
        loadPublicReviews(),
      ]);

    } catch (err) {

      console.error(
        "Failed to save review:",
        err
      );

      alert(
        err?.message ||
        "Unable to save your review."
      );

    } finally {

      setSavingId(null);

    }

  };


  /*
  |--------------------------------------------------------------------------
  | TOGGLE TRIP
  |--------------------------------------------------------------------------
  */

  const toggleTrip = (id) => {

    setExpandedTrip((current) =>
      current === id
        ? null
        : id
    );

  };


  /*
  |--------------------------------------------------------------------------
  | NOT SIGNED IN
  |--------------------------------------------------------------------------
  */

  if (
    isLoaded &&
    !isSignedIn
  ) {

    return (
      <div className="min-h-screen bg-[#f5f7f5] px-5 py-16">

        <div className="mx-auto max-w-lg rounded-[28px] bg-white p-10 text-center shadow-sm ring-1 ring-[#e4eae7]">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9f2ef] text-3xl">
            ⭐
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-[#173b34]">
            Review Your Trips
          </h1>

          <p className="mt-3 text-[#71807c]">
            Please sign in to review
            your generated trips.
          </p>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-7 rounded-xl bg-[#187967] px-7 py-3 font-bold text-white transition hover:bg-[#126554]"
          >
            Go Home
          </button>

        </div>

      </div>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (
    !isLoaded ||
    loading
  ) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7f5]">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#dce4e0] border-t-[#187967]" />

          <p className="mt-4 text-sm text-[#71807c]">
            Loading your trips...
          </p>

        </div>

      </div>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const visibleTrips =
    tripId
      ? trips.filter(
        (trip) =>
          trip._id === tripId
      )
      : trips;


  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-[#f5f7f5] text-[#173b34]">

      <main className="mx-auto max-w-[1350px] px-4 py-8 sm:px-6 lg:px-8">

        {/* ------------------------------------------------------------- */}
        {/* PAGE HEADER */}
        {/* ------------------------------------------------------------- */}

        <section className="mb-8">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e8f3ef] px-3 py-1.5 text-xs font-bold text-[#187967]">
                <span>✦</span>
                COMMUNITY REVIEWS
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Share your journey
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71807c]">
                Review your AI-generated itinerary and
                discover what other Bharatpur AI travelers
                experienced.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                navigate("/plan-my-trip")
              }
              className="rounded-xl border border-[#d8e1dd] bg-white px-5 py-3 text-sm font-bold text-[#30463f] shadow-sm transition hover:border-[#187967] hover:text-[#187967]"
            >
              + Create New Trip
            </button>

          </div>

        </section>


        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}


        {/* ------------------------------------------------------------- */}
        {/* TWO COLUMN LAYOUT */}
        {/* ------------------------------------------------------------- */}

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">


          {/* =========================================================== */}
          {/* LEFT — MY TRIPS */}
          {/* =========================================================== */}

          <section>

            <div className="mb-4 flex items-center justify-between">

              <div>

                <h2 className="text-lg font-extrabold text-[#173b34]">
                  Your generated trips
                </h2>

                <p className="mt-1 text-xs text-[#87938f]">
                  Click a trip to expand its itinerary.
                </p>

              </div>

              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#687771] ring-1 ring-[#e0e7e3]">
                {visibleTrips.length} trip
                {visibleTrips.length !== 1
                  ? "s"
                  : ""}
              </span>

            </div>


            {/* NO TRIPS */}

            {visibleTrips.length === 0 && (

              <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-[#e4eae7]">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9f2ef] text-3xl">
                  🗺️
                </div>

                <h2 className="mt-5 text-xl font-extrabold">
                  No generated trips yet
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#71807c]">
                  Create a personalized trip first,
                  then come back here to share your
                  experience.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/plan-my-trip")
                  }
                  className="mt-6 rounded-xl bg-[#187967] px-6 py-3 text-sm font-bold text-white hover:bg-[#126554]"
                >
                  Plan My Trip
                </button>

              </div>

            )}


            {/* TRIP LIST */}

            <div className="space-y-3">

              {visibleTrips.map((trip) => {

                const currentReview =
                  reviews[trip._id] || {
                    rating: 0,
                    review: "",
                  };

                const isOpen =
                  expandedTrip === trip._id;

                const numberOfDays =
                  trip.preferences?.days ||
                  trip.days?.length ||
                  0;


                return (
                  <article
                    key={trip._id}
                    className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition ${isOpen
                        ? "ring-[#bdd6cd]"
                        : "ring-[#e4eae7] hover:ring-[#cfdcd7]"
                      }`}
                  >

                    {/* ------------------------------------------------ */}
                    {/* COMPACT TRIP HEADER / TOGGLE */}
                    {/* ------------------------------------------------ */}

                    <button
                      type="button"
                      onClick={() =>
                        toggleTrip(trip._id)
                      }
                      className="w-full text-left"
                    >

                      <div className="flex items-center gap-4 px-5 py-4 sm:px-6">

                        {/* ICON */}

                        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f3ef] text-xl sm:flex">
                          🗺️
                        </div>


                        {/* MAIN */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="truncate text-base font-extrabold text-[#173b34] sm:text-lg">
                              {numberOfDays} Day{" "}
                              {trip.preferences?.travelingWith ||
                                "Personalized"}{" "}
                              Trip
                            </h3>

                            {currentReview.rating > 0 && (
                              <span className="rounded-full bg-[#fff6df] px-2.5 py-1 text-[11px] font-bold text-[#a66c00]">
                                ★{" "}
                                {currentReview.rating}
                              </span>
                            )}

                          </div>


                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#83908c]">

                            <span>
                              {trip.preferences?.budget ||
                                "Flexible budget"}
                            </span>

                            <span>•</span>

                            <span>
                              {trip.createdAt
                                ? new Date(
                                  trip.createdAt
                                ).toLocaleDateString()
                                : "Recently created"}
                            </span>

                          </div>

                        </div>


                        {/* COST */}

                        {trip.estimatedCost > 0 && (
                          <div className="hidden text-right sm:block">

                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#909b97]">
                              Estimated
                            </p>

                            <p className="text-sm font-extrabold text-[#187967]">
                              Rs.{" "}
                              {Number(
                                trip.estimatedCost
                              ).toLocaleString()}
                            </p>

                          </div>
                        )}


                        {/* CHEVRON */}

                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f7f5] text-[#5f706b] transition-transform ${isOpen
                              ? "rotate-180"
                              : ""
                            }`}
                        >
                          ↓
                        </div>

                      </div>

                    </button>


                    {/* ------------------------------------------------ */}
                    {/* EXPANDED CONTENT */}
                    {/* ------------------------------------------------ */}

                    {isOpen && (

                      <div className="border-t border-[#e7ece9]">

                        {/* ITINERARY */}

                        <div className="px-5 py-5 sm:px-6">

                          <div className="mb-4 flex items-center justify-between">

                            <h4 className="text-sm font-extrabold text-[#30463f]">
                              Your itinerary
                            </h4>

                            <span className="text-xs text-[#899590]">
                              {numberOfDays} day
                              {numberOfDays !== 1
                                ? "s"
                                : ""}
                            </span>

                          </div>


                          <div className="space-y-3">

                            {trip.days?.map(
                              (day) => (

                                <div
                                  key={day.day}
                                  className="rounded-xl border border-[#e4eae7] bg-[#fbfcfb]"
                                >

                                  <div className="flex items-center justify-between px-4 py-3">

                                    <div>

                                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#187967]">
                                        Day{" "}
                                        {day.day}
                                      </p>

                                      <p className="mt-0.5 text-sm font-bold text-[#30463f]">
                                        {day.title ||
                                          "Explore Bharatpur"}
                                      </p>

                                    </div>

                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#687771] ring-1 ring-[#e0e7e3]">
                                      Rs.{" "}
                                      {Number(
                                        day.estimatedCost ||
                                        0
                                      ).toLocaleString()}
                                    </span>

                                  </div>


                                  <div className="border-t border-[#e7ece9] px-4 py-3">

                                    <div className="space-y-2">

                                      {day.places?.map(
                                        (
                                          item,
                                          index
                                        ) => {

                                          const place =
                                            item.placeId;

                                          if (!place) {
                                            return null;
                                          }


                                          return (
                                            <div
                                              key={`${day.day}-${place._id || index}`}
                                              className="flex items-start gap-3 rounded-lg bg-white p-3"
                                            >

                                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e9f3ef] text-xs font-extrabold text-[#187967]">
                                                {index +
                                                  1}
                                              </div>

                                              <div className="min-w-0 flex-1">

                                                <div className="flex flex-wrap items-center gap-2">

                                                  <p className="text-xs font-bold text-[#30463f]">
                                                    {place.name}
                                                  </p>

                                                  {item.startTime && (
                                                    <span className="text-[10px] font-bold text-[#187967]">
                                                      {item.startTime}
                                                    </span>
                                                  )}

                                                </div>

                                                {item.durationMinutes && (
                                                  <p className="mt-0.5 text-[10px] text-[#8a9692]">
                                                    {item.durationMinutes} min
                                                  </p>
                                                )}

                                                {item.reason && (
                                                  <p className="mt-1 text-[11px] leading-5 text-[#7a8883]">
                                                    {item.reason}
                                                  </p>
                                                )}

                                              </div>

                                            </div>
                                          );

                                        }
                                      )}

                                    </div>

                                  </div>

                                </div>

                              )
                            )}

                          </div>


                          {/* ------------------------------------------------ */}
                          {/* REVIEW FORM */}
                          {/* ------------------------------------------------ */}

                          <div className="mt-6 rounded-2xl bg-[#f7faf8] p-5">

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                              <div>

                                <h4 className="text-sm font-extrabold text-[#173b34]">
                                  Your experience
                                </h4>

                                <p className="mt-1 text-xs text-[#7b8984]">
                                  How was this AI-generated
                                  itinerary?
                                </p>

                              </div>

                              <StarRating
                                rating={
                                  currentReview.rating ||
                                  0
                                }
                                onChange={(rating) =>
                                  updateRating(
                                    trip._id,
                                    rating
                                  )
                                }
                              />

                            </div>


                            <textarea
                              value={
                                currentReview.review ||
                                ""
                              }
                              onChange={(e) =>
                                updateReview(
                                  trip._id,
                                  e.target.value
                                )
                              }
                              placeholder="Tell other travelers about your experience..."
                              rows={4}
                              maxLength={2000}
                              className="mt-4 w-full resize-none rounded-xl border border-[#dce5e1] bg-white px-4 py-3 text-sm text-[#30463f] outline-none transition placeholder:text-[#a0aaa6] focus:border-[#187967] focus:ring-2 focus:ring-[#187967]/10"
                            />


                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                              <span className="text-[11px] text-[#8b9793]">
                                {
                                  (
                                    currentReview.review ||
                                    ""
                                  ).length
                                }
                                /2000
                              </span>


                              <button
                                type="button"
                                onClick={() =>
                                  handleSubmit(
                                    trip
                                  )
                                }
                                disabled={
                                  savingId ===
                                  trip._id
                                }
                                className="rounded-xl bg-[#187967] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#126554] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingId ===
                                  trip._id
                                  ? "Saving..."
                                  : currentReview.rating
                                    ? "Update Review"
                                    : "Publish Review"}
                              </button>

                            </div>

                          </div>

                        </div>

                      </div>

                    )}

                  </article>
                );

              })}

            </div>

          </section>


          {/* =========================================================== */}
          {/* RIGHT — COMMUNITY REVIEWS */}
          {/* =========================================================== */}

          <aside>

            <div className="sticky top-24">

              {/* SIDEBAR HEADER */}

              <div className="mb-4 flex items-end justify-between">

                <div>

                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#187967]">
                    Community
                  </p>

                  <h2 className="mt-1 text-xl font-extrabold text-[#173b34]">
                    Traveler reviews
                  </h2>

                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f3ef]">
                  💬
                </div>

              </div>


              {/* REVIEW SIDEBAR */}

              <div className="max-h-[calc(100vh-190px)] space-y-3 overflow-y-auto pr-1">

                {publicReviewsLoading && (

                  <>
                    {[1, 2, 3].map((item) => (

                      <div
                        key={item}
                        className="animate-pulse rounded-2xl bg-white p-4 ring-1 ring-[#e4eae7]"
                      >

                        <div className="flex gap-3">

                          <div className="h-10 w-10 rounded-full bg-[#e8eeeb]" />

                          <div className="flex-1">

                            <div className="h-3 w-28 rounded bg-[#e8eeeb]" />

                            <div className="mt-2 h-2 w-16 rounded bg-[#edf1ef]" />

                          </div>

                        </div>

                        <div className="mt-4 h-12 rounded bg-[#f1f4f2]" />

                      </div>

                    ))}
                  </>

                )}


                {!publicReviewsLoading &&
                  publicReviews.length === 0 && (

                    <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-[#e4eae7]">

                      <div className="text-2xl">
                        💬
                      </div>

                      <p className="mt-3 text-sm font-bold text-[#30463f]">
                        No reviews yet
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#899590]">
                        Be the first traveler to
                        share an experience.
                      </p>

                    </div>

                  )}


                {!publicReviewsLoading &&
                  publicReviews.map(
                    (item, index) => (

                      <PublicReviewCard
                        key={
                          item._id ||
                          index
                        }
                        item={item}
                      />

                    )
                  )}

              </div>

            </div>

          </aside>

        </div>

      </main>

    </div>
  );
}


export default Review;