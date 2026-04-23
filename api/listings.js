// Serverless function: proxies Airtable calls.
// POST: public listing submission.
// GET:  admin-only, returns all records.
// PATCH: admin-only, updates a record's status.

module.exports = async (req, res) => {
  // CORS for safety (same-origin on Vercel, but doesn't hurt)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  if (req.method === "OPTIONS") return res.status(204).end();

  const airtableKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME || "Listings";
  const adminKey = process.env.ADMIN_KEY;

  if (!airtableKey || !baseId) {
    return res.status(503).json({ error: "Airtable env vars not configured on the server." });
  }

  const atUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  const atHeaders = {
    Authorization: `Bearer ${airtableKey}`,
    "Content-Type": "application/json",
  };

  try {
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const required = ["name", "email", "origin", "dest", "start_date", "end_date", "unit_type"];
      for (const k of required) {
        if (!body[k]) return res.status(400).json({ error: `Missing required field: ${k}` });
      }
      if (!/^[^@\s]+@[^@\s]+\.edu$/i.test(body.email)) {
        return res.status(400).json({ error: "A .edu email address is required." });
      }
      const atResp = await fetch(atUrl, {
        method: "POST",
        headers: atHeaders,
        body: JSON.stringify({
          fields: {
            name: body.name,
            email: body.email.toLowerCase(),
            origin: body.origin,
            dest: body.dest,
            start_date: body.start_date,
            end_date: body.end_date,
            unit_type: body.unit_type,
            status: "submitted",
          },
        }),
      });
      if (!atResp.ok) {
        const detail = await atResp.text();
        return res.status(502).json({ error: "Airtable write failed", detail });
      }
      return res.status(200).json({ ok: true });
    }

    // GET and PATCH require admin
    const provided = req.headers["x-admin-key"];
    if (!adminKey || provided !== adminKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "GET") {
      const records = [];
      let offset;
      do {
        const u = new URL(atUrl);
        u.searchParams.set("pageSize", "100");
        if (offset) u.searchParams.set("offset", offset);
        const atResp = await fetch(u.toString(), { headers: atHeaders });
        if (!atResp.ok) {
          const detail = await atResp.text();
          return res.status(502).json({ error: "Airtable read failed", detail });
        }
        const data = await atResp.json();
        records.push(...(data.records || []));
        offset = data.offset;
      } while (offset && records.length < 1000);
      return res.status(200).json({ records });
    }

    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      if (!body.id || !body.status) return res.status(400).json({ error: "id and status required" });
      const atResp = await fetch(`${atUrl}/${body.id}`, {
        method: "PATCH",
        headers: atHeaders,
        body: JSON.stringify({ fields: { status: body.status } }),
      });
      if (!atResp.ok) {
        const detail = await atResp.text();
        return res.status(502).json({ error: "Airtable update failed", detail });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e) });
  }
};
