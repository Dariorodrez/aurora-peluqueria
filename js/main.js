/**
 * Punto de entrada. Script clásico con `defer`: se ejecuta con el DOM listo
 * y funciona también al abrir index.html directamente (file://).
 */
(function () {
  "use strict";

  var Aurora = window.Aurora || {};

  function setCurrentYear() {
    var node = document.querySelector("[data-year]");
    if (node) node.textContent = String(new Date().getFullYear());
  }

  setCurrentYear();

  if (Aurora.initNavigation) Aurora.initNavigation();
  if (Aurora.initActiveSection) Aurora.initActiveSection();
  if (Aurora.initReveal) Aurora.initReveal();
})();
