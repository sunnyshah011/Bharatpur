import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Compass,
  PawPrint,
  Mountain,
  Landmark,
  Utensils,
  House,
  CalendarDays,
  MapPin,
  Star,
  Leaf,
  Camera,
  Quote,
  ArrowUpRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

/* =========================================================
   CATEGORY DATA
========================================================= */

const categories = [
  {
    title: "Nature",
    subtitle: "Wildlife, parks, rivers",
    image:
      "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=900&q=85",
    icon: PawPrint,
    iconBg: "bg-emerald-700",
    arrow: "text-emerald-700",
  },
  {
    title: "Wildlife",
    subtitle: "Safaris, bird watching",
    image:
      "https://images.unsplash.com/photo-1535338454770-8be927b5a00b?auto=format&fit=crop&w=900&q=85",
    icon: Mountain,
    iconBg: "bg-lime-700",
    arrow: "text-lime-700",
  },
  {
    title: "Culture",
    subtitle: "Temples, heritage, local life",
    image:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=900&q=85",
    icon: Landmark,
    iconBg: "bg-amber-500",
    arrow: "text-amber-600",
  },
  {
    title: "Food",
    subtitle: "Local cuisine, restaurants",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
    icon: Utensils,
    iconBg: "bg-red-500",
    arrow: "text-red-500",
  },
  {
    title: "Homestays",
    subtitle: "Stay with locals",
    image:
      "https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=900&q=85",
    icon: House,
    iconBg: "bg-sky-600",
    arrow: "text-sky-600",
  },
  {
    title: "Events",
    subtitle: "Festivals, fairs, activities",
    image:
      "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=900&q=85",
    icon: CalendarDays,
    iconBg: "bg-purple-600",
    arrow: "text-purple-600",
  },
];

/* =========================================================
   POPULAR PLACES
========================================================= */

const popularPlaces = [
  {
    title: "Chitwan National Park",
    description:
      "Home to one-horned rhinos and rich wildlife",
    location: "Chitwan",
    rating: "4.8",
    reviews: "2.4k",
    image:
      "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Sunset View at Narayani River",
    description:
      "Peaceful views and local boat rides",
    location: "Bharatpur",
    rating: "4.6",
    reviews: "1.2k",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Bharatpur Museum",
    description:
      "History, culture and local heritage",
    location: "Bharatpur",
    rating: "4.5",
    reviews: "892",
    image:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=900&q=85",
  },
];

/* =========================================================
   REVIEWS
========================================================= */

const reviews = [
  {
    name: "Aarav Sharma",
    location: "Kathmandu, Nepal",
    rating: 5,
    text:
      "Bharatpur AI made it much easier to discover places around Chitwan. The trip planning and local recommendations were really useful.",
    image:
      "https://i.pravatar.cc/120?img=12",
  },
  {
    name: "Priya Thapa",
    location: "Pokhara, Nepal",
    rating: 5,
    text:
      "I found several places that I had never heard about before. The experience feels simple and helpful, especially when planning a short trip.",
    image:
      "https://i.pravatar.cc/120?img=47",
  },
  {
    name: "Daniel Miller",
    location: "United Kingdom",
    rating: 4,
    text:
      "A convenient way to explore Bharatpur and Chitwan. I especially liked having attractions, local experiences and trip planning in one place.",
    image:
      "https://i.pravatar.cc/120?img=33",
  },
];

/* =========================================================
   HOME
========================================================= */

