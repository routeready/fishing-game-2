'use strict';
// Every table in the game. Numbers here are the balance dials.

// ---------- products ----------
const PRODUCTS = {
  shine:  { name: 'MOONSHINE',  unit: 'JUG',   base: 12,   color: '#e8c46a', heat: 0.1 },
  opium:  { name: 'POPPY GUM',  unit: 'OZ',    base: 0,    color: '#d88ab8', heat: 0 },   // intermediate, not sold raw
  heroin: { name: 'HEROIN',     unit: 'BATCH', base: 140,  color: '#c49aff', heat: 3 },
  meth:   { name: 'METH',       unit: 'BAG',   base: 95,   color: '#7dffb8', heat: 2 },
  coke:   { name: 'COCAINE',    unit: 'UNIT',  base: 5500, color: '#9adfff', heat: 6 },
};

// ---------- businesses ----------
const BIZ = {
  still: {
    name: 'THE STILL', accent: '#e8c46a',
    blurb: "GRANDDAD'S RECIPE. TECHNICALLY A WAR CRIME.",
    tiers: [
      { name: 'BUILD THE STILL', cost: 25,   dur: 90, cap: 6,  mult: 1 },
      { name: 'COPPER COIL',     cost: 150,  dur: 60, cap: 6,  mult: 1 },
      { name: 'DOUBLE BARREL',   cost: 500,  dur: 60, cap: 12, mult: 1 },
      { name: "GRANDDAD'S CUT",  cost: 1500, dur: 45, cap: 12, mult: 1.5 },
    ],
  },
  poppy: {
    name: 'POPPY FIELD', accent: '#ff7eb0',
    blurb: 'JUST GARDENING, OFFICER.',
    plotCosts: [50, 120, 250, 500, 900, 1500],
    seed: 10, grow: 180,
    upgrades: [
      { id: 'fert',  name: 'REAL FERTILIZER', cost: 800,  desc: 'GROW TIME -33%' },
      { id: 'scare', name: 'SCARECROW COP',   cost: 1200, desc: 'HARVEST YIELD +20%' },
    ],
  },
  lab: {
    name: 'BUNKHOUSE LAB', accent: '#c49aff',
    blurb: 'THE BUNK BEDS ARE LOAD-BEARING.',
    cost: 400, opiumPer: 10, dur: 150,
    upgrades: [
      { id: 'burner2', name: 'SECOND BURNER', cost: 2000, desc: '2 BATCHES PER COOK' },
      { id: 'gear',    name: 'CLEAN GEAR',    cost: 3500, desc: 'QUALITY FLOOR 80%' },
    ],
  },
  meth: {
    name: 'CAMPER LAB', accent: '#7dffb8',
    blurb: 'SHE LEAKS, BUT ONLY FUMES.',
    cost: 2500, supplies: 30,
    upgrades: [
      { id: 'glass',    name: 'LAB GLASS',     cost: 4000,  desc: 'WIDER GREEN ZONE' },
      { id: 'scrubber', name: 'FUME SCRUBBER', cost: 7000,  desc: 'COOK HEAT -50%' },
      { id: 'bigrv',    name: 'BIG RV',        cost: 15000, desc: 'DOUBLE OUTPUT' },
    ],
  },
  coke: {
    name: 'THE DOCK', accent: '#9adfff',
    blurb: 'NIGHT RUNS ACROSS THE LAKE. BRING A PADDLE, JUST IN CASE.',
    cost: 30000, keyCost: 2000, unitsPerKey: 4,
    upgrades: [
      { id: 'hull',  name: 'TRENCH RUNNER HULL', cost: 20000, desc: 'FASTER BOAT' },
      { id: 'paint', name: 'NIGHT PAINT',        cost: 35000, desc: 'SMALLER SPOTLIGHTS' },
      { id: 'base',  name: 'LODGE BASEMENT',     cost: 25000, desc: 'CUT YIELD +50%' },
    ],
  },
  lodge: {
    name: 'THE LODGE', accent: '#ff6ea8',
    blurb: "HOT TUB'S BROKEN. BUSINESS MODEL ISN'T.",
    cost: 8000, maxGirls: 3,
    upgrades: [
      { id: 'wing',  name: 'SECOND WING',          cost: 20000, desc: 'ROOM FOR 6 GIRLS' },
      { id: 'disc',  name: 'DISCRETION TRAINING',  cost: 12000, desc: 'LODGE HEAT HALVED' },
      { id: 'exec',  name: 'EXECUTIVE PACKAGES',   cost: 50000, desc: 'RATES +75%' },
    ],
  },
};

