# Telegram directo a GitHub y Netlify

## Flujo

1. En Telegram escribes al bot.
2. Telegram manda el mensaje al webhook de Netlify.
3. La funcion `telegram-webhook` interpreta altas, ediciones, listados y borrados solo de noticias.
4. La funcion lee y actualiza `content/news.json` directamente en GitHub mediante la API de contenidos.
5. Netlify detecta el commit nuevo y publica la web.

## Archivos preparados

- `netlify/functions/telegram-webhook.js`
- `scripts/lib/telegram-content.js`
- `scripts/register-telegram-webhook.js`
- `scripts/set-telegram-commands.js`
- `.github/workflows/content-update.yml`

## Variables necesarias en Netlify

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `GITHUB_BRANCH` opcional, por defecto `main`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_CHAT_IDS`

## Formatos soportados

### Noticia en texto libre

```text
/noticia Nueva colaboracion artistica para la temporada 2026. Destacada. https://luryart.com/
```

### Borrar una noticia

```text
borra la noticia nueva colaboracion
```

El bot te devolvera un comando de confirmacion con `id`.

### Editar una noticia

```text
/editar noticia nueva colaboracion: resumen: Nuevo resumen
destacado: si
```

### Listar contenido

```text
lista de noticias
```

## Comandos del bot

Los comandos que se cargan en Telegram son:

- `/noticia`
- `/editar`
- `/borrar`
- `/lista`
- `/ayuda`
- `/start`

## Restriccion aplicada

- Desde Telegram solo se puede tocar `content/news.json`.
- Conciertos, programas y videos siguen visibles en la web, pero no se editan desde el bot.
- Ya no dependes de GitHub Actions para que una noticia entre en produccion.

## Comprobaciones locales

```powershell
npm run test:telegram-parser
npm run validate-content
npm run test:content-flow
```
