const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

function configured() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function command(args) {
  if (!configured()) {
    throw new Error("Redis is not configured");
  }

  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(args)
  });

  if (!response.ok) {
    throw new Error(`Redis HTTP ${response.status}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(json.error);
  }

  return json.result;
}

async function getJson(key, fallback) {
  const raw = await command(["GET", key]);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function setJson(key, value) {
  return command(["SET", key, JSON.stringify(value)]);
}

async function listIds(key) {
  const result = await command(["LRANGE", key, "0", "-1"]);
  return Array.isArray(result) ? result : [];
}

async function pushId(key, id) {
  return command(["LPUSH", key, id]);
}

async function removeId(key, id) {
  return command(["LREM", key, "0", id]);
}

async function deleteKey(key) {
  return command(["DEL", key]);
}

module.exports = {
  configured,
  command,
  getJson,
  setJson,
  listIds,
  pushId,
  removeId,
  deleteKey
};
