// ==UserScript==
// @name         Alza Dark Mode
// @description  Dark mode for Alza, follows the system appearance
// @version      2.0
// @match        *://*.alza.cz/*
// @match        *://*.alza.sk/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  const dark = matchMedia("(prefers-color-scheme: dark)");
  dark.addEventListener("change", () => location.reload());
  if (!dark.matches) return;

  const BG = "#181a1b";
  const TEXT = "#e3e3e3";
  const MARK = "data-dm";

  const style = document.createElement("style");
  style.textContent = `
    html { color-scheme: dark; background: ${BG} !important; }
    body { background: ${BG} !important; color: ${TEXT}; }
    ::placeholder { color: #8a8f94 !important; }
    img[src*="eshop-logos"], img[src*="private-labels/img/logo-"], img[src*="promoSection/"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  function parse(c) {
    const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] === undefined ? 1 : +m[4]] : null;
  }

  function toHsl([r, g, b]) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }

  function css([h, s, l], a) {
    return `hsla(${h.toFixed(0)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(0)}%, ${a})`;
  }

  // Light backgrounds become dark, keeping their hue.
  function darkBg(c) {
    const p = parse(c);
    if (!p || p[3] === 0) return null;
    const [h, s, l] = toHsl(p);
    if (l < 0.5) return null;
    return css([h, Math.min(s, 0.5), 0.1 + (1 - l) * 0.3], p[3]);
  }

  // Dark text becomes light, keeping its hue.
  function lightText(c) {
    const p = parse(c);
    if (!p || p[3] === 0) return null;
    const [h, s, l] = toHsl(p);
    if (l >= 0.5) return null;
    return css([h, s, s > 0.3 ? 0.72 + l * 0.2 : 0.9 - l * 0.35], p[3]);
  }

  function darkBorder(c) {
    const p = parse(c);
    if (!p || p[3] === 0) return null;
    const [h, s, l] = toHsl(p);
    if (l < 0.5) return null;
    return css([h, Math.min(s, 0.4), 0.18 + (1 - l) * 0.3], p[3]);
  }

  const RULES = [
    ["background-color", darkBg],
    ["color", lightText],
    ["border-top-color", darkBorder],
    ["border-right-color", darkBorder],
    ["border-bottom-color", darkBorder],
    ["border-left-color", darkBorder],
  ];
  const SVG_RULES = [
    ["fill", lightText],
    ["stroke", lightText],
  ];

  function reset(el) {
    const props = el.getAttribute(MARK);
    if (!props) return;
    for (const p of props.split(" ")) el.style.removeProperty(p);
    el.removeAttribute(MARK);
  }

  const SKIP = new Set(["IMG", "VIDEO", "PICTURE", "SCRIPT", "STYLE", "LINK", "META", "BR"]);

  // Returns only the properties not converted yet, so walking the same element twice is cheap.
  function compute(el) {
    if (SKIP.has(el.tagName)) return null;
    const done = (el.getAttribute(MARK) || "").split(" ");
    const cs = getComputedStyle(el);
    const rules = el instanceof SVGElement ? SVG_RULES : RULES;
    const out = [];
    for (const [prop, fn] of rules) {
      if (done.includes(prop)) continue;
      if (prop.startsWith("border") && parseFloat(cs.getPropertyValue(prop.replace("color", "width"))) === 0) continue;
      const v = fn(cs.getPropertyValue(prop));
      if (v) out.push([prop, v]);
    }
    return out.length ? out : null;
  }

  // Read every style first, then write, so the browser recalculates layout only once.
  function walk(root) {
    if (root.nodeType !== 1) return;
    const els = [root, ...root.querySelectorAll("*")];
    const changes = els.map(compute);
    els.forEach((el, i) => {
      if (!changes[i]) return;
      for (const [prop, v] of changes[i]) el.style.setProperty(prop, v, "important");
      const done = el.getAttribute(MARK);
      el.setAttribute(MARK, (done ? done + " " : "") + changes[i].map(([p]) => p).join(" "));
    });
  }

  let queue = new Set();
  let scheduled = false;
  function schedule(el) {
    queue.add(el);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      const items = queue;
      queue = new Set();
      scheduled = false;
      observer.disconnect();
      for (const el of items) if (el.isConnected) walk(el);
      observe();
    });
  }

  // Styles injected later (CSS-in-JS, lazy stylesheets) change elements without any DOM mutation,
  // so the whole page gets one more pass shortly after things settle.
  let recheckTimer, recheckSince = 0;
  function recheck() {
    const now = Date.now();
    if (!recheckSince) recheckSince = now;
    clearTimeout(recheckTimer);
    recheckTimer = setTimeout(() => {
      recheckSince = 0;
      schedule(document.body);
    }, now - recheckSince > 3000 ? 0 : 400);
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const n of m.addedNodes) if (n.nodeType === 1) schedule(n);
      } else if (m.attributeName === "class") {
        const t = m.target;
        reset(t);
        if (t !== document.body && t !== document.documentElement)
          for (const el of t.querySelectorAll(`[${MARK}]`)) reset(el);
        schedule(t);
      }
    }
    recheck();
  });
  function observe() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  document.addEventListener("transitionend", (e) => {
    if (e.target.nodeType === 1 && /color|^all$/.test(e.propertyName)) schedule(e.target);
  }, true);
  addEventListener("scroll", recheck, { passive: true });
  addEventListener("load", recheck);

  function start() {
    walk(document.body);
    observe();
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
