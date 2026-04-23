// UI glue for CycleStay prototype.
(function () {
"use strict";

if (!window.CS_DATA || !window.CS_MATCH || !window.CS_VIZ) {
  console.error("CycleStay: required modules missing", {
    CS_DATA: !!window.CS_DATA, CS_MATCH: !!window.CS_MATCH, CS_VIZ: !!window.CS_VIZ,
  });
  return;
}

const { generateProfiles, profilesToCSV, fmtDate, CITIES } = window.CS_DATA;
const { runMatcher, runBilateralOnly, simulateDropout, singlePerturb, findSubstitutes } = window.CS_MATCH;
const {
  renderMap, animateCycle, animatePerturb, renderSankey, renderHeatmap,
  renderSparkline, renderCycleCards, renderSensitivityHeatmap, renderErrorBars,
  highlightCycleOnMap, svgToPNG,
} = window.CS_VIZ;

let lastResult = null;
let lastProfiles = null;
let lastBilateralOnly = null;

const SAVINGS_PER_USER = 4500;

// ----- Tabs -----
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ----- Sliders -----
function bindRange(id) {
  const el = document.getElementById(id);
  const out = document.getElementById(id + "-v");
  if (!el || !out) return;
  const update = () => { out.textContent = Number(el.value).toFixed(2); };
  el.addEventListener("input", update);
  update();
}
["skew","w-date","w-unit","w-con"].forEach(bindRange);

function readParams() {
  return {
    n: +document.getElementById("n").value,
    seed: +document.getElementById("seed").value,
    skew: +document.getElementById("skew").value,
    wDate: +document.getElementById("w-date").value,
    wUnit: +document.getElementById("w-unit").value,
    wCon: +document.getElementById("w-con").value,
    cap: +document.getElementById("cap").value,
    minOverlap: +document.getElementById("minov").value,
    optimize: document.getElementById("optimize").checked,
  };
}

function writeParams(p) {
  if (p.n != null) document.getElementById("n").value = p.n;
  if (p.seed != null) document.getElementById("seed").value = p.seed;
  if (p.skew != null) { document.getElementById("skew").value = p.skew; document.getElementById("skew-v").textContent = Number(p.skew).toFixed(2); }
  if (p.wDate != null) { document.getElementById("w-date").value = p.wDate; document.getElementById("w-date-v").textContent = Number(p.wDate).toFixed(2); }
  if (p.wUnit != null) { document.getElementById("w-unit").value = p.wUnit; document.getElementById("w-unit-v").textContent = Number(p.wUnit).toFixed(2); }
  if (p.wCon != null) { document.getElementById("w-con").value = p.wCon; document.getElementById("w-con-v").textContent = Number(p.wCon).toFixed(2); }
  if (p.cap != null) document.getElementById("cap").value = p.cap;
  if (p.minOverlap != null) document.getElementById("minov").value = p.minOverlap;
  if (p.optimize != null) document.getElementById("optimize").checked = !!p.optimize;
}

// ----- URL sync -----
function paramsToHash(p) {
  try { return "#p=" + encodeURIComponent(btoa(JSON.stringify(p))); } catch { return ""; }
}
function hashToParams() {
  const m = location.hash.match(/^#p=(.+)$/);
  if (!m) return null;
  try { return JSON.parse(atob(decodeURIComponent(m[1]))); } catch { return null; }
}

// ----- Helpers -----
function byId(profiles) { const m = new Map(); for (const p of profiles) m.set(p.id, p); return m; }

function fmtMoney(n) {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

function showSpinner(text) {
  const s = document.getElementById("spinner");
  document.getElementById("spinner-text").textContent = text || "Working…";
  s.removeAttribute("hidden");
}
function hideSpinner() { document.getElementById("spinner").setAttribute("hidden", ""); }
function stdev(arr) {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

// ----- Rendering -----
function renderHero(result) {
  const s = result.stats;
  const savings = s.matchedInCycles * SAVINGS_PER_USER;
  document.getElementById("savings").textContent = fmtMoney(savings);
  document.getElementById("savings-sub").textContent =
    `Across ${s.matchedInCycles} matched students (${(s.matchedInCycles / s.total * 100).toFixed(0)}% of ${s.total}) at ~$${SAVINGS_PER_USER.toLocaleString()} saved each vs. Airbnb rates.`;
  document.getElementById("hs-cycle").textContent = `${s.matchedInCycles} / ${s.total}`;
  document.getElementById("hs-cycles-n").textContent = s.cyclesFound;
  document.getElementById("hs-cycle-len").textContent = s.avgCycleLen.toFixed(2);
}

function renderCycles(result) {
  const host = document.getElementById("cycles");
  host.innerHTML = "";
  if (!result.cycles.length) {
    host.innerHTML = '<div class="muted">No cycles found. Try lowering min date overlap or raising cycle cap.</div>';
    return;
  }
  const sorted = result.cycles.slice().sort((a, b) => b.nodes.length - a.nodes.length || b.avgScore - a.avgScore);
  const map = byId(result.profiles);
  sorted.forEach((c) => {
    const el = document.createElement("div");
    el.className = "cycle len-" + c.nodes.length;
    const chain = c.nodes.map(n => {
      const p = map.get(n);
      return `${p.name} (${p.origin}\u2192${p.dest})`;
    }).join(' <span class="arrow">\u2192</span> ');
    const first = map.get(c.nodes[0]);
    el.innerHTML = `
      <div class="cycle-head">
        <span>Length ${c.nodes.length} cycle</span>
        <span class="score">score ${c.avgScore.toFixed(3)}</span>
      </div>
      <div class="chain">${chain} <span class="arrow">\u2192</span> ${first.name}</div>
      <div class="cycle-expand" hidden></div>
    `;
    const expand = el.querySelector(".cycle-expand");
    el.addEventListener("click", (ev) => {
      // Avoid re-toggling when clicking a Swap button inside.
      if (ev.target.closest(".swap-btn")) return;
      if (expand.hasAttribute("hidden")) {
        expand.innerHTML = renderCycleCards(result.profiles, c.nodes, { swappable: true });
        expand.removeAttribute("hidden");
        expand.querySelectorAll(".swap-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            openSwapModal(c, +btn.dataset.idx);
          });
        });
      } else {
        expand.setAttribute("hidden", "");
        expand.innerHTML = "";
      }
    });
    host.appendChild(el);
  });
}

function renderBilateral(result) {
  const host = document.getElementById("bilateral");
  host.innerHTML = "";
  const map = byId(result.profiles);
  const top = result.bilateral.slice(0, 20);
  if (!top.length) {
    host.innerHTML = '<div class="muted">No bilateral matches in unmatched pool.</div>';
    return;
  }
  for (const pair of top) {
    const A = map.get(pair.provider), B = map.get(pair.renter);
    const el = document.createElement("div");
    el.className = "pair";
    el.innerHTML = `
      <div class="pair-head">
        <span>${A.name} \u2192 ${B.name}</span>
        <span class="score">score ${pair.score.toFixed(3)}</span>
      </div>
      <div class="chain muted">${A.name} offers ${A.offered.unit} in ${A.origin} (${fmtDate(A.start)}\u2013${fmtDate(A.end)}); ${B.name} needs ${B.dest}</div>
    `;
    host.appendChild(el);
  }
}

function renderSummary(result) {
  const s = result.stats;
  const matchRate = ((s.matchedInCycles / s.total) * 100).toFixed(1);
  document.getElementById("summary").textContent =
    `${s.total} profiles · ${s.cyclesFound} cycles · ${s.matchedInCycles} in cycles (${matchRate}%) · avg len ${s.avgCycleLen.toFixed(2)} · avg score ${s.avgCycleScore.toFixed(3)}`;
}

function renderCompare(cycleResult, bilateralResult) {
  const host = document.getElementById("compare-bars");
  const cycleRate = cycleResult.stats.matchedInCycles / cycleResult.stats.total;
  const bilateralRate = bilateralResult.stats.matchedInCycles / bilateralResult.stats.total;
  const lift = cycleRate - bilateralRate;
  host.innerHTML = `
    <div class="bar-row">
      <div class="bar-label">Bilateral only</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(bilateralRate * 100).toFixed(1)}%; background:#53565A"></div></div>
      <div class="bar-val">${(bilateralRate * 100).toFixed(1)}%</div>
    </div>
    <div class="bar-row">
      <div class="bar-label">Cycle-finding</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(cycleRate * 100).toFixed(1)}%"></div></div>
      <div class="bar-val">${(cycleRate * 100).toFixed(1)}%</div>
    </div>
    <div class="compare-note">Cycle-finding lifts match rate by <b>+${(lift * 100).toFixed(1)}pp</b> &mdash; the platform's core thesis.</div>
  `;
}

function renderDataTable(profiles) {
  const host = document.getElementById("data-table");
  const isReal = profiles.some(p => p.recordId);
  const extra = isReal ? "<th>status</th><th>action</th>" : "";
  const head = `<tr><th>id</th><th>name</th><th>origin</th><th>dest</th><th>start</th><th>end</th><th>unit</th>${extra}</tr>`;
  const rows = profiles.map(p => {
    const action = isReal
      ? `<td>${p.status || ""}</td><td>${p.recordId ? `<button class="mini-btn" data-id="${p.recordId}" data-status="matched">Mark matched</button>` : ""}</td>`
      : "";
    return `<tr>
      <td>${p.id}</td><td>${p.name}</td><td>${p.origin}</td><td>${p.dest}</td>
      <td>${fmtDate(p.start)}</td><td>${fmtDate(p.end)}</td>
      <td>${p.offered.unit}</td>
      ${action}
    </tr>`;
  }).join("");
  host.innerHTML = `<table>${head}${rows}</table>`;
  host.querySelectorAll(".mini-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "…";
      try {
        await window.CS_ADMIN.patchListing(btn.dataset.id, btn.dataset.status);
        btn.textContent = "✓ Updated";
      } catch (e) {
        btn.textContent = "Error";
        btn.disabled = false;
      }
    });
  });
}

