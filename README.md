# Aurora · Peluquería y estilismo

Sitio web de una peluquería ficticia en Madrid. HTML5, CSS3 y JavaScript vanilla:
sin frameworks, sin build, sin dependencias de producción.

**Contenido de demostración.** Nombre, dirección, teléfono, email, precios e imágenes
son ficticios o ilustrativos.

---

## Cómo abrirlo

Doble clic en `index.html` funciona (los scripts son clásicos y las rutas relativas).
Si prefieres servirlo por HTTP (recomendado para las pruebas):

```bash
npm run serve          # servidor propio, sin dependencias → http://127.0.0.1:4173
```

También vale cualquier servidor estático:

```bash
python -m http.server 8000
# o
php -S localhost:8000
```

Y abre <http://localhost:8000>.

---

## Estructura

```
aurora-peluqueria/
├── index.html              Documento único: cabecera, hero, servicios, galería,
│                           horario, contacto, pie + JSON-LD LocalBusiness
├── css/
│   ├── base.css            Tokens (color, tipografía, espaciado), reset, utilidades
│   ├── layout.css          Cabecera fija, secciones, rejillas, pie
│   └── components.css      Marca, navegación, botones, tarjetas, galería, tabla
├── js/
│   ├── main.js             Inicialización y año del pie
│   ├── navigation.js       Menú móvil accesible + enlace activo (scrollspy)
│   └── reveal.js           Aparición suave al hacer scroll
├── assets/
│   ├── img/                Imágenes en WebP (3 tamaños por imagen) + OG en JPEG
│   └── icons/favicon.svg   Icono con el monograma
├── tools/
│   ├── check.mjs           Auditoría automática sin dependencias (solo desarrollo)
│   └── serve.mjs           Servidor estático usado por `npm run serve` y Playwright
├── tests/
│   └── site.spec.js        Suite E2E (escritorio + móvil)
├── playwright.config.js    Proyectos desktop/mobile y webServer
├── package.json            Scripts de desarrollo y dependencias de test
└── README.md
```

Los tres archivos de JavaScript se cargan con `defer` y comparten el espacio de nombres
`window.Aurora`. Se evitó `type="module"` a propósito: los módulos ES fallan por CORS
cuando el HTML se abre desde `file://`.

---

## Editar contenido

| Qué | Dónde |
|---|---|
| Textos, servicios y precios | `index.html`, secciones `#servicios` |
| Horarios | `index.html`, tabla de `#horario` **y** JSON-LD del `<head>` |
| Dirección, teléfono, email | `index.html` (`<address>`, enlaces `tel:`/`mailto:`) y JSON-LD |
| Colores y tipografía | `css/base.css`, bloque `:root` |
| Tamaños fluidos | `css/base.css`, variables `--step-*` (`clamp()`) |
| Espaciado y ancho de página | `--space-*`, `--wrap`, `--gutter` |

Los colores se usan **solo** a través de tokens semánticos (`--color-fg`, `--local-accent`…),
así que cambiar la paleta es editar una decena de valores.

El teléfono aparece en cinco sitios (`tel:` en cabecera, hero, contacto, pie y JSON-LD):
búscalo con `910 00 00 00` / `+34910000000` antes de publicar.

---

## Imágenes

Las fotos son de **Unsplash** (licencia Unsplash: uso libre, sin atribución obligatoria).
Se descargaron y optimizaron en local —el sitio no hace peticiones a Unsplash— en WebP
con tres anchos por imagen y `srcset`/`sizes` ya configurados.

Para sustituirlas por fotos reales, respeta los nombres y proporciones:

| Archivo | Proporción | Tamaños |
|---|---|---|
| `hero-aurora-{640,960,1400}.webp` | 4:5 | 640×800, 960×1200, 1400×1750 |
| `galeria-01..05,08-{480,800,1200}.webp` | 3:2 | 480×320, 800×533, 1200×800 |
| `galeria-02-{480,800,1000}.webp` | 2:3 | 480×720, 800×1200, 1000×1500 |
| `galeria-06-{480,800,1100}.webp` | 1:1 | 480×480, 800×800, 1100×1100 |
| `galeria-07-{480,800,1200}.webp` | 4:5 | 480×600, 800×1000, 1200×1500 |
| `og-aurora.jpg` | 1.91:1 | 1200×630 |

Si cambias las proporciones, actualiza también los atributos `width`/`height` del `<img>`
(evitan saltos de layout) y el `alt`.

---

## Accesibilidad (WCAG 2.2 AA)

- Enlace «Saltar al contenido» como primer elemento enfocable.
- Un solo `<h1>` y jerarquía de encabezados sin saltos.
- Landmarks: `header`, `nav` (con `aria-label`), `main`, `section` con `aria-labelledby`,
  `aside`, `footer`. Sin `div` interactivos.
- Menú móvil con `<button aria-expanded aria-controls>`; cierra con `Escape`, al elegir
  destino, al hacer clic fuera y al pasar a escritorio; devuelve el foco al botón.
