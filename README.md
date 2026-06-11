# REEL TROUBLE

A push-your-luck fishing game where beer is both your gas pedal *and* your brake —
drink to catch more, but get too tipsy and the cops will catch *you*.

16-bit style, pure vanilla JS + Canvas, zero dependencies, zero build step.

## Play

Open `index.html` in a browser. That's it. (Or serve the folder:
`npx serve .` / `python3 -m http.server`.)

## Controls

| Key | Action |
| --- | --- |
| Arrows / WASD | Steer the boat, move the casting reticle |
| SPACE | Cast / set power / strike / hold to reel |
| ENTER | Confirm, cash in at the dock |
| B | Crack a beer |
| S (hold) | Lay low when the patrol sweeps past |
| H | "Hold my beer" super-cast (buzz 6+, once per trip) |
| ESC | Pull anchor / back |
| M | Mute |

## How it works

**The Buzz meter** is the whole game. Every beer pushes Buzz up. Being buzzed is
genuinely good for fishing — fish bite faster and every fish landed while buzzed is
worth more at the weigh-in (nobody believes a sober man's fish story). But the
drunker you are, the more your hands shake: the reticle sways, the cast power bar
speeds up, the reel tension needle wanders, and your boat weaves. The legal limit
is 40%.

**The cops** sweep the lake. You get a telegraph — a siren chirp, a light on the
far shore — and a few seconds to act sober: stop weaving, hold **S** to lay low,
don't be mid-sip. Get caught over the limit and you blow the breathalyzer
minigame: the needle sways with your buzz, and way over the limit the green zone
shrinks to nearly nothing. Fail and you lose the whole cooler, the trip, and your
no-arrest streak.

**One trip:** boat out at 4 PM, anchor on weed beds (the stars rate the spot),
cast, strike on the `!`, keep tension in the green while the fish runs, and cash
in at the dock — or push it to the 9 PM sundown. Beer and cops are managed live
the entire time.

**What brings you back:**
- Gear treadmill — better rods (wider green zone, tougher line), bigger boats
  (more cooler, faster hull), fancier beer (more buzz, less shake)
- Three lakes — a sleepy no-patrol pond, proper bass water with one patrol, and a
  trophy reservoir crawling with rangers — each with its own legendary fish
- Daily lake report — date-seeded weather, a hot spot, and a fish of the day
  worth double
- The bar wall — biggest catch, best haul, drunkest *successful* trip, and your
  no-arrest streak
- Earl, your drunk boat buddy, who hands you free beers and narrates badly

## Dev

- `node test/smoke.js` — headless smoke test: boots the game with a stubbed DOM
  and plays through a full scripted trip (cast, hook, land, snap, breathalyzer
  pass/fail, bust, weigh-in), then soaks random input for crashes.
- `npm install canvas && node test/shots.js` — renders PNG screenshots of every
  scene (the only dev dependency; the game itself has none).

Drink responsibly. In-game, go nuts.
