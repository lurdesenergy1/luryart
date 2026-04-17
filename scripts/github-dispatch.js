const fs = require("fs");
const https = require("https");
const path = require("path");

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  console.log("Uso:");
  console.log("  node scripts/github-dispatch.js <concert|news|video> <payload.json>");
  console.log("");
  console.log("Variables de entorno requeridas:");
  console.log("  GITHUB_TOKEN");
  console.log("  GITHUB_OWNER");
  console.log("  GITHUB_REPO");
}

function readJson(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`No existe el archivo de payload: ${absolutePath}`);
  }

  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function request(url, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);

    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "luryart-site-dispatch-script",
        },
      },
      (res) => {
        const chunks = [];

        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: responseBody });
            return;
          }

          reject(
            new Error(
              `GitHub respondio con ${res.statusCode || "error"}${responseBody ? `: ${responseBody}` : ""}`
            )
          );
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const [kind, payloadPath] = process.argv.slice(2);
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!kind || !payloadPath) {
    usage();
    process.exit(1);
  }

  if (!["concert", "news", "video"].includes(kind)) {
    exitWithError("El tipo de contenido debe ser `concert`, `news` o `video`.");
  }

  if (!token || !owner || !repo) {
    usage();
    exitWithError("Faltan variables de entorno para GitHub.");
  }

  const entry = readJson(payloadPath);
  const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
  const body = {
    event_type: "telegram-content-update",
    client_payload: {
      kind,
      entry,
    },
  };

  const result = await request(url, token, body);
  console.log(`Dispatch enviado correctamente a ${owner}/${repo} (${result.statusCode}).`);
}

main().catch((error) => {
  exitWithError(error instanceof Error ? error.message : String(error));
});