const Home = () => {
  const navigate = useNavigate();

  /* =====================================================
     CAROUSEL STATE
  ===================================================== */

  const [activeSlide, setActiveSlide] = useState(0);

  /* =====================================================
     CAROUSEL AUTO PLAY
  ===================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((current) =>
        current === popularPlaces.length - 1
          ? 0
          : current + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  /* =====================================================
     CAROUSEL CONTROLS
  ===================================================== */

  const nextSlide = () => {
    setActiveSlide((current) =>
      current === popularPlaces.length - 1
        ? 0
        : current + 1
    );
  };

  const previousSlide = () => {
    setActiveSlide((current) =>
      current === 0
        ? popularPlaces.length - 1
        : current - 1
    );
  };

  /* =====================================================
     OPEN EXPLORE CATEGORY
  ===================================================== */

  const openCategory = (category) => {
    navigate(
      `/explore?category=${encodeURIComponent(category)}`
    );
  };

  /* =====================================================
     OPEN POPULAR PLACE
  ===================================================== */

  const openPopularPlace = (place) => {
    navigate(
      `/explore?search=${encodeURIComponent(
        place.title
      )}`
    );
  };

  const activePlace = popularPlaces[activeSlide];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-br from-[#F1FAF6] via-white to-[#FFFDF5]">
        {/* Background decoration */}

        <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl" />

        <div className="pointer-events-none absolute -right-32 -top-20 h-[500px] w-[500px] rounded-full bg-amber-100/30 blur-3xl" />

        <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-teal-100/20 blur-3xl" />

        <div
          className="
            relative mx-auto
            grid max-w-[1500px]
            items-center
            gap-10
            px-5 py-10
            sm:px-8
            md:px-10 md:py-14
            lg:grid-cols-[0.92fr_1.08fr]
            lg:gap-14
            lg:py-16
          "
        >
          {/* =================================================
              HERO TEXT
          ================================================== */}

          <div className="animate-[fadeInUp_0.7s_ease-out]">
            {/* Eyebrow */}

            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.14em] text-emerald-800 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />

              YOUR AI-POWERED LOCAL GUIDE
            </div>

            {/* Heading */}

            <h1
              className="
                max-w-[680px]
                text-5xl font-black
                leading-[0.98]
                tracking-[-0.035em]
                text-slate-950
                sm:text-6xl
                xl:text-[72px]
              "
            >
              Discover Bharatpur,

              <span className="mt-2 block text-emerald-700">
                your way.
              </span>
            </h1>

            {/* Description */}

            <p
              className="
                mt-6
                max-w-[610px]
                text-base
                leading-7
                text-slate-600
                sm:text-lg
                sm:leading-8
              "
            >
              Plan meaningful trips, discover local
              experiences, and get instant help in
              English, नेपाली, or हिन्दी — all in one
              place.
            </p>

            {/* CTA */}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigate("/plan-my-trip")
                }
                className="
                  group
                  inline-flex items-center
                  justify-center gap-3
                  rounded-2xl
                  bg-emerald-700
                  px-7 py-4
                  font-bold
                  text-white
                  shadow-lg
                  shadow-emerald-700/20
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:bg-emerald-800
                  hover:shadow-xl
                  focus:outline-none
                  focus:ring-4
                  focus:ring-emerald-200
                "
              >
                <Compass size={21} />

                Plan My Trip

                <ChevronRight
                  size={19}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/ai-guides")
                }
                className="
                  inline-flex items-center
                  justify-center gap-3
                  rounded-2xl
                  border border-emerald-200
                  bg-white/90
                  px-7 py-4
                  font-bold
                  text-emerald-800
                  shadow-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-emerald-300
                  hover:bg-emerald-50
                  hover:shadow-md
                  focus:outline-none
                  focus:ring-4
                  focus:ring-emerald-100
                "
              >
                <Leaf size={20} />

                Ask AI Guide
              </button>
            </div>

            {/* Small trust / feature row */}

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <MapPin size={14} />
                </span>
                Local destinations
              </span>

              <span className="hidden h-4 w-px bg-slate-200 sm:block" />

              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Star
                    size={14}
                    className="fill-amber-500"
                  />
                </span>
                Curated experiences
              </span>
            </div>
          </div>

          {/* =================================================
              HERO CAROUSEL
          ================================================== */}

          <div
            className="
              relative
              animate-[fadeIn_0.9s_ease-out]
            "
          >
            <div
              className="
                relative
                overflow-hidden
                rounded-[30px]
                border
                border-white/80
                bg-slate-100
                shadow-[0_25px_80px_rgba(15,23,42,0.16)]
              "
            >
              {/* Main image */}

              <div className="relative h-[360px] overflow-hidden sm:h-[440px] lg:h-[520px]">
                <img
                  key={activePlace.title}
                  src={activePlace.image}
                  alt={activePlace.title}
                  className="
                    h-full w-full
                    object-cover
                    animate-[carouselImage_0.7s_ease-out]
                  "
                />

                {/* Overlay */}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Top location */}

                <div className="absolute left-5 right-5 top-5 flex items-center justify-between sm:left-7 sm:right-7 sm:top-7">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md">
                    <MapPin
                      size={15}
                      fill="currentColor"
                    />

                    {activePlace.location}
                  </div>

                  <div className="rounded-full border border-white/20 bg-black/25 px-3 py-2 text-xs font-bold text-white backdrop-blur-md">
                    {activeSlide + 1} /{" "}
                    {popularPlaces.length}
                  </div>
                </div>

                {/* Bottom content */}

                <div className="absolute bottom-6 left-5 right-5 text-white sm:bottom-8 sm:left-7 sm:right-7">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-900">
                      <Star
                        size={13}
                        className="fill-amber-400 text-amber-400"
                      />

                      {activePlace.rating}
                    </span>

                    <span className="text-xs font-medium text-white/80">
                      {activePlace.reviews} reviews
                    </span>
                  </div>

                  <h2 className="max-w-xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                    {activePlace.title}
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                    {activePlace.description}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openPopularPlace(
                        activePlace
                      )
                    }
                    className="
                      group
                      mt-5
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-white
                      px-4 py-3
                      text-sm
                      font-bold
                      text-emerald-800
                      transition-all
                      duration-300
                      hover:bg-emerald-50
                      hover:shadow-lg
                    "
                  >
                    Explore place

                    <ArrowUpRight
                      size={17}
                      className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </button>
                </div>
              </div>

              {/* Carousel controls */}

              <div className="absolute bottom-6 right-5 flex items-center gap-2 sm:right-7">
                <button
                  type="button"
                  onClick={previousSlide}
                  className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-full
                    border border-white/30
                    bg-black/25
                    text-white
                    backdrop-blur-md
                    transition
                    hover:bg-white
                    hover:text-emerald-800
                    focus:outline-none
                    focus:ring-2
                    focus:ring-white
                  "
                  aria-label="Previous popular place"
                >
                  <ChevronLeft size={19} />
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-full
                    border border-white/30
                    bg-black/25
                    text-white
                    backdrop-blur-md
                    transition
                    hover:bg-white
                    hover:text-emerald-800
                    focus:outline-none
                    focus:ring-2
                    focus:ring-white
                  "
                  aria-label="Next popular place"
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>

            {/* Carousel indicators */}

            <div className="mt-4 flex items-center justify-center gap-2">
              {popularPlaces.map((place, index) => (
                <button
                  key={place.title}
                  type="button"
                  onClick={() =>
                    setActiveSlide(index)
                  }
                  aria-label={`Show ${place.title}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeSlide === index
                      ? "w-8 bg-emerald-700"
                      : "w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="mx-auto max-w-[1500px] px-5 sm:px-8 md:px-10">
        <div
          className="
            grid
            grid-cols-1
            gap-10
            lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]
          "
        >
          {/* =================================================
              CATEGORIES
          ================================================== */}

          <section className="py-10 lg:py-14">
            {/* Section header */}

            <div className="mb-7 flex items-start gap-4">
              <div
                className="
                  flex h-12 w-12
                  shrink-0
                  items-center justify-center
                  rounded-2xl
                  bg-emerald-700
                  text-white
                  shadow-lg
                  shadow-emerald-700/20
                "
              >
                <Compass size={22} />
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
                  Explore your interests
                </p>

                <h2
                  className="
                    text-2xl
                    font-black
                    tracking-tight
                    text-slate-900
                    sm:text-3xl
                  "
                >
                  What are you looking for?
                </h2>

                <p
                  className="
                    mt-2
                    max-w-2xl
                    text-sm
                    leading-6
                    text-slate-500
                    sm:text-base
                  "
                >
                  Explore the best of Bharatpur —
                  nature, culture, adventure and more.
                </p>
              </div>
            </div>

            {/* Category cards */}

            <div
              className="
                grid
                grid-cols-1
                gap-4
                sm:grid-cols-2
                xl:grid-cols-3
              "
            >
              {categories.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() =>
                      openCategory(item.title)
                    }
                    className="
                      group
                      overflow-hidden
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      text-left
                      shadow-sm
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      hover:border-emerald-200
                      hover:shadow-[0_15px_40px_rgba(15,23,42,0.10)]
                      focus:outline-none
                      focus:ring-4
                      focus:ring-emerald-100
                    "
                  >
                    {/* Image */}

                    <div className="relative h-[135px] overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        className="
                          h-full w-full
                          object-cover
                          transition-transform
                          duration-700
                          ease-out
                          group-hover:scale-105
                        "
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

                      <div className="absolute bottom-3 left-3">
                        <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                          Explore
                        </span>
                      </div>
                    </div>

                    {/* Card body */}

                    <div className="flex items-center gap-3 p-4">
                      <div
                        className={`
                          flex h-11 w-11
                          shrink-0
                          items-center justify-center
                          rounded-xl
                          ${item.iconBg}
                          text-white
                          shadow-sm
                          transition-transform
                          duration-300
                          group-hover:scale-105
                        `}
                      >
                        <Icon size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800">
                          {item.title}
                        </h3>

                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {item.subtitle}
                        </p>
                      </div>

                      <ChevronRight
                        size={20}
                        className={`
                          shrink-0
                          ${item.arrow}
                          transition-transform
                          duration-300
                          group-hover:translate-x-1
                        `}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* =================================================
              SIDE FEATURE
          ================================================== */}

          <aside className="py-10 lg:py-14">
            <div className="sticky top-24">
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
                      Inspiration
                    </p>

                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                      Popular right now
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Leaf size={20} />
                  </div>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Places travelers are discovering
                  around Bharatpur and Chitwan.
                </p>

                {/* Mini place list */}

                <div className="mt-6 space-y-3">
                  {popularPlaces.map(
                    (place, index) => (
                      <button
                        key={place.title}
                        type="button"
                        onClick={() => {
                          setActiveSlide(index);
                          openPopularPlace(place);
                        }}
                        className={`
                          group
                          flex w-full
                          items-center
                          gap-3
                          rounded-2xl
                          border
                          p-2.5
                          text-left
                          transition-all
                          duration-300
                          ${activeSlide === index
                            ? "border-emerald-200 bg-emerald-50/70"
                            : "border-slate-100 bg-slate-50/50 hover:border-emerald-100 hover:bg-emerald-50/40"
                          }
                        `}
                      >
                        <img
                          src={place.image}
                          alt={place.title}
                          className="h-16 w-20 shrink-0 rounded-xl object-cover"
                          loading="lazy"
                        />

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-slate-800">
                            {place.title}
                          </h3>

                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={12} />
                            {place.location}
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-xs">
                            <Star
                              size={12}
                              className="fill-amber-400 text-amber-400"
                            />

                            <span className="font-semibold text-slate-600">
                              {place.rating}
                            </span>

                            <span className="text-slate-400">
                              ({place.reviews})
                            </span>
                          </div>
                        </div>

                        <ChevronRight
                          size={17}
                          className="
                            shrink-0
                            text-slate-400
                            transition-transform
                            duration-300
                            group-hover:translate-x-1
                            group-hover:text-emerald-700
                          "
                        />
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/explore")
                  }
                  className="
                    mt-5
                    flex w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-emerald-200
                    bg-emerald-50
                    px-4 py-3
                    text-sm
                    font-bold
                    text-emerald-800
                    transition-all
                    duration-300
                    hover:bg-emerald-100
                  "
                >
                  Explore all destinations

                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* =====================================================
          REVIEWS
      ===================================================== */}

      <section className="border-y border-slate-200 bg-[#F7FAF8]">
        <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 md:px-10 lg:py-20">
          {/* Header */}

          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-700/20">
              <Quote size={21} />
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Traveler experiences
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              What travelers are saying
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Discover how other travelers experienced
              Bharatpur and the surrounding destinations.
            </p>
          </div>

          {/* Reviews */}

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.name}
                className="
                  group
                  rounded-3xl
                  border
                  border-slate-200
                  bg-white
                  p-6
                  shadow-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-emerald-100
                  hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]
                "
              >
                {/* Rating */}

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {Array.from({
                      length: 5,
                    }).map((_, index) => (
                      <Star
                        key={index}
                        size={15}
                        className={
                          index <
                            review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }
                      />
                    ))}
                  </div>

                  <Quote
                    size={24}
                    className="text-emerald-100"
                  />
                </div>

                {/* Review text */}

                <p className="mt-5 min-h-[110px] text-sm leading-7 text-slate-600">
                  “{review.text}”
                </p>

                {/* User */}

                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <img
                    src={review.image}
                    alt={review.name}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-50"
                  />

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-800">
                      {review.name}
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {review.location}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Review CTA */}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => navigate("/review")}
              className="
                group
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-5 py-3
                text-sm
                font-bold
                text-slate-700
                shadow-sm
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:border-emerald-200
                hover:bg-emerald-50
                hover:text-emerald-800
              "
            >
              Share your experience

              <ArrowUpRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="relative overflow-hidden bg-[#103D35]">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1000px] px-5 py-14 text-center sm:px-8 sm:py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200 backdrop-blur">
            <Compass size={23} />
          </div>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Ready to explore Bharatpur?
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-emerald-100/75 sm:text-base">
            Let Bharatpur AI help you discover places,
            plan your journey and experience more of
            Chitwan.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                navigate("/plan-my-trip")
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-white
                px-6 py-3.5
                text-sm
                font-bold
                text-emerald-900
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-emerald-50
                hover:shadow-xl
              "
            >
              Start planning

              <ChevronRight size={17} />
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/explore")
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-white/20
                bg-white/5
                px-6 py-3.5
                text-sm
                font-bold
                text-white
                backdrop-blur
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-white/10
              "
            >
              Explore places
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-slate-200 bg-white px-5 py-7 text-center text-sm text-slate-500">
        <span className="font-bold text-emerald-800">
          Bharatpur AI
        </span>

        <span className="mx-2 text-slate-300">
          •
        </span>

        Your AI-powered tourism guide
      </footer>

      {/* =====================================================
          SMALL ANIMATION STYLES
      ===================================================== */}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes carouselImage {
          from {
            opacity: 0.65;
            transform: scale(1.025);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Home;