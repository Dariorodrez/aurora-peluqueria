#!/usr/bin/env node
/**
 * Auditoría estática del proyecto, sin dependencias externas.
 *   node tools/check.mjs
 *
 * Comprueba: archivos referenciados, semántica y accesibilidad del HTML,
 * reglas de CSS, contraste WCAG AA de los tokens y sintaxis del JavaScript.
 * Devuelve código de salida 1 si algo falla (útil en CI).
 */

import { existsSync, readFileSync, copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const results = [];
const pass = (label) => results.push({ ok: true, label });
const fail = (label, detail) => results.push({ ok: false, label, detail });

/* ------------------------------------------------------------------ *
 * 1. Archivos
 * ------------------------------------------------------------------ */
const required = [
  "index.html",
  "css/base.css",
  "css/layout.css",
  "css/components.css",
  "js/main.js",
  "js/navigation.js",
  "js/reveal.js",
  "assets/icons/favicon.svg",
];

for (const file of required) {
  existsSync(join(root, file))
    ? pass(`existe ${file}`)
    : fail(`falta ${file}`);
}

const html = read("index.html");
const cssFiles = ["css/base.css", "css/layout.css", "css/components.css"];
const css = cssFiles.map(read).join("\n");
const jsFiles = ["js/main.js", "js/navigation.js", "js/reveal.js"];

/* Recursos locales referenciados (src, srcset, href que no sean anclas) */
const localRefs = new Set();
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = match[1];
  if (/^(#|https?:|mailto:|tel:|data:)/.test(ref)) continue;
  localRefs.add(ref);
}
for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
  match[1]
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
    .forEach((ref) => localRefs.add(ref));
}
const missingRefs = [...localRefs].filter((ref) => !existsSync(join(root, ref)));
missingRefs.length === 0
  ? pass(`${localRefs.size} recursos locales existen`)
  : fail("recursos locales inexistentes", missingRefs.join(", "));

/* ------------------------------------------------------------------ *
 * 2. HTML
 * ------------------------------------------------------------------ */
if (/<html[^>]+lang="es"/.test(html)) pass('<html lang="es">');
else fail("<html lang> no es español");

if (/name="viewport"[^>]*content="width=device-width, initial-scale=1"/.test(html))
  pass("viewport correcto");
else fail("meta viewport ausente o incorrecto");

if (!/user-scalable=no|maximum-scale=1/.test(html)) pass("zoom no bloqueado");
else fail("el meta viewport bloquea el zoom");

const titles = html.match(/<title>([^<]+)<\/title>/);
titles ? pass(`title: "${titles[1]}"`) : fail("falta <title>");

const h1Count = (html.match(/<h1[\s>]/g) || []).length;
h1Count === 1 ? pass("un único <h1>") : fail(`hay ${h1Count} <h1>`);

/* Jerarquía de encabezados sin saltos */
const headings = [...html.matchAll(/<h([1-4])[\s>]/g)].map((m) => Number(m[1]));
let headingOk = headings[0] === 1;
for (let i = 1; i < headings.length && headingOk; i += 1) {
  if (headings[i] - headings[i - 1] > 1) headingOk = false;
}
headingOk
  ? pass(`jerarquía de encabezados correcta (${headings.join(">")})`)
  : fail("salto en la jerarquía de encabezados", headings.join(">"));

/* Ids únicos */
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
dupIds.length === 0 ? pass(`${ids.length} ids únicos`) : fail("ids duplicados", dupIds.join(", "));

/* Anclas internas */
const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const brokenAnchors = [...new Set(anchors)].filter((id) => !ids.includes(id));
brokenAnchors.length === 0
  ? pass(`${new Set(anchors).size} anclas internas válidas`)
  : fail("anclas internas rotas", brokenAnchors.join(", "));

/* Referencias ARIA */
for (const attr of ["aria-controls", "aria-labelledby", "aria-describedby"]) {
  const refs = [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))]
    .flatMap((m) => m[1].split(/\s+/));
  const broken = refs.filter((ref) => !ids.includes(ref));
  if (refs.length === 0) continue;
  broken.length === 0
    ? pass(`${attr}: ${refs.length} referencias válidas`)
    : fail(`${attr} apunta a ids inexistentes`, broken.join(", "));
}

/* Imágenes */
const images = [...html.matchAll(/<img\b[^>]*>/gs)].map((m) => m[0]);
const paginated = images.map((tag) => {
  const attr = (name) => {
    const m = tag.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : null;
  };
  return {
    alt: attr("alt"),
    width: attr("width"),
    height: attr("height"),
    loading: attr("loading"),
    priority: attr("fetchpriority"),
    src: attr("src"),
  };
});

const noAlt = paginated.filter((img) => img.alt === null);
noAlt.length === 0 ? pass(`${images.length} imágenes con atributo alt`) : fail("imágenes sin alt", String(noAlt.length));

const noSize = paginated.filter((img) => !img.width || !img.height);
noSize.length === 0 ? pass("todas las imágenes con width/height (CLS)") : fail("imágenes sin width/height", noSize.map((i) => i.src).join(", "));

const lazyOk = paginated.filter((img) => img.priority === "high" || img.loading === "lazy");
lazyOk.length === images.length
  ? pass("imágenes fuera del primer viewport con loading=lazy")
  : fail("imágenes sin loading=lazy", paginated.filter((img) => !(img.priority === "high" || img.loading === "lazy")).map((i) => i.src).join(", "));

