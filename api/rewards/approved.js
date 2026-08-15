const { configured } = require("../../lib/redis");
const { getApproved } = require("../../lib/rewards");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  if (!configured()) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ entries: [] }));
  }

  try {
    const items = await getApproved(100);

    const publicItems = items.map(item => ({
      submission_id: item.submission_id,
      tiktok_username: item.tiktok_username,
      tiktok_url: item.tiktok_url,
      content_type: item.content_type,
      status: item.status,
      reward: item.reward || "",
      reward_choice: item.reward_choice || "",
      is_winner: item.is_winner === true,
      winner_reward: item.winner_reward || "",
      score: Number(item.score || 0),
      submitted_at: item.submitted_at
    }));

    res.statusCode = 200;
    return res.end(JSON.stringify({ entries: publicItems }));
  } catch (error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ entries: [] }));
  }
};
