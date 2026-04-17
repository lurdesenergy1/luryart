const MONTHS = new Map([
  ["enero", 1],
  ["ene", 1],
  ["febrero", 2],
  ["feb", 2],
  ["marzo", 3],
  ["mar", 3],
  ["abril", 4],
  ["abr", 4],
  ["mayo", 5],
  ["may", 5],
  ["junio", 6],
  ["jun", 6],
  ["julio", 7],
  ["jul", 7],
  ["agosto", 8],
  ["ago", 8],
  ["septiembre", 9],
  ["setiembre", 9],
  ["sept", 9],
  ["sep", 9],
  ["octubre", 10],
  ["oct", 10],
  ["noviembre", 11],
  ["nov", 11],
  ["diciembre", 12],
  ["dic", 12],
]);

const SECTION_ALIASES = new Map([
  ["zarzuela", "zarzuelas"],
  ["zarzuelas", "zarzuelas"],
  ["opera", "zarzuelas"],
  ["opera y zarzuela", "zarzuelas"],
  ["lirico", "zarzuelas"],
  ["recital", "recital"],
  ["recitales", "recital"],
  ["recitativo", "recital"],
  ["recitativos", "recital"],
  ["clasico", "clasico"],
  ["clasicos", "clasico"],
  ["organo", "clasico"],
  ["concierto clasico", "clasico"],
  ["musical", "musicales"],
  ["musicales", "musicales"],
  ["teatro musical", "musicales"],
]);

const CONCERT_FIELDS = new Map([
  ["titulo", "title"],
  ["title", "title"],
  ["nombre", "title"],
  ["fecha", "date"],
  ["date", "date"],
  ["hora", "time"],
  ["time", "time"],
  ["recinto", "venue"],
  ["venue", "venue"],
  ["lugar", "venue"],
  ["ciudad", "city"],
  ["city", "city"],
  ["descripcion", "description"],
  ["description", "description"],
  ["detalle", "description"],
  ["detalles", "description"],
  ["enlace", "ticketUrl"],
  ["link", "ticketUrl"],
  ["url", "ticketUrl"],
  ["ticketurl", "ticketUrl"],
  ["estado", "status"],
  ["status", "status"],
  ["destacado", "featured"],
  ["featured", "featured"],
]);

const NEWS_FIELDS = new Map([
  ["titulo", "title"],
  ["title", "title"],
  ["nombre", "title"],
  ["fecha", "date"],
  ["date", "date"],
  ["resumen", "summary"],
  ["summary", "summary"],
  ["descripcion", "summary"],
  ["description", "summary"],
  ["enlace", "linkUrl"],
  ["url", "linkUrl"],
  ["link", "linkUrl"],
  ["linkurl", "linkUrl"],
  ["texto enlace", "linkText"],
  ["texto del enlace", "linkText"],
  ["link text", "linkText"],
  ["linktext", "linkText"],
  ["estado", "status"],
  ["status", "status"],
  ["destacada", "featured"],
  ["destacado", "featured"],
  ["featured", "featured"],
]);

const VIDEO_FIELDS = new Map([
  ["titulo", "title"],
  ["title", "title"],
  ["nombre", "title"],
  ["seccion", "section"],
  ["section", "section"],
  ["apartado", "section"],
  ["bloque", "section"],
  ["url", "youtubeUrl"],
  ["youtube", "youtubeUrl"],
  ["youtube url", "youtubeUrl"],
  ["enlace", "youtubeUrl"],
  ["link", "youtubeUrl"],
  ["descripcion", "description"],
  ["description", "description"],
  ["detalle", "description"],
  ["destacado", "featured"],
  ["featured", "featured"],
  ["posicion", "position"],
  ["orden", "position"],
  ["order", "position"],
]);

