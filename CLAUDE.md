# Boletín Carlota

App web (PWA) con un boletín diario para **Carlota**, veterinaria y comercial de De Heus (nutrición animal), que visita granjas de vacuno de leche en País Vasco y Navarra. Se lee en móvil y ordenador.

Carlota **no es programadora**: explícale cada paso en lenguaje sencillo, en español, y pregúntale antes de crear cuentas, pagar algo o publicar.

## Cómo está hecho

- Web estática sin servidor ni base de datos: `index.html`, `assets/styles.css`, `assets/app.js`.
- PWA: `manifest.webmanifest`, `sw.js` (guarda la app y los boletines vistos para leer sin conexión) e iconos en `assets/`.
- Cada boletín es un JSON: `boletines/AAAA-MM-DD.json`. El índice es `boletines/index.json` (lista de fechas y títulos, el más reciente primero).
- Esquema: `schema/boletin.schema.json`. Validación: `node scripts/validar.mjs` (sin dependencias). Se ejecuta siempre antes de guardar un boletín.
- Instrucciones editoriales para generar el boletín: `prompts/boletin-diario.md`.
- Publicación prevista: GitHub Pages desde la rama `main` (repo público `boletin-carlota`).

## Probar en local

```
python3 -m http.server 8000
```
y abrir http://localhost:8000 (el service worker solo funciona servido por http, no abriendo el archivo).

## Versión corta y larga

- Corta: titular + `resumen` de los items con `soloLargo: false`, más destacados, semáforo, margen y ángulo comercial.
- Larga: todos los items con `detalle`, tabla de precios completa y agenda.

## Generar el boletín de un día

1. Seguir `prompts/boletin-diario.md` (buscar en la web, nada de memoria).
2. Escribir `boletines/AAAA-MM-DD.json`.
3. Añadir la entrada al principio de `boletines/index.json`.
4. `node scripts/validar.mjs` → si falla, corregir; nunca publicar un boletín inválido.
5. Subir `CACHE_VERSION` en `sw.js` solo si cambia el código de la app (no hace falta por boletines nuevos).
6. Commit con mensaje `Boletín AAAA-MM-DD` y push.

## Estado y fases

- [x] Fase 1: app con boletín de ejemplo (`ejemplo: true` en el JSON, se muestra una banda de aviso).
- [ ] Fase 2: primer boletín real generado con el prompt.
- [ ] Fase 3: publicar en GitHub Pages e instalar en el móvil.
- [ ] Fase 4: automatizar de lunes a viernes a las 6:45 (hora de Madrid).
- [ ] Fase 5: mejoras (avisos, resumen semanal, fichas de clientes…).

## Decisiones

- 2026-10-07: web estática + JSON por día + GitHub Pages; repositorio público porque el contenido son noticias públicas. No guardar datos de clientes aquí mientras sea público.
