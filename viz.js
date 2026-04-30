// Visualizations for CycleStay.
const CITY_COORDS = {
  SF:      { lon: -122.4, lat: 37.8, label: "San Francisco" },
  LA:      { lon: -118.2, lat: 34.1, label: "Los Angeles" },
  Seattle: { lon: -122.3, lat: 47.6, label: "Seattle" },
  Austin:  { lon:  -97.7, lat: 30.3, label: "Austin" },
  Chicago: { lon:  -87.6, lat: 41.9, label: "Chicago" },
  Miami:   { lon:  -80.2, lat: 25.8, label: "Miami" },
  DC:      { lon:  -77.0, lat: 38.9, label: "Washington DC" },
  NYC:     { lon:  -74.0, lat: 40.7, label: "New York" },
  Boston:  { lon:  -71.1, lat: 42.4, label: "Boston" },
};

function projectLonLat(lon, lat, width, height) {
  const lonMin = -125, lonMax = -66;
  const latMin = 24, latMax = 50;
  const x = ((lon - lonMin) / (lonMax - lonMin)) * width;
  const y = ((latMax - lat) / (latMax - latMin)) * height;
  return { x, y };
}
function cityXY(city, width, height) {
  const c = CITY_COORDS[city];
  return projectLonLat(c.lon, c.lat, width, height);
}
function arcPath(x1, y1, x2, y2, bow = 0.2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const cx = mx + nx * len * bow, cy = my + ny * len * bow;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function renderMap(container, result, opts = {}) {
  const WIDTH = 900, HEIGHT = 500;
  const flowMatched = new Map();
  const flowUnmatched = new Map();
  const key = (a, b) => `${a}|${b}`;
  for (const p of result.profiles) {
    const k = key(p.origin, p.dest);
    if (result.matchedSet.has(p.id)) flowMatched.set(k, (flowMatched.get(k) || 0) + 1);
    else flowUnmatched.set(k, (flowUnmatched.get(k) || 0) + 1);
  }
  const maxFlow = Math.max(1, ...flowMatched.values(), ...flowUnmatched.values());
  function sw(count) { return 0.8 + (count / maxFlow) * 5; }

  let svg = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" class="map-svg" id="map-svg">`;
  svg += `<rect width="${WIDTH}" height="${HEIGHT}" fill="#FAFAF7"/>`;
  for (let lon = -120; lon <= -70; lon += 10) {
    const { x } = projectLonLat(lon, 40, WIDTH, HEIGHT);
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${HEIGHT}" stroke="#EEEEE8" stroke-width="1"/>`;
  }
  for (let lat = 25; lat <= 50; lat += 5) {
    const { y } = projectLonLat(-95, lat, WIDTH, HEIGHT);
    svg += `<line x1="0" y1="${y}" x2="${WIDTH}" y2="${y}" stroke="#EEEEE8" stroke-width="1"/>`;
  }
  for (const [k, count] of flowUnmatched) {
    const [a, b] = k.split("|");
    const pa = cityXY(a, WIDTH, HEIGHT), pb = cityXY(b, WIDTH, HEIGHT);
    svg += `<path d="${arcPath(pa.x, pa.y, pb.x, pb.y)}" fill="none" stroke="#C8C8C0" stroke-width="${sw(count)}" opacity="0.5" />`;
  }
  let arcIdx = 0;
  for (const [k, count] of flowMatched) {
    const [a, b] = k.split("|");
    const pa = cityXY(a, WIDTH, HEIGHT), pb = cityXY(b, WIDTH, HEIGHT);
    // Stagger animation start so arcs don't sync into a single pulse
    const delay = (arcIdx * 0.31) % 3;
    arcIdx++;
    svg += `<path d="${arcPath(pa.x, pa.y, pb.x, pb.y)}" fill="none" stroke="#8C1515" stroke-width="${sw(count)}" stroke-linecap="round" class="flow-arc-matched" style="animation-delay:-${delay.toFixed(2)}s" />`;
  }
  for (const city of Object.keys(CITY_COORDS)) {
    const { x, y } = cityXY(city, WIDTH, HEIGHT);
    // Two pulse rings staggered so the heartbeat is continuous, not clipped
    svg += `<circle class="city-pulse" cx="${x}" cy="${y}" r="7" />`;
    svg += `<circle class="city-pulse delay" cx="${x}" cy="${y}" r="7" />`;
    svg += `<circle class="city-pin" data-city="${city}" cx="${x}" cy="${y}" r="7" fill="#820000" stroke="#fff" stroke-width="2" style="cursor:pointer"/>`;
    svg += `<text x="${x}" y="${y - 12}" text-anchor="middle" font-family="Source Sans Pro, sans-serif" font-size="12" font-weight="700" fill="#2E2D29" pointer-events="none">${city}</text>`;
  }
  svg += `<g transform="translate(20, ${HEIGHT - 56})">
    <rect x="0" y="0" width="190" height="46" fill="#fff" stroke="#DADAD4" rx="3"/>
    <line x1="12" y1="16" x2="40" y2="16" stroke="#8C1515" stroke-width="3"/>
    <text x="48" y="20" font-family="Source Sans Pro" font-size="11" fill="#2E2D29">Matched flow</text>
    <line x1="12" y1="34" x2="40" y2="34" stroke="#C8C8C0" stroke-width="3"/>
    <text x="48" y="38" font-family="Source Sans Pro" font-size="11" fill="#2E2D29">Unmatched demand</text>
  </g>`;
  svg += `</svg>`;
  container.innerHTML = svg;

  if (opts.onCityClick) {
    container.querySelectorAll(".city-pin").forEach(p => {
      p.addEventListener("click", () => opts.onCityClick(p.dataset.city));
    });
  }
}

function highlightCycleOnMap(container, result, cycle) {
  const svg = container.querySelector("svg");
  if (!svg) return;
  // Remove previous highlight
  svg.querySelectorAll(".cycle-highlight").forEach(el => el.remove());
  const WIDTH = 900, HEIGHT = 500;
  const map = new Map(result.profiles.map(p => [p.id, p]));
  for (let i = 0; i < cycle.nodes.length; i++) {
    const s = map.get(cycle.nodes[i]);
    const pa = cityXY(s.origin, WIDTH, HEIGHT);
    const pb = cityXY(s.dest, WIDTH, HEIGHT);
    const d = arcPath(pa.x, pa.y, pb.x, pb.y, 0.28);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#820000");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("opacity", "0.95");
    path.setAttribute("class", "cycle-highlight");
    svg.appendChild(path);
  }
}

function animateCycle(container, result, cycle) {
  renderMap(container, result);
  const svg = container.querySelector("svg");
  if (!svg) return;
  const WIDTH = 900, HEIGHT = 500;
  const map = new Map(result.profiles.map(p => [p.id, p]));
  for (let i = 0; i < cycle.nodes.length; i++) {
    const s = map.get(cycle.nodes[i]);
    const pa = cityXY(s.origin, WIDTH, HEIGHT);
    const pb = cityXY(s.dest, WIDTH, HEIGHT);
    const d = arcPath(pa.x, pa.y, pb.x, pb.y, 0.25);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#820000");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("opacity", "0.95");
    svg.appendChild(path);
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.style.transition = `stroke-dashoffset 700ms ease-in-out`;
    path.style.transitionDelay = `${i * 750}ms`;
    requestAnimationFrame(() => { path.style.strokeDashoffset = 0; });
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", "#8C1515");
    dot.setAttribute("stroke", "#fff");
    dot.setAttribute("stroke-width", "2");
    svg.appendChild(dot);
    const animateMotion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    animateMotion.setAttribute("dur", "700ms");
    animateMotion.setAttribute("begin", `${i * 750}ms`);
    animateMotion.setAttribute("fill", "freeze");
    animateMotion.setAttribute("path", d);
    dot.appendChild(animateMotion);
    animateMotion.beginElement?.();
  }
}

function animatePerturb(container, result, perturbResult) {
  renderMap(container, result);
  const svg = container.querySelector("svg");
  if (!svg || !perturbResult) return;
  const WIDTH = 900, HEIGHT = 500;
  const map = new Map(result.profiles.map(p => [p.id, p]));
  highlightCycleOnMap(container, result, perturbResult.cycle);
  // Animate a red X at dropped student's origin
  const dropped = map.get(perturbResult.dropped);
  const p = cityXY(dropped.origin, WIDTH, HEIGHT);
  const x = document.createElementNS("http://www.w3.org/2000/svg", "g");
  x.setAttribute("transform", `translate(${p.x},${p.y})`);
  x.innerHTML = `
    <circle r="14" fill="#820000" opacity="0" class="pulse"/>
    <line x1="-8" y1="-8" x2="8" y2="8" stroke="#820000" stroke-width="3"/>
    <line x1="-8" y1="8" x2="8" y2="-8" stroke="#820000" stroke-width="3"/>
  `;
  svg.appendChild(x);
  const pulse = x.querySelector(".pulse");
  pulse.animate([
    { opacity: 0.4, r: 14 },
    { opacity: 0, r: 40 }
  ], { duration: 800, iterations: 3 });
}

function renderSankey(container, result) {
  const WIDTH = 900, HEIGHT = 500;
  const cities = Object.keys(CITY_COORDS);
  const leftX = 110, rightX = WIDTH - 110;
  const colGap = 4;
  const outCount = Object.fromEntries(cities.map(c => [c, 0]));
  const inCount = Object.fromEntries(cities.map(c => [c, 0]));
  const flow = {};
  for (const c of cities) flow[c] = Object.fromEntries(cities.map(x => [x, 0]));
  for (const p of result.profiles) {
    if (!result.matchedSet.has(p.id)) continue;
    outCount[p.origin]++;
    inCount[p.dest]++;
    flow[p.origin][p.dest]++;
  }
  const totalOut = cities.reduce((s, c) => s + outCount[c], 0) || 1;
  const usableH = HEIGHT - 80 - (cities.length - 1) * colGap;
  function layout(counts) {
    const total = cities.reduce((s, c) => s + counts[c], 0) || 1;
    const positions = {};
    let y = 40;
    for (const c of cities) {
      const h = Math.max(6, (counts[c] / total) * usableH);
      positions[c] = { y, h };
      y += h + colGap;
    }
    return positions;
  }
  const L = layout(outCount);
  const R = layout(inCount);
  let svg = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" class="map-svg">`;
  svg += `<rect width="${WIDTH}" height="${HEIGHT}" fill="#FAFAF7"/>`;
  let ribbonIdx = 0;
  for (const o of cities) {
    const oRect = L[o];
    if (outCount[o] === 0) continue;
    let offset = 0;
    for (const d of cities) {
      const f = flow[o][d];
      if (!f) continue;
      const ribbonH = (f / outCount[o]) * oRect.h;
      const y1Top = oRect.y + offset;
      const y1Bot = y1Top + ribbonH;
      offset += ribbonH;
      const dRect = R[d];
      if (!R[d].consumed) R[d].consumed = 0;
      const ribbonH2 = (f / inCount[d]) * dRect.h;
      const y2Top = dRect.y + R[d].consumed;
      const y2Bot = y2Top + ribbonH2;
      R[d].consumed += ribbonH2;
      const cx1 = leftX + 20 + (rightX - leftX - 40) / 2;
      const path = `M ${leftX + 20} ${y1Top}
                    C ${cx1} ${y1Top}, ${cx1} ${y2Top}, ${rightX - 20} ${y2Top}
                    L ${rightX - 20} ${y2Bot}
                    C ${cx1} ${y2Bot}, ${cx1} ${y1Bot}, ${leftX + 20} ${y1Bot} Z`;
      const delay = (ribbonIdx * 0.27) % 3.2;
      ribbonIdx++;
      svg += `<path d="${path}" fill="#8C1515" opacity="${0.15 + 0.5 * (f / totalOut)}" stroke="none" class="sankey-ribbon" style="animation-delay:-${delay.toFixed(2)}s"/>`;
    }
  }
  for (const c of cities) {
    svg += `<rect x="${leftX}" y="${L[c].y}" width="20" height="${L[c].h}" fill="#820000"/>`;
    svg += `<text x="${leftX - 8}" y="${L[c].y + L[c].h / 2 + 4}" text-anchor="end" font-family="Source Sans Pro" font-size="12" font-weight="600" fill="#2E2D29">${c} (${outCount[c]})</text>`;
  }
  for (const c of cities) {
    svg += `<rect x="${rightX - 20}" y="${R[c].y}" width="20" height="${R[c].h}" fill="#820000"/>`;
    svg += `<text x="${rightX + 8}" y="${R[c].y + R[c].h / 2 + 4}" text-anchor="start" font-family="Source Sans Pro" font-size="12" font-weight="600" fill="#2E2D29">${c} (${inCount[c]})</text>`;
  }
  svg += `<text x="${leftX}" y="22" text-anchor="start" font-family="Source Sans Pro" font-size="12" font-weight="700" fill="#53565A" letter-spacing="0.05em">LEAVING</text>`;
  svg += `<text x="${rightX}" y="22" text-anchor="end" font-family="Source Sans Pro" font-size="12" font-weight="700" fill="#53565A" letter-spacing="0.05em">ARRIVING</text>`;
  svg += `</svg>`;
  container.innerHTML = svg;
}

function renderHeatmap(container, result) {
  const cities = Object.keys(CITY_COORDS);
  const W = 520, H = 520;
  const padL = 70, padT = 70;
  const cell = (W - padL - 10) / cities.length;
  const counts = {};
  let max = 0;
  for (const p of result.profiles) {
    const k = `${p.origin}|${p.dest}`;
    if (!counts[k]) counts[k] = { matched: 0, total: 0 };
    counts[k].total++;
    if (result.matchedSet.has(p.id)) counts[k].matched++;
  }
  for (const k in counts) max = Math.max(max, counts[k].matched);
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="map-svg">`;
  svg += `<rect width="${W}" height="${H}" fill="#FAFAF7"/>`;
  for (let i = 0; i < cities.length; i++) {
    const x = padL + i * cell + cell / 2;
    svg += `<text x="${x}" y="${padT - 10}" text-anchor="middle" font-family="Source Sans Pro" font-size="11" font-weight="600" fill="#53565A">${cities[i]}</text>`;
  }
  for (let j = 0; j < cities.length; j++) {
    const y = padT + j * cell + cell / 2 + 4;
    svg += `<text x="${padL - 8}" y="${y}" text-anchor="end" font-family="Source Sans Pro" font-size="11" font-weight="600" fill="#53565A">${cities[j]}</text>`;
  }
  for (let j = 0; j < cities.length; j++) {
    for (let i = 0; i < cities.length; i++) {
      const k = `${cities[j]}|${cities[i]}`;
      const c = counts[k] || { matched: 0, total: 0 };
      const x = padL + i * cell;
      const y = padT + j * cell;
      if (cities[i] === cities[j]) {
        svg += `<rect x="${x}" y="${y}" width="${cell - 2}" height="${cell - 2}" fill="#EEEEE8"/>`;
      } else {
        const intensity = max ? c.matched / max : 0;
        const alpha = intensity === 0 ? 0.04 : 0.15 + intensity * 0.85;
        svg += `<rect x="${x}" y="${y}" width="${cell - 2}" height="${cell - 2}" fill="#8C1515" opacity="${alpha}"/>`;
        if (c.matched > 0) {
          const tcolor = intensity > 0.5 ? "#fff" : "#2E2D29";
          svg += `<text x="${x + cell / 2}" y="${y + cell / 2 + 4}" text-anchor="middle" font-family="Source Sans Pro" font-size="11" font-weight="600" fill="${tcolor}">${c.matched}</text>`;
        }
      }
    }
  }
  svg += `<text x="${padL + (W - padL - 10) / 2}" y="${padT - 32}" text-anchor="middle" font-family="Source Sans Pro" font-size="11" font-weight="700" fill="#53565A" letter-spacing="0.05em">DESTINATION</text>`;
  svg += `<text x="18" y="${padT + (H - padT - 10) / 2}" text-anchor="middle" font-family="Source Sans Pro" font-size="11" font-weight="700" fill="#53565A" letter-spacing="0.05em" transform="rotate(-90 18 ${padT + (H - padT - 10) / 2})">ORIGIN</text>`;
  svg += `</svg>`;
  container.innerHTML = svg;
}

function renderSparkline(container, points) {
  const W = 260, H = 60, padL = 26, padR = 8, padT = 6, padB = 18;
  const xs = points.map(p => p.x);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const iw = W - padL - padR, ih = H - padT - padB;
  function tx(x) { return padL + ((x - xMin) / (xMax - xMin || 1)) * iw; }
  function ty(y) { return padT + (1 - y) * ih; }
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.x).toFixed(1)} ${ty(p.y).toFixed(1)}`).join(" ");
  const area = d + ` L ${tx(xMax)} ${padT + ih} L ${tx(xMin)} ${padT + ih} Z`;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="spark-svg">`;
  svg += `<rect width="${W}" height="${H}" fill="#FAFAF7"/>`;
  svg += `<path d="${area}" fill="#8C1515" opacity="0.12"/>`;
  svg += `<path d="${d}" fill="none" stroke="#8C1515" stroke-width="1.75"/>`;
  svg += `<text x="2" y="${padT + 8}" font-family="Source Sans Pro" font-size="9" fill="#53565A">100%</text>`;
  svg += `<text x="2" y="${H - 4}" font-family="Source Sans Pro" font-size="9" fill="#53565A">0%</text>`;
  svg += `<text x="${tx(xMin)}" y="${H - 4}" font-family="Source Sans Pro" font-size="9" fill="#53565A" text-anchor="start">balanced</text>`;
  svg += `<text x="${tx(xMax)}" y="${H - 4}" font-family="Source Sans Pro" font-size="9" fill="#53565A" text-anchor="end">skewed</text>`;
  svg += `</svg>`;
  container.innerHTML = svg;
}

function renderCycleCards(profiles, nodes, opts = {}) {
  const map = new Map(profiles.map(p => [p.id, p]));
  const ps = nodes.map(n => map.get(n));
  const allStarts = ps.map(p => p.start.getTime());
  const allEnds = ps.map(p => p.end.getTime());
  const minT = Math.min(...allStarts);
  const maxT = Math.max(...allEnds);
  const span = maxT - minT || 1;
  return `<div class="cards-row">${ps.map((p, i) => {
    const sPct = ((p.start.getTime() - minT) / span) * 100;
    const wPct = ((p.end.getTime() - p.start.getTime()) / span) * 100;
    const initials = p.name.split(" ").map(w => w[0]).join("");
    const icon = p.offered.unit === "room" ? "\u25A1" : (p.offered.unit === "studio" ? "\u25AB" : "\u25A3");
    const swap = opts.swappable ? `<button class="swap-btn" data-idx="${i}" data-nodeid="${p.id}">Swap</button>` : "";
    return `<div class="card" data-nodeid="${p.id}">
      <div class="card-head">
        <div class="avatar">${initials}</div>
        <div class="card-name">${p.name}</div>
        ${swap}
      </div>
      <div class="card-row"><span class="card-lbl">Route</span>${p.origin} <span class="arrow">\u2192</span> ${p.dest}</div>
      <div class="card-row"><span class="card-lbl">Unit</span>${icon} ${p.offered.unit}${p.offered.nearTransit ? " \u00B7 transit" : ""}${p.offered.hasParking ? " \u00B7 parking" : ""}</div>
      <div class="card-row"><span class="card-lbl">Dates</span>${p.start.toISOString().slice(5,10)} \u2013 ${p.end.toISOString().slice(5,10)}</div>
      <div class="gantt"><div class="gantt-bar" style="left:${sPct}%; width:${wPct}%"></div></div>
    </div>`;
  }).join("")}</div>`;
}

// 2D sensitivity heatmap. rows = y values, cols = x values; cells = matchRate 0..1.
function renderSensitivityHeatmap(container, { xValues, yValues, xLabel, yLabel, grid }) {
  const W = 620, H = 380, padL = 80, padT = 34, padR = 60, padB = 40;
  const cellW = (W - padL - padR) / xValues.length;
  const cellH = (H - padT - padB) / yValues.length;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="map-svg">`;
  svg += `<rect width="${W}" height="${H}" fill="#FAFAF7"/>`;
  for (let j = 0; j < yValues.length; j++) {
    for (let i = 0; i < xValues.length; i++) {
      const v = grid[j][i];
      const x = padL + i * cellW;
      const y = padT + j * cellH;
      const alpha = 0.08 + v * 0.92;
      svg += `<rect x="${x}" y="${y}" width="${cellW - 1}" height="${cellH - 1}" fill="#8C1515" opacity="${alpha}"/>`;
      const tcolor = v > 0.5 ? "#fff" : "#2E2D29";
      svg += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 4}" text-anchor="middle" font-family="Source Sans Pro" font-size="11" font-weight="600" fill="${tcolor}">${(v * 100).toFixed(0)}%</text>`;
    }
  }
  for (let i = 0; i < xValues.length; i++) {
    svg += `<text x="${padL + i * cellW + cellW / 2}" y="${padT - 6}" text-anchor="middle" font-family="Source Sans Pro" font-size="10" fill="#53565A">${xValues[i]}</text>`;
  }
  for (let j = 0; j < yValues.length; j++) {
    svg += `<text x="${padL - 6}" y="${padT + j * cellH + cellH / 2 + 4}" text-anchor="end" font-family="Source Sans Pro" font-size="10" fill="#53565A">${yValues[j]}</text>`;
  }
  svg += `<text x="${padL + (W - padL - padR) / 2}" y="${H - 10}" text-anchor="middle" font-family="Source Sans Pro" font-size="11" font-weight="700" fill="#53565A" letter-spacing="0.05em">${xLabel.toUpperCase()}</text>`;
  svg += `<text x="${18}" y="${padT + (H - padT - padB) / 2}" text-anchor="middle" font-family="Source Sans Pro" font-size="11" font-weight="700" fill="#53565A" letter-spacing="0.05em" transform="rotate(-90 18 ${padT + (H - padT - padB) / 2})">${yLabel.toUpperCase()}</text>`;
  svg += `</svg>`;
  container.innerHTML = svg;
}

