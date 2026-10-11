// ==UserScript==
// @name         Alza Dark Mode
// @description  Dark mode for Alza, follows the system appearance
// @version      1.0
// @match        *://*.alza.cz/*
// @match        *://*.alza.sk/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  const css = `
    @media (prefers-color-scheme: dark) {
      html {
        background: #fff !important;
        filter: invert(0.9) hue-rotate(180deg) !important;
      }
      img, video, picture, canvas, iframe,
      [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }
      picture img {
        filter: none !important;
      }
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
})();
