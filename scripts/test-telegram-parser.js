const assert = require("assert");
const { buildHelpMessage, parseMutationRequest, parseTelegramContent } = require("./lib/telegram-content");

function testConcertMessage() {
  const result = parseMutationRequest("/concierto Tengo un recital en Pamplona el 18 de abril de 2026.");
  assert.strictEqual(result.type, "error");
  assert.match(result.message, /solo esta permitido/i);
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
  const result = parseMutationRequest(
    "/concierto Tengo un recital en Pamplona el 18 de abril de 2026 a las 19:30 en la parroquia de San Lorenzo. Destacado.",
    { referenceDate: "2026-04-17T12:00:00Z" }
  );

  assert.strictEqual(result.type, "error");
  assert.match(result.message, /solo esta permitido/i);
}

function testRelativeDateConcertMessage() {
  const result = parseMutationRequest("/concierto Recital manana a las 20h en Pamplona.", {
    referenceDate: "2026-04-17T12:00:00Z",
  });

  assert.strictEqual(result.type, "error");
  assert.match(result.message, /solo esta permitido/i);
}

function testVideoMessage() {
  const result = parseMutationRequest(
    "/video Sube este video a la seccion recital https://youtu.be/All5AboOBUE destacado"
  );

  assert.strictEqual(result.type, "error");
  assert.match(result.message, /solo esta permitido/i);
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
  const result = parseMutationRequest("lista de noticias");

  assert.strictEqual(result.type, "mutation");
  assert.strictEqual(result.action, "list");
  assert.strictEqual(result.kind, "news");
}

function testNaturalFallbackMessage() {
  const result = parseMutationRequest("hola");

  assert.strictEqual(result.type, "error");
  assert.match(result.message, /Puedo ayudarte a publicar, editar, borrar y listar noticias/i);
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
testNaturalFallbackMessage();

console.log("Parser de Telegram validado correctamente.");