// Bars with error bars. data = [{label, mean, stdev, color?}]
function renderErrorBars(container, data) {
  const W = 720, padL = 170, padR = 130, rowH = 56;
  const H = 36 + data.length * rowH + 30;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="map-svg">`;
  svg += `<rect width="${W}" height="${H}" fill="#FAFAF7"/>`;
  const maxV = 1;
  const barW = W - padL - padR;

  // Vertical gridlines + axis labels at 0 / 25 / 50 / 75 / 100%
  for (let p = 0; p <= 1; p += 0.25) {
    const x = padL + p * barW;
    const yTop = 28, yBot = 36 + data.length * rowH - 8;
    svg += `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBot}" stroke="#E6E5DF" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${yBot + 16}" text-anchor="middle" font-family="Source Sans Pro" font-size="10" fill="#888780">${(p * 100).toFixed(0)}%</text>`;
  }

  data.forEach((d, i) => {
    const yMid = 36 + i * rowH + rowH / 2;
    const yBar = yMid - 14;
    const len = d.mean * barW;
    const color = d.color || "#8C1515";

    // Left label
    svg += `<text x="${padL - 12}" y="${yMid + 4}" text-anchor="end" font-family="Source Sans Pro" font-size="13" font-weight="600" fill="#2E2D29">${d.label}</text>`;
    // Track
    svg += `<rect x="${padL}" y="${yBar}" width="${barW}" height="28" fill="#EEEEE8" rx="3"/>`;
    // Filled bar
    svg += `<rect x="${padL}" y="${yBar}" width="${len}" height="28" fill="${color}" rx="3"/>`;

    // Error whiskers in white over the colored fill so they don't fight with text.
    const eLo = Math.max(0, d.mean - d.stdev) * barW;
    const eHi = Math.min(maxV, d.mean + d.stdev) * barW;
    const wY = yBar + 14;
    svg += `<line x1="${padL + eLo}" y1="${wY}" x2="${padL + eHi}" y2="${wY}" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.85"/>`;
    svg += `<line x1="${padL + eLo}" y1="${wY - 5}" x2="${padL + eLo}" y2="${wY + 5}" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.85"/>`;
    svg += `<line x1="${padL + eHi}" y1="${wY - 5}" x2="${padL + eHi}" y2="${wY + 5}" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.85"/>`;

    // Right value column (fixed x so rows align)
    const vx = W - padR + 10;
    svg += `<text x="${vx}" y="${yMid - 1}" font-family="ui-monospace, monospace" font-size="14" font-weight="700" fill="#2E2D29">${(d.mean * 100).toFixed(1)}%</text>`;
    svg += `<text x="${vx}" y="${yMid + 14}" font-family="Source Sans Pro" font-size="10" font-weight="500" fill="#888780">\u00B1${(d.stdev * 100).toFixed(1)} pp</text>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg;
}

// Export an SVG element as a PNG download.
function svgToPNG(svgEl, filename = "export.png", scale = 2) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const vb = svgEl.viewBox.baseVal;
    const w = (vb && vb.width) || svgEl.clientWidth || 900;
    const h = (vb && vb.height) || svgEl.clientHeight || 500;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FAFAF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = "data:image/svg+xml;base64," + svg64;
}

window.CS_VIZ = {
  renderMap, animateCycle, animatePerturb, renderSankey, renderHeatmap,
  renderSparkline, renderCycleCards, renderSensitivityHeatmap, renderErrorBars,
  highlightCycleOnMap, svgToPNG, CITY_COORDS,
};
