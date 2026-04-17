const https = require("https");

function usage() {
  console.log("Uso:");
  console.log("  node scripts/set-telegram-commands.js");
  console.log("");
  console.log("Variables de entorno requeridas:");
  console.log("  TELEGRAM_BOT_TOKEN");
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function request(botToken, method, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      `https://api.telegram.org/bot${botToken}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "User-Agent": "luryart-set-telegram-commands",
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
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    usage();
    exitWithError("Falta TELEGRAM_BOT_TOKEN.");
  }

  await request(botToken, "setMyCommands", {
    commands: [
      { command: "noticia", description: "Publicar una noticia" },
      { command: "editar", description: "Editar una noticia por referencia o id" },
      { command: "borrar", description: "Borrar una noticia con confirmacion" },
      { command: "lista", description: "Listar noticias publicadas" },
      { command: "ayuda", description: "Ver ejemplos de noticias" },
      { command: "start", description: "Mostrar ayuda" },
    ],
  });

  console.log("Comandos de Telegram actualizados correctamente.");
}

main().catch((error) => {
  exitWithError(error instanceof Error ? error.message : String(error));
});
