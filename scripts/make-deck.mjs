// Generate the 6-slide CycleStay class deck (cover + 5 content slides).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches
pptx.title = "CycleStay";
pptx.author = "CycleStay Team";

// Stanford palette
const C = {
  cardinal: "8C1515",
  cardinalDark: "5C0000",
  cardinalLight: "B83A4B",
  coolGrey: "53565A",
  ink: "1A1A18",
  inkMid: "444441",
  inkMuted: "888780",
  sand: "F7F5F0",
  white: "FFFFFF",
};

const HEAD = "Calibri";
const BODY = "Calibri";

// ───────────────── SLIDE 1: COVER ─────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.cardinalDark };

  // Subtle radial accent (large faint circle on the right)
  s.addShape(pptx.ShapeType.ellipse, {
    x: 8.5, y: -2, w: 7, h: 7,
    fill: { color: C.cardinal, transparency: 75 },
    line: { type: "none" },
  });

  s.addText("Spring 2026", {
    x: 0.6, y: 0.6, w: 6, h: 0.4,
    fontFace: HEAD, fontSize: 13, color: C.sand, bold: true,
    charSpacing: 4,
  });

  s.addText("CycleStay", {
    x: 0.6, y: 1.6, w: 12, h: 1.6,
    fontFace: HEAD, fontSize: 96, color: C.white, bold: true,
  });

  s.addText("Trade your apartment, not your savings.", {
    x: 0.6, y: 3.2, w: 12, h: 0.7,
    fontFace: HEAD, fontSize: 28, color: C.sand, italic: true,
  });

  s.addText("A multi-way sublease exchange for graduate students relocating for summer internships.", {
    x: 0.6, y: 4.0, w: 11, h: 0.8,
    fontFace: BODY, fontSize: 16, color: C.sand,
  });

  // Mini cycle diagram, top-right
  const cx = 11.0, cy = 5.6;
  const r = 0.95;
  // arcs
  const triPoints = [
    { x: cx, y: cy - r, label: "SF" },
    { x: cx + r * 0.87, y: cy + r * 0.5, label: "NYC" },
    { x: cx - r * 0.87, y: cy + r * 0.5, label: "ATX" },
  ];
  // Draw 3 nodes
  triPoints.forEach((p) => {
    s.addShape(pptx.ShapeType.ellipse, {
      x: p.x - 0.22, y: p.y - 0.22, w: 0.44, h: 0.44,
      fill: { color: C.white },
      line: { color: C.white, width: 0 },
    });
    s.addText(p.label, {
      x: p.x - 0.6, y: p.y + 0.25, w: 1.2, h: 0.3,
      fontFace: BODY, fontSize: 11, color: C.sand, align: "center", bold: true,
    });
  });
  // Arrows between nodes (lines for simplicity)
  for (let i = 0; i < 3; i++) {
    const a = triPoints[i], b = triPoints[(i + 1) % 3];
    s.addShape(pptx.ShapeType.line, {
      x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y,
      line: { color: C.sand, width: 1.5, dashType: "dash", endArrowType: "triangle" },
    });
  }

  // Footer team line
  s.addText("Tony Shen  ·  Varun Kota  ·  Michael Reed  ·  Joseph Naness  ·  Christina (team)", {
    x: 0.6, y: 6.8, w: 11.5, h: 0.4,
    fontFace: BODY, fontSize: 12, color: C.sand,
  });

  s.addText("Stanford GSB · Digital Platforms in the Age of AI", {
    x: 0.6, y: 7.1, w: 11.5, h: 0.3,
    fontFace: BODY, fontSize: 10, color: C.sand, charSpacing: 2,
  });
}

