// UI glue for CycleStay prototype.
(function () {
"use strict";

if (!window.CS_DATA || !window.CS_MATCH || !window.CS_VIZ) {
  console.error("CycleStay: required modules missing", {
    CS_DATA: !!window.CS_DATA, CS_MATCH: !!window.CS_MATCH, CS_VIZ: !!window.CS_VIZ,
  });
  return;
}

const { generateProfiles, profilesToCSV, fmtDate } = window.CS_DATA;
const { runMatcher, runBilateralOnly, simulateDropout } = window.CS_MATCH;
const { renderMap, animateCycle, renderSankey, renderHeatmap, renderSparkline, renderCycleCards } = window.CS_VIZ;

let lastResult = null;
let lastProfiles = null;
let lastBilateralOnly = null;

// Tabs
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// Slider live labels
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
  };
}

function byId(profiles) {
  const m = new Map();
  for (const p of profiles) m.set(p.id, p);
  return m;
}

// Savings per matched student: assume Airbnb ≈ $3000/mo for 12 weeks ≈ $9000,
// sublet rate ≈ $1500/mo ≈ $4500. Saving ≈ $4500 per matched user; cycle matches
// save both sides, so count matched_in_cycles * 4500.
const SAVINGS_PER_USER = 4500;

function fmtMoney(n) {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

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
  const map = byId(result.profiles);
  if (!result.cycles.length) {
    host.innerHTML = '<div class="muted">No cycles found. Try lowering min date overlap or raising cycle cap.</div>';
    return;
  }
  const sorted = result.cycles.slice().sort((a, b) => b.nodes.length - a.nodes.length || b.avgScore - a.avgScore);
  sorted.forEach((c, idx) => {
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
    el.addEventListener("click", () => {
      if (expand.hasAttribute("hidden")) {
        expand.innerHTML = renderCycleCards(result.profiles, c.nodes);
        expand.removeAttribute("hidden");
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
  const head = `<tr><th>id</th><th>name</th><th>origin</th><th>dest</th><th>start</th><th>end</th><th>unit</th><th>pets</th><th>parking</th><th>private</th><th>accepts</th></tr>`;
  const rows = profiles.map(p => `<tr>
    <td>${p.id}</td><td>${p.name}</td><td>${p.origin}</td><td>${p.dest}</td>
    <td>${fmtDate(p.start)}</td><td>${fmtDate(p.end)}</td>
    <td>${p.offered.unit}</td>
    <td>${p.offered.hasPets ? "y" : ""}</td>
    <td>${p.offered.hasParking ? "y" : ""}</td>
    <td>${p.offered.isPrivate ? "y" : ""}</td>
    <td>${[...p.needs.units].join("|")}</td>
  </tr>`).join("");
  host.innerHTML = `<table>${head}${rows}</table>`;
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
    });
    host.appendChild(chip);
  });
}

// Sparkline: sweep skew from 0..1, measure match rate at each step.
function computeSparkline(baseParams) {
  const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const points = steps.map(sk => {
    const profiles = generateProfiles({ n: baseParams.n, seed: baseParams.seed, skew: sk });
    const r = runMatcher(profiles, baseParams);
    return { x: sk, y: r.stats.matchedInCycles / r.stats.total };
  });
  renderSparkline(document.getElementById("sparkline"), points);
}

function runAll() {
  const params = readParams();
  lastProfiles = generateProfiles({ n: params.n, seed: params.seed, skew: params.skew });
  lastResult = runMatcher(lastProfiles, params);
  lastBilateralOnly = runBilateralOnly(lastProfiles, params);

  renderHero(lastResult);
  renderSummary(lastResult);
  renderCycles(lastResult);
  renderBilateral(lastResult);
  renderCompare(lastResult, lastBilateralOnly);
  renderDataTable(lastProfiles);

  // Visualize tab
  renderMap(document.getElementById("map"), lastResult);
  renderSankey(document.getElementById("sankey"), lastResult);
  renderHeatmap(document.getElementById("heatmap"), lastResult);
  renderCyclePicker(lastResult);

  computeSparkline(params);
}

document.getElementById("run").addEventListener("click", runAll);

// Re-run sparkline live as user drags skew
let skewTimer = null;
document.getElementById("skew").addEventListener("input", () => {
  clearTimeout(skewTimer);
  skewTimer = setTimeout(() => {
    computeSparkline(readParams());
  }, 120);
});

document.getElementById("download-csv").addEventListener("click", () => {
  if (!lastProfiles) {
    alert("Generate profiles first (Match tab).");
    return;
  }
  const csv = profilesToCSV(lastProfiles);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cyclestay_profiles.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// Evaluation
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
  const bar = document.createElement("div");
  bar.className = "scenario";
  bar.innerHTML = "<h3>Match rate comparison</h3>";
  for (const sc of scenarios) {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <div class="bar-label">${sc.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(sc.totalServedRate * 100).toFixed(1)}%"></div></div>
      <div class="bar-val">${(sc.totalServedRate * 100).toFixed(1)}%</div>
    `;
    bar.appendChild(row);
  }
  host.appendChild(bar);
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
    scenario("Skewed (skew=0.8)", { skew: 0.8, n: params.n }, params),
    scenario("Sparse (n=60, skew=0.5)", { skew: 0.5, n: 60 }, params),
  ];
  renderEvalResults(scenarios);
  const dropoutResults = scenarios.map(sc => ({
    label: sc.label,
    dropout: simulateDropout(sc.result, 0.1, params.seed + 1),
  }));
  renderDropout(dropoutResults);
});

// Initial run
try {
  runAll();
} catch (e) {
  console.error("CycleStay initial run failed:", e);
}

})();
