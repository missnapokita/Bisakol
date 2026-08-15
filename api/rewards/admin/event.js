const { configured } = require("../../../lib/redis");
const { getEventConfig, setEventConfig } = require("../../../lib/rewards");

function allowed(req) {
  const expected = process.env.REWARDS_ADMIN_KEY || "";
  const supplied = String(req.headers["x-admin-key"] || "");
  return Boolean(expected && supplied && supplied === expected);
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (!allowed(req)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: "Unauthorized" }));
  }

  if (!configured()) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: "Storage is not configured" }));
  }

  try {
    if (req.method === "GET") {
      const config = await getEventConfig();
      res.statusCode = 200;
      return res.end(JSON.stringify(config));
    }

    if (req.method === "POST") {
      const body = typeof req.body === "object"
        ? req.body
        : JSON.parse(req.body || "{}");

      const config = await setEventConfig(body);
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, config }));
    }

    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: error.message || "Unable to update event config" }));
  }
};
