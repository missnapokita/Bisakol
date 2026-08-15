const { configured } = require("../../lib/redis");
const { getEventConfig } = require("../../lib/rewards");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  if (!configured()) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      countdown_enabled: false,
      countdown_title: "Event Starts Soon",
      countdown_message: "",
      start_at: 0
    }));
  }

  try {
    const config = await getEventConfig();
    res.statusCode = 200;
    return res.end(JSON.stringify({
      ...config,
      server_now: Date.now()
    }));
  } catch {
    res.statusCode = 500;
    return res.end(JSON.stringify({ countdown_enabled: false, start_at: 0 }));
  }
};
