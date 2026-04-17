const https = require("https");
const {
  buildHelpMessage,
  parseMutationRequest,
  summarizeEntry,
} = require("../../scripts/lib/telegram-content");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

function request({ url, method = "GET", token = "", body = null, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = body === null ? "" : JSON.stringify(body);
    const requestHeaders = {
      Accept: "application/json",
      "User-Agent": "luryart-telegram-webhook",
      ...headers,
    };

    if (payload) {
      requestHeaders["Content-Type"] = "application/json";
      requestHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const req = https.request(
      url,
      {
        method,
        headers: requestHeaders,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(text ? JSON.parse(text) : {});
            return;
          }

          reject(new Error(text || `HTTP ${response.statusCode}`));
        });
      }
    );

    req.on("error", reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

function requestGitHubDispatch(owner, repo, token, body) {
  return request({
    url: `https://api.github.com/repos/${owner}/${repo}/dispatches`,
    method: "POST",
    token,
    body,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

function getGitHubBranch() {
  return process.env.GITHUB_BRANCH || "main";
}

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isValidDate(value) {
  const text = String(value || "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }

  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidHttpUrl(value) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function asTrimmedString(value) {
  return String(value || "").trim();
}

function asBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "y", "si", "s"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function normalizeNewsEntry(entry) {
  const title = asTrimmedString(entry.title);
  const date = asTrimmedString(entry.date);
  const summary = asTrimmedString(entry.summary);
  const linkUrl = asTrimmedString(entry.linkUrl);
  const linkText = asTrimmedString(entry.linkText) || (linkUrl ? "Mas informacion" : "");
  const status = asTrimmedString(entry.status || "published") || "published";
  const featured = asBoolean(entry.featured);

  if (!title) {
    throw new Error("La noticia necesita title.");
  }

  if (!isValidDate(date)) {
    throw new Error(`Fecha invalida para noticia: ${date}`);
  }

  if (!isValidHttpUrl(linkUrl)) {
    throw new Error(`URL invalida para noticia: ${linkUrl}`);
  }

  if (linkText && !linkUrl) {
    throw new Error("La noticia no puede tener linkText sin linkUrl.");
  }

  if (!["published", "draft"].includes(status)) {
    throw new Error(`Estado invalido para noticia: ${status}`);
  }

  const id = asTrimmedString(entry.id) || `${slugify(title)}-${date}`;

  return {
    id,
    title,
    date,
    summary,
    linkText,
    linkUrl,
    status,
    featured,
  };
}

function sortNewsEntries(entries) {
  return [...entries].sort((left, right) => {
    const leftFeatured = left.featured ? 0 : 1;
    const rightFeatured = right.featured ? 0 : 1;

    if (leftFeatured !== rightFeatured) {
      return leftFeatured - rightFeatured;
    }

    return right.date.localeCompare(left.date) || left.title.localeCompare(right.title, "es");
  });
}

async function fetchGitHubFile(owner, repo, token, filePath) {
  const branch = encodeURIComponent(getGitHubBranch());
  return request({
    url: `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
    method: "GET",
    token,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

async function updateGitHubFile(owner, repo, token, filePath, content, sha, message) {
  return request({
    url: `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    method: "PUT",
    token,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: {
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha,
      branch: getGitHubBranch(),
    },
  });
}

async function loadNewsCollectionFromGitHub() {
  const file = await fetchGitHubFile(
    process.env.GITHUB_OWNER,
    process.env.GITHUB_REPO,
    process.env.GITHUB_TOKEN,
    "content/news.json"
  );

  const encoded = String(file.content || "").replace(/\n/g, "");
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const collection = JSON.parse(decoded || "[]");

  if (!Array.isArray(collection)) {
    throw new Error("content/news.json no contiene un array JSON.");
  }

  return {
    sha: file.sha,
    entries: collection,
  };
}

async function saveNewsCollectionToGitHub(entries, sha, message) {
  const normalized = entries.map((entry) => normalizeNewsEntry(entry));
  const uniqueEntries = [];
  const seen = new Set();

  normalized.forEach((entry) => {
    if (seen.has(entry.id)) {
      return;
    }

    seen.add(entry.id);
    uniqueEntries.push(entry);
  });

  const serialized = `${JSON.stringify(sortNewsEntries(uniqueEntries), null, 2)}\n`;

  await updateGitHubFile(
    process.env.GITHUB_OWNER,
    process.env.GITHUB_REPO,
    process.env.GITHUB_TOKEN,
    "content/news.json",
    serialized,
    sha,
    message
  );
}

function sendTelegramMessage(botToken, chatId, text) {
  return request({
    url: `https://api.telegram.org/bot${botToken}/sendMessage`,
    method: "POST",
    body: {
      chat_id: chatId,
      text,
    },
  });
}

function getHeader(headers, name) {
  const target = String(name || "").toLowerCase();
  const entries = Object.entries(headers || {});
  const found = entries.find(([key]) => String(key || "").toLowerCase() === target);
  return found ? found[1] : "";
}

function parseAllowedChatIds(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function hasRequiredConfig() {
  return [
    process.env.GITHUB_OWNER,
    process.env.GITHUB_REPO,
    process.env.GITHUB_TOKEN,
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.TELEGRAM_WEBHOOK_SECRET,
  ].every(Boolean);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildSiteOrigin(headers) {
  const proto = getHeader(headers, "x-forwarded-proto") || "https";
  const host = getHeader(headers, "x-forwarded-host") || getHeader(headers, "host") || "luryart.com";
  return `${proto}://${host}`;
}

function buildCollectionUrl(origin, kind) {
  const fileName = kind === "concert" ? "concerts.json" : kind === "news" ? "news.json" : "videos.json";
  return `${origin}/content/${fileName}`;
}

async function loadCollection(origin, kind) {
  const data = await request({
    url: buildCollectionUrl(origin, kind),
    method: "GET",
  });

  return Array.isArray(data) ? data : [];
}

function buildSearchText(kind, item) {
  if (kind === "concert") {
    return normalizeText([item.id, item.title, item.date, item.city, item.venue, item.description].join(" "));
  }

  if (kind === "news") {
    return normalizeText([item.id, item.title, item.date, item.summary].join(" "));
  }

  return normalizeText([item.id, item.title, item.section, item.description, item.youtubeUrl].join(" "));
}

function scoreItem(kind, item, query) {
  const normalizedQuery = normalizeText(query);
  const haystack = buildSearchText(kind, item);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (!normalizedQuery) {
    return 0;
  }

  if (item.id === normalizedQuery) {
    return 1000;
  }

  let score = 0;

  if (haystack.includes(normalizedQuery)) {
    score += 200;
  }

  tokens.forEach((token) => {
    if (haystack.includes(token)) {
      score += 25;
    }
  });

  return score;
}

function resolveTarget(kind, collection, targetId, query) {
  if (targetId) {
    return collection.find((item) => item.id === targetId) || null;
  }

  const ranked = collection
    .map((item) => ({ item, score: scoreItem(kind, item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) {
    return null;
  }

  return ranked[0].item;
}

function buildListMessage(kind, collection) {
  const label = "noticias";
  const visible = collection.slice(0, 8);

  if (!visible.length) {
    return `No hay ${label} ahora mismo.`;
  }

  return [
    `Estos son los ${label} disponibles:`,
    "",
    ...visible.map((item) => `${item.id}\n${summarizeEntry(kind, item)}`),
  ].join("\n\n");
}

function buildDeleteConfirmation(kind, item) {
  const label = "noticia";
  const command = `/borrar ${label} id:${item.id} confirmar`;

  return [
    `He encontrado este ${label}:`,
    "",
    summarizeEntry(kind, item),
    "",
    "Si quieres borrarlo, responde exactamente con:",
    command,
  ].join("\n");
}

function buildUpdateConfirmation(kind, item, entry) {
  const label = "noticia";
  const commandLabel = "noticia";
  const lines = Object.entries(entry)
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${value}`);

  return [
    `He encontrado este ${label}:`,
    "",
    summarizeEntry(kind, item),
    "",
    "Aplicare estos cambios:",
    ...lines,
    "",
    "Si quieres confirmarlo, reenvia este comando con confirmar al final:",
    `/editar ${commandLabel} id:${item.id}: ${lines.join(" | ")} confirmar`,
  ].join("\n");
}

function buildSuccessMessage(action, kind, entryOrId) {
  const label = "noticia";

  if (action === "delete") {
    return [
      `Borrado de ${label} guardado en GitHub.`,
      "Netlify desplegara la nueva version en unos minutos.",
      "",
      String(entryOrId),
    ].join("\n");
  }

  return [
    `${action === "update" ? "Actualizacion" : "Publicacion"} de ${label} guardada en GitHub.`,
    "Netlify desplegara la nueva version en unos minutos.",
    "",
    summarizeEntry(kind, entryOrId),
  ].join("\n");
}

function buildFriendlyGitHubError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (/Resource not accessible by personal access token/i.test(message) || /HTTP 403/i.test(message)) {
    return [
      "No se pudo enviar la actualizacion a GitHub.",
      "El token de GitHub no tiene permiso suficiente para escribir en el repositorio.",
      "Revisa GITHUB_TOKEN y activa Contents: Read and write en el repo luryart.",
    ].join("\n");
  }

  return ["No se pudo enviar la actualizacion a GitHub.", message].join("\n");
}

function mergeEntry(existing, patch) {
  const merged = { ...existing };

  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      merged[key] = value;
    }
  });

  return merged;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method Not Allowed" });
  }

  if (!hasRequiredConfig()) {
    return json(500, { ok: false, error: "Missing environment variables" });
  }

  const allowedChatIds = parseAllowedChatIds(process.env.TELEGRAM_ALLOWED_CHAT_IDS);

  if (!allowedChatIds.size) {
    return json(500, { ok: false, error: "Missing TELEGRAM_ALLOWED_CHAT_IDS" });
  }

  const providedSecret = getHeader(event.headers, "x-telegram-bot-api-secret-token");

  if (providedSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return json(403, { ok: false, error: "Invalid webhook secret" });
  }

  let update;

  try {
    update = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const message = update.message || update.edited_message;

  if (!message || !message.chat || !message.chat.id || !message.text) {
    return json(200, { ok: true, ignored: true });
  }

  const chatId = String(message.chat.id);

  if (!allowedChatIds.has(chatId)) {
    await sendTelegramMessage(
      process.env.TELEGRAM_BOT_TOKEN,
      chatId,
      "Este chat no esta autorizado para publicar contenido."
    );
    return json(200, { ok: true, authorized: false });
  }

  const parsed = parseMutationRequest(message.text, { referenceDate: new Date(message.date * 1000).toISOString() });

  if (parsed.type === "help") {
    await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, parsed.message || buildHelpMessage());
    return json(200, { ok: true, help: true });
  }

  if (parsed.type === "error") {
    await sendTelegramMessage(
      process.env.TELEGRAM_BOT_TOKEN,
      chatId,
      [parsed.message, "", parsed.help || buildHelpMessage(parsed.kind)].filter(Boolean).join("\n")
    );
    return json(200, { ok: true, error: true });
  }

  if (parsed.kind && parsed.kind !== "news") {
    await sendTelegramMessage(
      process.env.TELEGRAM_BOT_TOKEN,
      chatId,
      "Desde Telegram solo esta permitido gestionar noticias.\n\nUsa /noticia, /editar noticia, /borrar noticia o /lista noticias."
    );
    return json(200, { ok: true, restricted: true });
  }

  const origin = buildSiteOrigin(event.headers);

  try {
    if (parsed.action === "list") {
      const collection = await loadCollection(origin, "news");
      await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, buildListMessage(parsed.kind, collection));
      return json(200, { ok: true, list: true });
    }

    if (parsed.action === "upsert") {
      const { entries, sha } = await loadNewsCollectionFromGitHub();
      const normalized = normalizeNewsEntry(parsed.entry);
      const filtered = entries.filter((item) => item.id !== normalized.id);
      filtered.push(normalized);
      await saveNewsCollectionToGitHub(filtered, sha, `chore: actualizar noticia ${normalized.id} desde telegram`);

      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN,
        chatId,
        buildSuccessMessage("upsert", parsed.kind, normalized)
      );
      return json(200, { ok: true, upsert: true });
    }

    const githubNews = await loadNewsCollectionFromGitHub();
    const target = resolveTarget(parsed.kind, githubNews.entries, parsed.targetId, parsed.query);

    if (!target) {
      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN,
        chatId,
        'No he encontrado ninguna noticia con esa referencia. Puedes pedirme "lista de noticias".'
      );
      return json(200, { ok: true, not_found: true });
    }

    if (parsed.action === "delete") {
      if (!parsed.confirm) {
        await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, buildDeleteConfirmation(parsed.kind, target));
        return json(200, { ok: true, needs_confirmation: true });
      }

      const filtered = githubNews.entries.filter((item) => item.id !== target.id);
      await saveNewsCollectionToGitHub(filtered, githubNews.sha, `chore: borrar noticia ${target.id} desde telegram`);

      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN,
        chatId,
        buildSuccessMessage("delete", parsed.kind, target.id)
      );
      return json(200, { ok: true, deleted: true });
    }

    const mergedEntry = mergeEntry(target, parsed.entry);

    if (!parsed.confirm) {
      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN,
        chatId,
        buildUpdateConfirmation(parsed.kind, target, parsed.entry)
      );
      return json(200, { ok: true, needs_confirmation: true });
    }

    const normalizedMergedEntry = normalizeNewsEntry(mergedEntry);
    const filtered = githubNews.entries.filter((item) => item.id !== normalizedMergedEntry.id && item.id !== target.id);
    filtered.push(normalizedMergedEntry);
    await saveNewsCollectionToGitHub(
      filtered,
      githubNews.sha,
      `chore: editar noticia ${normalizedMergedEntry.id} desde telegram`
    );

    await sendTelegramMessage(
      process.env.TELEGRAM_BOT_TOKEN,
      chatId,
      buildSuccessMessage("update", parsed.kind, normalizedMergedEntry)
    );
  } catch (error) {
    await sendTelegramMessage(
      process.env.TELEGRAM_BOT_TOKEN,
      chatId,
      buildFriendlyGitHubError(error)
    );
  }

  return json(200, { ok: true });
};
