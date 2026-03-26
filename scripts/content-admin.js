const fs = require("fs");
const path = require("path");

const CONTENT_DIR = process.env.CONTENT_DIR
  ? path.resolve(process.env.CONTENT_DIR)
  : path.resolve(__dirname, "..", "content");

const FILES = {
  concert: path.join(CONTENT_DIR, "concerts.json"),
  news: path.join(CONTENT_DIR, "news.json"),
};

const CONCERT_STATUSES = new Set(["upcoming", "soldout", "cancelled", "draft"]);
const NEWS_STATUSES = new Set(["published", "draft"]);

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} debe ser un array JSON.`);
  }

  return value;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(filePath, json, "utf8");
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
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function asTrimmedString(value) {
  return String(value || "").trim();
}

function asBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "y", "si", "sí", "s"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function normalizeConcert(entry) {
  const title = asTrimmedString(entry.title);
  const date = asTrimmedString(entry.date);
  const time = asTrimmedString(entry.time);
  const venue = asTrimmedString(entry.venue);
  const city = asTrimmedString(entry.city);
  const description = asTrimmedString(entry.description);
  const ticketUrl = asTrimmedString(entry.ticketUrl);
  const status = asTrimmedString(entry.status || "upcoming") || "upcoming";
  const featured = asBoolean(entry.featured);

  if (!title) {
    throw new Error("El concierto necesita `title`.");
  }

  if (!isValidDate(date)) {
    throw new Error(`Fecha inválida para concierto: ${date}`);
  }

  if (!CONCERT_STATUSES.has(status)) {
    throw new Error(`Estado inválido para concierto: ${status}`);
  }

  const id = asTrimmedString(entry.id) || `${slugify(title)}-${date}`;

  return {
    id,
    title,
    date,
    time,
    venue,
    city,
    description,
    ticketUrl,
    status,
    featured,
  };
}

function normalizeNews(entry) {
  const title = asTrimmedString(entry.title);
  const date = asTrimmedString(entry.date);
  const summary = asTrimmedString(entry.summary);
  const linkText = asTrimmedString(entry.linkText);
  const linkUrl = asTrimmedString(entry.linkUrl);
  const status = asTrimmedString(entry.status || "published") || "published";
  const featured = asBoolean(entry.featured);

  if (!title) {
    throw new Error("La noticia necesita `title`.");
  }

  if (!isValidDate(date)) {
    throw new Error(`Fecha inválida para noticia: ${date}`);
  }

  if (!NEWS_STATUSES.has(status)) {
    throw new Error(`Estado inválido para noticia: ${status}`);
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

function normalizeEntry(kind, entry) {
  if (kind === "concert") {
    return normalizeConcert(entry);
  }

  if (kind === "news") {
    return normalizeNews(entry);
  }

  throw new Error(`Tipo de contenido no soportado: ${kind}`);
}

function sortEntries(kind, entries) {
  const sorted = [...entries];

  sorted.sort((left, right) => {
    const leftFeatured = left.featured ? 0 : 1;
    const rightFeatured = right.featured ? 0 : 1;

    if (leftFeatured !== rightFeatured) {
      return leftFeatured - rightFeatured;
    }

    if (kind === "concert") {
      return left.date.localeCompare(right.date) || left.title.localeCompare(right.title, "es");
    }

    return right.date.localeCompare(left.date) || left.title.localeCompare(right.title, "es");
  });

  return sorted;
}

function loadCollection(kind) {
  const filePath = FILES[kind];

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo para ${kind}: ${filePath}`);
  }

  return ensureArray(readJson(filePath), `El contenido de ${path.basename(filePath)}`);
}

function saveCollection(kind, entries) {
  const filePath = FILES[kind];
  writeJson(filePath, sortEntries(kind, entries));
}

function upsertEntry(kind, entry) {
  const normalized = normalizeEntry(kind, entry);
  const collection = loadCollection(kind);
  const filtered = collection.filter((item) => item.id !== normalized.id);
  filtered.push(normalized);
  saveCollection(kind, filtered);
  console.log(`Actualizado ${kind}: ${normalized.id}`);
}

function validateCollection(kind) {
  const collection = loadCollection(kind);
  const seen = new Set();

  collection.forEach((entry) => {
    const normalized = normalizeEntry(kind, entry);

    if (seen.has(normalized.id)) {
      throw new Error(`ID duplicado en ${kind}: ${normalized.id}`);
    }

    seen.add(normalized.id);
  });

  console.log(`Validación correcta para ${kind}.`);
}

function readPayloadFromFile(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`No existe el archivo de payload: ${absolutePath}`);
  }

  return readJson(absolutePath);
}

function printUsage() {
  console.log("Uso:");
  console.log("  node scripts/content-admin.js validate");
  console.log("  node scripts/content-admin.js apply-file <concert|news> <payload.json>");
}

function main() {
  const [command, kind, payloadPath] = process.argv.slice(2);

  if (command === "validate") {
    validateCollection("concert");
    validateCollection("news");
    return;
  }

  if (command === "apply-file") {
    if (!kind || !payloadPath) {
      printUsage();
      process.exit(1);
    }

    const payload = readPayloadFromFile(payloadPath);
    upsertEntry(kind, payload);
    return;
  }

  printUsage();
  process.exit(1);
}

try {
  main();
} catch (error) {
  exitWithError(error instanceof Error ? error.message : String(error));
}