// hideout services
const STASH_TIERS = [
  { name: 'NO STASH',        cost: 0,     prot: 0 },
  { name: 'FLOORBOARDS',     cost: 1000,  prot: 0.25 },
  { name: 'BURIED DRUMS',    cost: 5000,  prot: 0.5 },
  { name: 'THE OLD MINE',    cost: 20000, prot: 0.75 },
];
const LAWYER_TIERS = [
  { name: 'NO LAWYER',           cost: 0,     keep: 0.5 },
  { name: 'COUSIN-IN-LAW LARRY', cost: 3000,  keep: 0.65 },
  { name: 'BAY ST. SHARK',       cost: 15000, keep: 0.8 },
];
const BRIBE_BASE = 2500;

// ---------- buyers ----------
const BUYERS = [
  { id: 'barfly',   name: 'PETE AT THE LEGION', buys: ['shine'],                   mult: 1,   heatX: 0.5, cap: 20,
    desc: 'PAYS IN CRUMPLED TWENTIES. ASKS ZERO QUESTIONS.' },
  { id: 'bikers',   name: 'IRON SPLEEN MC',     buys: ['shine', 'heroin', 'meth'], mult: 0.8, heatX: 1,   cap: 99,
    desc: 'BULK RATES. DO NOT TOUCH THE BIKES.' },
  { id: 'tourists', name: 'LODGE GUESTS',       buys: ['shine', 'meth', 'coke'],   mult: 1.4, heatX: 2,   cap: 6, needs: 'lodge',
    desc: 'BACHELOR PARTIES FROM TORONTO. MONEY IS NO OBJECT.' },
  { id: 'mainland', name: 'MAINLAND RUN',       buys: ['heroin', 'meth', 'coke'],  mult: 1.8, heatX: 4,   cap: 99,
    desc: 'BEST PRICES ON THE LAKE. WORST PEOPLE ON THE LAKE.' },
];

// ---------- daily events ----------
const EVENTS = [
  { id: 'quiet',    name: 'QUIET DAY',       txt: 'NOTHING MOVES BUT THE LOONS.', fx: {} },
  { id: 'rally',    name: 'BIKER RALLY',     txt: 'IRON SPLEEN MC IS HOSTING. METH SELLS DOUBLE.', fx: { price: { meth: 2 } } },
  { id: 'derby',    name: 'FISHING DERBY',   txt: 'TOURISTS EVERYWHERE. LODGE EARNS +50%, BUT SO DO WITNESSES.', fx: { lodge: 1.5, heatX: 1.5 } },
  { id: 'crackdown',name: 'OPP CRACKDOWN',   txt: 'EXTRA CRUISERS ON THE FERRY. ALL HEAT GAINS DOUBLED.', fx: { heatX: 2 } },
  { id: 'drytown',  name: 'DRY TOWN',        txt: 'LCBO FERRY BROKE DOWN. MOONSHINE SELLS TRIPLE.', fx: { price: { shine: 3 } } },
  { id: 'snowbirds',name: 'SNOWBIRDS',       txt: 'RETIREES BACK FROM FLORIDA WITH EXPENSIVE HABITS. COKE +50%.', fx: { price: { coke: 1.5 } } },
  { id: 'powerout', name: 'POWER OUT',       txt: 'GENERATOR ONLY. ALL COOKS TAKE TWICE AS LONG.', fx: { cookX: 2 } },
  { id: 'wedding',  name: 'BUSH WEDDING',    txt: 'THE WHOLE TOWNSHIP IS DRUNK. SHINE +50%, HEAT -25%.', fx: { price: { shine: 1.5 }, heatX: 0.75 } },
  { id: 'inspector',name: 'HEALTH INSPECTOR',txt: 'SOMEBODY REPORTED THE LODGE KITCHEN. LODGE INCOME HALVED.', fx: { lodge: 0.5 } },
  { id: 'fog',      name: 'PEA SOUP FOG',    txt: "CAN'T SEE YOUR HAND. SMUGGLING RUNS ARE SAFER TONIGHT.", fx: { fog: true } },
  { id: 'hockey',   name: 'PLAYOFF NIGHT',   txt: 'EVERYONE IS AT THE LEGION. PETE BUYS DOUBLE QUANTITY.', fx: { peteCap: 2 } },
  { id: 'hydro',    name: 'HYDRO CREW',      txt: 'LINEMEN IN TOWN WITH PER-DIEMS. ALL STREET PRICES +20%.', fx: { priceAll: 1.2 } },
  { id: 'blackfly', name: 'BLACKFLY HATCH',  txt: 'THE BUGS WON. EVERYTHING OUTDOORS TAKES LONGER, HEAT -25%.', fx: { cookX: 1.3, heatX: 0.75 } },
  { id: 'bigfoot',  name: 'BIGFOOT SIGHTING',txt: 'TABLOIDS ON THE FERRY. OPP TOO BUSY FOR YOU. HEAT -50% TODAY.', fx: { heatX: 0.5 } },
];

