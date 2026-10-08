# Boletín Carlota

App web (PWA) con un boletín diario para **Carlota**, veterinaria y comercial de De Heus (nutrición animal), que visita granjas de vacuno de leche en País Vasco y Navarra. Se lee en móvil y ordenador.

- Web publicada: https://cmendiguren.github.io/boletin-carlota/
- Repositorio: https://github.com/cmendiguren/boletin-carlota (público, rama `main`)

Carlota **no es programadora**: explícale cada paso en lenguaje sencillo, en español, y pregúntale antes de crear cuentas, pagar algo o borrar contenido.

## Reglas de trabajo (importante)

- **Antes de empezar**, trae lo último de GitHub: `git pull origin main`. Los boletines se generan solos cada mañana y si no los traes habrá conflictos.
- **Al terminar**, guarda y publica siempre en `main`: `git add -A`, `git commit -m "<qué has cambiado>"`, `git push origin main`. GitHub Pages publica `main` en 1–2 minutos. Carlota no revisa pull requests: no dejes el trabajo en otra rama salvo que ella lo pida.
- Si un push falla porque hay cambios nuevos en GitHub: `git pull --rebase origin main` y vuelve a hacer push.
- Antes de cualquier commit: `node scripts/validar.mjs` y `node --check assets/app.js`.
- Si cambias código de la app (HTML, CSS, JS, manifest), sube `CACHE_VERSION` en `sw.js`.

## Cómo está hecho

- Web estática sin servidor ni base de datos: `index.html`, `assets/styles.css`, `assets/app.js` (JS sin dependencias ni compilación).
- PWA: `manifest.webmanifest`, `sw.js` (red primero; si no hay conexión, la copia guardada) e iconos en `assets/`.
- Cada boletín es un JSON: `boletines/AAAA-MM-DD.json`. El índice es `boletines/index.json` (lista de fechas y títulos, el más reciente primero).
- Esquema: `schema/boletin.schema.json`. Validación: `node scripts/validar.mjs`.
- Instrucciones editoriales del boletín: `prompts/boletin-diario.md`.
- Revistas: `revistas.json` (grupos con `id`, `nombre`, `descripcion`, `url`). Para añadir o quitar una revista basta con editar este archivo; el `id` no debe cambiar o se pierde la marca de leída.
- Marcas de "Leído" (noticias) y "Leída" (revistas): se guardan en el navegador de cada dispositivo (`localStorage`, claves `boletin.leidos` y `boletin.revistas`). No se sincronizan entre móvil y ordenador. Las revistas cuentan como "leídas hoy" y se reinician cada día, mostrando la fecha de la última lectura.

## Ordenador de Carlota (Windows)

- El proyecto está en `C:\Users\cperez\boletin-carlota`. La copia de `Documentos\boletin-carlota` es antigua y no se usa.
- Git está instalado; si la terminal no lo encuentra, usa la ruta completa (`C:\Program Files\Git\cmd\git.exe`).
- Node no está instalado, así que `node scripts/validar.mjs` no funciona aquí. Si vas a crear o modificar boletines desde este ordenador, ofrécele instalar Node (nodejs.org, versión LTS) antes.

## Probar en local

En VS Code: menú *Terminal → Run Task… → Ver la app en el ordenador* y abrir http://localhost:8000. O en una terminal:

```
python3 -m http.server 8000
```

## Versión corta y larga

- Corta: titular + `resumen` de los items con `soloLargo: false`, más destacados, semáforo, margen, precios (sin variación ni fuente), ideas para las visitas y revistas.
- Larga: todos los items con `detalle`, tabla de precios completa, agenda y revistas.

## Generar el boletín de un día

1. `git pull origin main`.
2. Seguir `prompts/boletin-diario.md` (buscar en la web, nada de memoria).
3. Escribir `boletines/AAAA-MM-DD.json` con `"ejemplo": false`.
4. Añadir la entrada al principio de `boletines/index.json`.
5. `node scripts/validar.mjs` → si falla, corregir; nunca publicar un boletín inválido.
6. Commit `Boletín AAAA-MM-DD` y `git push origin main`.

## Estado y fases

- [x] Fase 1: app con boletín de ejemplo.
- [x] Fase 2: primer boletín real (8 de octubre de 2026).
- [x] Fase 3: publicada en GitHub Pages e instalada en el móvil.
- [x] Revistas con marca de leída y noticias con marca de leído.
- [x] Fase 4: generación automática en marcha. Es una tarea programada de Claude en la nube (claude.ai, "Boletín Carlota diario"), de lunes a viernes a las 6:45 hora de Madrid; no depende de este ordenador. Primera ejecución: viernes 9 de octubre de 2026. Comprobar los primeros días que aparece el boletín nuevo en `boletines/`.
- [ ] Fase 5: mejoras (avisos, resumen semanal, fichas de clientes en un sitio privado…).

## Decisiones

- 2026-10-07: web estática + JSON por día + GitHub Pages; repositorio público porque el contenido son noticias públicas. No guardar datos de clientes aquí mientras sea público.
- 2026-10-08: marcas de lectura en el navegador (sin cuentas ni base de datos). Si Carlota quiere que se sincronicen entre móvil y ordenador, habrá que añadir un servicio externo: preguntarle antes.
