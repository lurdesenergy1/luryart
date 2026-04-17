const fs = require("fs");
const path = require("path");

const CONTENT_DIR = process.env.CONTENT_DIR
  ? path.resolve(process.env.CONTENT_DIR)
  : path.resolve(__dirname, "..", "content");

const FILES = {
  concert: path.join(CONTENT_DIR, "concerts.json"),
  news: path.join(CONTENT_DIR, "news.json"),
  video: path.join(CONTENT_DIR, "videos.json"),
};

const CONCERT_STATUSES = new Set(["upcoming", "soldout", "cancelled", "draft"]);
const NEWS_STATUSES = new Set(["published", "draft"]);
const VIDEO_SECTIONS = new Set(["zarzuelas", "recital", "clasico", "musicales"]);

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
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function isValidTime(value) {
  const text = String(value || "");

  if (!text) {
    return true;
  }

  if (!/^\d{2}:\d{2}$/.test(text)) {
    return false;
  }

  const [hours, minutes] = text.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
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

function isValidYoutubeUrl(value) {
  if (!isValidHttpUrl(value)) {
    return false;
  }

  return /(?:youtube\.com|youtu\.be)/i.test(String(value || ""));
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

function asOptionalInteger(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeSection(value) {
  const normalized = asTrimmedString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized === "zarzuela" || normalized === "opera") {
    return "zarzuelas";
  }

  if (normalized === "recitales") {
    return "recital";
  }

  if (normalized === "clasicos" || normalized === "organo") {
    return "clasico";
  }

  if (normalized === "musical") {
    return "musicales";
  }

  return normalized;
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
    throw new Error(`Fecha invalida para concierto: ${date}`);
  }

  if (!isValidTime(time)) {
    throw new Error(`Hora invalida para concierto: ${time}`);
  }

  if (!isValidHttpUrl(ticketUrl)) {
    throw new Error(`URL invalida para concierto: ${ticketUrl}`);
  }

  if (!CONCERT_STATUSES.has(status)) {
    throw new Error(`Estado invalido para concierto: ${status}`);
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
  const linkUrl = asTrimmedString(entry.linkUrl);
  const linkText = asTrimmedString(entry.linkText) || (linkUrl ? "Mas informacion" : "");
  const status = asTrimmedString(entry.status || "published") || "published";
  const featured = asBoolean(entry.featured);

  if (!title) {
    throw new Error("La noticia necesita `title`.");
  }

  if (!isValidDate(date)) {
    throw new Error(`Fecha invalida para noticia: ${date}`);
  }

  if (!isValidHttpUrl(linkUrl)) {
    throw new Error(`URL invalida para noticia: ${linkUrl}`);
  }

  if (linkText && !linkUrl) {
    throw new Error("La noticia no puede tener `linkText` sin `linkUrl`.");
  }

  if (!NEWS_STATUSES.has(status)) {
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

function normalizeVideo(entry) {
  const title = asTrimmedString(entry.title);
  const section = normalizeSection(entry.section);
  const youtubeUrl = asTrimmedString(entry.youtubeUrl);
  const description = asTrimmedString(entry.description);
  const featured = asBoolean(entry.featured);
  const positionValue = asOptionalInteger(entry.position);

  if (!title) {
    throw new Error("El video necesita `title`.");
  }

  if (!VIDEO_SECTIONS.has(section)) {
    throw new Error(`Seccion invalida para video: ${section}`);
  }

  if (!isValidYoutubeUrl(youtubeUrl)) {
    throw new Error(`URL de YouTube invalida para video: ${youtubeUrl}`);
  }

  if (Number.isNaN(positionValue)) {
    throw new Error(`Posicion invalida para video: ${entry.position}`);
  }

  const id = asTrimmedString(entry.id) || `${section}-${slugify(title)}`;

  return {
    id,
    title,
    section,
    youtubeUrl,
    description,
    featured,
    position: positionValue === "" ? "" : positionValue,
  };
}

function normalizeEntry(kind, entry) {
  if (kind === "concert") {
    return normalizeConcert(entry);
  }

  if (kind === "news") {
    return normalizeNews(entry);
  }

  if (kind === "video") {
    return normalizeVideo(entry);
  }

  throw new Error(`Tipo de contenido no soportado: ${kind}`);
}

function sortEntries(kind, entries) {
  const sorted = [...entries];

  sorted.sort((left, right) => {
    if (kind === "video") {
      const sectionCompare = left.section.localeCompare(right.section, "es");

      if (sectionCompare !== 0) {
        return sectionCompare;
      }

      const leftPosition = left.position === "" ? Number.MAX_SAFE_INTEGER : left.position;
      const rightPosition = right.position === "" ? Number.MAX_SAFE_INTEGER : right.position;

      if (leftPosition !== rightPosition) {
        return leftPosition - rightPosition;
      }

      const leftFeatured = left.featured ? 0 : 1;
      const rightFeatured = right.featured ? 0 : 1;

      if (leftFeatured !== rightFeatured) {
        return leftFeatured - rightFeatured;
      }

      return left.title.localeCompare(right.title, "es");
    }

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
  writeJson(FILES[kind], sortEntries(kind, entries));
}

function upsertEntry(kind, entry) {
  const normalized = normalizeEntry(kind, entry);
  const collection = loadCollection(kind);
  const filtered = collection.filter((item) => item.id !== normalized.id);
  filtered.push(normalized);
  saveCollection(kind, filtered);
  console.log(`Actualizado ${kind}: ${normalized.id}`);
}

function deleteEntry(kind, id) {
  const targetId = asTrimmedString(id);

  if (!targetId) {
    throw new Error("Debes indicar un `id` para borrar.");
  }

  const collection = loadCollection(kind);
  const filtered = collection.filter((item) => item.id !== targetId);

  if (filtered.length === collection.length) {
    throw new Error(`No existe ningun elemento ${kind} con id ${targetId}.`);
  }

  saveCollection(kind, filtered);
  console.log(`Borrado ${kind}: ${targetId}`);
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

  console.log(`Validacion correcta para ${kind}.`);
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
  console.log("  node scripts/content-admin.js apply-file <concert|news|video> <payload.json>");
  console.log("  node scripts/content-admin.js delete-id <concert|news|video> <id>");
}

function main() {
  const [command, kind, payloadPath] = process.argv.slice(2);

  if (command === "validate") {
    validateCollection("concert");
    validateCollection("news");
    validateCollection("video");
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

  if (command === "delete-id") {
    if (!kind || !payloadPath) {
      printUsage();
      process.exit(1);
    }

    deleteEntry(kind, payloadPath);
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
