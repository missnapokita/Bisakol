const { configured } = require("../../../lib/redis");
const { getAll } = require("../../../lib/rewards");

function allowed(req) {
  const expected = process.env.REWARDS_ADMIN_KEY || "";
  const supplied = String(req.headers["x-admin-key"] || "");
  return Boolean(expected && supplied && supplied === expected);
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  if (!allowed(req)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: "Unauthorized" }));
  }

  if (!configured()) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: "Storage is not configured" }));
  }

  try {
    const items = await getAll(300);
    res.statusCode = 200;
    return res.end(JSON.stringify({ entries: items }));
  } catch (error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: error.message || "Unable to load entries" }));
  }
};