// ───────────────── SLIDE 2: THE PROBLEM ─────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.white };

  s.addText("THE PROBLEM", {
    x: 0.6, y: 0.5, w: 4, h: 0.35,
    fontFace: HEAD, fontSize: 12, color: C.cardinal, bold: true, charSpacing: 4,
  });

  s.addText("Two students. Same problem. Opposite directions.", {
    x: 0.6, y: 0.9, w: 12, h: 1.0,
    fontFace: HEAD, fontSize: 36, color: C.ink, bold: true,
  });

  // Left card: leaving SF
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 2.3, w: 5.8, h: 3.4, rectRadius: 0.15,
    fill: { color: C.sand },
    line: { color: "DADAD4", width: 0.75 },
  });
  s.addText("Alex", {
    x: 0.95, y: 2.55, w: 5, h: 0.5,
    fontFace: HEAD, fontSize: 22, color: C.ink, bold: true,
  });
  s.addText("Stanford GSB → Goldman, NYC", {
    x: 0.95, y: 3.05, w: 5, h: 0.4,
    fontFace: BODY, fontSize: 14, color: C.coolGrey,
  });
  s.addText("•  Leaves a 1BR in Palo Alto for 12 weeks\n•  Needs short-term housing in NYC\n•  Pays $3,000+/mo for an Airbnb\n•  Lists on Facebook to find a sublet", {
    x: 0.95, y: 3.55, w: 5.2, h: 2.0,
    fontFace: BODY, fontSize: 13, color: C.inkMid, paraSpaceAfter: 6,
  });

  // Right card: leaving NYC
  s.addShape(pptx.ShapeType.roundRect, {
    x: 6.95, y: 2.3, w: 5.8, h: 3.4, rectRadius: 0.15,
    fill: { color: C.sand },
    line: { color: "DADAD4", width: 0.75 },
  });
  s.addText("Priya", {
    x: 7.3, y: 2.55, w: 5, h: 0.5,
    fontFace: HEAD, fontSize: 22, color: C.ink, bold: true,
  });
  s.addText("HBS → McKinsey, San Francisco", {
    x: 7.3, y: 3.05, w: 5, h: 0.4,
    fontFace: BODY, fontSize: 14, color: C.coolGrey,
  });
  s.addText("•  Leaves a 1BR in NYC for 12 weeks\n•  Needs short-term housing in SF\n•  Pays $3,000+/mo for an Airbnb\n•  Lists on Reddit to find a sublet", {
    x: 7.3, y: 3.55, w: 5.2, h: 2.0,
    fontFace: BODY, fontSize: 13, color: C.inkMid, paraSpaceAfter: 6,
  });

  // Insight bar at the bottom
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 6.0, w: 12.15, h: 1.0, rectRadius: 0.1,
    fill: { color: C.cardinal },
    line: { color: C.cardinal, width: 0 },
  });
  s.addText("They have exactly what each other needs.\nNo bilateral platform finds them.", {
    x: 0.95, y: 6.05, w: 11.5, h: 0.9,
    fontFace: HEAD, fontSize: 18, color: C.white, bold: true, italic: true, valign: "middle",
  });
}

// ───────────────── SLIDE 3: THE SOLUTION ─────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.white };

  s.addText("THE SOLUTION", {
    x: 0.6, y: 0.5, w: 4, h: 0.35,
    fontFace: HEAD, fontSize: 12, color: C.cardinal, bold: true, charSpacing: 4,
  });

  s.addText("Cycle-finding matching.", {
    x: 0.6, y: 0.9, w: 12, h: 0.9,
    fontFace: HEAD, fontSize: 36, color: C.ink, bold: true,
  });

  s.addText("The same algorithm behind kidney-exchange programs — applied to summer subleases.", {
    x: 0.6, y: 1.85, w: 12, h: 0.6,
    fontFace: BODY, fontSize: 16, color: C.coolGrey, italic: true,
  });

  // Three step columns
  const stepY = 2.8;
  const steps = [
    {
      n: "01",
      title: "List",
      body: "Students post their apartment, dates, and destination city. .edu email required.",
    },
    {
      n: "02",
      title: "Match",
      body: "We build a directed graph and find swap chains of length 2, 3, or 4 — ranked by date overlap, unit fit, and constraints.",
    },
    {
      n: "03",
      title: "Swap",
      body: "Everyone in the cycle moves into the next person's place. Net-zero rent. Platform handles escrow + verification.",
    },
  ];
  steps.forEach((step, i) => {
    const x = 0.6 + i * 4.18;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: stepY, w: 3.95, h: 3.0, rectRadius: 0.12,
      fill: { color: C.sand },
      line: { color: "DADAD4", width: 0.75 },
    });
    s.addText(step.n, {
      x: x + 0.3, y: stepY + 0.2, w: 1.5, h: 0.4,
      fontFace: HEAD, fontSize: 14, color: C.cardinal, bold: true, charSpacing: 3,
    });
    s.addText(step.title, {
      x: x + 0.3, y: stepY + 0.65, w: 3.5, h: 0.55,
      fontFace: HEAD, fontSize: 26, color: C.ink, bold: true,
    });
    s.addText(step.body, {
      x: x + 0.3, y: stepY + 1.4, w: 3.4, h: 1.5,
      fontFace: BODY, fontSize: 13, color: C.inkMid,
    });
  });

  // Cycle illustration at the bottom
  const yLine = 6.4;
  s.addText("SF  →  NYC  →  Austin  →  SF", {
    x: 0.6, y: yLine, w: 12, h: 0.6,
    fontFace: HEAD, fontSize: 22, color: C.cardinal, bold: true, align: "center",
  });
  s.addText("3-way cycle · 0 dollars exchanged between participants", {
    x: 0.6, y: yLine + 0.6, w: 12, h: 0.4,
    fontFace: BODY, fontSize: 13, color: C.coolGrey, align: "center", italic: true,
  });
}

