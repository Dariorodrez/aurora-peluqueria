/**
 * Revelado suave de bloques al entrar en el viewport.
 * Sin JS o con `prefers-reduced-motion` todo el contenido es visible desde el inicio.
 *
 * Script clásico (sin imports) para que también funcione en file://.
 */
(function () {
  "use strict";

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (items.length === 0) return;

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, instance) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          instance.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  window.Aurora = window.Aurora || {};
  window.Aurora.initReveal = initReveal;
})();