- Foco visible propio (contorno `currentColor` + halo dorado) sobre fondos claros y oscuros.
- Contraste comprobado en 13 pares: **texto mínimo 4.79:1** (el par más ajustado,
  `--gold-700` sobre crema) y **borde de control 3.54:1** (mínimo exigido 3:1).
- Objetivos táctiles ≥ 44×44 px y zoom no bloqueado.
- Imágenes con `alt` descriptivo; iconos decorativos con `aria-hidden`.
- Animaciones desactivadas con `prefers-reduced-motion: reduce`; sin movimiento automático.
- Tabla de horarios con `<caption>`, `scope="col"` y `scope="row"`.
- Enlace externo con `rel="noopener noreferrer"` y aviso «se abre en una pestaña nueva».

---

## Rendimiento

- Sin dependencias en producción; 3 hojas de estilo y 3 scripts pequeños.
- Peso inicial ≈ **180 KB** (HTML + CSS + JS + hero a 960 px + fuentes), imágenes de galería
  con `loading="lazy"`.
- Imagen LCP con `fetchpriority="high"`, precarga y `decoding="async"`.
- `width`/`height` en todas las imágenes para CLS 0.
- `srcset`/`sizes` con tres anchos: en móvil se descarga la variante de 480 px.
- Única petición externa: Google Fonts (Cormorant Garamond + Inter, `display=swap`).
  Para eliminarla, descarga los `.woff2` en `assets/fonts/` y sustituye el `<link>` por
  `@font-face` con `font-display: swap`.

---

## Verificación

### Auditoría estática (sin dependencias)

```bash
npm run check          # equivale a: node tools/check.mjs
```

34 comprobaciones sin dependencias: archivos y recursos referenciados, `lang`, viewport,
encabezados, ids duplicados, anclas internas, referencias ARIA, `alt`/dimensiones/lazy,
`rel` en enlaces externos, `@import`, `prefers-reduced-motion`, breakpoints, hex válidos,
contraste WCAG de los tokens y sintaxis de los tres scripts.

Estado actual: **34/34**.

`tools/check.mjs` es solo para desarrollo: puedes borrar la carpeta `tools/` sin afectar
al sitio (junto con `tests/` y la configuración de Playwright).

### Tests de navegador (Playwright)

Instalado con `npm init playwright@latest` usando solo **Chromium**. Requiere Node 18+.

```bash
npm install                       # al clonar el proyecto (node_modules no se versiona)
npx playwright install chromium   # solo la primera vez, si falta el navegador
npm test                          # suite completa (escritorio + móvil)
npm run test:ui                   # modo UI interactivo
npm run test:report               # abre el último informe HTML
```

`playwright.config.js` levanta el sitio con `tools/serve.mjs` (servidor Node sin
dependencias) en `http://127.0.0.1:4173` mediante `webServer`, así que no hay que
arrancar nada a mano. Si ya tienes el servidor activo (`npm run serve`), reutiliza esa
instancia.

Proyectos configurados: **desktop** (1440×900) y **mobile** (Pixel 5). Resultado actual:

```
22 passed, 2 skipped
```

Los dos omitidos son las pruebas de menú móvil, que solo aplican al proyecto `mobile`
(`test.skip` por `isMobile`).

Qué cubre `tests/site.spec.js`:

| Grupo | Comprobaciones |
|---|---|
| Carga y semántica | título, un solo `h1`, jerarquía sin saltos, consola sin errores ni excepciones |
| Accesibilidad de teclado | el skip link es el primer foco y lleva a `#contenido` |
| Navegación | 5 enlaces + CTA, cada uno lleva a su sección y la deja en el viewport |
| Contenido | 6 servicios con sus 6 precios, 8 fotos de galería, tabla de horario, email |
| Menú móvil | `aria-expanded`/`aria-label`, cierre con `Escape` y retorno de foco, cierre al elegir destino |
| Responsive | sin desbordamiento horizontal a 320, 768 y 1440 px |
| Imágenes | 9 imágenes cargan, con `alt`, `width` y `height` |
| Objetivos táctiles | todos los `.btn`, `.nav-toggle` y `.nav__link` ≥ 44 px |
| Movimiento reducido | con `prefers-reduced-motion: reduce` nada queda oculto |

Solo Chromium está instalado (ahorra ~300 MB). Para añadir Firefox y WebKit:

```bash
npx playwright install firefox webkit
```

y agrega sus proyectos en `playwright.config.js` con `devices["Desktop Firefox"]` y
`devices["Desktop Safari"]`.

Artefactos: `playwright-report/` (informe HTML) y `test-results/` (traces de fallos)
están en `.gitignore`.

---

## Compatibilidad

Chrome/Edge 111+, Firefox 113+, Safari 16.4+ (`color-mix()`, `text-wrap: balance`,
`clamp()`, `aspect-ratio`). Sin JavaScript la página sigue siendo legible y navegable:
la navegación se muestra completa y todo el contenido visible.
