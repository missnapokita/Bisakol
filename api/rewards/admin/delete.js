const { configured } = require("../../../lib/redis");
const { deleteSubmission } = require("../../../lib/rewards");

function allowed(req) {
  const expected = process.env.REWARDS_ADMIN_KEY || "";
  const supplied = String(req.headers["x-admin-key"] || "");
  return Boolean(expected && supplied && supplied === expected);
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
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
    const body = typeof req.body === "object"
      ? req.body
      : JSON.parse(req.body || "{}");

    const id = String(body.submission_id || "").trim();

    if (!id) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "submission_id is required" }));
    }

    const deleted = await deleteSubmission(id);

    if (!deleted) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: "Submission not found" }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: error.message || "Unable to delete submission" }));
  }
};