const lcp = paginated.find((img) => img.priority === "high");
lcp ? pass("imagen LCP con fetchpriority=high") : fail("ninguna imagen con fetchpriority=high");

/* Enlaces externos seguros */
const blankLinks = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map((m) => m[0]);
const unsafeLinks = blankLinks.filter((tag) => !/rel="[^"]*noopener/.test(tag));
unsafeLinks.length === 0
  ? pass(`${blankLinks.length} enlaces target=_blank con noopener`)
  : fail("target=_blank sin rel=noopener", String(unsafeLinks.length));

/* Sin manejadores inline */
/ on[a-z]+="/.test(html) ? fail("hay manejadores de eventos inline") : pass("sin manejadores inline");

/* ------------------------------------------------------------------ *
 * 3. CSS
 * ------------------------------------------------------------------ */
/@import/.test(css) ? fail("usa @import (bloquea el render)") : pass("sin @import");

/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)
  ? pass("respeta prefers-reduced-motion")
  : fail("no hay regla prefers-reduced-motion");

const breakpoints = ["560px", "640px", "900px", "960px"];
const missingBp = breakpoints.filter((bp) => !css.includes(`min-width: ${bp}`));
missingBp.length === 0
  ? pass(`breakpoints definidos (${breakpoints.join(", ")})`)
  : fail("faltan breakpoints", missingBp.join(", "));

if (/outline:\s*(none|0)/.test(css) && !/:focus-visible/.test(css))
  fail("se elimina el outline sin reemplazo de foco");
else pass("indicador de foco conservado");

const malformedHex = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
  .map((m) => m[0])
  .filter((hex) => ![4, 5, 7, 9].includes(hex.length));
malformedHex.length === 0 ? pass("colores hexadecimales válidos") : fail("hex inválidos", malformedHex.join(", "));

/* ------------------------------------------------------------------ *
 * 4. Contraste WCAG AA sobre tokens
 * ------------------------------------------------------------------ */
const tokenBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/);
const tokens = new Map();
if (tokenBlock) {
  for (const match of tokenBlock[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim());
  }
}

function resolve(name, depth = 0) {
  const value = tokens.get(name);
  if (!value || depth > 5) return null;
  const ref = value.match(/var\(--([\w-]+)\)/);
  if (ref) return resolve(ref[1], depth + 1);
  return /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

const pairs = [
  ["text-900", "cream-50", 4.5, "texto cuerpo sobre fondo claro"],
  ["text-600", "cream-50", 4.5, "texto secundario sobre fondo claro"],
  ["text-700", "surface", 4.5, "texto sobre tarjeta"],
  ["gold-700", "cream-50", 4.5, "eyebrow sobre fondo claro"],
  ["cream-50", "ink-900", 4.5, "texto sobre fondo oscuro"],
  ["cream-50", "ink-950", 4.5, "texto sobre cabecera/pie"],
  ["sand-500", "ink-900", 4.5, "texto secundario sobre oscuro"],
  ["sand-500", "ink-800", 4.5, "leyenda de galería"],
  ["sand-600", "ink-950", 4.5, "texto atenuado sobre oscuro"],
  ["gold-300", "ink-950", 4.5, "enlace activo sobre oscuro"],
  ["ink-950", "gold-400", 4.5, "texto de botón dorado"],
  ["text-900", "surface", 4.5, "texto sobre superficie"],
  ["border-strong", "cream-50", 3.0, "borde de control (UI, 3:1)"],
];

const contrastResults = pairs.map(([fgName, bgName, min, label]) => {
  const fg = resolve(fgName);
  const bg = resolve(bgName);
  if (!fg || !bg) return { label, value: null, min, fgName, bgName };
  return { label, value: ratio(fg, bg), min, fgName, bgName };
});

const contrastFailures = contrastResults.filter((p) => p.value === null || p.value < p.min);
if (contrastFailures.length === 0) {
  const worst = contrastResults.reduce((a, b) => (a.value < b.value ? a : b));
  pass(`contraste AA en ${contrastResults.length} pares (mínimo ${worst.value.toFixed(2)}:1 — ${worst.label})`);
} else {
  for (const item of contrastFailures) {
    fail(
      `contraste insuficiente: ${item.label}`,
      item.value === null
        ? `token no resuelto (${item.fgName} / ${item.bgName})`
        : `${item.value.toFixed(2)}:1 (mínimo ${item.min}:1)`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 5. JavaScript
 * ------------------------------------------------------------------ */
const tempDir = mkdtempSync(join(tmpdir(), "aurora-check-"));
for (const file of jsFiles) {
  const target = join(tempDir, `${file.replace(/[\\/]/g, "-")}.mjs`);
  copyFileSync(join(root, file), target);
  const result = spawnSync(process.execPath, ["--check", target], { encoding: "utf8" });
  result.status === 0
    ? pass(`sintaxis correcta: ${file}`)
    : fail(`error de sintaxis: ${file}`, (result.stderr || "").split("\n").slice(0, 3).join(" "));
}
rmSync(tempDir, { recursive: true, force: true });

/* ------------------------------------------------------------------ *
 * Informe
 * ------------------------------------------------------------------ */
const failures = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(
  `\n${results.length - failures.length}/${results.length} comprobaciones superadas` +
    (failures.length ? ` · ${failures.length} con error` : " · todo correcto"),
);

process.exit(failures.length ? 1 : 0);
