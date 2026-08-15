const { configured } = require("../../../lib/redis");
const { updateOwnedSubmission } = require("../../../lib/rewards");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  if (!configured()) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: "Storage is not configured" }));
  }

  try {
    const body = typeof req.body === "object"
      ? req.body
      : JSON.parse(req.body || "{}");

    const item = await updateOwnedSubmission(
      body.submission_id,
      body.owner_token,
      body
    );

    // Never expose the ownership token as part of the editable item payload.
    const safe = { ...item };
    delete safe.owner_token;

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, item: safe }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    return res.end(JSON.stringify({ error: error.message || "Unable to update submission" }));
  }
};
