const pptxgen = require("pptxgenjs");

const CARDINAL = "8C1515";
const CARDINAL_DARK = "820000";
const CARDINAL_LIGHT = "B83A4B";
const CARDINAL_WASH = "FBEDED";
const INK = "1A1A18";
const INK_MID = "444441";
const INK_MUTED = "888780";
const SAND = "F7F5F0";
const WHITE = "FFFFFF";
const BORDER = "D9D6CF";
const COOL_GREY = "53565A";

const SERIF = "Georgia";
const SANS = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10" x 5.625"
pres.title = "CycleStay — OIT277 Demo";
pres.author = "CycleStay";

const W = 10;
const H = 5.625;

function chrome(slide, num) {
  // Brand wordmark top-left
  slide.addText(
    [
      { text: "Cycle", options: { color: INK, fontFace: SERIF } },
      { text: "Stay", options: { color: CARDINAL, fontFace: SERIF } },
    ],
    { x: 0.4, y: 0.22, w: 2, h: 0.3, fontSize: 13, margin: 0 }
  );
  // Slide counter top-right
  slide.addText(`0${num} / 06`, {
    x: W - 1.4, y: 0.22, w: 1, h: 0.3,
    fontSize: 9, color: INK_MUTED,
    fontFace: SANS, align: "right",
    charSpacing: 3, margin: 0,
  });
}

function eyebrow(slide, text, x, y) {
  // dot + text
  slide.addShape(pres.shapes.OVAL, {
    x, y: y + 0.05, w: 0.08, h: 0.08,
    fill: { color: CARDINAL }, line: { color: CARDINAL, width: 0 },
  });
  slide.addText(text.toUpperCase(), {
    x: x + 0.16, y, w: 7, h: 0.22,
    fontSize: 9, bold: true, color: CARDINAL,
    fontFace: SANS, charSpacing: 4, margin: 0,
  });
}

// =================== SLIDE 1: COVER ===================
{
  const s = pres.addSlide();
  s.background = { color: SAND };
  chrome(s, 1);

  // soft cardinal blob top-right
  s.addShape(pres.shapes.OVAL, {
    x: 7.8, y: -1.2, w: 4.5, h: 4.5,
    fill: { color: CARDINAL, transparency: 90 },
    line: { type: "none" },
  });
  s.addShape(pres.shapes.OVAL, {
    x: -1.5, y: 4, w: 3.5, h: 3.5,
    fill: { color: CARDINAL_LIGHT, transparency: 92 },
    line: { type: "none" },
  });

  eyebrow(s, "OIT277 · Class demo", 0.6, 1.0);

  // Title
  s.addText(
    [
      { text: "Trade your apartment,", options: { color: INK, breakLine: true } },
      { text: "not your savings.", options: { color: CARDINAL, italic: true } },
    ],
    {
      x: 0.6, y: 1.35, w: 9, h: 1.9,
      fontSize: 54, fontFace: SERIF, bold: false,
      margin: 0, valign: "top",
    }
  );

  // Subtitle
  s.addText(
    "A 3- and 4-way home-swap network for MBA and grad students interning anywhere this summer — without double rent, Craigslist risk, or negotiating with strangers.",
    {
      x: 0.6, y: 3.4, w: 8, h: 1.0,
      fontSize: 15, color: INK_MID, fontFace: SANS,
      margin: 0, valign: "top",
    }
  );

  // separator line
  s.addShape(pres.shapes.LINE, {
    x: 0.6, y: 4.55, w: 8.8, h: 0,
    line: { color: BORDER, width: 1 },
  });

  // meta row
  const metaY = 4.7;
  const cols = [
    { lbl: "COURSE", val: "OIT277" },
    { lbl: "PILOT", val: "Summer 2026" },
    { lbl: "NETWORK", val: "9 cities · 100+ matches/run" },
  ];
  let mx = 0.6;
  cols.forEach((c) => {
    s.addText(c.lbl, {
      x: mx, y: metaY, w: 3.5, h: 0.22,
      fontSize: 8, color: INK_MUTED, fontFace: SANS,
      charSpacing: 3, bold: true, margin: 0,
    });
    s.addText(c.val, {
      x: mx, y: metaY + 0.25, w: 3.5, h: 0.3,
      fontSize: 13, color: INK, fontFace: SANS, bold: true, margin: 0,
    });
    mx += 3.0;
  });
}

