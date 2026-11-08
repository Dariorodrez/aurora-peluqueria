const { test, expect } = require("@playwright/test");

/** Navegación principal (excluye el pie de página). */
const mainNav = (page) =>
  page.getByRole("navigation", { name: "Navegación principal" });

/** En móvil el menú está colapsado: lo abrimos solo si hace falta. */
async function ensureNavOpen(page) {
  const toggle = page.locator(".nav-toggle");
  if (!(await toggle.isVisible())) return;
  if ((await toggle.getAttribute("aria-expanded")) === "true") return;

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

test.describe("Carga y semántica", () => {
  test("carga sin errores de consola y muestra la portada", async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");

    await expect(page).toHaveTitle(/Aurora · Peluquería/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("El detalle que");
    await expect(page.locator("main#contenido")).toBeVisible();

    expect(consoleErrors, "errores de consola").toEqual([]);
    expect(pageErrors, "excepciones no capturadas").toEqual([]);
  });

  test("la jerarquía de encabezados no tiene saltos", async ({ page }) => {
    await page.goto("/");

    const levels = await page.$$eval("h1, h2, h3, h4", (nodes) =>
      nodes.map((node) => Number(node.tagName.slice(1))),
    );

    expect(levels[0]).toBe(1);
    expect(levels.filter((level) => level === 1)).toHaveLength(1);

    for (let i = 1; i < levels.length; i += 1) {
      expect(
        levels[i] - levels[i - 1],
        `salto de h${levels[i - 1]} a h${levels[i]}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  test("el enlace de salto es el primer foco y lleva al contenido", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.locator(".skip-link");

    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenido$/);
  });
});

test.describe("Navegación y contenido", () => {
  test("cada enlace del menú lleva a su sección", async ({ page }) => {
    await page.goto("/");
    await ensureNavOpen(page);

    // Cinco secciones; el CTA «Pedir cita» es un enlace aparte.
    await expect(mainNav(page).locator(".nav__link")).toHaveCount(5);
    await expect(mainNav(page).getByRole("link", { name: "Pedir cita" })).toBeVisible();

    const targets = [
      ["Servicios", "servicios"],
      ["Galería", "galeria"],
      ["Horario", "horario"],
      ["Contacto", "contacto"],
      ["Inicio", "inicio"],
    ];

    for (const [name, id] of targets) {
      await ensureNavOpen(page);
      await mainNav(page).getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test("muestra los seis servicios con sus precios", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#servicios .card")).toHaveCount(6);

    const services = page.locator("#servicios");
    for (const price of ["32 €", "68 €", "95 €", "38 €", "28 €", "55 €"]) {
      await expect(services).toContainText(price);
    }
  });

  test("la galería y el horario están completos", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#galeria .gallery__item")).toHaveCount(8);
    await expect(page.locator("#horario table")).toBeVisible();
    await expect(page.locator("#horario table")).toContainText("Lunes a viernes");
    await expect(page.locator("#horario table")).toContainText("10:00 – 20:00");
    await expect(page.locator("#contacto")).toContainText("hola@aurorapeluqueria.es");
  });
});

test.describe("Menú móvil", () => {
  test.skip(({ isMobile }) => !isMobile, "solo aplica al proyecto móvil");

  test("abre y cierra con el teclado y devuelve el foco", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator(".nav-toggle");
    const nav = page.locator("#nav-principal");

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(nav).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAttribute("aria-label", "Cerrar menú de navegación");
    await expect(nav).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(nav).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("se cierra al elegir un destino", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator(".nav-toggle");
    await toggle.click();
    await mainNav(page).getByRole("link", { name: "Servicios", exact: true }).click();

    await expect(page).toHaveURL(/#servicios$/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#nav-principal")).toBeHidden();
  });
});

test.describe("Responsive y rendimiento percibido", () => {
  test("no hay desbordamiento horizontal en 320, 768 y 1440 px", async ({ page }) => {
    await page.goto("/");

    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));

      expect(scrollWidth, `desbordamiento a ${width} px`).toBeLessThanOrEqual(innerWidth + 1);
    }
  });

  test("las imágenes cargan, declaran dimensiones y tienen alt", async ({ page }) => {
    await page.goto("/");

    // Lleva cada imagen al viewport para disparar su carga diferida.
    const images = page.locator("img");
    const total = await images.count();
    expect(total).toBe(9);

    for (let i = 0; i < total; i += 1) {
      const image = images.nth(i);
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute("alt", /.+/);
      await expect(image).toHaveAttribute("width", /\d+/);
      await expect(image).toHaveAttribute("height", /\d+/);
      await expect
        .poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0), {
          message: `la imagen ${i} no carga`,
        })
        .toBe(true);
    }
  });

  test("los controles principales alcanzan 44 px de alto", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 768, height: 900 });
    await page.waitForTimeout(150);

    const small = await page.$$eval(
      ".btn, .nav-toggle, .nav__link",
      (elements) =>
        elements
          .filter((el) => {
            const box = el.getBoundingClientRect();
            return box.height > 0 && box.height < 44;
          })
          .map((el) => `${el.textContent.trim().slice(0, 24)} → ${Math.round(el.getBoundingClientRect().height)} px`),
    );

    expect(small).toEqual([]);
  });
});

test.describe("Movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("todo el contenido es visible sin animaciones", async ({ page }) => {
    await page.goto("/");

    const hidden = await page.$$eval(".reveal", (elements) =>
      elements.filter((el) => Number(getComputedStyle(el).opacity) === 0).length,
    );

    expect(hidden).toBe(0);
  });
});
