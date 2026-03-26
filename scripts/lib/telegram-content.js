const MONTHS = new Map([
  ["enero", 1],
  ["febrero", 2],
  ["marzo", 3],
  ["abril", 4],
  ["mayo", 5],
  ["junio", 6],
  ["julio", 7],
  ["agosto", 8],
  ["septiembre", 9],
  ["setiembre", 9],
  ["octubre", 10],
  ["noviembre", 11],
  ["diciembre", 12],
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

const CONCERT_KEYWORDS = ["concierto", "recital", "actuacion", "zarzuela", "opera", "musical"];
const NEWS_KEYWORDS = ["noticia", "anuncio", "comunicado", "estreno", "colaboracion", "entrevista", "prensa"];
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

function toTitleCase(value) {
  return String(value || "")
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

  return { type: "unknown" };
}

function extractUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s)]+/gi);
  return matches ? matches.map((item) => item.trim()) : [];
}

function extractDate(text) {
  const value = String(text || "");
  let match = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);

  if (match) {
    return formatIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  match = value.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);

  if (match) {
    return formatIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  }

  const normalized = normalizeText(value);
  match = normalized.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/);

  if (match) {
    const day = Number(match[1]);
    const month = MONTHS.get(match[2]);
    const year = match[3] ? Number(match[3]) : new Date().getFullYear();

    if (month) {
      return formatIsoDate(year, month, day);
    }
  }

  match = normalized.match(/\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/);

  if (match) {
    const day = Number(match[1]);
    const month = MONTHS.get(match[2]);
    const year = match[3] ? Number(match[3]) : new Date().getFullYear();

    if (month) {
      return formatIsoDate(year, month, day);
    }
  }

  return "";
}

function extractTime(text) {
  const value = String(text || "");
  let match = value.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);

  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }

  match = value.match(/\b([01]?\d|2[0-3])\s*h\b/i);

  if (match) {
    return `${match[1].padStart(2, "0")}:00`;
  }

  return "";
}

function hasFeaturedFlag(text) {
  const normalized = normalizeText(text);
  return /\b(destacado|destacada|prioritario|principal)\b/.test(normalized);
}

function detectDraftStatus(text, fallback) {
  const normalized = normalizeText(text);

  if (/\b(borrador|draft)\b/.test(normalized)) {
    return "draft";
  }

  return fallback;
}

function cleanNaturalText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function inferKindFromText(text) {
  const normalized = normalizeText(text);
  const concertScore = CONCERT_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length;
  const newsScore = NEWS_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length;

  if (concertScore > newsScore && concertScore > 0) {
    return "concert";
  }

  if (newsScore > concertScore && newsScore > 0) {
    return "news";
  }

  return "";
}

function detectStructuredLines(lines) {
  const knownKeys = new Set([...CONCERT_FIELDS.keys(), ...NEWS_FIELDS.keys()]);

  return lines.some((line) => {
    const trimmed = String(line || "").trim();
    const separatorIndex = trimmed.indexOf(":");

    if (separatorIndex === -1) {
      return false;
    }

    const candidateKey = normalizeKey(trimmed.slice(0, separatorIndex));
    return knownKeys.has(candidateKey);
  });
}

function parseFieldLines(kind, lines) {
  const fieldMap = kind === "concert" ? CONCERT_FIELDS : NEWS_FIELDS;
  const entry = {};
  const unknownFields = [];
  const malformedLines = [];

  lines.forEach((line) => {
    const trimmed = String(line || "").trim();

    if (!trimmed) {
      return;
    }

    const separatorIndex = trimmed.indexOf(":");

    if (separatorIndex === -1) {
      malformedLines.push(trimmed);
      return;
    }

    const rawKey = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const normalizedKey = fieldMap.get(normalizeKey(rawKey));

    if (!normalizedKey) {
      unknownFields.push(rawKey);
      return;
    }

    entry[normalizedKey] = rawValue;
  });

  return {
    entry,
    unknownFields,
    malformedLines,
  };
}

function compactSentence(text, maxLength) {
  const cleaned = cleanNaturalText(text);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const shortened = cleaned.slice(0, maxLength).replace(/\s+\S*$/, "");
  return `${shortened}...`;
}

function extractQuotedTitle(text) {
  const match = String(text || "").match(/["“](.+?)["”]/);
  return match ? cleanNaturalText(match[1]) : "";
}

function extractVenueAndCity(text) {
  const value = String(text || "");
  const matches = [...value.matchAll(/\ben\s+([^.;,!?\n]+?)(?=\s+a las\b|\s+el\b|[.;,!?\n]|$)/gi)];
  let venue = "";
  let city = "";

  matches.forEach((match) => {
    const segment = cleanNaturalText(match[1]).replace(/^(la|el|los|las)\s+/i, (value) => value.toLowerCase());
    const normalized = normalizeText(segment);

    if (!segment) {
      return;
    }

    if (!venue && VENUE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      venue = segment;
      return;
    }

    if (!city && /^[A-ZÁÉÍÓÚÑ][^,]+$/u.test(segment)) {
      city = segment;
    }
  });

  if (venue && !city) {
    const venueParts = venue.split(/\s*,\s*/);

    if (venueParts.length > 1) {
      city = city || venueParts[venueParts.length - 1];
      venue = venueParts.slice(0, -1).join(", ");
    }
  }

  return {
    venue,
    city,
  };
}

