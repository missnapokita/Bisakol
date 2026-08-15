const { configured } = require("../../../lib/redis");
const {
  getSubmission,
  updateSubmission,
  markApproved
} = require("../../../lib/rewards");

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
    const action = String(body.action || "").trim().toLowerCase();

    if (!id || !["approve", "reject", "pending"].includes(action)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Invalid review request" }));
    }

    const existing = await getSubmission(id);

    if (!existing) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: "Submission not found" }));
    }

    const status = action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : "pending";

    const updated = await updateSubmission(id, {
      status,
      reviewed_at: Date.now(),
      review_note: String(body.review_note || "").trim().slice(0, 500),
      reward: String(body.reward || "").trim().slice(0, 120),
      score: Math.max(0, Number(body.score || 0) || 0)
    });

    if (status === "approved") {
      await markApproved(id);
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({
      ok: true,
      item: updated
    }));

  } catch (error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({
      error: error.message || "Unable to update submission"
    }));
  }
};
