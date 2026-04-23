// Verifies the admin shared password. Returns 200 if the provided key matches
// the ADMIN_KEY env var. The client then stores the key in sessionStorage and
// sends it as x-admin-key on subsequent admin requests.

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return res.status(503).json({ error: "Admin key not configured on the server." });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  if (body.key && body.key === adminKey) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: "Invalid admin key" });
};
