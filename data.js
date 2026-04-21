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

// Hand-tuned flow priors reflecting public knowledge about U.S. student
// internship flows: NYC dominant for finance, SF dominant for tech, Seattle
// for big-tech (Amazon/Microsoft), Austin rising, Miami emerging fintech.
// Origin = where students live during the school year; destination = where
// they intern. These are intentionally illustrative, not scraped live.
function cityWeights(skew) {
  // Baseline: roughly balanced, with small natural skew from university populations.
  const base = {
    SF: 1.8, NYC: 1.8, Boston: 1.6, Chicago: 1.1, Seattle: 1.1,
    LA: 1.2, Austin: 1.0, Miami: 0.7, DC: 1.0,
  };
  // Realistic origin: where college populations concentrate.
  const realOrigin = {
    SF: 2.2, NYC: 2.0, Boston: 2.2, Chicago: 1.2, Seattle: 1.0,
    LA: 1.3, Austin: 1.0, Miami: 0.6, DC: 0.9,
  };
  // Realistic destination: internship market concentration.
  const realDest = {
    SF: 2.6, NYC: 2.8, Boston: 1.2, Chicago: 1.4, Seattle: 1.8,
    LA: 1.3, Austin: 1.5, Miami: 0.7, DC: 1.0,
  };
  function blend(a, b, t) {
    const out = {};
    for (const c of CITIES) out[c] = a[c] * (1 - t) + b[c] * t;
    return out;
  }
  return {
    origin: blend(base, realOrigin, skew),
    dest:   blend(base, realDest,   skew),
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

// Summer 2026 baseline: Jun 1 – Aug 22 (~12 weeks). Each profile is jittered
// ±7 days on start and has a 10–14 week duration.
function generateDates(rng) {
  const baseStart = new Date(Date.UTC(2026, 5, 1));
  const jitterDays = Math.floor((rng() - 0.5) * 14);
  const start = new Date(baseStart);
  start.setUTCDate(start.getUTCDate() + jitterDays);
  const weeks = 10 + Math.floor(rng() * 5);
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
    let guard = 0;
    while (dest === origin && guard++ < 10) dest = pickWeighted(rng, weights.dest);
    if (dest === origin) dest = CITIES[(CITIES.indexOf(origin) + 1) % CITIES.length];

    const { start, end } = generateDates(rng);

    const offeredUnit = pick(rng, UNIT_TYPES);
    const hasPets = rng() < 0.18;
    const hasParking = rng() < 0.45;
    const isPrivate = offeredUnit !== "room" ? true : rng() < 0.3;
    const nearTransit = rng() < 0.7;

    const needsNoPets = rng() < 0.15;
    const needsParking = rng() < 0.25;
    const needsPrivate = rng() < 0.35;
    const needsTransit = rng() < 0.4;
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
      offered: { unit: offeredUnit, hasPets, hasParking, isPrivate, nearTransit },
      needs: { noPets: needsNoPets, parking: needsParking, privateRoom: needsPrivate, nearTransit: needsTransit, units: acceptable },
    });
  }
  return profiles;
}

function profilesToCSV(profiles) {
  const header = ["id","name","origin","dest","start","end","offered_unit","offered_pets","offered_parking","offered_private","offered_transit","needs_nopets","needs_parking","needs_private","needs_transit","accepted_units"];
  const rows = profiles.map(p => [
    p.id, p.name, p.origin, p.dest, fmtDate(p.start), fmtDate(p.end),
    p.offered.unit, p.offered.hasPets, p.offered.hasParking, p.offered.isPrivate, p.offered.nearTransit,
    p.needs.noPets, p.needs.parking, p.needs.privateRoom, p.needs.nearTransit,
    [...p.needs.units].join("|"),
  ].join(","));
  return [header.join(","), ...rows].join("\n");
}

window.CS_DATA = { CITIES, UNIT_TYPES, generateProfiles, profilesToCSV, fmtDate, cityWeights };
