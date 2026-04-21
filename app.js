// UI glue for CycleStay prototype.

const { generateProfiles, profilesToCSV, CITIES, fmtDate } = window.CS_DATA;
const { runMatcher, simulateDropout } = window.CS_MATCH;

let lastResult = null;
let lastProfiles = null;

// Tabs
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// Live slider labels
function bindRange(id) {
  const el = document.getElementById(id);
  const out = document.getElementById(id + "-v");
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

function renderCycles(result) {
  const host = document.getElementById("cycles");
  host.innerHTML = "";
  const map = byId(result.profiles);
  if (!result.cycles.length) {
    host.innerHTML = '<div class="muted">No cycles found. Try lowering min date overlap or raising cycle cap.</div>';
    return;
  }
  // Sort by length desc then score desc
  const sorted = result.cycles.slice().sort((a, b) => b.nodes.length - a.nodes.length || b.avgScore - a.avgScore);
  for (const c of sorted) {
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
    `;
    host.appendChild(el);
  }
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
      <div class="chain muted">${A.name} offers ${A.offered.unit} in ${A.origin} (${fmtDate(A.start)} \u2013 ${fmtDate(A.end)}); ${B.name} needs ${B.dest}</div>
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

document.getElementById("run").addEventListener("click", () => {
  const params = readParams();
  lastProfiles = generateProfiles({ n: params.n, seed: params.seed, skew: params.skew });
  lastResult = runMatcher(lastProfiles, params);
  renderSummary(lastResult);
  renderCycles(lastResult);
  renderBilateral(lastResult);
  renderDataTable(lastProfiles);
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
  const bilateralIds = new Set(res.bilateral.slice(0, Math.min(res.bilateral.length, profiles.length)).flatMap(pair => [pair.provider, pair.renter]));
  // Count unique users served by bilateral who weren't in cycles.
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

  // Comparison bars
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

// Auto-run on load for immediate demo
document.getElementById("run").click();
