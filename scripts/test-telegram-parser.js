const assert = require("assert");
const { buildHelpMessage, parseTelegramContent } = require("./lib/telegram-content");

function testConcertMessage() {
  const result = parseTelegramContent(`
/concierto
titulo: Recital en Pamplona
fecha: 2026-04-18
hora: 19:30
recinto: Parroquia de San Lorenzo
ciudad: Pamplona
descripcion: Programa de recital y repertorio sacro.
enlace: https://ejemplo.com
destacado: si
  `);

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "concert");
  assert.strictEqual(result.entry.title, "Recital en Pamplona");
  assert.strictEqual(result.entry.time, "19:30");
  assert.strictEqual(result.entry.ticketUrl, "https://ejemplo.com");
}

function testNewsMessage() {
  const result = parseTelegramContent(`
/noticia
titulo: Nueva colaboracion
fecha: 2026-04-10
resumen: Anunciamos una nueva colaboracion.
texto enlace: Leer mas
enlace: https://luryart.com/
destacado: si
  `);

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "news");
  assert.strictEqual(result.entry.summary, "Anunciamos una nueva colaboracion.");
  assert.strictEqual(result.entry.linkText, "Leer mas");
}

function testHelp() {
  const result = parseTelegramContent("/ayuda");
  assert.strictEqual(result.type, "help");
  assert.strictEqual(result.message, buildHelpMessage());
}

function testUnknownField() {
  const result = parseTelegramContent(`
/concierto
titulo: Recital en Pamplona
lugar raro: X
  `);

  assert.strictEqual(result.type, "error");
  assert.match(result.message, /campos no reconocidos/i);
}

function testNaturalConcertMessage() {
  const result = parseTelegramContent(
    "/concierto Tengo un recital en Pamplona el 18 de abril de 2026 a las 19:30 en la parroquia de San Lorenzo. Destacado.",
    { referenceDate: "2026-04-17T12:00:00Z" }
  );

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "concert");
  assert.strictEqual(result.entry.date, "2026-04-18");
  assert.strictEqual(result.entry.time, "19:30");
  assert.strictEqual(result.entry.city, "Pamplona");
  assert.strictEqual(result.entry.featured, true);
}

function testRelativeDateConcertMessage() {
  const result = parseTelegramContent("/concierto Recital manana a las 20h en Pamplona.", {
    referenceDate: "2026-04-17T12:00:00Z",
  });

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "concert");
  assert.strictEqual(result.entry.date, "2026-04-18");
  assert.strictEqual(result.entry.time, "20:00");
}

function testNaturalNewsMessage() {
  const result = parseTelegramContent(
    "/noticia Nueva colaboracion artistica para la temporada 2026. Destacada. https://luryart.com/"
  );

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "news");
  assert.strictEqual(result.entry.linkUrl, "https://luryart.com/");
  assert.strictEqual(result.entry.featured, true);
}

function testInferKindWithoutCommand() {
  const result = parseTelegramContent(
    "Nueva colaboracion artistica anunciada para la temporada 2026 con estreno en otono."
  );

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "news");
}

function testVideoMessage() {
  const result = parseTelegramContent(
    "/video Sube este video a la seccion recital https://youtu.be/All5AboOBUE destacado"
  );

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "video");
  assert.strictEqual(result.entry.section, "recital");
  assert.strictEqual(result.entry.youtubeUrl, "https://youtu.be/All5AboOBUE");
}

function testStructuredVideoMessage() {
  const result = parseTelegramContent(`
/video
titulo: Nuevo video de recital
seccion: recital
url: https://www.youtube.com/watch?v=All5AboOBUE
posicion: 1
destacado: si
  `);

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "video");
  assert.strictEqual(result.entry.position, "1");
  assert.strictEqual(result.entry.section, "recital");
}

testConcertMessage();
testNewsMessage();
testHelp();
testUnknownField();
testNaturalConcertMessage();
testRelativeDateConcertMessage();
testNaturalNewsMessage();
testInferKindWithoutCommand();
testVideoMessage();
testStructuredVideoMessage();

console.log("Parser de Telegram validado correctamente.");
