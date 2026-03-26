# Telegram directo a GitHub y Netlify

## Flujo

1. En Telegram escribes al bot.
2. Telegram manda el mensaje al webhook de Netlify.
3. La funcion `telegram-webhook` transforma el mensaje en un `repository_dispatch`.
4. GitHub Actions actualiza `content/concerts.json` o `content/news.json`.
5. Netlify detecta el commit nuevo y publica la web.

## Archivos preparados

- `netlify/functions/telegram-webhook.js`
- `scripts/lib/telegram-content.js`
- `scripts/register-telegram-webhook.js`
- `.github/workflows/content-update.yml`
- `examples/telegram-concert-message.txt`
- `examples/telegram-news-message.txt`

## Lo que tienes que hacer fuera del repo

### 1. Conectar Netlify con GitHub

En Netlify:

1. `Proyectos`
2. Abre `luryart` o crea uno nuevo con `Import an existing project`
3. Selecciona GitHub
4. Elige el repositorio `lurdesenergy1/luryart`
5. Deja estos valores:
   - Base directory: vacio
   - Build command: vacio
   - Publish directory: `.`

### 2. Poner variables en Netlify

En `Project configuration > Environment variables` añade:

- `GITHUB_OWNER=...`
- `GITHUB_REPO=...`
- `GITHUB_TOKEN=...`
- `TELEGRAM_BOT_TOKEN=...`
- `TELEGRAM_WEBHOOK_SECRET=...`
- `TELEGRAM_ALLOWED_CHAT_IDS=...`

Notas:

- `GITHUB_TOKEN` aqui es un token personal tuyo con permiso para disparar `repository_dispatch` en ese repo.
- `TELEGRAM_ALLOWED_CHAT_IDS` puede llevar varios ids separados por comas.

### 3. Hacer el primer deploy

Cuando el proyecto ya este conectado al repo, Netlify desplegara la web y la funcion.

La URL del webhook sera:

```text
https://TU-SITIO.netlify.app/.netlify/functions/telegram-webhook
```

### 4. Registrar el webhook en Telegram

Desde PowerShell, sin pegar el token en el chat:

```powershell
$env:TELEGRAM_BOT_TOKEN="TU_TOKEN"
$env:TELEGRAM_WEBHOOK_SECRET="TU_SECRETO"
npm run telegram:set-webhook -- https://TU-SITIO.netlify.app
```

## Formato de mensajes

### Concierto

```text
/concierto
titulo: Recital en Pamplona
fecha: 2026-04-18
hora: 19:30
recinto: Parroquia de San Lorenzo
ciudad: Pamplona
descripcion: Programa de recital y repertorio sacro.
enlace: https://ejemplo.com
destacado: si
```

### Noticia

```text
/noticia
titulo: Nueva colaboracion artistica
fecha: 2026-04-10
resumen: Anunciamos una nueva colaboracion para proximos ciclos culturales.
texto enlace: Leer mas
enlace: https://luryart.com/
destacado: si
```

## Pruebas locales

```powershell
npm run test:telegram-parser
npm run validate-content
npm run test:content-flow
```