function renderCyclePicker(result) {
  const host = document.getElementById("cycle-picker");
  host.innerHTML = "";
  const map = byId(result.profiles);
  if (!result.cycles.length) {
    host.innerHTML = '<div class="muted">No cycles to replay.</div>';
    return;
  }
  const sorted = result.cycles.slice().sort((a, b) => b.nodes.length - a.nodes.length || b.avgScore - a.avgScore);
  sorted.slice(0, 24).forEach(c => {
    const chip = document.createElement("button");
    chip.className = "cycle-chip";
    const cities = c.nodes.map(n => map.get(n).origin).join("\u2192");
    chip.innerHTML = `<span class="chip-len">L${c.nodes.length}</span> ${cities} <span class="chip-score">${c.avgScore.toFixed(2)}</span>`;
    chip.addEventListener("click", () => {
      animateCycle(document.getElementById("map"), result, c);
      wireMapClicks();
    });
    host.appendChild(chip);
  });
}

function computeSparkline(baseParams) {
  const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const points = steps.map(sk => {
    const profiles = generateProfiles({ n: baseParams.n, seed: baseParams.seed, skew: sk });
    const r = runMatcher(profiles, baseParams);
    return { x: sk, y: r.stats.matchedInCycles / r.stats.total };
  });
  renderSparkline(document.getElementById("sparkline"), points);
}

