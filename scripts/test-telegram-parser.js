const assert = require("assert");
const { buildHelpMessage, parseMutationRequest, parseTelegramContent } = require("./lib/telegram-content");

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
  assert.strictEqual(result.entry.linkText, "Leer mas");
}

function testHelp() {
  const result = parseTelegramContent("/ayuda");
  assert.strictEqual(result.type, "help");
  assert.strictEqual(result.message, buildHelpMessage());
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
}

function testRelativeDateConcertMessage() {
  const result = parseTelegramContent("/concierto Recital manana a las 20h en Pamplona.", {
    referenceDate: "2026-04-17T12:00:00Z",
  });

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.entry.date, "2026-04-18");
  assert.strictEqual(result.entry.time, "20:00");
}

function testVideoMessage() {
  const result = parseTelegramContent(
    "/video Sube este video a la seccion recital https://youtu.be/All5AboOBUE destacado"
  );

  assert.strictEqual(result.type, "content");
  assert.strictEqual(result.kind, "video");
  assert.strictEqual(result.entry.section, "recital");
}

function testDeleteMutation() {
  const result = parseMutationRequest("borra la noticia nueva colaboracion");

  assert.strictEqual(result.type, "mutation");
  assert.strictEqual(result.action, "delete");
  assert.strictEqual(result.kind, "news");
  assert.strictEqual(result.confirm, false);
}

function testDeleteConfirmationMutation() {
  const result = parseMutationRequest("/borrar noticia id:nueva-colaboracion-2026-04-10 confirmar");

  assert.strictEqual(result.type, "mutation");
  assert.strictEqual(result.action, "delete");
  assert.strictEqual(result.kind, "news");
  assert.strictEqual(result.targetId, "nueva-colaboracion-2026-04-10");
  assert.strictEqual(result.confirm, true);
}

function testUpdateMutation() {
  const result = parseMutationRequest(
    "/editar noticia nueva colaboracion: resumen: Texto actualizado\ndestacado: si"
  );

  assert.strictEqual(result.type, "mutation");
  assert.strictEqual(result.action, "update");
  assert.strictEqual(result.kind, "news");
  assert.strictEqual(result.entry.summary, "Texto actualizado");
}

function testListMutation() {
  const result = parseMutationRequest("lista de videos");

  assert.strictEqual(result.type, "mutation");
  assert.strictEqual(result.action, "list");
  assert.strictEqual(result.kind, "video");
}

testConcertMessage();
testNewsMessage();
testHelp();
testNaturalConcertMessage();
testRelativeDateConcertMessage();
testVideoMessage();
testDeleteMutation();
testDeleteConfirmationMutation();
testUpdateMutation();
testListMutation();

console.log("Parser de Telegram validado correctamente.");