const CONCERT_KEYWORDS = ["concierto", "recital", "actuacion", "zarzuela", "opera", "musical"];
const NEWS_KEYWORDS = ["noticia", "anuncio", "comunicado", "estreno", "colaboracion", "entrevista", "prensa"];
const VIDEO_KEYWORDS = ["video", "youtube", "youtube.com", "youtu.be", "sube", "anade", "pon"];
const VENUE_KEYWORDS = [
  "parroquia",
  "iglesia",
  "catedral",
  "basilica",
  "teatro",
  "auditorio",
  "sala",
  "palacio",
  "centro",
  "conservatorio",
  "museo",
  "ermita",
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function toTitleCase(value) {
  return cleanText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function getReferenceDate(options = {}) {
  if (options.referenceDate) {
    return new Date(options.referenceDate);
  }

  return new Date();
}

function shiftDays(referenceDate, days) {
  const copy = new Date(referenceDate);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

function chooseYear(month, day, referenceDate, preferFuture) {
  const currentYear = referenceDate.getFullYear();
  const candidate = new Date(Date.UTC(currentYear, month - 1, day, 12));

  if (!preferFuture) {
    return currentYear;
  }

  const boundary = new Date(referenceDate);
  boundary.setHours(0, 0, 0, 0);

  if (candidate.getTime() + 24 * 60 * 60 * 1000 < boundary.getTime()) {
    return currentYear + 1;
  }

  return currentYear;
}

function parseCommand(value) {
  const command = normalizeText(value)
    .replace(/^\/+/, "")
    .split(/\s+/)[0]
    .split("@")[0];

  if (["help", "ayuda", "start"].includes(command)) {
    return { type: "help" };
  }

  if (["concert", "concierto"].includes(command)) {
    return { type: "content", kind: "concert" };
  }

  if (["news", "noticia"].includes(command)) {
    return { type: "content", kind: "news" };
  }

  if (["video", "videos"].includes(command)) {
    return { type: "content", kind: "video" };
  }

  return { type: "unknown" };
}

function extractUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s)]+/gi);
  return matches ? matches.map((item) => item.trim()) : [];
}

function isYoutubeUrl(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(String(url || ""));
}

function extractQuotedText(text) {
  const match = String(text || "").match(/["']([^"']+)["']/);
  return match ? cleanText(match[1]) : "";
}

function extractDate(text, options = {}) {
  const value = String(text || "");
  const referenceDate = getReferenceDate(options);
  const preferFuture = Boolean(options.preferFuture);
  const normalized = normalizeText(value);

  if (/\bpasado manana\b/.test(normalized)) {
    return shiftDays(referenceDate, 2);
  }

  if (/\bmanana\b/.test(normalized)) {
    return shiftDays(referenceDate, 1);
  }

  if (/\bhoy\b/.test(normalized)) {
    return shiftDays(referenceDate, 0);
  }

  let match = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);

  if (match) {
    return formatIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  match = value.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);

  if (match) {
    return formatIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  }

  match = value.match(/\b(\d{1,2})[\/.-](\d{1,2})\b/);

  if (match) {
    const month = Number(match[2]);
    const day = Number(match[1]);
    const year = chooseYear(month, day, referenceDate, preferFuture);
    return formatIsoDate(year, month, day);
  }

  match = normalized.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/);

  if (match) {
    const day = Number(match[1]);
    const month = MONTHS.get(match[2]);
    const year = match[3] ? Number(match[3]) : chooseYear(month, day, referenceDate, preferFuture);

    if (month) {
      return formatIsoDate(year, month, day);
    }
  }

  match = normalized.match(/\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/);

  if (match) {
    const day = Number(match[1]);
    const month = MONTHS.get(match[2]);
    const year = match[3] ? Number(match[3]) : chooseYear(month, day, referenceDate, preferFuture);

    if (month) {
      return formatIsoDate(year, month, day);
    }
  }

  return "";
}

