const { configured } = require("../../lib/redis");
const { saveNewSubmission } = require("../../lib/rewards");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  if (!configured()) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: "Rewards storage is not configured" }));
  }

  try {
    const body = typeof req.body === "object"
      ? req.body
      : JSON.parse(req.body || "{}");

    const item = await saveNewSubmission(body, {
      ip_hint: req.headers["x-forwarded-for"] || ""
    });

    res.statusCode = 201;
    return res.end(JSON.stringify({
      ok: true,
      submission_id: item.submission_id,
      status: item.status,
      owner_token: item.owner_token
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    return res.end(JSON.stringify({
      error: error.message || "Unable to save submission"
    }));
  }
};