// ───────────────── SLIDE 4: THE MATH ─────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.white };

  s.addText("WHY CYCLES BEAT BILATERAL", {
    x: 0.6, y: 0.5, w: 6, h: 0.35,
    fontFace: HEAD, fontSize: 12, color: C.cardinal, bold: true, charSpacing: 4,
  });

  s.addText("The math most platforms miss.", {
    x: 0.6, y: 0.9, w: 12, h: 0.9,
    fontFace: HEAD, fontSize: 36, color: C.ink, bold: true,
  });

  // Big stat callouts row
  const statY = 2.2;
  const stats = [
    { n: "+30pp", l: "match-rate lift over\nbilateral-only" },
    { n: "$4,500", l: "avg. savings per\nmatched student" },
    { n: "9", l: "cities in the\npilot network" },
  ];
  stats.forEach((stat, i) => {
    const x = 0.6 + i * 4.18;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: statY, w: 3.95, h: 2.2, rectRadius: 0.12,
      fill: { color: C.sand },
      line: { color: "DADAD4", width: 0.75 },
    });
    s.addText(stat.n, {
      x: x + 0.3, y: statY + 0.3, w: 3.5, h: 1.0,
      fontFace: HEAD, fontSize: 50, color: C.cardinal, bold: true,
    });
    s.addText(stat.l, {
      x: x + 0.3, y: statY + 1.3, w: 3.5, h: 0.8,
      fontFace: BODY, fontSize: 13, color: C.inkMid,
    });
  });

  // Bottom comparison — bilateral vs cycle bars
  const compY = 5.0;
  s.addText("Match rate, same data, two algorithms", {
    x: 0.6, y: compY, w: 12, h: 0.4,
    fontFace: HEAD, fontSize: 14, color: C.coolGrey, bold: true, charSpacing: 2,
  });

  // Bilateral bar (grey)
  s.addText("Bilateral only", {
    x: 0.6, y: compY + 0.55, w: 2.6, h: 0.4,
    fontFace: BODY, fontSize: 13, color: C.coolGrey, bold: true,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 3.4, y: compY + 0.55, w: 8.5, h: 0.35,
    fill: { color: "EEEEE8" }, line: { color: "EEEEE8", width: 0 },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 3.4, y: compY + 0.55, w: 8.5 * 0.38, h: 0.35,
    fill: { color: C.coolGrey }, line: { color: C.coolGrey, width: 0 },
  });
  s.addText("38%", {
    x: 12.0, y: compY + 0.55, w: 0.9, h: 0.35,
    fontFace: BODY, fontSize: 13, color: C.ink, bold: true,
  });

  // Cycle bar (cardinal)
  s.addText("Cycle-finding", {
    x: 0.6, y: compY + 1.05, w: 2.6, h: 0.4,
    fontFace: BODY, fontSize: 13, color: C.cardinal, bold: true,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 3.4, y: compY + 1.05, w: 8.5, h: 0.35,
    fill: { color: "EEEEE8" }, line: { color: "EEEEE8", width: 0 },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 3.4, y: compY + 1.05, w: 8.5 * 0.68, h: 0.35,
    fill: { color: C.cardinal }, line: { color: C.cardinal, width: 0 },
  });
  s.addText("68%", {
    x: 12.0, y: compY + 1.05, w: 0.9, h: 0.35,
    fontFace: BODY, fontSize: 13, color: C.ink, bold: true,
  });

  s.addText("Bilateral only finds 1-for-1 mirrors. Cycle-finding unlocks 3- and 4-way loops that no other platform can see — and we lift the match rate by ~30 points.", {
    x: 0.6, y: compY + 1.7, w: 12, h: 0.6,
    fontFace: BODY, fontSize: 12, color: C.coolGrey, italic: true,
  });
}

