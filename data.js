// Synthetic profile generator for CycleStay.
// Seeded RNG (mulberry32) for reproducibility.

const CITIES = ["SF", "NYC", "Boston", "Chicago", "Seattle", "LA", "Austin", "Miami", "DC"];
const UNIT_TYPES = ["studio", "1br", "2br+", "room"];
const FIRST_NAMES = ["Alex","Sam","Jordan","Taylor","Morgan","Casey","Riley","Jamie","Avery","Quinn",
  "Parker","Rowan","Sage","Drew","Reese","Cameron","Blake","Emerson","Hayden","Kendall",
  "Logan","Peyton","Skyler","Dakota","Finley","Harper","Jesse","Kai","Micah","Noel"];
const LAST_INITIALS = "ABCDEFGHIJKLMNOPRSTWZ";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Skew factor 0..1: 0 = fully balanced, 1 = heavy concentration.
// Returns a city distribution for origins (destinations are inverted).
function cityWeights(skew) {
  // Baseline: rough share of US tech/finance internship flows.
  const base = {
    SF:     1.8,
    NYC:    1.8,
    Boston: 1.0,
    Chicago:1.0,
    Seattle:1.2,
    LA:     1.0,
    Austin: 0.9,
    Miami:  0.7,
    DC:     0.8,
  };
  // Skewed origin: more people leaving SF & NYC, fewer from Austin/Miami.
  const skewedOrigin = {
    SF: 2.5, NYC: 2.5, Boston: 1.2, Chicago: 0.9, Seattle: 1.4,
    LA: 0.9, Austin: 0.5, Miami: 0.4, DC: 0.8,
  };
  // Skewed destination: inverse — Austin/Miami net receivers.
  const skewedDest = {
    SF: 1.0, NYC: 1.2, Boston: 0.9, Chicago: 0.9, Seattle: 1.1,
    LA: 1.0, Austin: 1.8, Miami: 1.8, DC: 1.0,
  };
  function blend(a, b, t) {
    const out = {};
    for (const c of CITIES) out[c] = a[c] * (1 - t) + b[c] * t;
    return out;
  }
  return {
    origin: blend(base, skewedOrigin, skew),
    dest:   blend(base, skewedDest,   skew),
  };
}

function pickWeighted(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Summer 2026 baseline window: Jun 1 – Aug 22 (~12 weeks).
// Each profile gets a start ± 7 days and length 10–14 weeks.
function generateDates(rng) {
  const baseStart = new Date(Date.UTC(2026, 5, 1)); // Jun 1 2026
  const jitterDays = Math.floor((rng() - 0.5) * 14); // ±7
  const start = new Date(baseStart);
  start.setUTCDate(start.getUTCDate() + jitterDays);
  const weeks = 10 + Math.floor(rng() * 5); // 10..14
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + weeks * 7);
  return { start, end };
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function generateProfiles({ n = 200, seed = 42, skew = 0.5 } = {}) {
  const rng = mulberry32(seed);
  const weights = cityWeights(skew);
  const profiles = [];

  for (let i = 0; i < n; i++) {
    let origin = pickWeighted(rng, weights.origin);
    let dest = pickWeighted(rng, weights.dest);
    // Avoid origin == dest
    let guard = 0;
    while (dest === origin && guard++ < 10) dest = pickWeighted(rng, weights.dest);
    if (dest === origin) dest = CITIES[(CITIES.indexOf(origin) + 1) % CITIES.length];

    const { start, end } = generateDates(rng);

    // Offered unit attributes
    const offeredUnit = pick(rng, UNIT_TYPES);
    const hasPets = rng() < 0.18;
    const hasParking = rng() < 0.45;
    const isPrivate = offeredUnit !== "room" ? true : rng() < 0.3;

    // Needed constraints (what the renter requires in their destination)
    const needsNoPets = rng() < 0.15;
    const needsParking = rng() < 0.25;
    const needsPrivate = rng() < 0.35;
    // Acceptable unit types for destination: always accepts own type + some others.
    const acceptable = new Set([offeredUnit]);
    for (const u of UNIT_TYPES) if (rng() < 0.5) acceptable.add(u);

    const name = pick(rng, FIRST_NAMES) + " " + pick(rng, LAST_INITIALS.split(""));

    profiles.push({
      id: i,
      name,
      origin,
      dest,
      start,
      end,
      offered: { unit: offeredUnit, hasPets, hasParking, isPrivate },
      needs: { noPets: needsNoPets, parking: needsParking, privateRoom: needsPrivate, units: acceptable },
    });
  }
  return profiles;
}

function profilesToCSV(profiles) {
  const header = ["id","name","origin","dest","start","end","offered_unit","offered_pets","offered_parking","offered_private","needs_nopets","needs_parking","needs_private","accepted_units"];
  const rows = profiles.map(p => [
    p.id,
    p.name,
    p.origin,
    p.dest,
    fmtDate(p.start),
    fmtDate(p.end),
    p.offered.unit,
    p.offered.hasPets,
    p.offered.hasParking,
    p.offered.isPrivate,
    p.needs.noPets,
    p.needs.parking,
    p.needs.privateRoom,
    [...p.needs.units].join("|"),
  ].join(","));
  return [header.join(","), ...rows].join("\n");
}

window.CS_DATA = { CITIES, UNIT_TYPES, generateProfiles, profilesToCSV, fmtDate, cityWeights };
