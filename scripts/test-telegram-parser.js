const assert = require("assert");
const {
  buildHelpMessage,
  parseTelegramContent,
} = require("./lib/telegram-content");

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

testConcertMessage();
testNewsMessage();
testHelp();
testUnknownField();

console.log("Parser de Telegram validado correctamente.");