// ───────────────── SLIDE 5: DEMO ─────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.ink };

  s.addText("LIVE DEMO", {
    x: 0.6, y: 0.5, w: 4, h: 0.35,
    fontFace: HEAD, fontSize: 12, color: C.cardinalLight, bold: true, charSpacing: 4,
  });

  s.addText("cyclestay.vercel.app", {
    x: 0.6, y: 0.9, w: 12, h: 1.0,
    fontFace: HEAD, fontSize: 40, color: C.white, bold: true,
  });

  s.addText("What you'll see in the next 90 seconds.", {
    x: 0.6, y: 1.95, w: 12, h: 0.5,
    fontFace: BODY, fontSize: 16, color: "C8C8C0", italic: true,
  });

  // Four numbered demo beats
  const beats = [
    { n: "1", t: "Submit a real listing", d: "Live form on the landing page writes to a hosted Airtable backend." },
    { n: "2", t: "Open the admin matcher", d: "Password-gated console runs cycle detection over the combined live + baseline pool." },
    { n: "3", t: "Click a 3- or 4-way cycle", d: "Watch the chain animate across a U.S. flow map." },
    { n: "4", t: "Stress-test the network", d: "Multi-seed benchmarks, sensitivity sweeps, and a perturb button that simulates dropouts." },
  ];
  beats.forEach((b, i) => {
    const y = 2.85 + i * 1.05;
    // Number circle
    s.addShape(pptx.ShapeType.ellipse, {
      x: 0.6, y, w: 0.7, h: 0.7,
      fill: { color: C.cardinal }, line: { color: C.cardinal, width: 0 },
    });
    s.addText(b.n, {
      x: 0.6, y, w: 0.7, h: 0.7,
      fontFace: HEAD, fontSize: 22, color: C.white, bold: true, align: "center", valign: "middle",
    });
    // Title + description
    s.addText(b.t, {
      x: 1.6, y: y + 0.02, w: 11, h: 0.45,
      fontFace: HEAD, fontSize: 18, color: C.white, bold: true,
    });
    s.addText(b.d, {
      x: 1.6, y: y + 0.45, w: 11, h: 0.45,
      fontFace: BODY, fontSize: 13, color: "C8C8C0",
    });
  });

  s.addText("→ Switching to the live site now.", {
    x: 0.6, y: 7.05, w: 12, h: 0.4,
    fontFace: HEAD, fontSize: 14, color: C.cardinalLight, italic: true, bold: true,
  });
}

// ───────────────── SLIDE 6: WHAT'S NEXT ─────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.white };

  s.addText("WHAT'S NEXT", {
    x: 0.6, y: 0.5, w: 4, h: 0.35,
    fontFace: HEAD, fontSize: 12, color: C.cardinal, bold: true, charSpacing: 4,
  });

  s.addText("From a class prototype to a live pilot.", {
    x: 0.6, y: 0.9, w: 12, h: 0.9,
    fontFace: HEAD, fontSize: 36, color: C.ink, bold: true,
  });

  // 3-phase roadmap
  const phases = [
    { ph: "PHASE 1", t: "Validate the matcher", d: "Run the engine on real submissions across 4–6 partner MBA programs. Target: ≥50 listings, ≥5 confirmed cycles by June 2026." },
    { ph: "PHASE 2", t: "Build the logistics layer", d: "Escrow, key-exchange coordination, move-in checklist, and dropout-recovery flows so the platform can transact end-to-end." },
    { ph: "PHASE 3", t: "Expand the network", d: "Open beyond MBA to law, medical, and undergraduate research programs — the same migration pattern at 10× the volume." },
  ];
  phases.forEach((p, i) => {
    const y = 2.3 + i * 1.4;
    // Phase label (left column, narrow)
    s.addText(p.ph, {
      x: 0.6, y, w: 1.8, h: 0.4,
      fontFace: HEAD, fontSize: 11, color: C.cardinal, bold: true, charSpacing: 3,
    });
    // Title + description
    s.addText(p.t, {
      x: 2.6, y, w: 10, h: 0.45,
      fontFace: HEAD, fontSize: 22, color: C.ink, bold: true,
    });
    s.addText(p.d, {
      x: 2.6, y: y + 0.5, w: 10, h: 0.7,
      fontFace: BODY, fontSize: 13, color: C.inkMid,
    });
  });

  // Closing insight bar
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 6.5, w: 12.15, h: 0.9, rectRadius: 0.1,
    fill: { color: C.cardinal },
    line: { color: C.cardinal, width: 0 },
  });
  s.addText("Student summer housing isn't a liquidity problem — it's a coordination problem.", {
    x: 0.95, y: 6.55, w: 11.5, h: 0.8,
    fontFace: HEAD, fontSize: 18, color: C.white, bold: true, italic: true, valign: "middle",
  });
}

// Write
const outPath = "C:/Users/varun/Downloads/CycleStay-Class-Deck.pptx";
pptx.writeFile({ fileName: outPath }).then((p) => {
  console.log("Wrote:", p);
});
