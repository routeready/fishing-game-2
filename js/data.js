'use strict';
// Legal buzz limit. At/below this the breathalyzer is winnable; above it, good luck.
const BUZZ_LIMIT = 4;
const TRIP_START = 16 * 60;      // 4:00 PM
const TRIP_END = 21 * 60;        // 9:00 PM sundown
const LAST_CALL = 20 * 60 + 30;  // banner warning
const CANS_PER_TRIP = 8;

const RODS = [
  { name: 'GARAGE SALE ROD', cost: 0, green: 9, snapT: 0.8, reel: 9 },
  { name: 'DECENT SPINCASTER', cost: 200, green: 12, snapT: 1.1, reel: 11 },
  { name: 'PRO BAITCASTER', cost: 900, green: 15, snapT: 1.4, reel: 13 },
  { name: 'LEGEND STICK', cost: 2200, green: 19, snapT: 1.8, reel: 16 },
];
const BOATS = [
  { name: 'LEAKY JON BOAT', cost: 0, cooler: 5, speed: 75 },
  { name: 'BASS TRACKER', cost: 500, cooler: 8, speed: 100 },
  { name: 'RANGER ROYALE', cost: 1500, cooler: 12, speed: 125 },
];
const BEERS = [
  { name: 'OLD SWILL', cost: 0, buzz: 2.0, shake: 1.0 },
  { name: 'LAKESIDE LAGER', cost: 150, buzz: 2.0, shake: 0.8 },
  { name: 'HOPPY HERON IPA', cost: 400, buzz: 2.6, shake: 0.65 },
  { name: 'IMPERIAL PILS', cost: 800, buzz: 2.6, shake: 0.5 },
];

// fight: 0..1 aggression in the reel minigame. base: $ at average weight.
const FISH = {
  bluegill:   { name: 'BLUEGILL',        base: 8,   wMin: 0.3, wMax: 1.4,  fight: 0.20, col: '#7aa4e0' },
  perch:      { name: 'YELLOW PERCH',    base: 10,  wMin: 0.4, wMax: 1.6,  fight: 0.25, col: '#d8c050' },
  crappie:    { name: 'BLACK CRAPPIE',   base: 14,  wMin: 0.5, wMax: 2.2,  fight: 0.30, col: '#aab8c0' },
  bullhead:   { name: 'BULLHEAD',        base: 12,  wMin: 0.8, wMax: 3.0,  fight: 0.35, col: '#7a6a4a' },
  smallmouth: { name: 'SMALLMOUTH BASS', base: 25,  wMin: 1.0, wMax: 4.5,  fight: 0.55, col: '#8a9a50' },
  largemouth: { name: 'LARGEMOUTH BASS', base: 35,  wMin: 1.5, wMax: 7.5,  fight: 0.60, col: '#5a8a40' },
  walleye:    { name: 'WALLEYE',         base: 40,  wMin: 2.0, wMax: 8.5,  fight: 0.50, col: '#c0a860' },
  catfish:    { name: 'CHANNEL CAT',     base: 45,  wMin: 3.0, wMax: 16,   fight: 0.65, col: '#607080' },
  pike:       { name: 'NORTHERN PIKE',   base: 60,  wMin: 4.0, wMax: 19,   fight: 0.75, col: '#4a7a50' },
  laketrout:  { name: 'LAKE TROUT',      base: 70,  wMin: 5.0, wMax: 22,   fight: 0.70, col: '#9090b8' },
  musky:      { name: 'MUSKELLUNGE',     base: 90,  wMin: 8.0, wMax: 32,   fight: 0.85, col: '#6a8a6a' },
  // Legendaries — one white whale per lake.
  grandpagill:{ name: 'GRANDPA GILL',    base: 400, wMin: 3.5, wMax: 4.8,  fight: 0.70, col: '#4a74f0', legend: true },
  greenback:  { name: 'OLD GREENBACK',   base: 750, wMin: 13,  wMax: 16,   fight: 0.88, col: '#2a6a20', legend: true },
  warden:     { name: 'THE WARDEN',      base: 1200,wMin: 38,  wMax: 46,   fight: 0.97, col: '#3a5a3a', legend: true },
};

// The island, traced from the satellite closeup: bulky lobed west half,
// a narrow neck, a knob, then the bare sand point at the east tip.
// Normalized to its own bounding box.
const ISLAND_PTS = [
  [0.00, 0.54], [0.05, 0.40], [0.13, 0.32], [0.21, 0.38], [0.29, 0.28],
  [0.38, 0.36], [0.46, 0.30], [0.55, 0.40], [0.62, 0.26], [0.68, 0.24],
  [0.72, 0.36], [0.80, 0.38], [0.88, 0.40], [1.00, 0.42], [0.88, 0.54],
  [0.76, 0.58], [0.64, 0.56], [0.52, 0.64], [0.45, 0.74], [0.36, 0.70],
  [0.22, 0.74], [0.10, 0.68], [0.03, 0.62],
];