// =================== SLIDE 2: PROBLEM ===================
{
  const s = pres.addSlide();
  s.background = { color: SAND };
  chrome(s, 2);

  eyebrow(s, "The problem", 0.6, 0.75);

  s.addText(
    [
      { text: "Summer interns pay ", options: { color: INK } },
      { text: "twice", options: { color: CARDINAL, italic: true } },
      { text: " for one bed.", options: { color: INK } },
    ],
    {
      x: 0.6, y: 1.05, w: 9, h: 0.9,
      fontSize: 36, fontFace: SERIF, margin: 0, valign: "top",
    }
  );

  // Left pain cards
  const pains = [
    { n: "01", h: "Lease locked, intern moving", p: "12-month leases in Stanford housing, Boston, NYC don't pause for a 10-week internship across the country." },
    { n: "02", h: "Subletting is a part-time job", p: "Posting to Craigslist, vetting strangers, chasing deposits — all while studying for finals." },
    { n: "03", h: "1-for-1 swaps almost never line up", p: "Your SF intern needs NYC, but the NYC student needs Boston, not SF. The match dies." },
  ];
  let py = 2.2;
  pains.forEach((p) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y: py, w: 5.4, h: 0.95,
      fill: { color: WHITE }, line: { color: BORDER, width: 0.75 },
    });
    s.addText(p.n, {
      x: 0.8, y: py + 0.15, w: 0.6, h: 0.5,
      fontSize: 22, color: CARDINAL, fontFace: SERIF, margin: 0, valign: "top",
    });
    s.addText(p.h, {
      x: 1.45, y: py + 0.13, w: 4.5, h: 0.32,
      fontSize: 13, color: INK, fontFace: SANS, bold: true, margin: 0, valign: "top",
    });
    s.addText(p.p, {
      x: 1.45, y: py + 0.43, w: 4.4, h: 0.5,
      fontSize: 10.5, color: INK_MID, fontFace: SANS, margin: 0, valign: "top",
    });
    py += 1.05;
  });

  // Right cardinal cost card
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.3, y: 2.2, w: 3.1, h: 3.0,
    fill: { color: CARDINAL }, line: { color: CARDINAL, width: 0 },
  });
  s.addText("TYPICAL SUMMER COST", {
    x: 6.5, y: 2.35, w: 2.8, h: 0.25,
    fontSize: 8.5, color: WHITE, fontFace: SANS, bold: true, charSpacing: 3, margin: 0,
  });
  s.addText("~$9,000", {
    x: 6.5, y: 2.6, w: 2.8, h: 0.85,
    fontSize: 44, color: WHITE, fontFace: SERIF, margin: 0, valign: "top",
  });
  s.addText("Out-of-pocket for an MBA intern paying for two cities for ten weeks.", {
    x: 6.5, y: 3.5, w: 2.8, h: 0.55,
    fontSize: 10, color: WHITE, fontFace: SANS, margin: 0, valign: "top",
  });
  s.addShape(pres.shapes.LINE, {
    x: 6.5, y: 4.1, w: 2.8, h: 0,
    line: { color: WHITE, width: 0.5, transparency: 60 },
  });
  const rows = [
    ["Home-city rent (held)", "$4,500"],
    ["Intern-city sublet", "$4,500"],
    ["Hours on Craigslist", "20+"],
  ];
  let ry = 4.2;
  rows.forEach((r) => {
    s.addText(r[0], {
      x: 6.5, y: ry, w: 1.9, h: 0.25,
      fontSize: 10, color: WHITE, fontFace: SANS, margin: 0,
    });
    s.addText(r[1], {
      x: 8.4, y: ry, w: 0.9, h: 0.25,
      fontSize: 10, color: WHITE, fontFace: SANS, bold: true, align: "right", margin: 0,
    });
    ry += 0.3;
  });
}

