// -----------------------------------------------------------------------------
// Party configuration — edit everything about the event in this one file.
// -----------------------------------------------------------------------------

export const party = {
  brand: "4th of July Bash",
  title: "Fourth of July Bash",
  tagline:
    "Fire up the grill, grab a partner for the spades table, and let's light up the night. 🇺🇸",

  // Human-readable date/time plus a machine value used for the countdown.
  date: "Saturday, July 4, 2026",
  time: "4:00 PM – late",
  // ISO 8601 with timezone offset — drives the live countdown.
  startsAt: "2026-07-04T16:00:00-04:00",

  venue: {
    name: "The Backyard Bash",
    address: "130 Lawrence Drive",
    city: "Villa Rica, GA 30180",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=130+Lawrence+Drive+Villa+Rica+GA+30180",
  },

  dressCode: "Summer party vibes \u2014 keep it light, comfy, and cookout-ready \u2600\ufe0f",
  hostContact: "rsvp@example.com",

  schedule: [
    { time: "4:00 PM", label: "Gates Open & Welcome Drinks", icon: "\ud83c\udf89" },
    { time: "5:00 PM", label: "Grill Fires Up \u2014 Burgers & BBQ", icon: "\ud83c\udf54" },
    { time: "6:00 PM", label: "Spades Tournament (Cards) Kicks Off", icon: "\ud83c\udccf" },
    { time: "7:30 PM", label: "Lawn Games & Watermelon", icon: "\ud83c\udf49" },
    { time: "8:30 PM", label: "Playlist & Dancing", icon: "\ud83c\udfb6" },
    { time: "9:15 PM", label: "Fireworks Show", icon: "\ud83c\udf86" },
    { time: "9:45 PM", label: "S'mores & Late-Night Bites", icon: "\ud83d\udd25" },
  ],

  faqs: [
    {
      q: "Can I bring a plus-one?",
      a: "Absolutely \u2014 just include your total headcount in the RSVP form so we can save enough seats, food, and a spot at the spades table.",
    },
    {
      q: "What games will there be?",
      a: "A bracket-style spades tournament (grab a partner!), plus cornhole, lawn games, and a watermelon-eating contest. Bring your A-game.",
    },
    {
      q: "What should I wear?",
      a: "Summer party vibes \u2014 light and comfortable for a day in the yard. Red, white & blue is always encouraged.",
    },
    {
      q: "Is there parking?",
      a: "Yes \u2014 driveway and street parking are available along Lawrence Drive. Carpooling is appreciated.",
    },
    {
      q: "Is it family-friendly? What should I bring?",
      a: "Bring the whole crew, kids included. Just yourself is plenty, but a side dish, drinks, or lawn chairs are always welcome.",
    },
  ],
} as const;

export type Party = typeof party;
