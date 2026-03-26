# Publicación y actualización rápida

## Qué se ha preparado

- La portada principal vive en `index.html`.
- Los conciertos se cargan desde `content/concerts.json`.
- Las noticias se cargan desde `content/news.json`.
- El renderizado automático vive en `app.js`.
- La configuración de Netlify vive en `netlify.toml`.
- El actualizador reutilizable de contenido vive en `scripts/content-admin.js`.

Con esta estructura, el diseño queda separado del contenido. Eso hace mucho más fácil publicar nuevas fechas sin tocar toda la web.

## Cómo añadir un concierto desde Windows

Abre PowerShell en esta carpeta y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\add-concert.ps1
```

El script te pedirá:

- título
- fecha
- hora
- recinto
- ciudad
- descripción
- enlace opcional
- si debe salir destacado

## Cómo añadir una noticia desde Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\add-news.ps1
```

El script te pedirá:

- título
- fecha
- resumen
- enlace opcional
- si debe salir destacada

## Cómo previsualizar la web en local

Como la portada carga los datos desde archivos JSON, conviene verla con un servidor local.

```powershell
node .\scripts\preview-local.js
```

Después abre:

```text
http://localhost:4173
```

## Cómo validar que el contenido está bien

```powershell
npm run validate-content
```

## Cómo probar el flujo completo sin tocar tus datos reales

```powershell
npm run test:content-flow
```

## Cómo dejar el deploy automático en Netlify

La opción recomendada es esta:

1. Subir esta carpeta a un repositorio de GitHub.
2. Conectar ese repositorio a Netlify.
3. Configurar la publicación desde la raíz del proyecto.
4. Cada cambio en `index.html`, `app.js` o `content/*.json` generará un deploy automático.

La configuración base ya está en:

- `netlify.toml`

Documentación oficial útil:

- Telegram Bot API: https://core.telegram.org/bots/api
- n8n Telegram Trigger: https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.telegramtrigger/
- Netlify Git-based deploys: https://docs.netlify.com/build/git-workflows/repo-permissions-linking/
- Netlify Build Hooks: https://docs.netlify.com/build/configure-builds/build-hooks/

## Flujo recomendado para publicar desde el móvil

La mejor arquitectura para tu caso sería:

1. Tú escribes al bot de Telegram desde el móvil.
2. El bot recoge los datos del concierto o la noticia.
3. n8n transforma ese mensaje en una actualización del repositorio.
4. GitHub guarda el cambio en `content/concerts.json` o `content/news.json`.
5. Netlify publica automáticamente la nueva versión.

Para probar antes de montar Telegram puedes lanzar el mismo flujo a GitHub con:

```powershell
node .\scripts\github-dispatch.js concert .\examples\concert-payload.json
```

## Importante

Publicar directamente sobre archivos estáticos dentro de Netlify no es lo ideal para contenido cambiante, porque el despliegue genera una versión fija del sitio. Por eso la mejor práctica es usar GitHub como origen de verdad y dejar a Netlify desplegar automáticamente.

## Ejemplo de concierto en `content/concerts.json`

```json
[
  {
    "id": "recital-pamplona-2026-04-18",
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
]
```

## Ejemplo de noticia en `content/news.json`

```json
[
  {
    "id": "nueva-colaboracion-2026-04-10",
    "title": "Nueva colaboración artística",
    "date": "2026-04-10",
    "summary": "Anunciamos una nueva colaboración para próximos ciclos culturales.",
    "linkText": "Leer más",
    "linkUrl": "https://luryart.com/",
    "status": "published",
    "featured": true
  }
]
```