// =================== SLIDE 3: SOLUTION ===================
{
  const s = pres.addSlide();
  s.background = { color: SAND };
  chrome(s, 3);

  eyebrow(s, "The fix", 0.6, 0.75);

  s.addText(
    [
      { text: "Don't trade with one stranger. ", options: { color: INK } },
      { text: "Cycle", options: { color: CARDINAL, italic: true } },
      { text: " with three.", options: { color: INK } },
    ],
    {
      x: 0.6, y: 1.05, w: 9, h: 1.4,
      fontSize: 32, fontFace: SERIF, margin: 0, valign: "top",
    }
  );

  // Left body
  s.addText(
    [
      { text: "CycleStay treats summer housing as a network problem. We close ", options: { color: INK_MID } },
      { text: "3- and 4-way loops", options: { color: INK, bold: true } },
      { text: ": A's apartment goes to B, B's to C, C's to A. Everyone moves once. Nobody pays twice.", options: { color: INK_MID } },
    ],
    {
      x: 0.6, y: 2.5, w: 5.0, h: 1.2,
      fontSize: 13, fontFace: SANS, margin: 0, valign: "top", paraSpaceAfter: 6,
    }
  );
  s.addText(
    [
      { text: "Same trust model as a 1-for-1 swap (verified students, university email), but with ", options: { color: INK_MID } },
      { text: "orders of magnitude more matches", options: { color: INK, bold: true } },
      { text: " because the algorithm finds chains, not pairs.", options: { color: INK_MID } },
    ],
    {
      x: 0.6, y: 3.75, w: 5.0, h: 1.3,
      fontSize: 13, fontFace: SANS, margin: 0, valign: "top",
    }
  );

  // Right diagram — triangle of 3 city nodes
  const cx = 8.0, cy = 3.3;
  const r = 1.4;
  const sf = { x: cx, y: cy - r, label: "SF", sub: "Alex · 2BR", color: CARDINAL };
  const nyc = { x: cx + r * 0.866, y: cy + r * 0.5, label: "NYC", sub: "Priya · 1BR", color: CARDINAL_LIGHT };
  const bos = { x: cx - r * 0.866, y: cy + r * 0.5, label: "BOS", sub: "Jordan · Studio", color: COOL_GREY };

  // background ring
  s.addShape(pres.shapes.OVAL, {
    x: cx - r - 0.2, y: cy - r - 0.2, w: (r + 0.2) * 2, h: (r + 0.2) * 2,
    fill: { color: SAND, transparency: 100 },
    line: { color: BORDER, width: 0.75 },
  });

  // Arrows SF -> NYC -> BOS -> SF — normalize to positive w/h with flipH/flipV
  function arrow(from, to, color) {
    const bx = Math.min(from.x, to.x);
    const by = Math.min(from.y, to.y);
    const bw = Math.max(0.001, Math.abs(to.x - from.x));
    const bh = Math.max(0.001, Math.abs(to.y - from.y));
    const isLeft = from.x <= to.x;
    const isTop = from.y <= to.y;
    const flipH = !isLeft && isTop;     // TR -> BL
    const flipV = isLeft && !isTop;     // BL -> TR
    const flipBoth = !isLeft && !isTop; // BR -> TL
    s.addShape(pres.shapes.LINE, {
      x: bx, y: by, w: bw, h: bh,
      flipH: flipH || flipBoth,
      flipV: flipV || flipBoth,
      line: { color, width: 1.75, dashType: "dash", endArrowType: "triangle" },
    });
  }
  arrow(sf, nyc, CARDINAL);
  arrow(nyc, bos, CARDINAL_LIGHT);
  arrow(bos, sf, COOL_GREY);

  // city nodes
  function node(n) {
    const dot = 0.5;
    s.addShape(pres.shapes.OVAL, {
      x: n.x - dot / 2, y: n.y - dot / 2, w: dot, h: dot,
      fill: { color: WHITE }, line: { color: n.color, width: 1.5 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: n.x - 0.13, y: n.y - 0.13, w: 0.26, h: 0.26,
      fill: { color: n.color }, line: { color: n.color, width: 0 },
    });
    s.addText(n.label, {
      x: n.x - 0.7, y: n.y + 0.3, w: 1.4, h: 0.25,
      fontSize: 11, bold: true, color: n.color, fontFace: SANS, align: "center", charSpacing: 2, margin: 0,
    });
    s.addText(n.sub, {
      x: n.x - 0.9, y: n.y + 0.52, w: 1.8, h: 0.2,
      fontSize: 9, color: INK_MUTED, fontFace: SANS, align: "center", margin: 0,
    });
  }
  node(sf); node(nyc); node(bos);
}

// =================== SLIDE 4: HOW IT WORKS ===================
{
  const s = pres.addSlide();
  s.background = { color: SAND };
  chrome(s, 4);

  eyebrow(s, "How it works", 0.6, 0.75);
  s.addText(
    [
      { text: "Three steps to your ", options: { color: INK } },
      { text: "summer home.", options: { color: CARDINAL, italic: true } },
    ],
    {
      x: 0.6, y: 1.05, w: 9, h: 0.9,
      fontSize: 36, fontFace: SERIF, margin: 0, valign: "top",
    }
  );

  const steps = [
    { icon: "⌂", n: "01 — LIST", h: "Post your place in 5 minutes", p: "Upload a few photos, set dates and rent, name cities you'd consider. University email gates the network." },
    { icon: "↻", n: "02 — MATCH", h: "Our algorithm finds your cycle", p: "Cycle search finds 3- and 4-way loops where everyone gets a destination they wanted, ranked by overall fit." },
    { icon: "✓", n: "03 — SWAP", h: "Move in, rent-free", p: "Confirm the cycle, sign a CycleStay swap agreement, trade keys. No double rent. No Craigslist." },
  ];

  const cardW = 2.85, cardH = 2.6, cardY = 2.2;
  let cx = 0.6;
  steps.forEach((st) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cardY, w: cardW, h: cardH,
      fill: { color: WHITE }, line: { color: BORDER, width: 0.75 },
    });
    // icon chip
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx + 0.25, y: cardY + 0.25, w: 0.5, h: 0.5,
      fill: { color: CARDINAL_WASH }, line: { color: CARDINAL_WASH, width: 0 },
    });
    s.addText(st.icon, {
      x: cx + 0.25, y: cardY + 0.22, w: 0.5, h: 0.5,
      fontSize: 20, color: CARDINAL, fontFace: SERIF, align: "center", valign: "middle", margin: 0,
    });
    s.addText(st.n, {
      x: cx + 0.25, y: cardY + 0.9, w: cardW - 0.5, h: 0.25,
      fontSize: 9, color: CARDINAL, fontFace: SANS, bold: true, charSpacing: 3, margin: 0,
    });
    s.addText(st.h, {
      x: cx + 0.25, y: cardY + 1.15, w: cardW - 0.5, h: 0.7,
      fontSize: 17, color: INK, fontFace: SERIF, margin: 0, valign: "top",
    });
    s.addText(st.p, {
      x: cx + 0.25, y: cardY + 1.85, w: cardW - 0.5, h: 0.7,
      fontSize: 10.5, color: INK_MID, fontFace: SANS, margin: 0, valign: "top",
    });
    cx += cardW + 0.2;
  });

  // bottom stat row
  s.addShape(pres.shapes.LINE, {
    x: 0.6, y: 5.0, w: 8.8, h: 0,
    line: { color: BORDER, width: 1 },
  });
  const stats = [
    { n: "5 min", l: "TO LIST" },
    { n: "<1 sec", l: "MATCH RUNTIME" },
    { n: "1 move", l: "PER STUDENT" },
  ];
  let sx = 0.6;
  stats.forEach((st) => {
    s.addText(st.n, {
      x: sx, y: 5.1, w: 2, h: 0.32,
      fontSize: 18, color: INK, fontFace: SERIF, margin: 0,
    });
    s.addText(st.l, {
      x: sx + 1.0, y: 5.18, w: 2, h: 0.22,
      fontSize: 8, color: INK_MUTED, fontFace: SANS, bold: true, charSpacing: 2, margin: 0, valign: "middle",
    });
    sx += 3.0;
  });
}

