const {
  getJson,
  setJson,
  listIds,
  pushId,
  removeId,
  deleteKey
} = require("./redis");

const ALL_IDS_KEY = "bisaya:rewards:all_ids";
const APPROVED_IDS_KEY = "bisaya:rewards:approved_ids";
const EVENT_CONFIG_KEY = "bisaya:rewards:event_config";

function cleanText(value, max = 300) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function isTikTokUrl(value) {
  try {
    const url = new URL(cleanText(value, 700));
    const host = url.hostname.toLowerCase();

    return host === "tiktok.com" ||
      host.endsWith(".tiktok.com") ||
      host === "vm.tiktok.com" ||
      host === "vt.tiktok.com";
  } catch {
    return false;
  }
}

function createId() {
  return `BTK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function itemKey(id) {
  return `bisaya:rewards:item:${id}`;
}

async function saveNewSubmission(body, requestInfo = {}) {
  const username = cleanText(body.tiktok_username, 80).replace(/^@+/, "");
  const url = cleanText(body.tiktok_url, 700);
  const contentType = cleanText(body.content_type, 40);
  const rewardChoice = cleanText(body.reward_choice, 20);
  const payoutMethod = cleanText(body.payout_method, 30);
  const payoutAccount = cleanText(body.payout_account, 120);
  const mlbbId = cleanText(body.mlbb_id, 40);
  const mlbbServer = cleanText(body.mlbb_server, 40);

  if (!username) {
    const err = new Error("TikTok username is required");
    err.statusCode = 400;
    throw err;
  }

  if (!isTikTokUrl(url)) {
    const err = new Error("A valid TikTok video URL is required");
    err.statusCode = 400;
    throw err;
  }

  if (!["Custom Skin", "Meme Skin"].includes(contentType)) {
    const err = new Error("Invalid content type");
    err.statusCode = 400;
    throw err;
  }

  if (!["Cash", "Diamonds"].includes(rewardChoice)) {
    const err = new Error("Choose Cash or Diamonds");
    err.statusCode = 400;
    throw err;
  }

  if (rewardChoice === "Cash") {
    if (!["GCash", "Bank"].includes(payoutMethod) || !payoutAccount) {
      const err = new Error("Cash entries need a GCash/Bank account number");
      err.statusCode = 400;
      throw err;
    }
  }

  if (rewardChoice === "Diamonds") {
    if (!mlbbId || !mlbbServer) {
      const err = new Error("Diamond entries need MLBB ID and Server ID");
      err.statusCode = 400;
      throw err;
    }
  }

  const id = createId();

  const item = {
    submission_id: id,
    event_id: "bisayatoolkit_tiktok_rewards",
    tiktok_username: username,
    tiktok_url: url,
    content_type: contentType,
    required_hashtag: "#bisayatoolkit",
    reward_choice: rewardChoice,
    payout_method: rewardChoice === "Cash" ? payoutMethod : "",
    payout_account: rewardChoice === "Cash" ? payoutAccount : "",
    mlbb_id: rewardChoice === "Diamonds" ? mlbbId : "",
    mlbb_server: rewardChoice === "Diamonds" ? mlbbServer : "",
    status: "pending",
    submitted_at: Date.now(),
    reviewed_at: 0,
    review_note: "",
    reward: "",
    score: 0,
    is_winner: false,
    winner_reward: "",
    winner_announced_at: 0,
    source: "web",
    ip_hint: cleanText(requestInfo.ip_hint, 120)
  };

  await setJson(itemKey(id), item);
  await pushId(ALL_IDS_KEY, id);

  return item;
}

async function getSubmission(id) {
  return getJson(itemKey(cleanText(id, 120)), null);
}

async function updateSubmission(id, updates) {
  const item = await getSubmission(id);
  if (!item) return null;

  const next = {
    ...item,
    ...updates,
    submission_id: item.submission_id
  };

  await setJson(itemKey(id), next);
  return next;
}

async function getManyByList(listKey, limit = 250) {
  const ids = (await listIds(listKey)).slice(0, limit);
  const items = [];

  for (const id of ids) {
    const item = await getSubmission(id);
    if (item) items.push(item);
  }

  return items;
}

async function getAll(limit = 250) {
  return getManyByList(ALL_IDS_KEY, limit);
}

async function getApproved(limit = 100) {
  const items = await getManyByList(APPROVED_IDS_KEY, limit);

  return items
    .filter(x => x && x.status === "approved")
    .sort((a, b) => {
      const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return Number(b.submitted_at || 0) - Number(a.submitted_at || 0);
    });
}

async function markApproved(id) {
  const { command } = require("./redis");
  const existing = await command(["LRANGE", APPROVED_IDS_KEY, "0", "-1"]);

  if (!Array.isArray(existing) || !existing.includes(id)) {
    await pushId(APPROVED_IDS_KEY, id);
  }
}


async function deleteSubmission(id) {
  const cleanId = cleanText(id, 120);
  const item = await getSubmission(cleanId);
  if (!item) return false;

  await removeId(ALL_IDS_KEY, cleanId);
  await removeId(APPROVED_IDS_KEY, cleanId);
  await deleteKey(itemKey(cleanId));
  return true;
}

async function getWinners(limit = 50) {
  const all = await getAll(300);

  return all
    .filter(item => item && item.is_winner === true)
    .sort((a, b) => Number(b.winner_announced_at || 0) - Number(a.winner_announced_at || 0))
    .slice(0, limit);
}

async function getEventConfig() {
  const defaults = {
    countdown_enabled: false,
    countdown_title: "Event Starts Soon",
    countdown_message: "Get ready for the next Bisaya Toolkit rewards event!",
    start_at: 0
  };

  const stored = await getJson(EVENT_CONFIG_KEY, null);

  return stored && typeof stored === "object"
    ? { ...defaults, ...stored }
    : defaults;
}

async function setEventConfig(config) {
  const next = {
    countdown_enabled: Boolean(config.countdown_enabled),
    countdown_title: cleanText(config.countdown_title || "Event Starts Soon", 100),
    countdown_message: cleanText(config.countdown_message || "", 300),
    start_at: Math.max(0, Number(config.start_at || 0) || 0),
    updated_at: Date.now()
  };

  await setJson(EVENT_CONFIG_KEY, next);
  return next;
}

module.exports = {
  saveNewSubmission,
  getSubmission,
  updateSubmission,
  getAll,
  getApproved,
  markApproved,
  deleteSubmission,
  getWinners,
  getEventConfig,
  setEventConfig
};