const TIPS = [
  'SELL WHEN THE ARROW IS GREEN. BUY NOTHING AT FULL PRICE.',
  'THE MAINLAND PAYS BEST AND BURNS YOU FASTEST.',
  'LAY LOW BEFORE A BIG SALE, NOT AFTER.',
  "A HAPPY GIRL EARNS. A MAD ONE TALKS TO THE OPP.",
  'NEVER COOK ON A CRACKDOWN DAY.',
  'THE STILL PAYS FOR THE FARM. THE FARM PAYS FOR EVERYTHING ELSE.',
  'BRIBES GET PRICIER EVERY TIME BLANCHARD SEES YOUR FACE.',
  'STASH FIRST, FLASH LATER.',
];

// ---------- ranks ----------
const RANKS = [
  { at: 0,       name: 'SHINE RUNNER' },
  { at: 1000,    name: 'FARMHAND' },
  { at: 10000,   name: 'COOK' },
  { at: 100000,  name: 'DISTRIBUTOR' },
  { at: 1000000, name: 'KINGPIN OF HEMLOCK' },
];

// ---------- characters ----------
const GORD_LINES = [
  "GORD: I TOLD MARLENE WE GREW DECORATIVE POPPIES. SHE'S ORDERING A WREATH.",
  'GORD: A LOON LOOKED AT ME FUNNY TODAY. COULD BE A FED.',
  "GORD: THE CAMPER'S LEANING AGAIN. I PUT A HOCKEY STICK UNDER HER.",
  'GORD: PETE PAID ME IN SCRATCH TICKETS. ONE OF EM WON, SO, BUSINESS IS GOOD.',
  "GORD: I'M NOT SAYING I LICKED THE PRODUCT. I'M SAYING THE WEEK FLEW BY.",
  'GORD: BLANCHARD WAVED AT ME. I PANICKED AND WAVED BACK WITH BOTH HANDS.',
  "GORD: YOUR GRANDDAD WOULD BE PROUD. WELL. CONFUSED, THEN PROUD.",
  'GORD: TIM AT THE MARINA ASKS WHY WE GAS UP AT MIDNIGHT. I SAID NIGHT FISHING. HE SAID FOR WHAT. I SAID FISH.',
];
const GORD_WARN = [
  'GORD: CRUISER ON THE ICE ROAD. MAYBE COOL IT A DAY, EH?',
  "GORD: BLANCHARD'S ASKING ABOUT YOU AT THE LEGION. BY NAME.",
  'GORD: I COUNTED THREE HATS IN ONE BOAT. NOBODY FISHES IN A HAT LIKE THAT.',
  "GORD: SCANNER'S BEEN SAYING YOUR ROAD ALL MORNING.",
];

const BLANCHARD = { skin: '#e0a87c', hair: 'short', hairCol: '#5a4a3a', hat: '#2a3a55', shades: true, coat: '#2a3a55' };
const GORD_FACE = { skin: '#e8b48c', hair: 'bald', hairCol: '#7a6a55', stubble: true, coat: '#7a3520' };

// ---------- the lodge ----------
const LODGE_NAMES = ['CANDY', 'DESTINY', 'PEACHES', 'ROXY', 'CINNAMON', 'BAMBI', 'CRYSTAL', 'MISTY',
  'DIAMOND', 'ANGEL', 'GINGER', 'PORSCHE', 'VELVET', 'STARLA', 'BRANDI', 'JOLENE', 'TAMMY', 'SAPPHIRE'];