// =================== SLIDE 5: THE MATH ===================
{
  const s = pres.addSlide();
  s.background = { color: SAND };
  chrome(s, 5);

  eyebrow(s, "Why cycles win", 0.6, 0.75);
  s.addText(
    [
      { text: "The math most platforms ", options: { color: INK } },
      { text: "miss.", options: { color: CARDINAL, italic: true } },
    ],
    {
      x: 0.6, y: 1.05, w: 9, h: 0.9,
      fontSize: 36, fontFace: SERIF, margin: 0, valign: "top",
    }
  );

  // Left card (white)
  const cardY = 2.0, cardH = 2.85;
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: cardY, w: 4.2, h: cardH,
    fill: { color: WHITE }, line: { color: BORDER, width: 0.75 },
  });
  s.addText("1-for-1 sublets only", {
    x: 0.85, y: cardY + 0.2, w: 3.8, h: 0.35,
    fontSize: 18, color: INK, fontFace: SERIF, margin: 0,
  });
  s.addText("~3%", {
    x: 0.85, y: cardY + 0.6, w: 3.8, h: 1.0,
    fontSize: 56, color: CARDINAL, fontFace: SERIF, margin: 0, valign: "top",
  });
  s.addText("Share of pairs in a typical student network where both sides want each other's exact city. Most matches die at the first hop.", {
    x: 0.85, y: cardY + 1.7, w: 3.8, h: 0.85,
    fontSize: 11, color: INK_MID, fontFace: SANS, margin: 0, valign: "top",
  });

  // Right card (dark, featured)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.0, y: cardY, w: 4.4, h: cardH,
    fill: { color: INK }, line: { color: INK, width: 0 },
  });
  s.addText("Multi-way cycles", {
    x: 5.25, y: cardY + 0.2, w: 4.0, h: 0.35,
    fontSize: 18, color: WHITE, fontFace: SERIF, margin: 0,
  });
  s.addText("100+", {
    x: 5.25, y: cardY + 0.6, w: 4.0, h: 1.0,
    fontSize: 56, color: CARDINAL_LIGHT, fontFace: SERIF, margin: 0, valign: "top",
  });
  s.addText("Valid 3- and 4-way swaps surfaced per matcher run on a 9-city, 250-listing network.", {
    x: 5.25, y: cardY + 1.55, w: 4.0, h: 0.5,
    fontSize: 10.5, color: WHITE, fontFace: SANS, margin: 0, valign: "top",
  });
  const subs = [
    "Adds NYC↔BOS↔SF triangles 1-for-1 can't see",
    "Tolerates date mismatches up to ±7 days",
    "Ranks by everyone's preferences, not just first match",
  ];
  let sy = cardY + 2.05;
  subs.forEach((b) => {
    s.addText("→", {
      x: 5.25, y: sy, w: 0.2, h: 0.22,
      fontSize: 10, color: CARDINAL_LIGHT, fontFace: SANS, bold: true, margin: 0,
    });
    s.addText(b, {
      x: 5.45, y: sy, w: 3.85, h: 0.22,
      fontSize: 9.5, color: WHITE, fontFace: SANS, margin: 0,
    });
    sy += 0.18;
  });

  // bottom stat row
  s.addShape(pres.shapes.LINE, {
    x: 0.6, y: 5.0, w: 8.8, h: 0,
    line: { color: BORDER, width: 1 },
  });
  const stats = [
    { n: "$4,500", l: "AVG. SUMMER SAVINGS" },
    { n: "100+", l: "MATCHES PER RUN" },
    { n: "9", l: "CITIES IN NETWORK" },
  ];
  let xS = 0.6;
  stats.forEach((st) => {
    s.addText(st.n, {
      x: xS, y: 5.1, w: 1.5, h: 0.32,
      fontSize: 18, color: INK, fontFace: SERIF, margin: 0,
    });
    s.addText(st.l, {
      x: xS + 1.05, y: 5.18, w: 2.0, h: 0.22,
      fontSize: 8, color: INK_MUTED, fontFace: SANS, bold: true, charSpacing: 2, margin: 0, valign: "middle",
    });
    xS += 3.0;
  });
}

