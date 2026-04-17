# Telegram directo a GitHub y Netlify

## Flujo

1. En Telegram escribes al bot.
2. Telegram manda el mensaje al webhook de Netlify.
3. La funcion `telegram-webhook` interpreta altas, ediciones, listados y borrados de concierto, noticia o video.
4. La funcion dispara un `repository_dispatch` en GitHub.
5. GitHub Actions actualiza `content/concerts.json`, `content/news.json` o `content/videos.json`.
6. Netlify detecta el commit nuevo y publica la web.

## Archivos preparados

- `netlify/functions/telegram-webhook.js`
- `scripts/lib/telegram-content.js`
- `scripts/register-telegram-webhook.js`
- `scripts/set-telegram-commands.js`
- `.github/workflows/content-update.yml`
- `content/videos.json`
- `examples/video-payload.json`

## Variables necesarias en Netlify

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_CHAT_IDS`

## Formatos soportados

### Concierto en texto libre

```text
/concierto Tengo un recital en Pamplona el 18 de abril de 2026 a las 19:30 en la parroquia de San Lorenzo. Destacado.
```

### Noticia en texto libre

```text
/noticia Nueva colaboracion artistica para la temporada 2026. Destacada. https://luryart.com/
```

### Video en texto libre

```text
/video Sube este video a la seccion recital https://youtu.be/All5AboOBUE destacado
```

### Video con campos

```text
/video
titulo: Nuevo video de recital
seccion: recital
url: https://www.youtube.com/watch?v=All5AboOBUE
descripcion: Video para la seccion de recitales.
posicion: 1
destacado: si
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
lista de conciertos
lista de videos
```

## Comandos del bot

Los comandos que se cargan en Telegram son:

- `/concierto`
- `/noticia`
- `/video`
- `/editar`
- `/borrar`
- `/lista`
- `/ayuda`
- `/start`

## Comprobaciones locales

```powershell
npm run test:telegram-parser
npm run validate-content
npm run test:content-flow
```
