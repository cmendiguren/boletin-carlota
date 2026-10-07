// Valida todos los boletines contra schema/boletin.schema.json y comprueba el índice.
// Uso: node scripts/validar.mjs   (sin dependencias)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const dirBoletines = join(raiz, "boletines");
const schema = JSON.parse(readFileSync(join(raiz, "schema/boletin.schema.json"), "utf8"));
const errores = [];

function tipoDe(v) {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v;
}

// Subconjunto de JSON Schema: type, required, properties, items, enum, pattern, minItems, maxItems, minLength
function validar(valor, esquema, ruta, archivo) {
  const fallo = (msg) => errores.push(`${archivo} → ${ruta || "(raíz)"}: ${msg}`);
  if (esquema.enum && !esquema.enum.includes(valor)) {
    return fallo(`valor "${valor}" no permitido (opciones: ${esquema.enum.join(", ")})`);
  }
  if (esquema.type && tipoDe(valor) !== esquema.type) {
    return fallo(`se esperaba ${esquema.type} y hay ${tipoDe(valor)}`);
  }
  if (esquema.type === "string") {
    if (esquema.minLength && valor.length < esquema.minLength) fallo("texto vacío");
    if (esquema.pattern && !new RegExp(esquema.pattern).test(valor)) fallo(`formato incorrecto ("${valor}")`);
  }
  if (esquema.type === "object") {
    for (const campo of esquema.required || []) {
      if (!(campo in valor)) fallo(`falta el campo "${campo}"`);
    }
    for (const [campo, sub] of Object.entries(esquema.properties || {})) {
      if (campo in valor) validar(valor[campo], sub, ruta ? `${ruta}.${campo}` : campo, archivo);
    }
  }
  if (esquema.type === "array") {
    if (esquema.minItems != null && valor.length < esquema.minItems) fallo(`mínimo ${esquema.minItems} elementos`);
    if (esquema.maxItems != null && valor.length > esquema.maxItems) fallo(`máximo ${esquema.maxItems} elementos`);
    if (esquema.items) valor.forEach((v, i) => validar(v, esquema.items, `${ruta}[${i}]`, archivo));
  }
}

const archivos = readdirSync(dirBoletines).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
for (const f of archivos) {
  let datos;
  try {
    datos = JSON.parse(readFileSync(join(dirBoletines, f), "utf8"));
  } catch (e) {
    errores.push(`${f}: JSON mal formado (${e.message})`);
    continue;
  }
  validar(datos, schema, "", f);
  if (datos.fecha && `${datos.fecha}.json` !== f) errores.push(`${f}: la fecha interna (${datos.fecha}) no coincide con el nombre del archivo`);
}

// Índice
const rutaIndice = join(dirBoletines, "index.json");
if (!existsSync(rutaIndice)) {
  errores.push("Falta boletines/index.json");
} else {
  const indice = JSON.parse(readFileSync(rutaIndice, "utf8"));
  if (!Array.isArray(indice.boletines)) {
    errores.push('index.json: falta la lista "boletines"');
  } else {
    const fechas = indice.boletines.map((b) => b.fecha);
    const ordenadas = [...fechas].sort().reverse();
    if (fechas.join() !== ordenadas.join()) errores.push("index.json: las fechas deben ir de la más reciente a la más antigua");
    for (const b of indice.boletines) {
      if (!b.fecha || !b.titulo) errores.push(`index.json: entrada incompleta ${JSON.stringify(b)}`);
      else if (!archivos.includes(`${b.fecha}.json`)) errores.push(`index.json: no existe boletines/${b.fecha}.json`);
    }
    for (const f of archivos) {
      if (!fechas.includes(f.replace(".json", ""))) errores.push(`${f}: no está en index.json`);
    }
  }
}

if (errores.length) {
  console.error(`✗ ${errores.length} problema(s):`);
  for (const e of errores) console.error("  - " + e);
  process.exit(1);
}
console.log(`✓ ${archivos.length} boletín(es) válidos e índice correcto.`);
