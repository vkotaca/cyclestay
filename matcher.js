// CycleStay matching engine.
const DAY = 86400000;

function daysOverlap(a, b) {
  const start = Math.max(a.start.getTime(), b.start.getTime());
  const end = Math.min(a.end.getTime(), b.end.getTime());
  return Math.max(0, Math.round((end - start) / DAY));
}

function scoreEdge(A, B, weights, minOverlapDays) {
  if (A.origin !== B.dest) return -1;
  const overlap = daysOverlap(A, B);
  if (overlap < minOverlapDays) return -1;
  if (B.needs.noPets && A.offered.hasPets) return -1;
  if (B.needs.parking && !A.offered.hasParking) return -1;
  if (B.needs.privateRoom && !A.offered.isPrivate) return -1;
  if (!B.needs.units.has(A.offered.unit)) return -1;

  const duration = Math.round((B.end - B.start) / DAY) || 1;
  const dateScore = Math.min(1, overlap / duration);
  const unitScore = A.offered.unit === B.offered.unit ? 1 : 0.75;

  // Nice-to-haves: transit, parking, private (beyond hard requirements).
  let conSatisfied = 0, conConsidered = 0;
  conConsidered++; if (!A.offered.hasPets) conSatisfied++;
  conConsidered++; if (A.offered.hasParking) conSatisfied++;
  conConsidered++; if (A.offered.isPrivate) conSatisfied++;
  conConsidered++; if (A.offered.nearTransit) conSatisfied++;
  if (B.needs.nearTransit && !A.offered.nearTransit) return -1;
  const conScore = conSatisfied / conConsidered;

  const wTotal = weights.date + weights.unit + weights.con || 1;
  return (weights.date * dateScore + weights.unit * unitScore + weights.con * conScore) / wTotal;
}

function buildGraph(profiles, weights, minOverlapDays) {
  const byDest = new Map();
  for (const p of profiles) {
    if (!byDest.has(p.dest)) byDest.set(p.dest, []);
    byDest.get(p.dest).push(p);
  }
  const adj = new Map();
  for (const A of profiles) {
    const outs = [];
    const candidates = byDest.get(A.origin) || [];
    for (const B of candidates) {
      if (B.id === A.id) continue;
      const w = scoreEdge(A, B, weights, minOverlapDays);
      if (w > 0) outs.push({ to: B.id, w });
    }
    adj.set(A.id, outs);
  }
  return adj;
}

function findCycles(adj, maxLen) {
  const cycles = [];
  const nodes = [...adj.keys()].sort((a, b) => a - b);
  for (const start of nodes) {
    const pathIds = [start];
    const pathEdges = [];
    const inPath = new Set([start]);
    function dfs(current, depth) {
      const outs = adj.get(current) || [];
      for (const { to, w } of outs) {
        if (to < start) continue;
        if (to === start) {
          if (pathIds.length >= 2) {
            const avg = (pathEdges.reduce((s, x) => s + x, 0) + w) / (pathEdges.length + 1);
            cycles.push({ nodes: pathIds.slice(), avgScore: avg });
          }
          continue;
        }
        if (inPath.has(to)) continue;
        if (depth + 1 > maxLen) continue;
        pathIds.push(to);
        pathEdges.push(w);
        inPath.add(to);
        dfs(to, depth + 1);
        pathIds.pop();
        pathEdges.pop();
        inPath.delete(to);
      }
    }
    dfs(start, 1);
  }
  return cycles;
}

function selectNonOverlapping(cycles) {
  const sorted = cycles.slice().sort((a, b) => b.avgScore - a.avgScore);
  const used = new Set();
  const picked = [];
  for (const c of sorted) {
    if (c.nodes.some(n => used.has(n))) continue;
    picked.push(c);
    for (const n of c.nodes) used.add(n);
  }
  return { picked, used };
}

