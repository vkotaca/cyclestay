// One-shot script to populate the CycleStay Airtable schema via the Meta API.
//
// Prereqs before running:
//   1. Rename the default table to "Listings"
//   2. Rename the primary field to "name" (keep type: singleLineText)
//   3. Create a PAT with scopes:
//        data.records:read, data.records:write,
//        schema.bases:read, schema.bases:write
//      scoped to the CycleStay base.
//
// Run (PowerShell):
//   $env:AIRTABLE_API_KEY="pat..."; $env:AIRTABLE_BASE_ID="appwMNKLbC74Rf0Tl"; node scripts/setup-airtable.mjs
//
// Or (bash / git bash):
//   AIRTABLE_API_KEY=pat... AIRTABLE_BASE_ID=appwMNKLbC74Rf0Tl node scripts/setup-airtable.mjs
//
// Idempotent: fields that already exist are skipped.

// Auto-load .env.local if present (from `vercel env pull`).
import fs from "node:fs";
import path from "node:path";
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  console.log(`Loaded env from ${envPath}`);
}

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || "Listings";

if (!API_KEY || !BASE_ID) {
  console.error("Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID env vars first.");
  process.exit(1);
}

const META = `https://api.airtable.com/v0/meta/bases/${BASE_ID}`;
const H = { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };

const CITIES = ["SF", "NYC", "Boston", "Chicago", "Seattle", "LA", "Austin", "Miami", "DC"];
const UNITS = ["studio", "1br", "2br+", "room"];
const STATUSES = ["submitted", "matched", "expired"];

const FIELDS_TO_CREATE = [
  { name: "email", type: "email" },
  {
    name: "origin",
    type: "singleSelect",
    options: { choices: CITIES.map(c => ({ name: c })) },
  },
  {
    name: "dest",
    type: "singleSelect",
    options: { choices: CITIES.map(c => ({ name: c })) },
  },
  {
    name: "start_date",
    type: "date",
    options: { dateFormat: { name: "iso" } },
  },
  {
    name: "end_date",
    type: "date",
    options: { dateFormat: { name: "iso" } },
  },
  {
    name: "unit_type",
    type: "singleSelect",
    options: { choices: UNITS.map(u => ({ name: u })) },
  },
  {
    name: "status",
    type: "singleSelect",
    options: { choices: STATUSES.map(s => ({ name: s })) },
  },
  { name: "created", type: "createdTime" },
];

async function main() {
  // 1. Fetch existing tables to find ours.
  const tablesResp = await fetch(`${META}/tables`, { headers: H });
  if (!tablesResp.ok) {
    console.error("Could not list tables:", tablesResp.status, await tablesResp.text());
    process.exit(1);
  }
  const { tables } = await tablesResp.json();
  const table = tables.find(t => t.name === TABLE_NAME);
  if (!table) {
    console.error(`No table named "${TABLE_NAME}" in base ${BASE_ID}. Rename your default table first.`);
    console.error(`Found tables: ${tables.map(t => t.name).join(", ") || "(none)"}`);
    process.exit(1);
  }
  console.log(`Found table "${TABLE_NAME}" (id=${table.id})`);

  // Check primary field.
  const primary = table.fields.find(f => f.id === table.primaryFieldId);
  if (primary.name !== "name") {
    console.warn(`⚠ Primary field is named "${primary.name}", expected "name". Rename it in the UI before continuing.`);
  } else {
    console.log(`✓ Primary field is "name"`);
  }

  const existing = new Set(table.fields.map(f => f.name));

  // 2. Create each field if missing.
  for (const field of FIELDS_TO_CREATE) {
    if (existing.has(field.name)) {
      console.log(`  skip  ${field.name} (exists)`);
      continue;
    }
    const r = await fetch(`${META}/tables/${table.id}/fields`, {
      method: "POST",
      headers: H,
      body: JSON.stringify(field),
    });
    if (r.ok) {
      console.log(`  +     ${field.name}`);
    } else {
      const detail = await r.text();
      console.error(`  fail  ${field.name} — ${r.status}: ${detail}`);
    }
  }

  console.log("\nDone. Verify the schema in the Airtable UI, then set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and ADMIN_KEY on Vercel and redeploy.");
}

main().catch(err => { console.error(err); process.exit(1); });