const LODGE_BIOS = [
  'FORMER FIGURE SKATER. STILL STICKS THE LANDING.',
  'CHARGES EXTRA IF YOU MENTION YOUR EX. SMART POLICY.',
  'CAME FOR THE FISHING DERBY IN 09. NEVER LEFT.',
  'CAN OPEN A BEER WITH ANYTHING. ANYTHING.',
  'HER LAST GUY RAN A CASINO. SHE RAN IT BETTER.',
  'SPEAKS FRENCH WHEN THE TIP IS RIGHT.',
  'BANNED FROM THE LEGION FOR WINNING TOO MUCH AT DARTS.',
  'DOES TAXES IN THE OFF-SEASON. FULLY BOOKED TIL MAY.',
  'SAYS SHE IS BETWEEN MODELLING CONTRACTS. HAS SAID IT SINCE 2011.',
  'KNOWS EVERY COP ON THE LAKE BY FIRST NAME AND WEAKNESS.',
  'HONOURS STUDENT. THIS PAYS BETTER THAN CO-OP.',
  'ALLERGIC TO CHEAPSKATES. BREAKS OUT IN ATTITUDE.',
];
const LODGE_QUIT = [
  'LEFT A NOTE: "THE HOT TUB WAS A METAPHOR FOR THIS WHOLE OPERATION. BROKEN."',
  'RAN OFF WITH A HYDRO LINEMAN. SAID HE HAD "STABLE CURRENT".',
  'QUIT VIA VOICEMAIL. THE VOICEMAIL WAS A SONG. IT SLAPPED, HONESTLY.',
  'TOOK THE GOOD ROBE AND THE GOOD VIBES.',
];
const LODGE_EVENTS = [
  { txt: 'A GUEST WANTS THE "FULL HEMLOCK EXPERIENCE." NOBODY KNOWS WHAT THAT IS.',
    a: { label: 'CHARGE TRIPLE', cash: [300, 900], mood: -5, heat: 3, line: 'YOU INVENTED IT ON THE SPOT. HE CRIED. HE TIPPED.' },
    b: { label: 'PLAY IT SAFE', cash: [80, 160], mood: 5, heat: 0, line: 'A GENTLE EVENING OF EUCHRE AND LIES.' } },
  { txt: 'A BACHELOR PARTY FROM TORONTO WANTS TO RENT THE WHOLE LODGE "AND THE HOT TUB".',
    a: { label: 'TAKE THE BOOKING', cash: [600, 1400], mood: -10, heat: 6, line: 'THE HOT TUB REMAINS BROKEN. THEY DID NOT NOTICE.' },
    b: { label: 'TURN THEM AWAY', cash: [0, 0], mood: 10, heat: -2, line: 'THE GIRLS PLAYED CRIB AND BAD-MOUTHED YOU LOVINGLY.' } },
  { txt: 'CANDY SAYS A GUEST "LOOKS LIKE A COP, SMELLS LIKE A COP, TIPS LIKE A COP."',
    a: { label: 'KICK HIM OUT', cash: [-100, -100], mood: 5, heat: -4, line: 'HE LEFT A ONE-STAR REVIEW. ON WHAT PLATFORM, NOBODY KNOWS.' },
    b: { label: 'TAKE HIS MONEY', cash: [200, 500], mood: -5, heat: 8, line: 'HE PAID WITH A GOVERNMENT CHEQUE. HMM.' } },
  { txt: 'THE GIRLS WANT A KARAOKE NIGHT. "FOR MORALE. AND TIPS."',
    a: { label: 'FUND IT ($300)', cash: [-300, -300], mood: 25, heat: 2, line: 'JOLENE SANG "JOLENE". THE LAKE WEPT. TIPS DOUBLED.' },
    b: { label: 'NO BUDGET', cash: [0, 0], mood: -10, heat: 0, line: 'THEY SANG ANYWAY, ABOUT YOU, UNFLATTERINGLY.' } },
  { txt: 'A REGULAR PROPOSED TO ROXY WITH A RING FROM A CRACKERJACK BOX.',
    a: { label: 'TOAST THE COUPLE', cash: [150, 300], mood: 15, heat: 1, line: 'SHE SAID NO BUT KEPT THE RING. EVERYONE DRANK TO THAT.' },
    b: { label: 'CHARGE A VENUE FEE', cash: [400, 700], mood: -5, heat: 2, line: 'YOU CATERED A REJECTION. FLAWLESS MARGINS.' } },
];

// ---------- raid / inspection flavor ----------
const RAID_LINES = [
  'THE OPP CAME IN LIKE IT WAS A SEASON FINALE.',
  'BLANCHARD HELD THE WARRANT UPSIDE DOWN. IT STILL COUNTED.',
  'THEY BROUGHT A DOG. THE DOG FOUND EVERYTHING. GOOD BOY. TERRIBLE DAY.',
];
const INSPECT_LINES = [
  'CONSTABLE BLANCHARD KNOCKS. "ROUTINE VISIT. MIND IF I SNIFF AROUND?"',
  'BLANCHARD AGAIN. "NEIGHBOUR REPORTED A SMELL. DESCRIBE YOUR HOBBIES."',
  '"EVENING. NICE NIGHT FOR... WHATEVER IT IS YOU DO OUT HERE."',
];
const EXPLODE_LINES = [
  'THE CAMPER HAS A SUNROOF NOW.',
  'THAT BATCH IS IN ORBIT.',
  'EYEBROWS GROW BACK. PROBABLY.',
];
