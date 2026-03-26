# Bot de Telegram para publicar desde el móvil

## Objetivo

Publicar conciertos y noticias escribiendo a un bot de Telegram desde el móvil, sin editar manualmente el HTML.

## Arquitectura recomendada

1. Tú escribes al bot de Telegram.
2. n8n recibe el mensaje.
3. n8n transforma el mensaje en un JSON estructurado.
4. n8n dispara un `repository_dispatch` en GitHub.
5. GitHub Actions actualiza `content/concerts.json` o `content/news.json`.
6. Netlify despliega automáticamente al detectar el commit nuevo.

## Por qué esta arquitectura

- La web sigue siendo estática y rápida.
- El contenido queda versionado.
- Si algo sale mal, puedes corregirlo o volver atrás.
- Funciona bien desde móvil, pero no depende de editar directamente en Netlify.

## Requisitos externos

- Un bot creado con BotFather en Telegram.
- Una cuenta de n8n.
- Un repositorio de GitHub conectado a Netlify.
- Un token de GitHub con permiso para lanzar `repository_dispatch`.

## Repositorio

Este proyecto ya queda preparado con:

- `content/concerts.json`
- `content/news.json`
- `scripts/content-admin.js`
- `scripts/github-dispatch.js`
- `scripts/dispatch-github-content.ps1`
- `.github/workflows/content-update.yml`

## Qué debe enviar n8n a GitHub

Haz una petición `POST` a:

```text
https://api.github.com/repos/TU_USUARIO/TU_REPO/dispatches
```

Con cabeceras:

```text
Accept: application/vnd.github+json
Authorization: Bearer TU_TOKEN
X-GitHub-Api-Version: 2022-11-28
Content-Type: application/json
```

## Payload para publicar un concierto

```json
{
  "event_type": "telegram-content-update",
  "client_payload": {
    "kind": "concert",
    "entry": {
      "title": "Recital en Pamplona",
      "date": "2026-04-18",
      "time": "19:30",
      "venue": "Parroquia de San Lorenzo",
      "city": "Pamplona",
      "description": "Programa de recital y repertorio sacro.",
      "ticketUrl": "",
      "status": "upcoming",
      "featured": true
    }
  }
}
```

## Payload para publicar una noticia

```json
{
  "event_type": "telegram-content-update",
  "client_payload": {
    "kind": "news",
    "entry": {
      "title": "Nueva colaboración artística",
      "date": "2026-04-10",
      "summary": "Anunciamos una nueva colaboración para próximos ciclos culturales.",
      "linkText": "Leer más",
      "linkUrl": "https://luryart.com/",
      "status": "published",
      "featured": true
    }
  }
}
```

## Diseño práctico del bot

La opción más fiable es usar comandos distintos:

- `/concierto`
- `/noticia`

Después el bot te va preguntando cada dato uno a uno:

### Flujo `/concierto`

1. Título
2. Fecha
3. Hora
4. Recinto
5. Ciudad
6. Descripción
7. Enlace opcional
8. Si debe ir destacado

### Flujo `/noticia`

1. Título
2. Fecha
3. Resumen
4. Texto del enlace opcional
5. URL opcional
6. Si debe ir destacada

## Cómo montarlo en n8n

Nodos recomendados:

1. `Telegram Trigger`
2. `Switch`
3. `Set` o `Edit Fields`
4. `Telegram` para hacer preguntas y confirmar
5. `HTTP Request` hacia GitHub

## Cómo probar GitHub antes de usar el bot

Si quieres comprobar primero que GitHub Actions actualiza el contenido correctamente:

Con Node:

```powershell
$env:GITHUB_OWNER="TU_USUARIO"
$env:GITHUB_REPO="TU_REPO"
$env:GITHUB_TOKEN="TU_TOKEN"
node .\scripts\github-dispatch.js concert .\examples\concert-payload.json
```

Con PowerShell:

```powershell
$env:GITHUB_OWNER="TU_USUARIO"
$env:GITHUB_REPO="TU_REPO"
$env:GITHUB_TOKEN="TU_TOKEN"
powershell -ExecutionPolicy Bypass -File .\scripts\dispatch-github-content.ps1 -Kind concert -PayloadPath .\examples\concert-payload.json
```

## Mensaje de confirmación recomendado

Antes de publicar, el bot debería devolverte algo así:

```text
Voy a publicar este concierto:
Recital en Pamplona
18/04/2026 a las 19:30
Parroquia de San Lorenzo · Pamplona

Responde SI para publicar.
```

## Recomendación importante

No intentes que el bot escriba directamente sobre Netlify. Lo robusto es:

- GitHub como fuente de verdad
- GitHub Actions para actualizar JSON
- Netlify para desplegar

## Siguiente paso real

Cuando tengas:

- bot de Telegram
- repositorio GitHub
- sitio de Netlify conectado al repo

el siguiente paso será configurar n8n con el token de GitHub y probar un primer `repository_dispatch`.
