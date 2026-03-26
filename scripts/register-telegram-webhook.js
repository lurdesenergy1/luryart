const https = require("https");

function usage() {
  console.log("Uso:");
  console.log("  node scripts/register-telegram-webhook.js <site-url-o-webhook-url>");
  console.log("");
  console.log("Variables de entorno requeridas:");
  console.log("  TELEGRAM_BOT_TOKEN");
  console.log("  TELEGRAM_WEBHOOK_SECRET");
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function normalizeWebhookUrl(input) {
  const value = String(input || "").trim().replace(/\/+$/, "");

  if (!value) {
    return "";
  }

  if (value.includes("/.netlify/functions/telegram-webhook")) {
    return value;
  }

  return `${value}/.netlify/functions/telegram-webhook`;
}

function request(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "User-Agent": "luryart-register-telegram-webhook",
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const data = text ? JSON.parse(text) : {};

          if (response.statusCode >= 200 && response.statusCode < 300 && data.ok) {
            resolve(data);
            return;
          }

          reject(new Error(data.description || text || `HTTP ${response.statusCode}`));
        });
      }
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

async function main() {
  const inputUrl = process.argv[2];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!inputUrl) {
    usage();
    process.exit(1);
  }

  if (!botToken || !secret) {
    usage();
    exitWithError("Faltan variables de entorno para Telegram.");
  }

  const webhookUrl = normalizeWebhookUrl(inputUrl);

  if (!/^https:\/\//.test(webhookUrl)) {
    exitWithError("La URL del webhook debe empezar por https://");
  }

  await request(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "edited_message"],
    drop_pending_updates: false,
  });

  console.log(`Webhook registrado correctamente en ${webhookUrl}`);
}

main().catch((error) => {
  exitWithError(error instanceof Error ? error.message : String(error));
});