function extractTime(text) {
  const value = String(text || "");
  let match = value.match(/\b([01]?\d|2[0-3])[:.,]([0-5]\d)\s*(?:h)?\b/i);

  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }

  match = value.match(/\b([1-9]|1[0-2])\s*(am|pm)\b/i);

  if (match) {
    let hours = Number(match[1]);

    if (/pm/i.test(match[2]) && hours < 12) {
      hours += 12;
    }

    if (/am/i.test(match[2]) && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:00`;
  }

  match = value.match(/\b([01]?\d|2[0-3])\s*y\s+media\b/i);

  if (match) {
    return `${match[1].padStart(2, "0")}:30`;
  }

  match = value.match(/\b([01]?\d|2[0-3])\s*h(?:oras?)?\b/i);

  if (match) {
    return `${match[1].padStart(2, "0")}:00`;
  }

  return "";
}

function extractPosition(text) {
  const value = String(text || "");
  let match = value.match(/\b(?:posicion|orden|order)\s*[:=]?\s*(\d+)\b/i);

  if (match) {
    return Number(match[1]);
  }

  match = value.match(/\b(\d+)\s+(?:video|videos)\b/i);

  if (match) {
    return Number(match[1]);
  }

  return "";
}

function extractSection(text) {
  const normalized = normalizeText(text);

  for (const [alias, section] of SECTION_ALIASES.entries()) {
    if (normalized.includes(alias)) {
      return section;
    }
  }

  return "";
}

function extractVenueAndCity(text) {
  const segments = [...String(text || "").matchAll(/\ben\s+([^.;,!?\n]+?)(?=\s+a las\b|\s+el\b|[.;,!?\n]|$)/gi)];
  let venue = "";
  let city = "";

  segments.forEach((match) => {
    const segment = cleanText(match[1]);
    const normalized = normalizeText(segment);

    if (!segment) {
      return;
    }

    if (!venue && VENUE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      venue = segment;
      return;
    }

    if (!city && !VENUE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      city = toTitleCase(segment);
    }
  });

  if (venue && !city) {
    const parts = venue.split(/\s*,\s*/).filter(Boolean);

    if (parts.length > 1) {
      city = toTitleCase(parts[parts.length - 1]);
      venue = parts.slice(0, -1).join(", ");
    }
  }

  return {
    venue: cleanText(venue),
    city: cleanText(city),
  };
}

function hasPositiveFeaturedFlag(text) {
  return /\b(destacado|destacada|principal|prioritario|prioritaria|importante)\b/.test(normalizeText(text));
}

function hasNegativeFeaturedFlag(text) {
  return /\b(no destacado|no destacada|sin destacar|no principal)\b/.test(normalizeText(text));
}

function extractFeatured(text) {
  if (hasNegativeFeaturedFlag(text)) {
    return false;
  }

  return hasPositiveFeaturedFlag(text);
}

function detectConcertStatus(text) {
  const normalized = normalizeText(text);

  if (/\b(borrador|draft)\b/.test(normalized)) {
    return "draft";
  }

  if (/\b(completo|completa|agotado|agotada|sold out)\b/.test(normalized)) {
    return "soldout";
  }

  if (/\b(cancelado|cancelada|suspendido|suspendida|anulado|anulada)\b/.test(normalized)) {
    return "cancelled";
  }

  return "upcoming";
}

function detectNewsStatus(text) {
  return /\b(borrador|draft)\b/.test(normalizeText(text)) ? "draft" : "published";
}

function inferKindFromText(text) {
  const normalized = normalizeText(text);
  const urls = extractUrls(text);

  if (urls.some(isYoutubeUrl) || VIDEO_KEYWORDS.some((keyword) => normalized.includes(keyword)) && extractSection(text)) {
    return "video";
  }

  const concertScore =
    CONCERT_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length +
    (extractDate(text, { preferFuture: true }) ? 1 : 0) +
    (extractTime(text) ? 1 : 0) +
    (extractVenueAndCity(text).venue ? 1 : 0);
  const newsScore = NEWS_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length;

  if (concertScore > newsScore && concertScore > 0) {
    return "concert";
  }

  if (newsScore > 0) {
    return "news";
  }

  return "";
}

function parseKeyValueLine(line) {
  const match = String(line || "").match(/^\s*[-*]?\s*([^:=]+?)\s*[:=]\s*(.+?)\s*$/);

  if (!match) {
    return null;
  }

  return {
    key: match[1],
    value: match[2],
  };
}

function detectStructuredLines(lines) {
  const knownKeys = new Set([
    ...CONCERT_FIELDS.keys(),
    ...NEWS_FIELDS.keys(),
    ...VIDEO_FIELDS.keys(),
    "tipo",
    "kind",
  ]);

  return lines.some((line) => {
    const pair = parseKeyValueLine(line);
    return pair ? knownKeys.has(normalizeKey(pair.key)) : false;
  });
}

function parseJsonPayload(text) {
  const trimmed = String(text || "").trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "object" && parsed ? parsed : null;
  } catch (error) {
    return null;
  }
}

function compactSentence(text, maxLength) {
  const cleaned = cleanText(text);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function buildConcertTitle(text, city, venue) {
  const quoted = extractQuotedText(text);

  if (quoted) {
    return quoted;
  }

  const normalized = normalizeText(text);
  let label = "Concierto";

  if (normalized.includes("recital")) {
    label = "Recital";
  } else if (normalized.includes("zarzuela")) {
    label = "Zarzuela";
  } else if (normalized.includes("opera")) {
    label = "Opera";
  } else if (normalized.includes("musical")) {
    label = "Musical";
  }

  if (city) {
    return `${label} en ${city}`;
  }

  if (venue) {
    return `${label} en ${venue}`;
  }

  return label;
}

function buildNewsTitle(text) {
  const quoted = extractQuotedText(text);

  if (quoted) {
    return quoted;
  }

  const firstSentence = cleanText(String(text || "").split(/[.!?\n]/)[0]);
  return firstSentence ? compactSentence(firstSentence, 90) : "Nueva noticia";
}

function buildVideoTitle(text, section) {
  const quoted = extractQuotedText(text);

  if (quoted) {
    return quoted;
  }

  const explicit = String(text || "").match(/\b(?:titulo|nombre)\s*[:=]?\s*([^.;,!?\n]+)/i);

  if (explicit) {
    return cleanText(explicit[1]);
  }

  if (section) {
    const label = section === "zarzuelas" ? "zarzuela" : section;
    return `Video ${label}`;
  }

  return "Nuevo video";
}

function parseNaturalConcert(text, options = {}) {
  const cleaned = cleanText(text);
  const urls = extractUrls(cleaned);
  const date = extractDate(cleaned, { referenceDate: options.referenceDate, preferFuture: true });
  const time = extractTime(cleaned);
  const location = extractVenueAndCity(cleaned);
  const entry = {
    title: buildConcertTitle(cleaned, location.city, location.venue),
    date,
    time,
    venue: location.venue,
    city: location.city,
    description: compactSentence(cleaned.replace(/https?:\/\/[^\s)]+/gi, "").trim(), 240),
    ticketUrl: urls.find((url) => !isYoutubeUrl(url)) || "",
    status: detectConcertStatus(cleaned),
    featured: extractFeatured(cleaned),
  };

  if (!entry.date) {
    return {
      type: "error",
      kind: "concert",
      message: "He detectado un concierto, pero me falta una fecha clara.",
      help: buildHelpMessage("concert"),
    };
  }

  return {
    type: "content",
    kind: "concert",
    entry,
  };
}

function parseNaturalNews(text, options = {}) {
  const cleaned = cleanText(text);
  const urls = extractUrls(cleaned);
  const referenceDate = getReferenceDate(options);
  const entry = {
    title: buildNewsTitle(cleaned),
    date: extractDate(cleaned, { referenceDate, preferFuture: false }) || referenceDate.toISOString().slice(0, 10),
    summary: compactSentence(cleaned.replace(/https?:\/\/[^\s)]+/gi, "").trim(), 240) || "Nueva publicacion de Luryart.",
    linkText: urls.length ? "Mas informacion" : "",
    linkUrl: urls.find((url) => !isYoutubeUrl(url)) || "",
    status: detectNewsStatus(cleaned),
    featured: extractFeatured(cleaned),
  };

  return {
    type: "content",
    kind: "news",
    entry,
  };
}

function parseNaturalVideo(text) {
  const cleaned = cleanText(text);
  const urls = extractUrls(cleaned);
  const youtubeUrl = urls.find(isYoutubeUrl) || "";
  const section = extractSection(cleaned);
  const entry = {
    title: buildVideoTitle(cleaned, section),
    section,
    youtubeUrl,
    description: compactSentence(cleaned.replace(/https?:\/\/[^\s)]+/gi, "").trim(), 200),
    featured: extractFeatured(cleaned),
    position: extractPosition(cleaned),
  };

  if (!entry.section) {
    return {
      type: "error",
      kind: "video",
      message: "He detectado un video, pero me falta la seccion. Usa zarzuelas, recital, clasico o musicales.",
      help: buildHelpMessage("video"),
    };
  }

  if (!entry.youtubeUrl) {
    return {
      type: "error",
      kind: "video",
      message: "He detectado un video, pero me falta un enlace de YouTube.",
      help: buildHelpMessage("video"),
    };
  }

  return {
    type: "content",
    kind: "video",
    entry,
  };
}

function buildHelpMessage(kind) {
  if (kind === "concert") {
    return [
      "Puedes enviarlo en texto libre o con campos.",
      "",
      "Rapido:",
      "/concierto Tengo un recital en Pamplona el 18 de abril de 2026 a las 19:30 en la parroquia de San Lorenzo. Destacado.",
      "",
      "Estructurado:",
      "/concierto",
      "titulo: Recital en Pamplona",
      "fecha: 2026-04-18",
      "hora: 19:30",
      "recinto: Parroquia de San Lorenzo",
      "ciudad: Pamplona",
      "descripcion: Programa de recital y repertorio sacro.",
      "enlace: https://ejemplo.com",
      "destacado: si",
    ].join("\n");
  }

  if (kind === "news") {
    return [
      "Puedes enviarlo en texto libre o con campos.",
      "",
      "Rapido:",
      "/noticia Nueva colaboracion artistica para la temporada 2026. Destacada. https://luryart.com/",
      "",
      "Estructurado:",
      "/noticia",
      "titulo: Nueva colaboracion",
      "fecha: 2026-04-10",
      "resumen: Anunciamos una nueva colaboracion.",
      "texto enlace: Leer mas",
      "enlace: https://luryart.com/",
      "destacado: si",
    ].join("\n");
  }

  if (kind === "video") {
    return [
      "Puedes anadir videos de YouTube por seccion.",
      "",
      "Rapido:",
      "/video Sube este video a la seccion recital https://youtu.be/abc123 destacado",
      "",
      "Estructurado:",
      "/video",
      "titulo: Nuevo recital",
      "seccion: recital",
      "url: https://www.youtube.com/watch?v=abc123",
      "descripcion: Video para la seccion de recitales.",
      "posicion: 1",
      "destacado: si",
    ].join("\n");
  }

  return [
    "Usa /concierto, /noticia o /video.",
    "",
    buildHelpMessage("concert"),
    "",
    buildHelpMessage("news"),
    "",
    buildHelpMessage("video"),
  ].join("\n");
}

function parseFieldLines(kind, lines) {
  const fieldMap = kind === "concert" ? CONCERT_FIELDS : kind === "news" ? NEWS_FIELDS : VIDEO_FIELDS;
  const entry = {};
  const unknownFields = [];
  const malformedLines = [];

  lines.forEach((line) => {
    const pair = parseKeyValueLine(line);

    if (!pair) {
      malformedLines.push(String(line || "").trim());
      return;
    }

    const normalizedKey = normalizeKey(pair.key);

    if (normalizedKey === "tipo" || normalizedKey === "kind") {
      return;
    }

    const targetKey = fieldMap.get(normalizedKey);

    if (!targetKey) {
      unknownFields.push(pair.key);
      return;
    }

    entry[targetKey] = pair.value.trim();
  });

  return {
    entry,
    unknownFields,
    malformedLines: malformedLines.filter(Boolean),
  };
}

function inferKindFromStructuredLines(lines) {
  const keys = lines
    .map((line) => parseKeyValueLine(line))
    .filter(Boolean)
    .map((pair) => normalizeKey(pair.key));

  if (keys.includes("tipo") || keys.includes("kind")) {
    const pair = lines.map((line) => parseKeyValueLine(line)).find((item) => item && ["tipo", "kind"].includes(normalizeKey(item.key)));
    const value = normalizeText(pair.value);

    if (["concierto", "concert"].includes(value)) {
      return "concert";
    }

    if (["noticia", "news"].includes(value)) {
      return "news";
    }

    if (["video", "videos"].includes(value)) {
      return "video";
    }
  }

  if (keys.some((key) => VIDEO_FIELDS.has(key))) {
    return "video";
  }

  if (keys.some((key) => CONCERT_FIELDS.has(key)) && keys.some((key) => ["hora", "recinto", "city", "ciudad"].includes(key))) {
    return "concert";
  }

  if (keys.some((key) => NEWS_FIELDS.has(key))) {
    return "news";
  }

  return "";
}

function parseStructuredContent(kind, lines) {
  const parsed = parseFieldLines(kind, lines);

  if (parsed.malformedLines.length) {
    return {
      type: "error",
      kind,
      message: `Hay lineas sin formato clave: valor: ${parsed.malformedLines.join(" | ")}`,
      help: buildHelpMessage(kind),
    };
  }

  if (parsed.unknownFields.length) {
    return {
      type: "error",
      kind,
      message: `Hay campos no reconocidos: ${parsed.unknownFields.join(", ")}`,
      help: buildHelpMessage(kind),
    };
  }

  if (!Object.keys(parsed.entry).length) {
    return {
      type: "error",
      kind,
      message: "Faltan los datos del contenido.",
      help: buildHelpMessage(kind),
    };
  }

  return {
    type: "content",
    kind,
    entry: parsed.entry,
  };
}

function parseJsonContent(kind, payload) {
  const entry = payload.entry && typeof payload.entry === "object" ? payload.entry : payload;

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  return {
    type: "content",
    kind,
    entry,
  };
}

function parseNaturalContent(kind, text, options = {}) {
  if (kind === "concert") {
    return parseNaturalConcert(text, options);
  }

  if (kind === "news") {
    return parseNaturalNews(text, options);
  }

  return parseNaturalVideo(text, options);
}

function parseTelegramContent(text, options = {}) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim());
  const firstLine = lines.find((line) => line);

  if (!firstLine) {
    return {
      type: "help",
      message: buildHelpMessage(),
    };
  }

  let kind = "";
  let bodyLines = lines;

  if (firstLine.startsWith("/")) {
    const command = parseCommand(firstLine);

    if (command.type === "help") {
      return {
        type: "help",
        message: buildHelpMessage(),
      };
    }

    if (command.type === "unknown") {
      return {
        type: "error",
        message: "Comando no reconocido. Usa /concierto, /noticia, /video o /ayuda.",
        help: buildHelpMessage(),
      };
    }

    kind = command.kind;

    const inlineBody = firstLine.replace(/^\/\S+\s*/, "").trim();
    bodyLines = inlineBody ? [inlineBody, ...lines.slice(lines.indexOf(firstLine) + 1)] : lines.slice(lines.indexOf(firstLine) + 1);
  } else {
    kind = inferKindFromText(lines.join(" "));

    if (!kind && detectStructuredLines(lines)) {
      kind = inferKindFromStructuredLines(lines);
    }

    if (!kind) {
      return {
        type: "error",
        message: "No he podido decidir si es concierto, noticia o video. Empieza por /concierto, /noticia o /video.",
        help: buildHelpMessage(),
      };
    }
  }

  const nonEmptyBodyLines = bodyLines.filter(Boolean);

  if (!nonEmptyBodyLines.length) {
    return {
      type: "error",
      kind,
      message: "Faltan los datos del contenido.",
      help: buildHelpMessage(kind),
    };
  }

  const jsonPayload = parseJsonPayload(nonEmptyBodyLines.join("\n"));

  if (jsonPayload) {
    return parseJsonContent(kind, jsonPayload);
  }

  if (detectStructuredLines(nonEmptyBodyLines)) {
    return parseStructuredContent(kind, nonEmptyBodyLines);
  }

  return parseNaturalContent(kind, nonEmptyBodyLines.join(" "), options);
}

function summarizeEntry(kind, entry) {
  if (kind === "concert") {
    return [
      entry.title || "Sin titulo",
      entry.date || "Sin fecha",
      [entry.time, entry.venue, entry.city].filter(Boolean).join(" | "),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (kind === "news") {
    return [
      entry.title || "Sin titulo",
      entry.date || "Sin fecha",
      entry.summary || "Sin resumen",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    entry.title || "Sin titulo",
    entry.section || "Sin seccion",
    entry.youtubeUrl || "Sin enlace",
  ]
    .filter(Boolean)
    .join("\n");
}

module.exports = {
  buildHelpMessage,
  parseTelegramContent,
  summarizeEntry,
};
