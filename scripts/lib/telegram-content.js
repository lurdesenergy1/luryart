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

function parseCommand(value) {
  const command = normalizeText(value).replace(/^\/+/, "").split(/\s+/)[0];

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

function buildHelpMessage(kind) {
  if (kind === "concert") {
    return [
      "Formato para /concierto:",
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
      "Formato para /noticia:",
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
    "Usa uno de estos formatos:",
    "",
    buildHelpMessage("concert"),
    "",
    buildHelpMessage("news"),
  ].join("\n");
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
      message: 'Comando no reconocido. Usa /concierto, /noticia o /ayuda.',
      help: buildHelpMessage(),
    };
  }

  const parsed = parseFieldLines(command.kind, lines.slice(lines.indexOf(firstLine) + 1));

  if (parsed.malformedLines.length) {
    return {
      type: "error",
      kind: command.kind,
      message: `Hay lineas sin formato clave: valor: ${parsed.malformedLines.join(" | ")}`,
      help: buildHelpMessage(command.kind),
    };
  }

  if (parsed.unknownFields.length) {
    return {
      type: "error",
      kind: command.kind,
      message: `Hay campos no reconocidos: ${parsed.unknownFields.join(", ")}`,
      help: buildHelpMessage(command.kind),
    };
  }

  if (!Object.keys(parsed.entry).length) {
    return {
      type: "error",
      kind: command.kind,
      message: "Faltan los datos del contenido.",
      help: buildHelpMessage(command.kind),
    };
  }

  return {
    type: "content",
    kind: command.kind,
    entry: parsed.entry,
  };
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
