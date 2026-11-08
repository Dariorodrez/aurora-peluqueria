/**
 * Navegación principal.
 * - Menú móvil accesible (aria-expanded, Escape, clic fuera, cambio de viewport).
 * - Marca el enlace activo de la sección visible.
 *
 * Script clásico (sin imports) para que también funcione en file://.
 */
(function () {
  "use strict";

  var DESKTOP_QUERY = "(min-width: 900px)";

  function initNavigation() {
    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("nav-principal");

    if (!header || !toggle || !nav) return;

    var LABEL_OPEN = "Abrir menú de navegación";
    var LABEL_CLOSE = "Cerrar menú de navegación";
    var desktop = window.matchMedia(DESKTOP_QUERY);

    function isOpen() {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    function open() {
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", LABEL_CLOSE);
      nav.classList.add("is-open");
    }

    function close(options) {
      if (!isOpen()) return;

      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", LABEL_OPEN);
      nav.classList.remove("is-open");

      if (options && options.returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) {
        close();
      } else {
        open();
      }
    });

    /* Al elegir un destino, el menú se cierra (el ancla lleva el foco al destino). */
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) {
        close({ returnFocus: true });
      }
    });

    document.addEventListener("click", function (event) {
      if (!isOpen()) return;
      if (header.contains(event.target)) return;
      close();
    });

    /* Si la ventana pasa a escritorio, el panel móvil deja de tener sentido. */
    desktop.addEventListener("change", function (event) {
      if (event.matches) close();
    });
  }

  /**
   * Scrollspy: marca con aria-current el enlace de la sección en pantalla.
   */
  function initActiveSection() {
    if (!("IntersectionObserver" in window)) return;

    var links = Array.prototype.slice.call(
      document.querySelectorAll('.nav__link[href^="#"]'),
    );
    if (!links.length) return;

    var sections = links
      .map(function (link) {
        return document.getElementById(link.getAttribute("href").slice(1));
      })
      .filter(Boolean);

    if (!sections.length) return;

    function setCurrent(id) {
      links.forEach(function (link) {
        if (link.getAttribute("href") === "#" + id) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (entry) {
            return entry.isIntersecting;
          })
          .sort(function (a, b) {
            return b.intersectionRatio - a.intersectionRatio;
          });

        if (visible.length > 0) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  window.Aurora = window.Aurora || {};
  window.Aurora.initNavigation = initNavigation;
  window.Aurora.initActiveSection = initActiveSection;
})();