function buildConcertTitle(text, city, venue) {
  const quotedTitle = extractQuotedTitle(text);

  if (quotedTitle) {
    return quotedTitle;
  }

  const normalized = normalizeText(text);
  const label =
    CONCERT_KEYWORDS.find((keyword) => normalized.includes(keyword)) === "recital"
      ? "Recital"
      : CONCERT_KEYWORDS.find((keyword) => normalized.includes(keyword)) === "zarzuela"
        ? "Zarzuela"
        : CONCERT_KEYWORDS.find((keyword) => normalized.includes(keyword)) === "opera"
          ? "Opera"
          : CONCERT_KEYWORDS.find((keyword) => normalized.includes(keyword)) === "musical"
            ? "Musical"
            : "Concierto";

  if (city) {
    return `${label} en ${city}`;
  }

  if (venue) {
    return `${label} en ${venue}`;
  }

  return label;
}

function parseNaturalConcert(text) {
  const cleaned = cleanNaturalText(text);
  const urls = extractUrls(cleaned);
  const date = extractDate(cleaned);
  const time = extractTime(cleaned);
  const location = extractVenueAndCity(cleaned);
  const entry = {
    title: buildConcertTitle(cleaned, location.city, location.venue),
    date,
    time,
    venue: location.venue,
    city: location.city,
    description: compactSentence(cleaned.replace(/https?:\/\/[^\s)]+/gi, "").trim(), 240),
    ticketUrl: urls[0] || "",
    status: detectDraftStatus(cleaned, "upcoming"),
    featured: hasFeaturedFlag(cleaned),
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

function buildNewsTitle(text) {
  const quotedTitle = extractQuotedTitle(text);

  if (quotedTitle) {
    return quotedTitle;
  }

  const firstSentence = cleanNaturalText(String(text || "").split(/[.!?\n]/)[0]);

  if (firstSentence) {
    return compactSentence(firstSentence, 80);
  }

  return "Nueva noticia";
}

function parseNaturalNews(text) {
  const cleaned = cleanNaturalText(text);
  const urls = extractUrls(cleaned);
  const summary = compactSentence(cleaned.replace(/https?:\/\/[^\s)]+/gi, "").trim(), 240);
  const entry = {
    title: buildNewsTitle(cleaned),
    date: extractDate(cleaned) || new Date().toISOString().slice(0, 10),
    summary: summary || "Nueva publicacion de Luryart.",
    linkText: urls[0] ? "Mas informacion" : "",
    linkUrl: urls[0] || "",
    status: detectDraftStatus(cleaned, "published"),
    featured: hasFeaturedFlag(cleaned),
  };

  return {
    type: "content",
    kind: "news",
    entry,
  };
}

function buildHelpMessage(kind) {
  if (kind === "concert") {
    return [
      "Puedes escribirlo de dos formas.",
      "",
      "Rapida:",
      "/concierto Tengo un recital en Pamplona el 18 de abril de 2026 a las 19:30 en la parroquia de San Lorenzo. Destacado.",
      "",
      "Estructurada:",
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
      "Puedes escribirlo de dos formas.",
      "",
      "Rapida:",
      "/noticia Nueva colaboracion artistica para la temporada 2026. Destacada. https://luryart.com/",
      "",
      "Estructurada:",
      "/noticia",
      "titulo: Nueva colaboracion",
      "fecha: 2026-04-10",
      "resumen: Anunciamos una nueva colaboracion.",
      "texto enlace: Leer mas",
      "enlace: https://luryart.com/",
      "destacado: si",
    ].join("\n");
  }

  return [
    "Usa /concierto o /noticia.",
    "",
    buildHelpMessage("concert"),
    "",
    buildHelpMessage("news"),
  ].join("\n");
}

function parseNaturalContent(kind, text) {
  if (kind === "concert") {
    return parseNaturalConcert(text);
  }

  return parseNaturalNews(text);
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

function parseTelegramContent(text) {
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
        message: "Comando no reconocido. Usa /concierto, /noticia o /ayuda.",
        help: buildHelpMessage(),
      };
    }

    kind = command.kind;

    const inlineBody = firstLine.replace(/^\/\S+\s*/, "").trim();
    bodyLines = inlineBody ? [inlineBody, ...lines.slice(lines.indexOf(firstLine) + 1)] : lines.slice(lines.indexOf(firstLine) + 1);
  } else {
    kind = inferKindFromText(lines.join(" "));

    if (!kind) {
      return {
        type: "error",
        message: "No he podido decidir si es concierto o noticia. Empieza por /concierto o /noticia.",
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

  if (detectStructuredLines(nonEmptyBodyLines)) {
    return parseStructuredContent(kind, nonEmptyBodyLines);
  }

  return parseNaturalContent(kind, nonEmptyBodyLines.join(" "));
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

  return [
    entry.title || "Sin titulo",
    entry.date || "Sin fecha",
    entry.summary || "Sin resumen",
  ]
    .filter(Boolean)
    .join("\n");
}

module.exports = {
  buildHelpMessage,
  parseTelegramContent,
  summarizeEntry,
};
