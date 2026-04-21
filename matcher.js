// CycleStay matching engine.
// - Build directed graph: edge A->B iff A's unit in city X satisfies B's needs at X and dates overlap.
// - Enumerate simple cycles up to a max length via bounded DFS.
// - Greedy-select non-overlapping cycles by descending avg pairwise score.
// - Bilateral fallback for unmatched.

const DAY = 86400000;

function daysOverlap(a, b) {
  const start = Math.max(a.start.getTime(), b.start.getTime());
  const end = Math.min(a.end.getTime(), b.end.getTime());
  return Math.max(0, Math.round((end - start) / DAY));
}

// Score edge A -> B (A offers a unit in A.origin that B needs at B.dest).
// Returns 0..1 or -1 if hard incompatible.
function scoreEdge(A, B, weights, minOverlapDays) {
  if (A.origin !== B.dest) return -1;

  const overlap = daysOverlap(A, B);
  if (overlap < minOverlapDays) return -1;

  // Hard constraint checks on what A offers vs what B needs.
  if (B.needs.noPets && A.offered.hasPets) return -1;
  if (B.needs.parking && !A.offered.hasParking) return -1;
  if (B.needs.privateRoom && !A.offered.isPrivate) return -1;
  if (!B.needs.units.has(A.offered.unit)) return -1;

  // Soft components:
  const duration = Math.round((B.end - B.start) / DAY) || 1;
  const dateScore = Math.min(1, overlap / duration);

  // Unit match is already a hard filter; bonus for exact match over fuzzy accept.
  const unitScore = A.offered.unit === B.offered.unit ? 1 : 0.75;

  // Constraint generosity: how many of B's "nice to haves" A also satisfies beyond hard needs.
  let conSatisfied = 0, conConsidered = 0;
  conConsidered++;
  if (!A.offered.hasPets) conSatisfied++;
  conConsidered++;
  if (A.offered.hasParking) conSatisfied++;
  conConsidered++;
  if (A.offered.isPrivate) conSatisfied++;
  const conScore = conSatisfied / conConsidered;

  const wTotal = weights.date + weights.unit + weights.con || 1;
  return (weights.date * dateScore + weights.unit * unitScore + weights.con * conScore) / wTotal;
}

function buildGraph(profiles, weights, minOverlapDays) {
  // Bucket by origin city so we only test candidates whose dest equals that city.
  const byDest = new Map();
  for (const p of profiles) {
    if (!byDest.has(p.dest)) byDest.set(p.dest, []);
    byDest.get(p.dest).push(p);
  }
  const adj = new Map(); // id -> [{to, w}]
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

// Enumerate simple cycles up to maxLen using bounded DFS.
// To avoid duplicate rotations, require each cycle's minimum-id node to be the start.
function findCycles(adj, maxLen) {
  const cycles = [];
  const nodes = [...adj.keys()].sort((a, b) => a - b);

  for (const start of nodes) {
    const pathIds = [start];
    const pathEdges = []; // weights along traversal
    const inPath = new Set([start]);

    function dfs(current, depth) {
      const outs = adj.get(current) || [];
      for (const { to, w } of outs) {
        if (to < start) continue; // canonical: start is min id in cycle
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

// Greedy pick non-overlapping cycles by descending avg score.
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

// Bilateral fallback: for each unmatched user B, find best A (unmatched) that satisfies B.
function bilateralFallback(profiles, adj, matchedSet, weights, minOverlapDays) {
  const pairs = [];
  const available = profiles.filter(p => !matchedSet.has(p.id));
  const availIds = new Set(available.map(p => p.id));

  for (const B of available) {
    let bestA = null, bestW = 0;
    // Find A such that A.origin === B.dest and A satisfies B. Reuse adj edges (we stored A->B weights).
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
  // Sort by score; dedupe by renter (top 20).
  pairs.sort((a, b) => b.score - a.score);
  return pairs;
}

function runMatcher(profiles, opts) {
  const weights = { date: opts.wDate, unit: opts.wUnit, con: opts.wCon };
  const adj = buildGraph(profiles, weights, opts.minOverlap);
  const cycles = findCycles(adj, opts.cap);
  const { picked, used } = selectNonOverlapping(cycles);
  const bilateral = bilateralFallback(profiles, adj, used, weights, opts.minOverlap);

  return {
    profiles,
    adj,
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

// Dropout simulation: remove dropoutRate fraction of matched nodes, then for each
// affected cycle try to repair via a single-node substitute from the unmatched pool.
function simulateDropout(result, dropoutRate, seed) {
  const rng = (function () {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
  const byId = new Map(result.profiles.map(p => [p.id, p]));

  let collapsed = 0, repaired = 0, untouched = 0;

  for (const cyc of result.cycles) {
    const hitIdx = cyc.nodes.findIndex(n => toDrop.has(n));
    if (hitIdx === -1) { untouched++; continue; }

    // Try substituting exactly one dropped node with a pool candidate.
    const dropped = cyc.nodes[hitIdx];
    const prev = cyc.nodes[(hitIdx - 1 + cyc.nodes.length) % cyc.nodes.length];
    const next = cyc.nodes[(hitIdx + 1) % cyc.nodes.length];
    const prevP = byId.get(prev), nextP = byId.get(next);

    let substituted = false;
    // Need a candidate C such that prev->C edge and C->next edge both exist in adj.
    for (const C of pool) {
      if (toDrop.has(C.id)) continue;
      const outPrev = result.adj.get(prev) || [];
      const outC = result.adj.get(C.id) || [];
      if (!outPrev.find(e => e.to === C.id)) continue;
      if (!outC.find(e => e.to === next)) continue;
      // Also need to ensure the rest of the cycle's members aren't also dropped.
      const othersDropped = cyc.nodes.some((n, i) => i !== hitIdx && toDrop.has(n));
      if (othersDropped) continue;
      substituted = true;
      break;
    }
    if (substituted) repaired++; else collapsed++;
  }

  return {
    totalCycles: result.cycles.length,
    cyclesWithDropout: result.cycles.length - untouched,
    collapsed,
    repaired,
    untouched,
    droppedNodes: toDrop.size,
  };
}

// Bilateral-only baseline: cap cycles at length 2 (pure pairwise swaps).
function runBilateralOnly(profiles, opts) {
  return runMatcher(profiles, { ...opts, cap: 2 });
}

window.CS_MATCH = { runMatcher, runBilateralOnly, simulateDropout, scoreEdge, buildGraph };
