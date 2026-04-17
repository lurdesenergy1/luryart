const https = require("https");
const {
  buildHelpMessage,
  parseTelegramContent,
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

function requestJson(url, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "User-Agent": "luryart-telegram-webhook",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const request = https.request(
      url,
      {
        method: "POST",
        headers,
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

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function requestGitHubDispatch(owner, repo, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "luryart-telegram-webhook",
        },
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

          reject(new Error(text || `GitHub HTTP ${response.statusCode}`));
        });
      }
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function sendTelegramMessage(botToken, chatId, text) {
  return requestJson(`https://api.telegram.org/bot${botToken}/sendMessage`, "", {
    chat_id: chatId,
    text,
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

function buildSuccessMessage(kind, entry) {
  const label = kind === "concert" ? "concierto" : kind === "news" ? "noticia" : "video";
  return [
    `Solicitud de ${label} enviada a GitHub.`,
    "Si el workflow termina bien, Netlify desplegara la nueva version en unos minutos.",
    "",
    summarizeEntry(kind, entry),
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

  const parsed = parseTelegramContent(message.text);

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

  try {
    await requestGitHubDispatch(
      process.env.GITHUB_OWNER,
      process.env.GITHUB_REPO,
      process.env.GITHUB_TOKEN,
      {
        event_type: "telegram-content-update",
        client_payload: {
          kind: parsed.kind,
          entry: parsed.entry,
        },
      }
    );

    await sendTelegramMessage(
      process.env.TELEGRAM_BOT_TOKEN,
      chatId,
      buildSuccessMessage(parsed.kind, parsed.entry)
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
