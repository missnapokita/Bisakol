const { configured } = require("../../lib/redis");
const { getWinners } = require("../../lib/rewards");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  if (!configured()) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ winners: [] }));
  }

  try {
    const winners = await getWinners(50);

    const publicWinners = winners.map(item => ({
      submission_id: item.submission_id,
      tiktok_username: item.tiktok_username,
      content_type: item.content_type,
      reward_choice: item.reward_choice || "",
      winner_reward: item.winner_reward || item.reward || "",
      winner_announced_at: item.winner_announced_at || 0
    }));

    res.statusCode = 200;
    return res.end(JSON.stringify({ winners: publicWinners }));
  } catch {
    res.statusCode = 200;
    return res.end(JSON.stringify({ winners: [] }));
  }
};
