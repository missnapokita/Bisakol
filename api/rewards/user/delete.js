const { configured } = require("../../../lib/redis");
const { deleteOwnedSubmission } = require("../../../lib/rewards");

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

    const deleted = await deleteOwnedSubmission(
      body.submission_id,
      body.owner_token || ""
    );

    if (!deleted) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: "Submission not found" }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({
      ok: true,
      submission_id: String(body.submission_id || "")
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    return res.end(JSON.stringify({
      error: error.message || "Unable to delete submission"
    }));
  }
};
