import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { generateMyTrip } from "../lib/api";

/* =========================================================
   ICONS
========================================================= */

const ChevronDown = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const WalletIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20v14H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" />
    <path d="M3 8h17" />
    <path d="M16 12h4v4h-4a2 2 0 1 1 0-4Z" />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CarIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 17h14" />
    <path d="m5 17-1-5 2-5h12l2 5-1 5" />
    <path d="M6 7l1.5-3h9L18 7" />
    <circle cx="7" cy="17" r="1.5" />
    <circle cx="17" cy="17" r="1.5" />
  </svg>
);

const SparklesIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 3-1.2 4.1a4 4 0 0 1-2.7 2.7L4 11l4.1 1.2a4 4 0 0 1 2.7 2.7L12 19l1.2-4.1a4 4 0 0 1 2.7-2.7L20 11l-4.1-1.2a4 4 0 0 1-2.7-2.7L12 3Z" />
    <path d="m19 4-.5 1.5L17 6l1.5.5L19 8l.5-1.5L21 6l-1.5-.5L19 4Z" />
  </svg>
);

const MapIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
    <path d="M9 3v15M15 6v15" />
  </svg>
);

const StarIcon = () => (
  <svg
    className="h-3.5 w-3.5 fill-current"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.8Z" />
  </svg>
);

const ArrowRight = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const LocationIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

/* =========================================================
   DATA
========================================================= */

const options = {
  days: [
    "1 day",
    "2 days",
    "3 days",
    "4 days",
    "5 days",
    "6 days",
    "7 days",
  ],

  budget: [
    "Rs. 2,000 – 5,000",
    "Rs. 5,000 – 10,000",
    "Rs. 10,000 – 20,000",
    "Rs. 20,000+",
  ],

  traveling: [
    "Solo",
    "Couple",
    "Family",
    "Friends",
  ],

  transportation: [
    "Walking",
    "Bicycle",
    "Bus",
    "Car/Taxi",
  ],
};

const interestOptions = [
  "Nature",
  "Wildlife",
  "Food",
  "Culture",
  "Adventure",
];

/* =========================================================
   HELPERS
========================================================= */

function formatDays(days) {
  return Number(String(days).split(" ")[0]);
}

function getBudgetRange(budget) {
  const numbers = budget.match(/[\d,]+/g);

  if (!numbers?.length) {
    return {
      min: 0,
      max: 0,
    };
  }

  const parsed = numbers.map((value) =>
    Number(value.replace(/,/g, ""))
  );

  if (budget.includes("+")) {
    return {
      min: parsed[0] || 0,
      max: 0,
    };
  }

  return {
    min: parsed[0] || 0,
    max: parsed[1] || 0,
  };
}

/* =========================================================
   SELECT BOX
========================================================= */