function wireMapClicks() {
  const pins = document.querySelectorAll("#map .city-pin");
  pins.forEach(pin => {
    pin.addEventListener("click", () => {
      const city = pin.dataset.city;
      showCityCycles(city);
    });
  });
}

function showCityCycles(city) {
  const info = document.getElementById("map-city-info");
  if (!lastResult) { info.textContent = ""; return; }
  const map = byId(lastResult.profiles);
  const matching = lastResult.cycles.filter(c =>
    c.nodes.some(n => {
      const p = map.get(n);
      return p.origin === city || p.dest === city;
    })
  );
  if (!matching.length) { info.innerHTML = `<b>${city}</b>: no cycles pass through this city.`; return; }
  const top = matching.slice().sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
  info.innerHTML = `<b>${city}</b>: ${matching.length} cycle${matching.length > 1 ? "s" : ""} through this city. Top ${top.length}:<br>` +
    top.map(c => {
      const chain = c.nodes.map(n => map.get(n).origin).join("\u2192");
      return `&nbsp;&nbsp;L${c.nodes.length}: ${chain} &nbsp;(score ${c.avgScore.toFixed(3)})`;
    }).join("<br>");
  // Highlight the first on the map
  highlightCycleOnMap(document.getElementById("map"), lastResult, top[0]);
}

