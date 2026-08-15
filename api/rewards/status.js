const { configured } = require("../../lib/redis");
const { getSubmission } = require("../../lib/rewards");

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
      statuses: {},
      missing: []
    }));
  }

  const raw = String((req.query && req.query.ids) || "");
  const ids = raw
    .split(",")
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 50);

  const statuses = {};
  const missing = [];

  for (const id of ids) {
    const item = await getSubmission(id);

    if (!item) {
      missing.push(id);
      continue;
    }

    statuses[id] = {
      status: item.status,
      reward: item.reward || "",
      is_winner: item.is_winner === true,
      winner_reward: item.winner_reward || ""
    };
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({
    statuses,
    missing
  }));
};
