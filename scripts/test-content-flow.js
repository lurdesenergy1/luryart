const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "luryart-flow-"));
const tempContentDir = path.join(tempRoot, "content");

function run(args, env = {}) {
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "content-admin.js"), ...args], {
    cwd: root,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }

  process.stdout.write(result.stdout);
}

try {
  fs.mkdirSync(tempContentDir, { recursive: true });
  fs.copyFileSync(path.join(root, "content", "concerts.json"), path.join(tempContentDir, "concerts.json"));
  fs.copyFileSync(path.join(root, "content", "news.json"), path.join(tempContentDir, "news.json"));
  fs.copyFileSync(path.join(root, "content", "videos.json"), path.join(tempContentDir, "videos.json"));

  run(["apply-file", "concert", path.join(root, "examples", "concert-payload.json")], {
    CONTENT_DIR: tempContentDir,
  });
  run(["apply-file", "news", path.join(root, "examples", "news-payload.json")], {
    CONTENT_DIR: tempContentDir,
  });
  run(["apply-file", "video", path.join(root, "examples", "video-payload.json")], {
    CONTENT_DIR: tempContentDir,
  });
  run(["validate"], {
    CONTENT_DIR: tempContentDir,
  });

  console.log("Prueba de flujo completada correctamente.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