async function runAll() {
  const params = readParams();
  const source = window.CS_ADMIN?.getDataSource?.() || "synthetic";
  const sourceStatus = document.getElementById("source-status");

  if (source === "real") {
    try {
      if (sourceStatus) sourceStatus.textContent = "Loading submissions…";
      lastProfiles = await window.CS_ADMIN.fetchListings();
      if (!lastProfiles.length) {
        if (sourceStatus) sourceStatus.textContent = "No Airtable submissions yet — falling back to synthetic.";
        lastProfiles = generateProfiles({ n: params.n, seed: params.seed, skew: params.skew });
      } else {
        if (sourceStatus) sourceStatus.textContent = `Loaded ${lastProfiles.length} real submissions from Airtable.`;
      }
    } catch (e) {
      if (sourceStatus) sourceStatus.textContent = `Fetch failed (${e.message}) — falling back to synthetic.`;
      lastProfiles = generateProfiles({ n: params.n, seed: params.seed, skew: params.skew });
    }
  } else {
    if (sourceStatus) sourceStatus.textContent = "";
    lastProfiles = generateProfiles({ n: params.n, seed: params.seed, skew: params.skew });
  }
  lastResult = runMatcher(lastProfiles, params);
  lastBilateralOnly = runBilateralOnly(lastProfiles, params);

  renderHero(lastResult);
  renderSummary(lastResult);
  renderCycles(lastResult);
  renderBilateral(lastResult);
  renderCompare(lastResult, lastBilateralOnly);
  renderDataTable(lastProfiles);

  renderMap(document.getElementById("map"), lastResult);
  wireMapClicks();
  renderSankey(document.getElementById("sankey"), lastResult);
  renderHeatmap(document.getElementById("heatmap"), lastResult);
  renderCyclePicker(lastResult);

  computeSparkline(params);

  // Sync URL
  history.replaceState(null, "", paramsToHash(params));
}

document.getElementById("run").addEventListener("click", () => { runAll(); });

// Wire the data source radio buttons
document.querySelectorAll('input[name="source"]').forEach(r => {
  r.addEventListener("change", () => {
    if (window.CS_ADMIN) window.CS_ADMIN.setDataSource(r.value);
    runAll();
  });
});

// Expose re-run hook for admin.js (called after successful admin login)
window.CS_APP_READY = () => { runAll(); };

// Live sparkline as user drags skew
let skewTimer = null;
document.getElementById("skew").addEventListener("input", () => {
  clearTimeout(skewTimer);
  skewTimer = setTimeout(() => {
    computeSparkline(readParams());
  }, 120);
});

// ----- Personas -----
const PERSONAS = {
  mba:      { n: 180, seed: 42, skew: 0.7, wDate: 0.5, wUnit: 0.3, wCon: 0.2, cap: 4, minOverlap: 56, optimize: true },
  mscs:     { n: 260, seed: 42, skew: 0.85, wDate: 0.55, wUnit: 0.25, wCon: 0.2, cap: 4, minOverlap: 70, optimize: true },
  undergrad:{ n: 140, seed: 42, skew: 0.3, wDate: 0.5, wUnit: 0.3, wCon: 0.2, cap: 3, minOverlap: 35, optimize: false },
};
document.querySelectorAll(".persona").forEach(btn => {
  btn.addEventListener("click", () => {
    const preset = PERSONAS[btn.dataset.persona];
    if (!preset) return;
    writeParams(preset);
    runAll();
    window.scrollTo({ top: document.getElementById("tab-match").offsetTop, behavior: "smooth" });
  });
});