function SelectBox({
  label,
  value,
  onChange,
  items = [],
  icon,
}) {
  return (
    <div>
      <label className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#71807c]">
        {icon && (
          <span className="text-[#187967]">
            {icon}
          </span>
        )}
        {label}
      </label>

      <div className="group relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border border-[#e1e8e5] bg-[#fbfcfb] px-4 py-3.5 pr-11 text-[14px] font-semibold text-[#263f38] outline-none transition hover:border-[#c7d9d3] focus:border-[#187967] focus:bg-white focus:ring-4 focus:ring-[#187967]/[0.08]"
        >
          {items.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#71807c] transition group-focus-within:text-[#187967]">
          <ChevronDown />
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function ItinerarySkeleton() {
  return (
    <div
      className="animate-pulse space-y-5"
      aria-label="Generating itinerary"
    >
      {[1, 2].map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-[#e5ebe8] p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-14 rounded bg-[#e8eeeb]" />
              <div className="h-5 w-36 rounded bg-[#e8eeeb]" />
            </div>

            <div className="h-7 w-20 rounded-full bg-[#e8eeeb]" />
          </div>

          <div className="mt-6 space-y-5">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="flex gap-4"
              >
                <div className="w-14 shrink-0 space-y-2">
                  <div className="h-3 w-10 rounded bg-[#e8eeeb]" />
                  <div className="h-2.5 w-12 rounded bg-[#eef2f0]" />
                </div>

                <div className="flex-1 space-y-2 border-l border-[#edf1ef] pl-4">
                  <div className="h-4 w-32 rounded bg-[#e8eeeb]" />
                  <div className="h-3 w-full max-w-md rounded bg-[#eef2f0]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */

function Planmytrip() {
  const navigate = useNavigate();

  const {
    isLoaded,
    isSignedIn,
    getToken,
  } = useAuth();

  const [days, setDays] =
    useState("2 days");

  const [budget, setBudget] =
    useState("Rs. 5,000 – 10,000");

  const [traveling, setTraveling] =
    useState("Family");

  const [transportation, setTransportation] =
    useState("Car/Taxi");

  const [interests, setInterests] =
    useState([
      "Nature",
      "Wildlife",
      "Food",
      "Culture",
      "Adventure",
    ]);

  const [itinerary, setItinerary] =
    useState([]);

  const [totalCost, setTotalCost] =
    useState(0);

  const [generatedTripId, setGeneratedTripId] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const toggleInterest = (interest) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter(
          (item) => item !== interest
        )
        : [...current, interest]
    );
  };

  const handleGenerateTrip = async () => {
    setError("");

    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setError(
        "Please sign in before generating your trip."
      );
      return;
    }

    if (interests.length === 0) {
      setError(
        "Please select at least one interest."
      );
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        throw new Error(
          "Authentication token could not be created."
        );
      }

      const budgetRange =
        getBudgetRange(budget);

      const preferences = {
        days: formatDays(days),
        budget,
        budgetMin: budgetRange.min,
        budgetMax: budgetRange.max,
        travelingWith: traveling,
        transportation,
        interests,
      };

      const result =
        await generateMyTrip(
          preferences,
          token
        );

      const generatedTrip =
        result?.trip;

      if (!generatedTrip) {
        throw new Error(
          "Trip generation returned no itinerary."
        );
      }

      setGeneratedTripId(
        generatedTrip._id || null
      );

      setItinerary(
        Array.isArray(
          generatedTrip.days
        )
          ? generatedTrip.days
          : []
      );

      setTotalCost(
        Number(
          generatedTrip.estimatedCost
        ) || 0
      );
    } catch (err) {
      setError(
        err?.message ||
        "Unable to generate your trip."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewMap = () => {
    if (!generatedTripId) {
      return;
    }

    /*
      Your map page can later receive
      generatedTripId and display all
      itinerary destinations.
    */

    navigate(
      `/places/itinerary/map?trip=${generatedTripId}`
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f8f6] text-[#173b34]">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <main className="mx-auto max-w-[1380px] px-4 pb-12 pt-7 sm:px-6 md:px-8 md:pt-10">

        <section className="mb-8">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div className="max-w-2xl">

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d7e7e1] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#187967] shadow-sm">
                <SparklesIcon />
                AI Trip Planner
              </div>

              <h1 className="text-[34px] font-extrabold leading-[1.08] tracking-[-1.5px] text-[#173b34] sm:text-[42px] md:text-[48px]">
                Build your perfect
                <span className="text-[#187967]">
                  {" "}Bharatpur trip.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#71807c] sm:text-[16px]">
                Tell Bharatpur AI how you
                want to travel. We’ll turn
                your preferences into a
                practical day-by-day itinerary.
              </p>

            </div>

            {/* STATUS */}

            <div className="hidden rounded-2xl border border-[#dce8e3] bg-white px-5 py-4 shadow-[0_4px_20px_rgba(20,50,40,0.03)] md:block">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9f2ef] text-[#187967]">
                  <SparklesIcon />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#89938f]">
                    Planning mode
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-[#30463f]">
                    Personalized itinerary
                  </p>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700"
          >
            <span className="mt-0.5 font-bold">
              !
            </span>

            <p>{error}</p>
          </div>
        )}

        {/* =====================================================
            MAIN GRID
        ===================================================== */}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">

          {/* ===================================================
              LEFT — PREFERENCES
          =================================================== */}

          <aside className="rounded-[24px] border border-[#e2e9e6] bg-white p-5 shadow-[0_8px_30px_rgba(20,50,40,0.035)] sm:p-6">

            <div className="mb-6">

              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8a9692]">
                Step 1
              </p>

              <h2 className="mt-1.5 text-[22px] font-extrabold tracking-[-0.5px] text-[#173b34]">
                Your preferences
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#7b8884]">
                Customize the trip around
                your time, budget and interests.
              </p>

            </div>

            <div className="space-y-5">

              <SelectBox
                label="Trip duration"
                value={days}
                onChange={setDays}
                items={options.days}
                icon={<CalendarIcon />}
              />

              <SelectBox
                label="Budget"
                value={budget}
                onChange={setBudget}
                items={options.budget}
                icon={<WalletIcon />}
              />

              <SelectBox
                label="Traveling with"
                value={traveling}
                onChange={setTraveling}
                items={options.traveling}
                icon={<UsersIcon />}
              />

              <SelectBox
                label="Transportation"
                value={transportation}
                onChange={setTransportation}
                items={options.transportation}
                icon={<CarIcon />}
              />

            </div>

            {/* INTERESTS */}

            <div className="mt-7 border-t border-[#edf1ef] pt-6">

              <div className="mb-3 flex items-end justify-between">

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#71807c]">
                    Interests
                  </label>

                  <p className="mt-1 text-xs text-[#89938f]">
                    Choose everything you enjoy
                  </p>
                </div>

                <span className="text-xs font-bold text-[#187967]">
                  {interests.length}/
                  {interestOptions.length}
                </span>

              </div>

              <div className="flex flex-wrap gap-2">

                {interestOptions.map(
                  (interest) => {
                    const active =
                      interests.includes(
                        interest
                      );

                    return (
                      <button
                        key={interest}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          toggleInterest(
                            interest
                          )
                        }
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-bold transition focus:outline-none focus:ring-4 focus:ring-[#187967]/10 ${active
                            ? "border-[#b9d8cf] bg-[#e9f2ef] text-[#187967]"
                            : "border-[#e1e8e5] bg-white text-[#64736e] hover:border-[#c8d9d3] hover:bg-[#f7faf8]"
                          }`}
                      >
                        {active && (
                          <CheckIcon />
                        )}

                        {interest}
                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* SUMMARY */}

            <div className="mt-7 rounded-2xl bg-[#f6f9f7] p-4">

              <div className="flex items-center justify-between">

                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71807c]">
                  Trip summary
                </p>

                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#187967] shadow-sm">
                  Ready
                </span>

              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[#89938f]">
                    Duration
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#30463f]">
                    {days}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[#89938f]">
                    Travelers
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#30463f]">
                    {traveling}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[#89938f]">
                    Budget
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#30463f]">
                    {budget.replace(
                      "Rs. ",
                      ""
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[#89938f]">
                    Transport
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#30463f]">
                    {transportation}
                  </p>
                </div>

              </div>

            </div>

          </aside>

          {/* ===================================================
              RIGHT — ITINERARY
          =================================================== */}

          <section className="flex min-h-[650px] flex-col rounded-[24px] border border-[#e2e9e6] bg-white shadow-[0_8px_30px_rgba(20,50,40,0.035)]">

            {/* HEADER */}

            <div className="border-b border-[#edf1ef] px-5 py-5 sm:px-7">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                <div>

                  <div className="flex items-center gap-2">

                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e9f2ef] text-[#187967]">
                      <SparklesIcon />
                    </span>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#89938f]">
                        Step 2
                      </p>

                      <h2 className="text-[21px] font-extrabold tracking-[-0.4px] text-[#173b34]">
                        Your AI itinerary
                      </h2>
                    </div>

                  </div>

                  <p className="mt-2 text-sm text-[#7b8884]">
                    {loading
                      ? "Our AI is planning your journey..."
                      : itinerary.length
                        ? `${itinerary.length} days planned around your preferences`
                        : "Your personalized itinerary will appear here"}
                  </p>

                </div>

                {totalCost > 0 && (
                  <div className="rounded-xl border border-[#d5e7e0] bg-[#f4faf7] px-4 py-3">

                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a8984]">
                      Estimated trip cost
                    </p>

                    <p className="mt-0.5 text-xl font-extrabold tracking-[-0.5px] text-[#187967]">
                      Rs.{" "}
                      {totalCost.toLocaleString()}
                    </p>

                  </div>
                )}

              </div>

            </div>

            {/* BODY */}

            <div className="flex-1 px-5 py-5 sm:px-7">

              {loading ? (
                <ItinerarySkeleton />
              ) : itinerary.length === 0 ? (

                <div className="flex min-h-[450px] items-center justify-center">

                  <div className="max-w-md text-center">

                    <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">

                      <div className="absolute inset-0 rounded-full bg-[#e9f2ef]" />

                      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#187967] text-white shadow-lg shadow-[#187967]/20">
                        <SparklesIcon />
                      </div>

                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#187967]">
                      Ready when you are
                    </p>

                    <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.6px] text-[#173b34]">
                      Your Bharatpur adventure
                      starts here.
                    </h3>

                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#7b8884]">
                      Select your preferences on
                      the left and let Bharatpur AI
                      create a personalized itinerary
                      for you.
                    </p>

                  </div>

                </div>

              ) : (

                <div className="space-y-5">

                  {itinerary.map((day) => (

                    <article
                      key={day.day}
                      className="overflow-hidden rounded-2xl border border-[#e3e9e6] bg-white"
                    >

                      {/* DAY HEADER */}

                      <div className="flex flex-col justify-between gap-4 bg-[#f7faf8] px-5 py-4 sm:flex-row sm:items-center">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#187967] text-xs font-extrabold text-white">
                            {String(day.day).padStart(
                              2,
                              "0"
                            )}
                          </div>

                          <div>

                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8b86]">
                              Day {day.day}
                            </p>

                            <h3 className="mt-0.5 text-base font-extrabold text-[#30463f]">
                              {day.title ||
                                `Explore Bharatpur — Day ${day.day}`}
                            </h3>

                          </div>

                        </div>

                        <div className="flex items-center gap-3">

                          <span className="hidden text-[11px] font-semibold text-[#89938f] sm:block">
                            Day budget
                          </span>

                          <span className="rounded-full border border-[#d9e5e0] bg-white px-3 py-1.5 text-xs font-bold text-[#187967]">
                            Rs.{" "}
                            {Number(
                              day.estimatedCost ||
                              0
                            ).toLocaleString()}
                          </span>

                        </div>

                      </div>

                      {/* PLACES */}

                      <div className="px-5 py-5">

                        {day.places?.length ? (
                          <div className="space-y-0">

                            {day.places.map(
                              (
                                item,
                                index
                              ) => {

                                const place =
                                  item.placeId;

                                if (!place) {
                                  return null;
                                }

                                const isLast =
                                  index ===
                                  day.places
                                    .length -
                                  1;

                                return (
                                  <div
                                    key={`${day.day}-${place._id || index}`}
                                    className="relative flex gap-4"
                                  >

                                    {/* TIME */}

                                    <div className="w-[62px] shrink-0 pt-0.5">

                                      <p className="text-xs font-extrabold text-[#187967]">
                                        {item.startTime ||
                                          "--:--"}
                                      </p>

                                      {item.durationMinutes && (
                                        <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[#929d99]">
                                          <ClockIcon />
                                          {
                                            item.durationMinutes
                                          }{" "}
                                          min
                                        </p>
                                      )}

                                    </div>

                                    {/* TIMELINE */}

                                    <div className="relative flex-1 pb-6">

                                      <span className="absolute left-[-25px] top-1.5 h-3 w-3 rounded-full border-[3px] border-[#d7ebe4] bg-[#187967]" />

                                      {!isLast && (
                                        <span className="absolute left-[-19px] top-4 h-[calc(100%-8px)] w-px bg-[#dfe9e5]" />
                                      )}

                                      <div className="rounded-xl border border-transparent px-3 py-2 transition hover:border-[#e4ebe8] hover:bg-[#fafcfb]">

                                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">

                                          <div className="min-w-0">

                                            <h4 className="text-[14px] font-extrabold text-[#30463f]">
                                              {place.name}
                                            </h4>

                                            {item.reason && (
                                              <p className="mt-1 text-xs leading-5 text-[#7b8884]">
                                                {
                                                  item.reason
                                                }
                                              </p>
                                            )}

                                            {place.location && (
                                              <p className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-[#929d99]">
                                                <LocationIcon />
                                                <span className="truncate">
                                                  {
                                                    place.location
                                                  }
                                                </span>
                                              </p>
                                            )}

                                          </div>

                                          {item.estimatedCost >
                                            0 && (
                                              <span className="shrink-0 text-xs font-bold text-[#64736e]">
                                                Rs.{" "}
                                                {Number(
                                                  item.estimatedCost
                                                ).toLocaleString()}
                                              </span>
                                            )}

                                        </div>

                                      </div>

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>
                        ) : (

                          <p className="text-sm text-[#89938f]">
                            No destinations were added
                            for this day.
                          </p>

                        )}

                      </div>

                    </article>

                  ))}

                </div>

              )}

            </div>

            {/* FOOTER ACTIONS */}

            <div className="border-t border-[#edf1ef] bg-[#fcfdfc] px-5 py-5 sm:px-7">

              <div className="flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={handleGenerateTrip}
                  disabled={
                    loading ||
                    !isLoaded
                  }
                  className="group flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#187967] px-5 text-[13px] font-bold text-white shadow-[0_5px_15px_rgba(24,121,103,0.15)] transition hover:bg-[#126554] hover:shadow-[0_7px_20px_rgba(24,121,103,0.2)] focus:outline-none focus:ring-4 focus:ring-[#187967]/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generating itinerary...
                    </>
                  ) : (
                    <>
                      <SparklesIcon />
                      {itinerary.length
                        ? "Regenerate Trip"
                        : "Generate My Trip"}
                      <ArrowRight />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleViewMap}
                  disabled={
                    !generatedTripId ||
                    loading
                  }
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#d7e1dd] bg-white px-5 text-[13px] font-bold text-[#30463f] transition hover:border-[#bcd1c9] hover:bg-[#f5f9f7] focus:outline-none focus:ring-4 focus:ring-[#187967]/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <MapIcon />
                  View on Map
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      generatedTripId
                        ? `/review/${generatedTripId}`
                        : "/review"
                    )
                  }
                  disabled={!generatedTripId}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#b9d8cf] bg-[#e9f2ef] px-5 text-[13px] font-bold text-[#187967] transition hover:bg-[#dcece7] focus:outline-none focus:ring-4 focus:ring-[#187967]/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <StarIcon />
                  Review Trip
                </button>

              </div>

              <p className="mt-3 text-center text-[10px] text-[#9aa49f]">
                AI-generated recommendations are
                estimates. Review places and costs
                before traveling.
              </p>

            </div>

          </section>

        </section>

        {/* =====================================================
            FOOTNOTE
        ===================================================== */}

        <div className="mt-6 flex flex-col justify-between gap-2 px-1 text-[11px] text-[#9aa49f] sm:flex-row">

          <p>
            Bharatpur AI · Personalized tourism
            planning
          </p>

          <p>
            Built around your preferences
          </p>

        </div>

      </main>
    </div>
  );
}

export default Planmytrip;