// Trout Lake, traced from the satellite overview: broad west basin (the
// island sits low in it), a mid-lake pinch, Camp Champlain bay bulging
// north, the narrow Redbridge arm running NE, a big peninsula and bays
// along the south shore. Normalized to the world rectangle.
const TROUT_PTS = [
  [0.02, 0.50], [0.05, 0.34], [0.13, 0.28], [0.20, 0.36], [0.27, 0.30],
  [0.33, 0.42], [0.40, 0.36], [0.47, 0.24], [0.55, 0.18], [0.62, 0.26],
  [0.68, 0.34], [0.76, 0.26], [0.85, 0.14], [0.92, 0.18], [0.90, 0.32],
  [0.97, 0.44], [0.90, 0.56], [0.80, 0.52], [0.72, 0.64], [0.62, 0.58],
  [0.55, 0.72], [0.45, 0.68], [0.36, 0.78], [0.26, 0.72], [0.17, 0.80],
  [0.08, 0.70], [0.03, 0.60],
];

// fish: [speciesId, spawn weight] — higher tiers get boosted near weeds.
const LAKES = [
  {
    name: 'SNOOZY POND', unlock: 0, patrol: 0, w: 760, h: 540,
    spotN: 4, rockN: 5, sweep: 0.4,
    fish: [['bluegill', 50], ['perch', 30], ['crappie', 16], ['bullhead', 10], ['largemouth', 4]],
    legend: 'grandpagill',
    blurb: 'SMALL FISH, EASY LIVING. THE ODD SHORE PATROL.',
  },
  {
    name: 'BIGMOUTH LAKE', unlock: 250, patrol: 1, w: 1120, h: 760,
    spotN: 6, rockN: 9, sweep: 1,
    fish: [['perch', 26], ['crappie', 20], ['smallmouth', 20], ['largemouth', 16], ['walleye', 12], ['catfish', 8]],
    legend: 'greenback',
    blurb: 'PROPER BASS WATER. ONE PATROL BOAT WORKS IT.',
  },
  {
    name: 'TROUT LAKE', unlock: 1000, patrol: 2, w: 1680, h: 760,
    poly: TROUT_PTS, isl: { x: 0.15, y: 0.55, k: 0.55 },
    spotN: 7, rockN: 14, sweep: 1.6,
    fish: [['walleye', 26], ['catfish', 22], ['pike', 20], ['laketrout', 18], ['musky', 9]],
    legend: 'warden',
    blurb: 'BIG COLD TROPHY WATER. CRAWLING WITH RANGERS.',
  },
];

const WEATHERS = [
  { id: 'CLEAR', bite: 1.0, copR: 1.0, windMax: 2 },
  { id: 'OVERCAST', bite: 1.15, copR: 1.0, windMax: 3 },
  { id: 'BREEZY', bite: 1.0, copR: 1.0, windMax: 5 },
  { id: 'FOG', bite: 1.05, copR: 0.6, windMax: 1 },
];

const EARL_LINES = [
  "GRAHAM: THAT'S WHERE I LOST MY WEDDING RING. AND MY SECOND ONE.",
  'GRAHAM: FISH CAN SMELL FEAR. AND CHEAP BEER.',
  'GRAHAM: I ONCE CAUGHT A FISH THIS BIG. THE COOLER DISAGREED.',
  "GRAHAM: YOU'RE REELING LIKE MY AUNT RITA. SHE'S BANNED FROM 3 LAKES.",
  'GRAHAM: SUN, BEER, NO WARRANTS. PERFECT DAY.',
  "GRAHAM: IF THE BOAT'S A-WEAVIN', THE WARDEN COMES A-PEEVIN'.",
  'GRAHAM: BIG ONES BITE AT DUSK. SO DO MOSQUITOES.',
  'GRAHAM: TRUST THE WEEDS, BUDDY. FISH LOVE A SALAD BAR.',
  "GRAHAM: I AIN'T DRUNK, I'M NAUTICALLY LOOSE.",
  'GRAHAM: MY EX GOT THE TRUCK. I GOT THE COOLER. I WON.',
];
const EARL_OFFER = "GRAHAM: COLD ONE, CAP'N? (Y/N)";
const EARL_WARN = [
  "GRAHAM: BAD FEELIN'... LAW'S OUT TONIGHT.",
  'GRAHAM: I SMELL AFTERSHAVE AND PAPERWORK. STAY SHARP.',
];
const EARL_STASH = 'GRAHAM: STASH IT! STASH IT!!';
const EARL_NEAR = [
  'GRAHAM: HOO BOY. I SWALLOWED MY DIP.',
  'GRAHAM: THAT WAS CLOSER THAN MY LAST HAIRCUT.',
];

const TIPS = [
  'TIP: A BUZZED FISH STORY PAYS BETTER AT THE DOCK.',
  'TIP: SIT STILL AND STASH THE CAN WHEN YOU HEAR THE CHIRP.',
  'TIP: CAST POWER IN THE GREEN DROPS THE LURE ON TARGET.',
  'TIP: WEED BEDS HOLD THE GOOD FISH.',
  'TIP: FOG HIDES YOU FROM PATROLS. ALSO HIDES THE ROCKS.',
  'TIP: THE STAR SPOT IS RED HOT TODAY ONLY.',
  'TIP: LEGENDS WAKE UP AFTER 7 PM.',
  'TIP: RAM FLOATING CRATES. FINDERS KEEPERS.',
  'TIP: A POLICE SCANNER BUYS YOU 20 QUIET SECONDS.',
];
