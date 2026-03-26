# Puesta en marcha completa

## 1. Crear el repositorio GitHub

Si todavía no tienes repo:

```powershell
git init
git add .
git commit -m "feat: preparar landing y sistema de contenido"
```

Después crea un repositorio vacío en GitHub y enlázalo:

```powershell
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

## 2. Conectar Netlify al repositorio

En Netlify:

1. `Add new site`
2. `Import an existing project`
3. Elegir GitHub
4. Seleccionar tu repositorio
5. Publicar desde la raíz del proyecto

Configuración esperada:

- Build command: vacío
- Publish directory: `.`

El archivo `netlify.toml` ya deja esa publicación definida.

## 3. Validar contenido antes de publicar

```powershell
npm run validate-content
```

## 4. Probar el flujo interno de contenido

Esto prueba que los ejemplos de concierto y noticia pueden entrar en el sistema sin romper los JSON:

```powershell
npm run test:content-flow
```

## 5. Crear el bot con BotFather

En Telegram:

1. Abre `@BotFather`
2. Ejecuta `/newbot`
3. Elige nombre y username
4. Guarda el token del bot

Ese token irá luego en n8n.

## 6. Preparar GitHub para aceptar publicaciones del bot

Necesitas un token de GitHub con permisos sobre el repositorio.

El flujo ya está listo en:

- `.github/workflows/content-update.yml`

Acepta:

- `repository_dispatch`
- `workflow_dispatch`

## 7. Probar un disparo manual a GitHub

Con variables de entorno:

```powershell
$env:GITHUB_OWNER="TU_USUARIO"
$env:GITHUB_REPO="TU_REPO"
$env:GITHUB_TOKEN="TU_TOKEN"
```

Con PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dispatch-github-content.ps1 -Kind concert -PayloadPath .\examples\concert-payload.json
```

Con Node:

```powershell
node .\scripts\github-dispatch.js concert .\examples\concert-payload.json
```

## 8. Conectar n8n

La idea es:

1. `Telegram Trigger`
2. preguntas guiadas
3. confirmación final
4. `HTTP Request` a GitHub `repository_dispatch`

Más detalle en:

- `TELEGRAM-BOT.md`

## 9. Qué queda fuera de este proyecto

Hay tres cosas que no puedo hacer desde aquí sin tus credenciales:

- crear el repo real en GitHub
- conectar el sitio real en Netlify al repo
- crear y autenticar el bot y n8n

## 10. Orden recomendado real

1. Sube el proyecto a GitHub
2. Conecta Netlify
3. Prueba `workflow_dispatch`
4. Prueba `repository_dispatch` con los scripts
5. Crea el bot
6. Monta n8n
7. Publica el primer concierto desde móvil