// ----- Export / Share -----
document.getElementById("share-link").addEventListener("click", async () => {
  const url = location.origin + location.pathname + paramsToHash(readParams());
  try {
    await navigator.clipboard.writeText(url);
    flashStatus("#summary", "Link copied to clipboard ✓", 1800);
  } catch {
    prompt("Copy this link:", url);
  }
});

function flashStatus(selector, text, ms) {
  const el = document.querySelector(selector);
  const old = el.textContent;
  el.textContent = text;
  setTimeout(() => { el.textContent = old; }, ms);
}

document.getElementById("export-png").addEventListener("click", () => {
  const svg = document.querySelector("#map svg");
  if (!svg) { alert("Run a match first."); return; }
  svgToPNG(svg, "cyclestay-map.png", 2);
});

document.getElementById("export-md").addEventListener("click", () => {
  if (!lastResult) { alert("Run a match first."); return; }
  const s = lastResult.stats;
  const b = lastBilateralOnly.stats;
  const savings = s.matchedInCycles * SAVINGS_PER_USER;
  const lift = ((s.matchedInCycles - b.matchedInCycles) / s.total) * 100;
  const params = readParams();
  const md = [
    "# CycleStay — Match Summary",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Profiles: ${s.total}`,
    `- Seed: ${params.seed}, Skew: ${params.skew}, Cap: ${params.cap}, Min overlap: ${params.minOverlap} days`,
    `- Optimizer: ${params.optimize ? "local-search (near-optimal)" : "greedy"}`,
    "",
    "## Results",
    `- **Matched in cycles:** ${s.matchedInCycles} / ${s.total} (${(s.matchedInCycles/s.total*100).toFixed(1)}%)`,
    `- **Cycles found:** ${s.cyclesFound} (avg length ${s.avgCycleLen.toFixed(2)}, avg score ${s.avgCycleScore.toFixed(3)})`,
    `- **Bilateral-only baseline:** ${b.matchedInCycles} / ${b.total} (${(b.matchedInCycles/b.total*100).toFixed(1)}%)`,
    `- **Cycle lift over bilateral:** +${lift.toFixed(1)}pp`,
    `- **Estimated student savings:** ${fmtMoney(savings)} (at ~$${SAVINGS_PER_USER}/user vs. Airbnb)`,
    "",
    "## Top cycles",
    ...lastResult.cycles.slice(0, 10).map((c, i) => {
      const map = byId(lastResult.profiles);
      const chain = c.nodes.map(n => `${map.get(n).name} (${map.get(n).origin}→${map.get(n).dest})`).join(" → ");
      return `${i + 1}. [len ${c.nodes.length}, score ${c.avgScore.toFixed(3)}] ${chain}`;
    }),
    "",
    "## Share link",
    location.origin + location.pathname + paramsToHash(params),
    "",
  ].join("\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cyclestay-summary.md";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("download-csv").addEventListener("click", () => {
  if (!lastProfiles) { alert("Generate profiles first (Match tab)."); return; }
  const csv = profilesToCSV(lastProfiles);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cyclestay_profiles.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// ----- Perturb -----
document.getElementById("perturb-btn").addEventListener("click", () => {
  if (!lastResult || !lastResult.cycles.length) return;
  const status = document.getElementById("perturb-status");
  const perturb = singlePerturb(lastResult, Date.now() & 0xffff);
  if (!perturb) { status.textContent = "No matched students to drop."; return; }
  const map = byId(lastResult.profiles);
  const dropped = map.get(perturb.dropped);
  animatePerturb(document.getElementById("map"), lastResult, perturb);
  wireMapClicks();
  if (perturb.substitute) {
    const sub = map.get(perturb.substitute.id);
    status.innerHTML = `<span style="color:#8C1515">\u26a0</span> ${dropped.name} (${dropped.origin}) dropped. Repair found: swap in <b>${sub.name}</b> (score ${perturb.substitute.score.toFixed(3)}). Cycle holds.`;
  } else {
    status.innerHTML = `<span style="color:#820000">\u00D7</span> ${dropped.name} (${dropped.origin}) dropped. No substitute in unmatched pool. Cycle collapses.`;
  }
});

// ----- Swap modal -----
let currentSwap = null;
function openSwapModal(cycle, nodeIdx) {
  const map = byId(lastResult.profiles);
  const subs = findSubstitutes(lastResult, cycle, nodeIdx, 8);
  const dropped = map.get(cycle.nodes[nodeIdx]);
  document.getElementById("swap-title").textContent = `Swap ${dropped.name} out of cycle`;
  const host = document.getElementById("swap-list");
  if (!subs.length) {
    host.innerHTML = '<div class="muted">No viable substitutes in the unmatched pool.</div>';
  } else {
    host.innerHTML = subs.map(s => {
      const p = map.get(s.id);
      return `<div class="swap-row" data-id="${s.id}">
        <div>
          <b>${p.name}</b>
          <span class="muted"> · ${p.origin}\u2192${p.dest} · ${p.offered.unit} · ${fmtDate(p.start)}\u2013${fmtDate(p.end)}</span>
        </div>
        <div class="score">score ${s.score.toFixed(3)}</div>
      </div>`;
    }).join("");
    host.querySelectorAll(".swap-row").forEach(row => {
      row.addEventListener("click", () => {
        const id = +row.dataset.id;
        applySwap(cycle, nodeIdx, id);
      });
    });
  }
  currentSwap = { cycle, nodeIdx };
  document.getElementById("swap-modal").removeAttribute("hidden");
}
document.getElementById("swap-close").addEventListener("click", () => {
  document.getElementById("swap-modal").setAttribute("hidden", "");
});
function applySwap(cycle, nodeIdx, newId) {
  // Mutate the cycle in lastResult and re-render.
  const oldId = cycle.nodes[nodeIdx];
  cycle.nodes[nodeIdx] = newId;
  lastResult.matchedSet.delete(oldId);
  lastResult.matchedSet.add(newId);
  // Recompute cycle avgScore from the adjacency.
  let total = 0;
  for (let i = 0; i < cycle.nodes.length; i++) {
    const a = cycle.nodes[i];
    const b = cycle.nodes[(i + 1) % cycle.nodes.length];
    const edge = (lastResult.adj.get(a) || []).find(e => e.to === b);
    total += edge ? edge.w : 0;
  }
  cycle.avgScore = total / cycle.nodes.length;
  document.getElementById("swap-modal").setAttribute("hidden", "");
  renderCycles(lastResult);
  renderCyclePicker(lastResult);
  renderMap(document.getElementById("map"), lastResult);
  wireMapClicks();
  highlightCycleOnMap(document.getElementById("map"), lastResult, cycle);
}

// ----- Evaluation -----
function scenario(label, overrides, params) {
  const p = { ...params, ...overrides };
  const profiles = generateProfiles({ n: p.n, seed: p.seed, skew: p.skew });
  const res = runMatcher(profiles, p);
  const s = res.stats;
  const bilateralIds = new Set(res.bilateral.flatMap(pair => [pair.provider, pair.renter]));
  const bilateralUnique = [...bilateralIds].filter(id => !res.matchedSet.has(id)).length;
  return {
    label,
    matchRate: s.matchedInCycles / s.total,
    bilateralRate: bilateralUnique / s.total,
    totalServedRate: (s.matchedInCycles + bilateralUnique) / s.total,
    avgCycleLen: s.avgCycleLen,
    avgCycleScore: s.avgCycleScore,
    cyclesFound: s.cyclesFound,
    result: res,
  };
}

function renderEvalResults(scenarios) {
  const host = document.getElementById("eval-results");
  host.innerHTML = "";
  for (const sc of scenarios) {
    const el = document.createElement("div");
    el.className = "scenario";
    el.innerHTML = `
      <h3>${sc.label}</h3>
      <div class="metrics">
        <div class="metric"><div class="metric-label">Cycle match rate</div><div class="metric-value">${(sc.matchRate * 100).toFixed(1)}%</div></div>
        <div class="metric"><div class="metric-label">+ Bilateral</div><div class="metric-value">${(sc.totalServedRate * 100).toFixed(1)}%</div></div>
        <div class="metric"><div class="metric-label">Cycles found</div><div class="metric-value">${sc.cyclesFound}</div></div>
        <div class="metric"><div class="metric-label">Avg cycle length</div><div class="metric-value">${sc.avgCycleLen.toFixed(2)}</div></div>
        <div class="metric"><div class="metric-label">Avg cycle score</div><div class="metric-value">${sc.avgCycleScore.toFixed(3)}</div></div>
      </div>
    `;
    host.appendChild(el);
  }
}

function renderDropout(results) {
  const host = document.getElementById("dropout-results");
  host.innerHTML = "";
  for (const { label, dropout } of results) {
    const el = document.createElement("div");
    el.className = "scenario";
    const repairRate = dropout.cyclesWithDropout ? (dropout.repaired / dropout.cyclesWithDropout * 100).toFixed(1) : "0.0";
    el.innerHTML = `
      <h3>${label}</h3>
      <div class="metrics">
        <div class="metric"><div class="metric-label">Cycles hit</div><div class="metric-value">${dropout.cyclesWithDropout} / ${dropout.totalCycles}</div></div>
        <div class="metric"><div class="metric-label">Repaired</div><div class="metric-value">${dropout.repaired}</div></div>
        <div class="metric"><div class="metric-label">Collapsed</div><div class="metric-value">${dropout.collapsed}</div></div>
        <div class="metric"><div class="metric-label">Repair rate</div><div class="metric-value">${repairRate}%</div></div>
      </div>
    `;
    host.appendChild(el);
  }
}

document.getElementById("run-eval").addEventListener("click", () => {
  const params = readParams();
  const scenarios = [
    scenario("Balanced (skew=0)", { skew: 0, n: params.n }, params),
    scenario("Realistic (skew=1)", { skew: 1, n: params.n }, params),
    scenario("Sparse (n=60, skew=0.5)", { skew: 0.5, n: 60 }, params),
  ];
  renderEvalResults(scenarios);
  renderDropout(scenarios.map(sc => ({
    label: sc.label,
    dropout: simulateDropout(sc.result, 0.1, params.seed + 1),
  })));
});

// ----- Multi-seed benchmark -----
document.getElementById("run-multiseed").addEventListener("click", () => {
  const params = readParams();
  const seeds = Array.from({ length: 20 }, (_, i) => 100 + i);
  showSpinner("Running 20-seed benchmark…");
  setTimeout(() => {
    try {
      const cycleRates = [];
      const bilateralRates = [];
      for (const s of seeds) {
        const profs = generateProfiles({ n: params.n, seed: s, skew: params.skew });
        const r = runMatcher(profs, params);
        const b = runBilateralOnly(profs, params);
        cycleRates.push(r.stats.matchedInCycles / r.stats.total);
        bilateralRates.push(b.stats.matchedInCycles / b.stats.total);
      }
      renderErrorBars(document.getElementById("multiseed-bars"), [
        { label: "Bilateral only", mean: mean(bilateralRates), stdev: stdev(bilateralRates), color: "#53565A" },
        { label: "Cycle-finding",  mean: mean(cycleRates),     stdev: stdev(cycleRates),     color: "#8C1515" },
      ]);
      document.getElementById("multiseed-status").textContent =
        `Lift: +${((mean(cycleRates) - mean(bilateralRates)) * 100).toFixed(1)}pp across ${seeds.length} seeds`;
    } finally {
      hideSpinner();
    }
  }, 30);
});

// ----- Sensitivity sweep -----
document.getElementById("run-sensitivity").addEventListener("click", () => {
  const params = readParams();
  const skews = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const minOvs = [14, 28, 42, 56, 70];
  showSpinner("Sweeping parameters (30 runs)…");
  setTimeout(() => {
    try {
      const grid = minOvs.map(() => []);
      for (let j = 0; j < minOvs.length; j++) {
        for (let i = 0; i < skews.length; i++) {
          const profs = generateProfiles({ n: params.n, seed: params.seed, skew: skews[i] });
          const r = runMatcher(profs, { ...params, minOverlap: minOvs[j] });
          grid[j].push(r.stats.matchedInCycles / r.stats.total);
        }
      }
      renderSensitivityHeatmap(document.getElementById("sensitivity-grid"), {
        xValues: skews.map(s => s.toFixed(1)),
        yValues: minOvs.map(m => m + "d"),
        xLabel: "Market skew",
        yLabel: "Min date overlap",
        grid,
      });
      document.getElementById("sensitivity-status").textContent = `${skews.length}×${minOvs.length} grid, seed ${params.seed}`;
    } finally {
      hideSpinner();
    }
  }, 30);
});

// ----- Hero CTAs -----
document.getElementById("cta-scroll").addEventListener("click", () => {
  document.getElementById("tab-match").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("cta-tour").addEventListener("click", () => { startTour(); });

// ----- Tour -----
const TOUR_STEPS = [
  { sel: "#savings", text: "The headline number: estimated student savings from matched-in-cycle pairings, at ~$4,500 saved per user vs. Airbnb rates." },
  { sel: "#compare-bars", text: "The platform's thesis in one chart: cycle-finding matches ~20 percentage points more students than bilateral-only swaps on the same data." },
  { sel: "#cycles", text: "Each cycle is a closed loop — click one to see the students as cards with date bars, and hit Swap to substitute a participant." },
  { sel: ".persona-row", text: "Load realistic parameter sets for different student segments. Each re-runs the matcher instantly." },
  { sel: "#sparkline", text: "Live sparkline: drag the Skew slider and watch match rate change. Shows why concentrated intern markets lift cycle-finding." },
  { tab: "viz", sel: "#map", text: "National flow map. Cardinal arcs are matched, grey are unmatched demand. Click any city pin to see its cycles." },
  { tab: "viz", sel: "#cycle-picker", text: "Replay cycles across the map, or click Perturb to simulate a random dropout and watch the repair attempt." },
  { tab: "eval", sel: "#multiseed-bars", text: "Statistical confidence: multi-seed benchmarks with error bars. Runs 20 random markets and averages match rates." },
  { tab: "eval", sel: "#sensitivity-grid", text: "2D sensitivity sweep: match rate across skew × min-overlap. Shows which parameter combinations break the matcher." },
];
let tourIdx = 0;
function startTour() {
  tourIdx = 0;
  document.getElementById("tour-overlay").removeAttribute("hidden");
  showTourStep();
}
function endTour() {
  document.getElementById("tour-overlay").setAttribute("hidden", "");
}
function showTourStep() {
  const step = TOUR_STEPS[tourIdx];
  if (!step) { endTour(); return; }
  if (step.tab) {
    document.querySelector(`.tab[data-tab="${step.tab}"]`).click();
  }
  const target = document.querySelector(step.sel);
  if (!target) { tourIdx++; showTourStep(); return; }
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    const rect = target.getBoundingClientRect();
    const spot = document.getElementById("tour-spot");
    const pad = 8;
    spot.style.left = (rect.left - pad) + "px";
    spot.style.top = (window.scrollY + rect.top - pad) + "px";
    spot.style.width = (rect.width + pad * 2) + "px";
    spot.style.height = (rect.height + pad * 2) + "px";
    const tip = document.getElementById("tour-tooltip");
    tip.style.top = (window.scrollY + rect.bottom + 16) + "px";
    const tipLeft = Math.min(window.innerWidth - 380, Math.max(20, rect.left));
    tip.style.left = tipLeft + "px";
    document.getElementById("tour-text").textContent = step.text;
    document.getElementById("tour-step").textContent = `Step ${tourIdx + 1} of ${TOUR_STEPS.length}`;
  }, 300);
}
document.getElementById("tour-next").addEventListener("click", () => { tourIdx++; showTourStep(); });
document.getElementById("tour-prev").addEventListener("click", () => { tourIdx = Math.max(0, tourIdx - 1); showTourStep(); });
document.getElementById("tour-close").addEventListener("click", endTour);

// ----- Init -----
const fromHash = hashToParams();
if (fromHash) writeParams(fromHash);

try { runAll(); } catch (e) { console.error("CycleStay initial run failed:", e); }

if (/[?&]tour=1/.test(location.search)) { setTimeout(startTour, 400); }

})();
