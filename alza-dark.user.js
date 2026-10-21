// ==UserScript==
// @name         Alza Dark Mode
// @description  Dark mode for Alza, follows the system appearance
// @version      2.2
// @match        *://*.alza.cz/*
// @match        *://*.alza.sk/*
// @run-at       document-start
// @grant        none
// @icon         https://raw.githubusercontent.com/kasparek-net/alza-dark-mode/main/icon.png
// @homepageURL  https://github.com/kasparek-net/alza-dark-mode
// @updateURL    https://raw.githubusercontent.com/kasparek-net/alza-dark-mode/main/alza-dark.user.js
// @downloadURL  https://raw.githubusercontent.com/kasparek-net/alza-dark-mode/main/alza-dark.user.js
// ==/UserScript==

(function () {
  const dark = matchMedia("(prefers-color-scheme: dark)");
  dark.addEventListener("change", () => location.reload());
  if (!dark.matches) return;

  const BG = "#181a1b";
  const TEXT = "#e3e3e3";
  const MARK = "data-dm";
  const PSEUDO = "data-dmp";

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

  // Pseudo-elements can't take inline styles, so their colors go into rules keyed by an attribute.
  const pseudoStyle = document.createElement("style");
  (document.head || document.documentElement).appendChild(pseudoStyle);
  const pseudoRules = new Map();
  let pseudoId = 0;
  let pseudoDirty = false;

  function parse(c) {
    const m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] === undefined ? 1 : +m[4]] : null;
  }

  function parseHex(c) {
    let h = c.slice(1);
    if (h.length <= 4) h = [...h].map((x) => x + x).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
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

  function luminance([r, g, b]) {
    const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  // What the element sits on once converted: "light" (a background that stays bright, like the green
  // buy button), "dark" (dark in the original design) or "converted" (light background made dark).
  let contextCache = new Map();
  function context(el) {
    const path = [];
    let result = "converted";
    for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      if (contextCache.has(e)) {
        result = contextCache.get(e);
        break;
      }
      path.push(e);
      const c = getComputedStyle(e).backgroundColor;
      const p = parse(c);
      if (!p || p[3] < 0.5) continue;
      result = darkBg(c) || (e.getAttribute(MARK) || "").includes("background-color") ? "converted"
        : luminance(p) > 0.4 ? "light" : "dark";
      break;
    }
    for (const e of path) contextCache.set(e, result);
    return result;
  }

  // Light backgrounds become dark, keeping their hue.
  function darkBg(c) {
    const p = parse(c);
    if (!p || p[3] === 0) return null;
    const [h, s, l] = toHsl(p);
    if (l < 0.5) return null;
    return css([h, Math.min(s, 0.5), 0.1 + (1 - l) * 0.3], p[3]);
  }

  // Dark text becomes light, keeping its hue, unless it sits on a background that stays bright.
  function lightText(c, el) {
    const p = parse(c);
    if (!p || p[3] === 0) return null;
    const [h, s, l] = toHsl(p);
    if (l >= 0.5 || context(el) === "light") return null;
    return css([h, s, s > 0.3 ? 0.72 + l * 0.2 : 0.9 - l * 0.35], p[3]);
  }

  // Icon fonts: vivid colors like the red heart already stand out on dark, only dull ones get lighter.
  function lightIcon(c, el) {
    const p = parse(c);
    if (!p) return null;
    const [, s, l] = toHsl(p);
    return s > 0.5 && l > 0.3 ? null : lightText(c, el);
  }

  // Light borders get darker; dark ones drawn on a light background (like checkbox outlines) get lighter.
  function darkBorder(c, el) {
    const p = parse(c);
    if (!p || p[3] === 0) return null;
    const [h, s, l] = toHsl(p);
    if (l >= 0.5) return css([h, Math.min(s, 0.4), 0.18 + (1 - l) * 0.3], p[3]);
    if (context(el) !== "converted") return null;
    return css([h, s, 0.75 - l], p[3]);
  }

  // Decorative white fades, as gradients or as images.
  function darkImage(v) {
    if (/sectbgr\.png/.test(v)) return "none";
    if (!v.includes("gradient(")) return null;
    let changed = false;
    const out = v.replace(/rgba?\([^)]*\)/g, (c) => {
      const p = parse(c);
      const [h, s, l] = toHsl(p);
      if (l < 0.5) return c;
      changed = true;
      return css([h, Math.min(s, 0.5), 0.1 + (1 - l) * 0.3], p[3]);
    });
    return changed ? out : null;
  }

  const RULES = [
    ["background-color", darkBg],
    ["background-image", darkImage],
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
  const PSEUDO_RULES = [
    ["background-color", darkBg],
    ["background-image", darkImage],
    ["color", lightIcon],
  ];

  // Small SVG icons loaded as images can't be recolored, so dark ones get inverted.
  const svgIsDark = new Map();
  function darkSvg(text) {
    const named = { white: [1, 1, 1], black: [0, 0, 0] };
    const colors = [...text.matchAll(/(?:fill|stroke|stop-color)\s*[:=]\s*"?\s*(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|white|black)/gi)]
      .map(([, c]) => named[c.toLowerCase()] || (c[0] === "#" ? parseHex(c) : parse(c)))
      .filter(Boolean)
      .map((p) => toHsl(p)[2]);
    // No color means the default black fill. Light parts mean a badge with its own background, left as is.
    return colors.every((l) => l < 0.45);
  }
  function checkIcon(img) {
    const src = img.currentSrc || img.src;
    if (!/\.svg(\?|$)/i.test(src) || img.hasAttribute(MARK)) return;
    const width = img.getBoundingClientRect().width;
    if (!width || width > 48 || context(img) !== "converted") return;
    if (!svgIsDark.has(src))
      svgIsDark.set(src, fetch(src).then((r) => r.text()).then(darkSvg).catch(() => false));
    svgIsDark.get(src).then((dark) => {
      if (!dark || img.hasAttribute(MARK)) return;
      img.style.setProperty("filter", "invert(1) hue-rotate(180deg)", "important");
      img.setAttribute(MARK, "filter");
    });
  }

  function reset(el) {
    const id = el.getAttribute(PSEUDO);
    if (id) {
      pseudoRules.delete(id);
      pseudoDirty = true;
      el.removeAttribute(PSEUDO);
    }
    const props = el.getAttribute(MARK);
    if (!props) return;
    for (const p of props.split(" ")) el.style.removeProperty(p);
    el.removeAttribute(MARK);
  }

  const SKIP = new Set(["IMG", "VIDEO", "PICTURE", "SCRIPT", "STYLE", "LINK", "META", "BR"]);

  // Returns only the properties not converted yet, so walking the same element twice is cheap.
  function compute(el) {
    if (el.tagName === "IMG") checkIcon(el);
    if (SKIP.has(el.tagName)) return null;
    const done = (el.getAttribute(MARK) || "").split(" ");
    const cs = getComputedStyle(el);
    const svg = el instanceof SVGElement;
    const out = [];
    for (const [prop, fn] of svg ? SVG_RULES : RULES) {
      if (done.includes(prop)) continue;
      if (prop.startsWith("border") && parseFloat(cs.getPropertyValue(prop.replace("color", "width"))) === 0) continue;
      const v = fn(cs.getPropertyValue(prop), el);
      if (v) out.push([prop, v]);
    }
    let pseudo = "";
    if (!svg && !el.hasAttribute(PSEUDO)) {
      for (const which of ["::before", "::after"]) {
        const ps = getComputedStyle(el, which);
        if (ps.content === "none" || ps.content === "normal") continue;
        const decls = [];
        for (const [prop, fn] of PSEUDO_RULES) {
          const v = fn(ps.getPropertyValue(prop), el);
          if (v) decls.push(`${prop}: ${v} !important`);
        }
        if (decls.length) pseudo += `${which} { ${decls.join("; ")} }`;
      }
    }
    return out.length || pseudo ? { out, pseudo } : null;
  }

  // Read every style first, then write, so the browser recalculates layout only once.
  function walk(root) {
    if (root.nodeType !== 1) return;
    const els = [root, ...root.querySelectorAll("*")];
    contextCache = new Map();
    const changes = els.map(compute);
    els.forEach((el, i) => {
      if (!changes[i]) return;
      const { out, pseudo } = changes[i];
      if (out.length) {
        for (const [prop, v] of out) el.style.setProperty(prop, v, "important");
        const done = el.getAttribute(MARK);
        el.setAttribute(MARK, (done ? done + " " : "") + out.map(([p]) => p).join(" "));
      }
      if (pseudo) {
        const id = String(++pseudoId);
        el.setAttribute(PSEUDO, id);
        pseudoRules.set(id, pseudo.replace(/::(before|after) \{/g, `[${PSEUDO}="${id}"]::$1 {`));
        pseudoDirty = true;
      }
    });
    if (pseudoDirty) {
      pseudoStyle.textContent = [...pseudoRules.values()].join("\n");
      pseudoDirty = false;
    }
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
          for (const el of t.querySelectorAll(`[${MARK}], [${PSEUDO}]`)) reset(el);
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
