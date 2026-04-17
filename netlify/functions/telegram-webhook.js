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
  const label = kind === "concert" ? "conciertos" : kind === "news" ? "noticias" : "videos";
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
  const label = kind === "concert" ? "concierto" : kind === "news" ? "noticia" : "video";
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
  const label = kind === "concert" ? "concierto" : kind === "news" ? "noticia" : "video";
  const commandLabel = kind === "concert" ? "concierto" : kind === "news" ? "noticia" : "video";
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
  const label = kind === "concert" ? "concierto" : kind === "news" ? "noticia" : "video";

  if (action === "delete") {
    return [
      `Solicitud de borrado del ${label} enviada a GitHub.`,
      "Si el workflow termina bien, Netlify desplegara la nueva version en unos minutos.",
      "",
      String(entryOrId),
    ].join("\n");
  }

  return [
    `Solicitud de ${action === "update" ? "actualizacion" : "publicacion"} de ${label} enviada a GitHub.`,
    "Si el workflow termina bien, Netlify desplegara la nueva version en unos minutos.",
    "",
    summarizeEntry(kind, entryOrId),
  ].join("\n");
}

function buildFriendlyGitHubError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (/Resource not accessible by personal access token/i.test(message)) {
    return [
      "No se pudo enviar la actualizacion a GitHub.",
      "El token de GitHub no tiene permiso suficiente.",
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

async function dispatchMutation(payload) {
  await requestGitHubDispatch(
    process.env.GITHUB_OWNER,
    process.env.GITHUB_REPO,
    process.env.GITHUB_TOKEN,
    payload
  );
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

  const origin = buildSiteOrigin(event.headers);

  try {
    if (parsed.action === "list") {
      const collection = await loadCollection(origin, parsed.kind);
      await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, buildListMessage(parsed.kind, collection));
      return json(200, { ok: true, list: true });
    }

    if (parsed.action === "upsert") {
      await dispatchMutation({
        event_type: "telegram-content-update",
        client_payload: {
          action: "upsert",
          kind: parsed.kind,
          entry: parsed.entry,
        },
      });

      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN,
        chatId,
        buildSuccessMessage("upsert", parsed.kind, parsed.entry)
      );
      return json(200, { ok: true, upsert: true });
    }

    const collection = await loadCollection(origin, parsed.kind);
    const target = resolveTarget(parsed.kind, collection, parsed.targetId, parsed.query);

    if (!target) {
      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN,
        chatId,
        `No he encontrado ningun elemento ${parsed.kind} con esa referencia. Puedes pedirme "lista de ${parsed.kind === "concert" ? "conciertos" : parsed.kind === "news" ? "noticias" : "videos"}".`
      );
      return json(200, { ok: true, not_found: true });
    }

    if (parsed.action === "delete") {
      if (!parsed.confirm) {
        await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, buildDeleteConfirmation(parsed.kind, target));
        return json(200, { ok: true, needs_confirmation: true });
      }

      await dispatchMutation({
        event_type: "telegram-content-update",
        client_payload: {
          action: "delete",
          kind: parsed.kind,
          id: target.id,
          entry: {},
        },
      });

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

    await dispatchMutation({
      event_type: "telegram-content-update",
      client_payload: {
        action: "upsert",
        kind: parsed.kind,
        entry: mergedEntry,
      },
    });

    await sendTelegramMessage(
      process.env.TELEGRAM_BOT_TOKEN,
      chatId,
      buildSuccessMessage("update", parsed.kind, mergedEntry)
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
