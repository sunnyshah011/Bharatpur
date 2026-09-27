import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  resolvePlace,
  addMyTrip,
} from "../lib/api";

import { useAuth } from "@clerk/react";

import {
  Search,
  MapPin,
  Star,
  X,
  Navigation,
  Plus,
  Check,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
} from "lucide-react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import placesData from "../data/places.json";


const CATEGORIES = [
  "All",
  "Nature",
  "Wildlife",
  "Culture",
  "Food",
  "Homestays",
  "Events",
  "Hidden Places",
];


const normalizeCategories = (category) => {
  if (Array.isArray(category)) {
    return category.filter(Boolean);
  }

  if (typeof category === "string" && category.trim()) {
    return [category.trim()];
  }

  return [];
};


const getPlaceKey = (place) => {
  return place?.id || place?._id || place?.slug || place?.name;
};


const Explore = () => {
  /* =====================================================
     CLERK AUTH
  ===================================================== */

  const {
    isLoaded,
    isSignedIn,
    getToken,
  } = useAuth();


  const navigate = useNavigate();


  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();


  /* =====================================================
     STATES
  ===================================================== */

  const [
    search,
    setSearch,
  ] = useState(
    searchParams.get("search") || ""
  );


  const [
    resolvingPlaceId,
    setResolvingPlaceId,
  ] = useState(null);


  const [
    activeCategory,
    setActiveCategory,
  ] = useState(
    searchParams.get("category") || "All"
  );


  const [
    selectedPlace,
    setSelectedPlace,
  ] = useState(null);


  const [
    showFilters,
    setShowFilters,
  ] = useState(false);


  const [
    addedPlaceId,
    setAddedPlaceId,
  ] = useState(null);


  const [
    addingPlaceId,
    setAddingPlaceId,
  ] = useState(null);


  /* =====================================================
     ESCAPE KEY FOR MODAL
  ===================================================== */

  useEffect(() => {
    if (!selectedPlace) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedPlace(null);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedPlace]);


  /* =====================================================
     BODY SCROLL LOCK
  ===================================================== */

  useEffect(() => {
    if (!selectedPlace) {
      return undefined;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [selectedPlace]);


  /* =====================================================
     SYNC URL → STATE
  ===================================================== */

  useEffect(() => {
    const category =
      searchParams.get("category");

    const searchQuery =
      searchParams.get("search");


    setActiveCategory(
      category || "All"
    );


    setSearch(
      searchQuery || ""
    );
  }, [searchParams]);


  /* =====================================================
     FILTER PLACES
  ===================================================== */

  const filteredPlaces = useMemo(() => {
    const places =
      Array.isArray(placesData?.places)
        ? placesData.places
        : [];


    const searchText =
      search.trim().toLowerCase();


    return places.filter((place) => {
      const categories =
        normalizeCategories(
          place.category
        );


      const matchesSearch =
        !searchText ||
        String(place.name || "")
          .toLowerCase()
          .includes(searchText) ||

        String(place.description || "")
          .toLowerCase()
          .includes(searchText) ||

        String(place.location || "")
          .toLowerCase()
          .includes(searchText) ||

        categories.some(
          (category) =>
            category
              .toLowerCase()
              .includes(searchText)
        );


      const matchesCategory =
        activeCategory === "All" ||
        categories.some(
          (category) =>
            category.toLowerCase() ===
            activeCategory.toLowerCase()
        );


      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    search,
    activeCategory,
  ]);


  /* =====================================================
     UPDATE CATEGORY
  ===================================================== */

  const handleCategoryChange = (
    category
  ) => {
    setActiveCategory(
      category
    );


    const nextParams =
      new URLSearchParams(
        searchParams
      );


    if (category === "All") {
      nextParams.delete(
        "category"
      );
    } else {
      nextParams.set(
        "category",
        category
      );
    }


    setSearchParams(
      nextParams
    );


    setShowFilters(false);
  };


  /* =====================================================
     UPDATE SEARCH
  ===================================================== */

  const handleSearchChange = (
    value
  ) => {
    setSearch(
      value
    );


    const nextParams =
      new URLSearchParams(
        searchParams
      );


    if (value.trim()) {
      nextParams.set(
        "search",
        value
      );
    } else {
      nextParams.delete(
        "search"
      );
    }


    setSearchParams(
      nextParams
    );
  };


  /* =====================================================
     CLEAR FILTERS
  ===================================================== */

  const clearFilters = () => {
    setSearch("");
    setActiveCategory("All");
    setSearchParams({});
  };


  /* =====================================================
     ADD PLACE TO MY TRIP
  ===================================================== */

  const addToMyTrip = async (
    place
  ) => {
    try {
      if (!isLoaded) {
        return;
      }


      if (!isSignedIn) {
        alert(
          "Please sign in before adding a place to My Trip."
        );

        return;
      }


      if (!place) {
        throw new Error(
          "Place information is missing."
        );
      }


      const placeKey =
        getPlaceKey(place);


      setAddingPlaceId(
        placeKey
      );


      const token =
        await getToken();


      if (!token) {
        throw new Error(
          "Authentication token could not be created."
        );
      }


      const result =
        await resolvePlace(
          place.name,
          token
        );


      const resolved =
        result?.place;


      if (!resolved?._id) {
        throw new Error(
          "Place could not be resolved in the database."
        );
      }


      await addMyTrip(
        resolved._id,
        token
      );


      setAddedPlaceId(
        placeKey
      );

    } catch (error) {
      const message =
        error?.message ||
        "Unable to add this place to My Trip.";


      if (
        message
          .toLowerCase()
          .includes("already")
      ) {
        setAddedPlaceId(
          getPlaceKey(place)
        );

        return;
      }


      alert(message);

    } finally {
      setAddingPlaceId(null);
    }
  };


  /* =====================================================
     OPEN DIRECTIONS
  ===================================================== */

  const openDirections = async (
    place
  ) => {
    try {
      if (!isLoaded) {
        alert(
          "Google Maps is still loading. Please try again."
        );

        return;
      }


      if (!isSignedIn) {
        alert(
          "Please sign in before using directions."
        );

        return;
      }


      if (!place?.name) {
        throw new Error(
          "Place information is missing."
        );
      }


      const placeKey =
        getPlaceKey(place);


      setResolvingPlaceId(
        placeKey
      );


      const token =
        await getToken();


      if (!token) {
        throw new Error(
          "Authentication token could not be created."
        );
      }


      const result =
        await resolvePlace(
          place.name,
          token
        );


      const resolved =
        result?.place;


      if (!resolved?._id) {
        throw new Error(
          "Place could not be resolved."
        );
      }


      setSelectedPlace(null);


      navigate(
        `/places/${resolved._id}/map`
      );

    } catch (error) {
      alert(
        error?.message ||
        "Unable to load directions."
      );

    } finally {
      setResolvingPlaceId(null);
    }
  };


  /* =====================================================
     OPEN DETAILS
  ===================================================== */

  const openDetails = (
    place
  ) => {
    setSelectedPlace(
      place
    );

    setAddedPlaceId(null);
  };


  /* =====================================================
     CLOSE MODAL
  ===================================================== */

  const closeModal = () => {
    setSelectedPlace(null);
  };


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-b
        from-[#f6faf8]
        via-white
        to-white
        text-slate-800
      "
    >

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <header
        className="
          mx-auto
          max-w-[1400px]
          px-5
          pb-8
          pt-10
          md:px-10
          lg:pt-14
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            text-xs
            font-bold
            tracking-[0.18em]
            text-emerald-700
          "
        >
          <span
            aria-hidden="true"
            className="
              h-[3px]
              w-8
              rounded-full
              bg-emerald-700
            "
          />

          DISCOVER
        </div>


        <div
          className="
            mt-3
            flex
            flex-col
            gap-4
            md:flex-row
            md:items-end
            md:justify-between
          "
        >

          <div>
            <h1
              className="
                text-4xl
                font-extrabold
                tracking-tight
                text-[#073b3a]
                sm:text-5xl
              "
            >
              Explore Bharatpur
            </h1>


            <p
              className="
                mt-3
                max-w-2xl
                text-base
                leading-7
                text-slate-500
              "
            >
              Find destinations, food, stays,
              events, and local experiences.
            </p>
          </div>


          <div
            className="
              hidden
              items-center
              gap-2
              rounded-full
              border
              border-emerald-100
              bg-white
              px-4
              py-2
              text-sm
              font-semibold
              text-emerald-700
              shadow-sm
              md:flex
            "
          >
            <Sparkles
              size={16}
              aria-hidden="true"
            />

            Discover something new
          </div>

        </div>


        {/* SEARCH */}

        <div
          className="
            mt-8
            flex
            gap-3
          "
        >

          <div
            className="
              relative
              flex-1
            "
          >

            <Search
              size={21}
              aria-hidden="true"
              className="
                absolute
                left-5
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />


            <label
              htmlFor="explore-search"
              className="sr-only"
            >
              Search destinations and experiences
            </label>


            <input
              id="explore-search"
              type="search"
              value={search}
              onChange={(event) =>
                handleSearchChange(
                  event.target.value
                )
              }
              placeholder="Search destinations, experiences, restaurants..."
              autoComplete="off"
              className="
                h-16
                w-full
                rounded-2xl
                border
                border-slate-100
                bg-white
                pl-14
                pr-5
                text-sm
                text-slate-800
                shadow-sm
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-emerald-300
                focus:ring-4
                focus:ring-emerald-50
              "
            />

          </div>


          <button
            type="button"
            aria-label={
              showFilters
                ? "Hide destination filters"
                : "Show destination filters"
            }
            aria-expanded={showFilters}
            onClick={() =>
              setShowFilters(
                (current) => !current
              )
            }
            className="
              flex
              h-16
              w-16
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-slate-200
              bg-white
              text-slate-600
              shadow-sm
              transition
              hover:border-emerald-300
              hover:text-emerald-700
              focus:outline-none
              focus:ring-4
              focus:ring-emerald-100
              md:hidden
            "
          >
            <SlidersHorizontal
              size={21}
              aria-hidden="true"
            />
          </button>

        </div>


        {/* CATEGORY FILTERS */}

        <div
          className={`
            mt-6
            flex
            flex-wrap
            gap-3
            ${showFilters
              ? "flex"
              : "hidden md:flex"
            }
          `}
          aria-label="Destination categories"
        >

          {CATEGORIES.map(
            (category) => (
              <button
                key={category}
                type="button"
                aria-pressed={
                  activeCategory ===
                  category
                }
                onClick={() =>
                  handleCategoryChange(
                    category
                  )
                }
                className={`
                  rounded-full
                  border
                  px-6
                  py-2.5
                  text-sm
                  font-semibold
                  transition
                  focus:outline-none
                  focus:ring-4
                  focus:ring-emerald-100

                  ${activeCategory ===
                    category
                    ? `
                        border-emerald-700
                        bg-emerald-700
                        text-white
                        shadow-md
                      `
                    : `
                        border-slate-200
                        bg-white
                        text-slate-700
                        hover:border-emerald-300
                        hover:bg-emerald-50
                        hover:text-emerald-700
                      `
                  }
                `}
              >
                {category}
              </button>
            )
          )}

        </div>

      </header>


      {/* =================================================
          RESULTS
      ================================================= */}

      <main
        className="
          mx-auto
          max-w-[1400px]
          px-5
          pb-20
          md:px-10
        "
      >

        <div
          className="
            mb-6
            flex
            items-center
            justify-between
          "
        >

          <div>
            <h2
              className="
                text-2xl
                font-extrabold
                text-[#073b3a]
                sm:text-3xl
              "
            >
              Recommended for you
            </h2>


            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
              aria-live="polite"
            >
              {filteredPlaces.length}{" "}
              {
                filteredPlaces.length === 1
                  ? "place"
                  : "places"
              }{" "}
              found
            </p>
          </div>


          {activeCategory !== "All" && (
            <div
              className="
                hidden
                rounded-full
                bg-emerald-50
                px-4
                py-2
                text-xs
                font-bold
                text-emerald-700
                sm:block
              "
            >
              {activeCategory}
            </div>
          )}

        </div>


        {/* =================================================
            NO RESULTS
        ================================================= */}

        {filteredPlaces.length === 0 ? (
          <div
            className="
              flex
              min-h-[350px]
              flex-col
              items-center
              justify-center
              rounded-[28px]
              border
              border-dashed
              border-slate-200
              bg-slate-50
              px-5
              text-center
            "
          >

            <div
              className="
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-full
                bg-emerald-100
                text-emerald-700
              "
              aria-hidden="true"
            >
              <Search size={27} />
            </div>


            <h3
              className="
                mt-5
                text-xl
                font-bold
                text-slate-800
              "
            >
              No places found
            </h3>


            <p
              className="
                mt-2
                max-w-md
                text-sm
                leading-6
                text-slate-500
              "
            >
              Try searching for another
              destination or choose a
              different category.
            </p>


            <button
              type="button"
              onClick={clearFilters}
              className="
                mt-5
                rounded-full
                bg-emerald-700
                px-6
                py-3
                text-sm
                font-bold
                text-white
                transition
                hover:bg-emerald-800
                focus:outline-none
                focus:ring-4
                focus:ring-emerald-100
              "
            >
              Clear filters
            </button>

          </div>
        ) : (

          /* =================================================
             PLACE GRID
          ================================================= */

          <div
            className="
              grid
              grid-cols-1
              gap-5
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >

            {filteredPlaces.map(
              (place) => {
                const categories =
                  normalizeCategories(
                    place.category
                  );

                const placeKey =
                  getPlaceKey(place);

                const isResolving =
                  resolvingPlaceId ===
                  placeKey;


                return (
                  <article
                    key={placeKey}
                    className="
                      group
                      overflow-hidden
                      rounded-[22px]
                      border
                      border-slate-200
                      bg-white
                      shadow-sm
                      transition
                      duration-300
                      hover:-translate-y-1
                      hover:shadow-xl
                    "
                  >

                    {/* IMAGE */}

                    <div
                      className="
                        relative
                        h-[220px]
                        overflow-hidden
                      "
                    >

                      <img
                        src={place.image}
                        alt={place.name}
                        loading="lazy"
                        className="
                          h-full
                          w-full
                          object-cover
                          transition
                          duration-500
                          group-hover:scale-105
                        "
                      />


                      <div
                        aria-hidden="true"
                        className="
                          absolute
                          inset-0
                          bg-gradient-to-t
                          from-black/50
                          via-transparent
                          to-transparent
                        "
                      />


                      {/* CATEGORY */}

                      {categories[0] && (
                        <div
                          className="
                            absolute
                            left-4
                            top-4
                            rounded-full
                            bg-white/95
                            px-3
                            py-1.5
                            text-xs
                            font-bold
                            text-emerald-800
                            shadow-sm
                          "
                        >
                          {categories[0]}
                        </div>
                      )}


                      {/* RATING */}

                      <div
                        className="
                          absolute
                          bottom-4
                          right-4
                          flex
                          items-center
                          gap-1
                          rounded-full
                          bg-white
                          px-3
                          py-1.5
                          text-xs
                          font-bold
                          text-slate-800
                          shadow-sm
                        "
                        aria-label={`Rating ${place.rating || 0} out of 5`}
                      >

                        <Star
                          size={13}
                          aria-hidden="true"
                          className="
                            fill-amber-400
                            text-amber-400
                          "
                        />

                        {place.rating || "—"}

                        {place.reviews ? (
                          <span
                            className="
                              font-medium
                              text-slate-400
                            "
                          >
                            ({place.reviews})
                          </span>
                        ) : null}

                      </div>

                    </div>


                    {/* CONTENT */}

                    <div className="p-5">

                      <h3
                        className="
                          line-clamp-1
                          text-lg
                          font-extrabold
                          text-slate-900
                        "
                      >
                        {place.name}
                      </h3>


                      <div
                        className="
                          mt-2
                          flex
                          items-center
                          gap-1.5
                          text-sm
                          text-slate-500
                        "
                      >

                        <MapPin
                          size={15}
                          aria-hidden="true"
                          className="
                            shrink-0
                            text-emerald-700
                          "
                        />

                        <span className="line-clamp-1">
                          {place.location ||
                            "Bharatpur"}
                        </span>

                      </div>


                      <p
                        className="
                          mt-3
                          line-clamp-2
                          min-h-[48px]
                          text-sm
                          leading-6
                          text-slate-500
                        "
                      >
                        {place.description ||
                          "Discover this destination in Bharatpur."}
                      </p>


                      {/* CATEGORY BADGES */}

                      <div
                        className="
                          mt-4
                          flex
                          min-h-[28px]
                          flex-wrap
                          gap-2
                        "
                      >

                        {categories
                          .slice(0, 2)
                          .map(
                            (category) => (
                              <span
                                key={category}
                                className="
                                  rounded-full
                                  bg-slate-100
                                  px-3
                                  py-1
                                  text-[11px]
                                  font-semibold
                                  text-slate-600
                                "
                              >
                                {category}
                              </span>
                            )
                          )}

                      </div>


                      {/* VIEW DETAILS */}

                      <button
                        type="button"
                        onClick={() =>
                          openDetails(place)
                        }
                        aria-label={`View details for ${place.name}`}
                        className="
                          mt-5
                          flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-full
                          border
                          border-slate-200
                          bg-white
                          px-4
                          py-3
                          text-sm
                          font-bold
                          text-slate-800
                          transition
                          hover:border-emerald-600
                          hover:bg-emerald-50
                          hover:text-emerald-700
                          focus:outline-none
                          focus:ring-4
                          focus:ring-emerald-100
                        "
                      >
                        View Details

                        <ArrowRight
                          size={16}
                          aria-hidden="true"
                        />
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </main>


      {/* =========================================================
          DESTINATION MODAL
      ========================================================= */}

      {selectedPlace && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-slate-950/60
            p-4
            backdrop-blur-sm
          "
          role="presentation"
          onMouseDown={closeModal}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="destination-modal-title"
            className="
              relative
              max-h-[92vh]
              w-full
              max-w-5xl
              overflow-y-auto
              rounded-[28px]
              bg-white
              shadow-2xl
            "
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* CLOSE */}

            <button
              type="button"
              onClick={closeModal}
              aria-label="Close destination details"
              className="
                absolute
                right-5
                top-5
                z-20
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-white/95
                text-slate-600
                shadow-lg
                transition
                hover:bg-slate-100
                focus:outline-none
                focus:ring-4
                focus:ring-emerald-100
              "
            >
              <X
                size={20}
                aria-hidden="true"
              />
            </button>


            <div
              className="
                grid
                grid-cols-1
                lg:grid-cols-2
              "
            >

              {/* =================================================
                  LEFT IMAGE
              ================================================= */}

              <div
                className="
                  relative
                  min-h-[300px]
                  lg:min-h-[620px]
                "
              >

                <img
                  src={selectedPlace.image}
                  alt={selectedPlace.name}
                  className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-cover
                  "
                />


                <div
                  aria-hidden="true"
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-t
                    from-black/70
                    via-black/10
                    to-transparent
                  "
                />


                <div
                  className="
                    absolute
                    bottom-7
                    left-6
                    right-6
                    text-white
                    sm:left-8
                    sm:right-8
                  "
                >

                  {/* CATEGORY BADGES */}

                  <div
                    className="
                      mb-3
                      flex
                      flex-wrap
                      gap-2
                    "
                  >

                    {normalizeCategories(
                      selectedPlace.category
                    ).map(
                      (category) => (
                        <span
                          key={category}
                          className="
                            rounded-full
                            bg-white/20
                            px-3
                            py-1.5
                            text-xs
                            font-semibold
                            backdrop-blur-md
                          "
                        >
                          {category}
                        </span>
                      )
                    )}

                  </div>


                  <h2
                    id="destination-modal-title"
                    className="
                      text-3xl
                      font-extrabold
                      sm:text-4xl
                    "
                  >
                    {selectedPlace.name}
                  </h2>


                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      gap-2
                      text-sm
                      text-white/90
                    "
                  >

                    <MapPin
                      size={17}
                      aria-hidden="true"
                    />

                    {selectedPlace.location ||
                      "Bharatpur"}

                  </div>

                </div>

              </div>


              {/* =================================================
                  RIGHT DETAILS
              ================================================= */}

              <div
                className="
                  p-6
                  sm:p-8
                  lg:p-10
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-[0.16em]
                        text-emerald-700
                      "
                    >
                      Destination Details
                    </p>


                    <h3
                      className="
                        mt-2
                        text-2xl
                        font-extrabold
                        text-slate-900
                      "
                    >
                      Plan your visit
                    </h3>
                  </div>


                  {/* RATING */}

                  <div
                    className="
                      flex
                      shrink-0
                      items-center
                      gap-1.5
                      rounded-full
                      bg-amber-50
                      px-3
                      py-2
                      text-sm
                      font-bold
                      text-slate-800
                    "
                    aria-label={`Rating ${selectedPlace.rating || 0} out of 5`}
                  >

                    <Star
                      size={15}
                      aria-hidden="true"
                      className="
                        fill-amber-400
                        text-amber-400
                      "
                    />

                    {selectedPlace.rating ||
                      "—"}

                  </div>

                </div>


                {/* DESCRIPTION */}

                <p
                  className="
                    mt-6
                    text-sm
                    leading-7
                    text-slate-600
                  "
                >
                  {selectedPlace.description ||
                    "Discover this destination and plan your visit with Bharatpur AI."}
                </p>


                {/* INFORMATION */}

                <div
                  className="
                    mt-7
                    space-y-5
                  "
                >

                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-wider
                        text-slate-400
                      "
                    >
                      Best For
                    </p>

                    <p
                      className="
                        mt-1
                        font-bold
                        text-slate-800
                      "
                    >
                      {selectedPlace.details?.bestFor ||
                        "Everyone"}
                    </p>
                  </div>


                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-wider
                        text-slate-400
                      "
                    >
                      Suggested Time
                    </p>

                    <p
                      className="
                        mt-1
                        font-bold
                        text-slate-800
                      "
                    >
                      {selectedPlace.details?.suggestedTime ||
                        "2–4 hours"}
                    </p>
                  </div>


                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-wider
                        text-slate-400
                      "
                    >
                      Cost
                    </p>

                    <p
                      className="
                        mt-1
                        font-bold
                        text-slate-800
                      "
                    >
                      {selectedPlace.details?.cost ||
                        "Check current local fees"}
                    </p>
                  </div>


                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-wider
                        text-slate-400
                      "
                    >
                      Nearby
                    </p>

                    <p
                      className="
                        mt-1
                        font-bold
                        text-slate-800
                      "
                    >
                      {selectedPlace.details?.nearby ||
                        "Food • Hotels • Attractions"}
                    </p>
                  </div>

                </div>


                {/* RATING / REVIEWS */}

                <div
                  className="
                    mt-7
                    flex
                    items-center
                    gap-2
                    border-t
                    border-slate-100
                    pt-6
                  "
                >

                  <Star
                    size={17}
                    aria-hidden="true"
                    className="
                      fill-amber-400
                      text-amber-400
                    "
                  />


                  <span
                    className="
                      text-sm
                      font-bold
                      text-slate-800
                    "
                  >
                    {selectedPlace.rating ||
                      "—"}
                  </span>


                  <span
                    className="
                      text-sm
                      text-slate-400
                    "
                    aria-hidden="true"
                  >
                    •
                  </span>


                  <span
                    className="
                      text-sm
                      text-slate-500
                    "
                  >
                    {selectedPlace.reviews || 0}{" "}
                    reviews
                  </span>

                </div>


                {/* =================================================
                    ACTION BUTTONS
                ================================================= */}

                <div
                  className="
                    mt-7
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-2
                  "
                >

                  {/* ADD TO TRIP */}

                  <button
                    type="button"
                    onClick={() =>
                      addToMyTrip(
                        selectedPlace
                      )
                    }
                    disabled={
                      addingPlaceId ===
                      getPlaceKey(
                        selectedPlace
                      )
                    }
                    aria-label={
                      addedPlaceId ===
                        getPlaceKey(
                          selectedPlace
                        )
                        ? `${selectedPlace.name} has been added to My Trip`
                        : `Add ${selectedPlace.name} to My Trip`
                    }
                    className={`
                      flex
                      items-center
                      justify-center
                      gap-2
                      rounded-full
                      px-5
                      py-3.5
                      text-sm
                      font-bold
                      transition
                      focus:outline-none
                      focus:ring-4
                      focus:ring-emerald-100
                      disabled:cursor-not-allowed
                      disabled:opacity-60

                      ${addedPlaceId ===
                        getPlaceKey(
                          selectedPlace
                        )
                        ? `
                            bg-emerald-100
                            text-emerald-800
                          `
                        : `
                            bg-emerald-700
                            text-white
                            shadow-lg
                            shadow-emerald-700/20
                            hover:bg-emerald-800
                          `
                      }
                    `}
                  >

                    {addingPlaceId ===
                      getPlaceKey(
                        selectedPlace
                      ) ? (
                      <>
                        <RefreshCw
                          size={18}
                          aria-hidden="true"
                          className="animate-spin"
                        />

                        Saving...
                      </>
                    ) : addedPlaceId ===
                      getPlaceKey(
                        selectedPlace
                      ) ? (
                      <>
                        <Check
                          size={18}
                          aria-hidden="true"
                        />

                        Added to My Trip
                      </>
                    ) : (
                      <>
                        <Plus
                          size={18}
                          aria-hidden="true"
                        />

                        Add to My Trip
                      </>
                    )}

                  </button>


                  {/* ASK AI */}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/ai-guides"
                      )
                    }
                    aria-label={`Ask Bharatpur AI about ${selectedPlace.name}`}
                    className="
                      flex
                      items-center
                      justify-center
                      gap-2
                      rounded-full
                      border
                      border-slate-200
                      bg-white
                      px-5
                      py-3.5
                      text-sm
                      font-bold
                      text-slate-800
                      transition
                      hover:border-emerald-500
                      hover:bg-emerald-50
                      hover:text-emerald-700
                      focus:outline-none
                      focus:ring-4
                      focus:ring-emerald-100
                    "
                  >

                    <Sparkles
                      size={17}
                      aria-hidden="true"
                    />

                    Ask AI About This Place

                  </button>


                  {/* DIRECTIONS */}

                  <button
                    type="button"
                    onClick={() =>
                      openDirections(
                        selectedPlace
                      )
                    }
                    disabled={
                      resolvingPlaceId ===
                      getPlaceKey(
                        selectedPlace
                      )
                    }
                    aria-label={`Get directions to ${selectedPlace.name}`}
                    className="
                      flex
                      items-center
                      justify-center
                      gap-2
                      rounded-full
                      border
                      border-emerald-200
                      bg-emerald-50
                      px-5
                      py-3.5
                      text-sm
                      font-bold
                      text-emerald-800
                      transition
                      hover:bg-emerald-700
                      hover:text-white
                      focus:outline-none
                      focus:ring-4
                      focus:ring-emerald-100
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >

                    {resolvingPlaceId ===
                      getPlaceKey(
                        selectedPlace
                      ) ? (
                      <>
                        <RefreshCw
                          size={18}
                          aria-hidden="true"
                          className="animate-spin"
                        />

                        Preparing destination...
                      </>
                    ) : (
                      <>
                        <Navigation
                          size={18}
                          aria-hidden="true"
                        />

                        Directions
                      </>
                    )}

                  </button>

                </div>


                {/* =================================================
                    VISITOR REVIEW
                ================================================= */}

                {selectedPlace.details?.review && (
                  <div
                    className="
                      mt-7
                      rounded-2xl
                      bg-slate-50
                      p-5
                    "
                  >

                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-wider
                        text-slate-400
                      "
                    >
                      Visitor Review
                    </p>


                    <p
                      className="
                        mt-2
                        text-sm
                        italic
                        leading-6
                        text-slate-600
                      "
                    >
                      "{selectedPlace.details.review}"
                    </p>

                  </div>
                )}

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};


export default Explore;