// =================== SLIDE 6: DEMO ===================
{
  const s = pres.addSlide();
  s.background = { color: SAND };
  chrome(s, 6);

  eyebrow(s, "Live demo", 0.6, 0.75);
  s.addText("Run the matcher.", {
    x: 0.6, y: 1.05, w: 6.0, h: 0.9,
    fontSize: 36, fontFace: SERIF, color: INK, margin: 0, valign: "top",
  });

  // Pill button
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 6.9, y: 1.25, w: 2.5, h: 0.5,
    fill: { color: CARDINAL }, line: { color: CARDINAL, width: 0 },
    rectRadius: 0.25,
  });
  s.addText("Open full app  →", {
    x: 6.9, y: 1.25, w: 2.5, h: 0.5,
    fontSize: 13, color: WHITE, fontFace: SANS, bold: true,
    align: "center", valign: "middle", margin: 0,
    hyperlink: { url: "https://cyclestay.app", tooltip: "Open CycleStay matcher" },
  });

  // Mock browser frame
  const frX = 0.6, frY = 2.15, frW = 8.8, frH = 2.6;
  s.addShape(pres.shapes.RECTANGLE, {
    x: frX, y: frY, w: frW, h: frH,
    fill: { color: WHITE }, line: { color: BORDER, width: 0.75 },
  });
  // browser top bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: frX, y: frY, w: frW, h: 0.36,
    fill: { color: "F0EEE8" }, line: { color: BORDER, width: 0 },
  });
  // traffic dots
  ["FF5F57", "FEBC2E", "28C840"].forEach((c, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: frX + 0.15 + i * 0.22, y: frY + 0.11, w: 0.14, h: 0.14,
      fill: { color: c }, line: { color: c, width: 0 },
    });
  });
  // url
  s.addText("cyclestay.app/app", {
    x: frX + 1.0, y: frY + 0.06, w: frW - 2, h: 0.24,
    fontSize: 9, color: INK_MUTED, fontFace: SANS, align: "center", valign: "middle", margin: 0,
  });

  // mock content inside frame
  s.addText(
    [
      { text: "Cycle", options: { color: INK } },
      { text: "Stay", options: { color: CARDINAL } },
      { text: "  matcher", options: { color: INK_MUTED } },
    ],
    {
      x: frX + 0.4, y: frY + 0.55, w: 5, h: 0.32,
      fontSize: 14, fontFace: SERIF, bold: false, margin: 0,
    }
  );
  s.addText("Live at cyclestay.app", {
    x: frX + 0.4, y: frY + 0.85, w: 5, h: 0.25,
    fontSize: 10, color: INK_MUTED, fontFace: SANS, margin: 0,
    hyperlink: { url: "https://cyclestay.app" },
  });

  // mock 3 city pills + result
  const pillY = frY + 1.3;
  ["Home: SF", "Intern: NYC", "Dates: Jun–Aug"].forEach((p, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: frX + 0.4 + i * 1.7, y: pillY, w: 1.55, h: 0.36,
      fill: { color: CARDINAL_WASH }, line: { color: CARDINAL_WASH, width: 0 },
      rectRadius: 0.18,
    });
    s.addText(p, {
      x: frX + 0.4 + i * 1.7, y: pillY, w: 1.55, h: 0.36,
      fontSize: 10, color: CARDINAL, fontFace: SANS, bold: true,
      align: "center", valign: "middle", margin: 0,
    });
  });
  // result row
  s.addShape(pres.shapes.RECTANGLE, {
    x: frX + 0.4, y: frY + 1.85, w: 8.0, h: 0.55,
    fill: { color: SAND }, line: { color: BORDER, width: 0.5 },
  });
  s.addText(
    [
      { text: "✓ Match found  ", options: { color: CARDINAL, bold: true } },
      { text: "SF → NYC → BOS → SF", options: { color: INK, bold: true } },
      { text: "    3-way cycle · 0.42s · $4,620 saved", options: { color: INK_MUTED } },
    ],
    {
      x: frX + 0.55, y: frY + 1.85, w: 7.7, h: 0.55,
      fontSize: 11, fontFace: SANS, valign: "middle", margin: 0,
    }
  );

  // bottom row
  s.addText(
    [
      { text: "Try it: ", options: { color: INK, bold: true } },
      { text: "pick a home city + intern city, hit ", options: { color: INK_MID } },
      { text: "Launch matcher", options: { color: INK, bold: true } },
      { text: ", watch a 3- or 4-way cycle come back in <1s.", options: { color: INK_MID } },
    ],
    {
      x: 0.6, y: 4.95, w: 6.2, h: 0.5,
      fontSize: 11, fontFace: SANS, margin: 0, valign: "top",
    }
  );
  s.addText(
    [
      { text: "Pilot: ", options: { color: CARDINAL, bold: true } },
      { text: "Summer 2026 · Stanford GSB cohort first", options: { color: INK_MID } },
    ],
    {
      x: 6.9, y: 4.95, w: 2.5, h: 0.5,
      fontSize: 11, fontFace: SANS, align: "right", margin: 0, valign: "top",
    }
  );
}

pres.writeFile({ fileName: "C:/Users/varun/OneDrive/Documents/CycleStay/deck.pptx" })
  .then((f) => console.log("Wrote:", f));
