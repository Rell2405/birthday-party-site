// -----------------------------------------------------------------------------
// Party configuration — edit everything about the event in this one file.
// -----------------------------------------------------------------------------

export const party = {
  guestOfHonor: "Jordan",
  age: 30,
  title: "Jordan's 30th Birthday Bash",
  tagline: "Three decades of legendary. Let's celebrate in style.",

  // Human-readable date/time plus a machine value used for the countdown.
  date: "Saturday, August 16, 2026",
  time: "7:00 PM – late",
  // ISO 8601 with timezone offset — drives the live countdown.
  startsAt: "2026-08-16T19:00:00-04:00",

  venue: {
    name: "The Rooftop at Marigold Hall",
    address: "482 Lakeview Avenue, Suite 12",
    city: "Brooklyn, NY 11201",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=482+Lakeview+Avenue+Brooklyn+NY",
  },

  dressCode: "Cocktail chic — bonus points for a splash of gold \u2728",
  hostContact: "jordan.party@example.com",

  schedule: [
    { time: "7:00 PM", label: "Doors & Welcome Drinks", icon: "\ud83e\udd42" },
    { time: "8:00 PM", label: "Dinner Is Served", icon: "\ud83c\udf7d\ufe0f" },
    { time: "9:00 PM", label: "Toasts & Cake", icon: "\ud83c\udf82" },
    { time: "9:30 PM", label: "Dance Floor Opens", icon: "\ud83e\udea9" },
    { time: "12:00 AM", label: "Late-Night Snacks", icon: "\ud83c\udf2e" },
  ],

  faqs: [
    {
      q: "Can I bring a plus-one?",
      a: "Absolutely \u2014 just let us know your total headcount in the RSVP form so we can save enough seats and cake.",
    },
    {
      q: "Is there parking?",
      a: "Street parking is available nearby, and there's a paid garage one block east on Lakeview Avenue. Rideshare is recommended.",
    },
    {
      q: "What should I wear?",
      a: "Cocktail chic. Think dressed-up-but-comfortable \u2014 you'll want to dance.",
    },
    {
      q: "Any gift ideas?",
      a: "Your presence is the present! If you'd still like to bring something, contributions to the honeymoon fund are warmly welcomed.",
    },
  ],
} as const;

export type Party = typeof party;