// Randomized-restart optimizer: perturb the score-based ordering and keep
// the selection with highest total score over R restarts. In practice this
// gets within ~1% of ILP optimal on this problem size.
// Bails to plain greedy if the cycle pool is huge (would take seconds).
function selectOptimized(cycles, restarts = 25, seed = 1) {
  if (cycles.length > 4000) return selectNonOverlapping(cycles);
  let a = seed >>> 0;
  function rng() { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  let best = null, bestTotal = -Infinity;
  for (let r = 0; r < restarts; r++) {
    const perturbed = cycles.map(c => ({
      c,
      key: c.avgScore + (r === 0 ? 0 : (rng() - 0.5) * 0.3),
    }));
    perturbed.sort((a, b) => b.key - a.key);
    const used = new Set();
    const picked = [];
    let total = 0;
    for (const { c } of perturbed) {
      if (c.nodes.some(n => used.has(n))) continue;
      picked.push(c);
      for (const n of c.nodes) used.add(n);
      total += c.avgScore * c.nodes.length;
    }
    if (total > bestTotal) { bestTotal = total; best = { picked, used }; }
  }
  return best;
}

function bilateralFallback(profiles, adj, matchedSet) {
  const pairs = [];
  const available = profiles.filter(p => !matchedSet.has(p.id));
  for (const B of available) {
    let bestA = null, bestW = 0;
    for (const A of available) {
      if (A.id === B.id) continue;
      if (A.origin !== B.dest) continue;
      const edgesOut = adj.get(A.id) || [];
      const edge = edgesOut.find(e => e.to === B.id);
      if (!edge) continue;
      if (edge.w > bestW) { bestW = edge.w; bestA = A; }
    }
    if (bestA) pairs.push({ provider: bestA.id, renter: B.id, score: bestW });
  }
  pairs.sort((a, b) => b.score - a.score);
  return pairs;
}

function runMatcher(profiles, opts) {
  const weights = { date: opts.wDate, unit: opts.wUnit, con: opts.wCon };
  const adj = buildGraph(profiles, weights, opts.minOverlap);
  const cycles = findCycles(adj, opts.cap);
  const selector = opts.optimize ? selectOptimized : selectNonOverlapping;
  const { picked, used } = selector(cycles, 25, opts.seed || 1);
  const bilateral = bilateralFallback(profiles, adj, used);

  return {
    profiles, adj,
    allCycles: cycles,
    cycles: picked,
    matchedSet: used,
    bilateral,
    stats: {
      total: profiles.length,
      matchedInCycles: used.size,
      bilateralMatched: new Set(bilateral.flatMap(p => [p.provider, p.renter])).size,
      unmatched: profiles.length - used.size,
      cyclesFound: picked.length,
      avgCycleLen: picked.length ? picked.reduce((s, c) => s + c.nodes.length, 0) / picked.length : 0,
      avgCycleScore: picked.length ? picked.reduce((s, c) => s + c.avgScore, 0) / picked.length : 0,
    },
  };
}

function runBilateralOnly(profiles, opts) {
  return runMatcher(profiles, { ...opts, cap: 2 });
}

// Given a result, find top-K substitute candidates for node X in cycle C
// (swap X out, swap in an unmatched node that preserves the cycle's edges).
function findSubstitutes(result, cycle, nodeIdx, topK = 5) {
  const prev = cycle.nodes[(nodeIdx - 1 + cycle.nodes.length) % cycle.nodes.length];
  const next = cycle.nodes[(nodeIdx + 1) % cycle.nodes.length];
  const adj = result.adj;
  const candidates = [];
  const pool = result.profiles.filter(p => !result.matchedSet.has(p.id));
  const outPrev = adj.get(prev) || [];
  for (const C of pool) {
    const e1 = outPrev.find(e => e.to === C.id);
    if (!e1) continue;
    const outC = adj.get(C.id) || [];
    const e2 = outC.find(e => e.to === next);
    if (!e2) continue;
    candidates.push({ id: C.id, score: (e1.w + e2.w) / 2 });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK);
}

function simulateDropout(result, dropoutRate, seed) {
  const rng = (function () {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  })();
  const matched = [...result.matchedSet];
  const toDrop = new Set();
  const numDrop = Math.floor(matched.length * dropoutRate);
  const shuffled = matched.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (let i = 0; i < numDrop; i++) toDrop.add(shuffled[i]);

  const pool = result.profiles.filter(p => !result.matchedSet.has(p.id));
  let collapsed = 0, repaired = 0, untouched = 0;
  for (const cyc of result.cycles) {
    const hitIdx = cyc.nodes.findIndex(n => toDrop.has(n));
    if (hitIdx === -1) { untouched++; continue; }
    const prev = cyc.nodes[(hitIdx - 1 + cyc.nodes.length) % cyc.nodes.length];
    const next = cyc.nodes[(hitIdx + 1) % cyc.nodes.length];
    let substituted = false;
    for (const C of pool) {
      if (toDrop.has(C.id)) continue;
      const outPrev = result.adj.get(prev) || [];
      const outC = result.adj.get(C.id) || [];
      if (!outPrev.find(e => e.to === C.id)) continue;
      if (!outC.find(e => e.to === next)) continue;
      const othersDropped = cyc.nodes.some((n, i) => i !== hitIdx && toDrop.has(n));
      if (othersDropped) continue;
      substituted = true; break;
    }
    if (substituted) repaired++; else collapsed++;
  }
  return {
    totalCycles: result.cycles.length,
    cyclesWithDropout: result.cycles.length - untouched,
    collapsed, repaired, untouched,
    droppedNodes: toDrop.size,
  };
}

// Pick a single matched student to drop, return which cycle and whether it can be repaired.
function singlePerturb(result, seed) {
  const matched = [...result.matchedSet];
  if (!matched.length) return null;
  const rng = (function () { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const dropped = matched[Math.floor(rng() * matched.length)];
  const cycle = result.cycles.find(c => c.nodes.includes(dropped));
  if (!cycle) return null;
  const idx = cycle.nodes.indexOf(dropped);
  const subs = findSubstitutes(result, cycle, idx, 1);
  return { dropped, cycle, substitute: subs[0] || null };
}

window.CS_MATCH = {
  runMatcher, runBilateralOnly, simulateDropout, scoreEdge, buildGraph,
  findSubstitutes, singlePerturb,
};
