import fs from 'node:fs';
import path from 'node:path';

// =====================================================================
// BOOT HEADLESS
//
// Importa js/main.js (e, com ele, todo o grafo do jogo) com um DOM falso.
// Serve para pegar o que o teste de estrutura não vê: export faltando depois
// de uma refatoração, import circular quebrado, erro de sintaxe em módulo
// carregado sob demanda.
//
// Falhas de stub (canvas, áudio, layout) são ignoradas de propósito — o alvo
// aqui é o grafo de módulos, não a renderização.
// =====================================================================

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const mainPath = path.join(root, 'js/main.js');
if (!fs.existsSync(mainPath)) throw new Error('js/main.js sumiu');

const noop = () => {};
const ctxProxy = new Proxy({}, {
  get: (_, key) => {
    if (key === 'canvas') return { width: 1280, height: 720 };
    if (key === 'measureText') return () => ({ width: 10 });
    if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop: noop });
    if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return noop;
  },
  set: () => true,
});

function makeElement(tag = 'div') {
  const element = {
    tagName: String(tag).toUpperCase(),
    style: {}, dataset: {}, children: [],
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    width: 1280, height: 720, textContent: '', innerHTML: '', outerHTML: '',
    addEventListener: noop, removeEventListener: noop, appendChild: noop, append: noop, remove: noop,
    setAttribute: noop, removeAttribute: noop, getAttribute: () => null,
    focus: noop, blur: noop, click: noop,
    getContext: () => ctxProxy,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => false,
    insertBefore: noop, replaceChildren: noop,
    animate: () => ({ finished: Promise.resolve(), cancel: noop }),
    requestFullscreen: () => Promise.resolve(),
  };
  element.parentElement = null;
  return element;
}

globalThis.document = {
  createElement: makeElement, createElementNS: makeElement,
  body: makeElement('body'), documentElement: makeElement('html'),
  getElementById: () => makeElement(), querySelector: () => makeElement(), querySelectorAll: () => [],
  addEventListener: noop, removeEventListener: noop,
  fullscreenElement: null, exitFullscreen: () => Promise.resolve(),
  fonts: { ready: Promise.resolve() },
};
globalThis.window = globalThis;
globalThis.innerWidth = 1280;
globalThis.innerHeight = 720;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = noop;
globalThis.removeEventListener = noop;
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
globalThis.Image = class { constructor() { this.src = ''; this.onload = null; } };
globalThis.Audio = class { play() { return Promise.resolve(); } pause() {} };
globalThis.localStorage = {
  data: {},
  getItem(key) { return this.data[key] ?? null; },
  setItem(key, value) { this.data[key] = String(value); },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; },
};
globalThis.location = { href: 'http://localhost/', search: '', hash: '' };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true });

let failure = null;
const loading = import(mainPath).catch(error => { failure = error; });

// main.js termina com awaits de carregamento; 2 s bastam para o grafo montar.
await Promise.race([loading, new Promise(resolve => setTimeout(resolve, 2000))]);

const moduleLevel = failure && (
  failure instanceof SyntaxError ||
  /does not provide an export|Cannot find module|Failed to resolve|not defined as an export/i.test(failure.message)
);

if (moduleLevel) {
  console.error(`BOOT: grafo de módulos quebrado → ${failure.constructor.name}: ${failure.message}`);
  process.exit(1);
}
if (failure) {
  console.log(`Boot headless: grafo de módulos OK (o stub parou em ${failure.constructor.name}, esperado sem navegador).`);
} else {
  console.log('Boot headless: js/main.js e todo o grafo de imports carregaram sem erro de módulo.');
}
process.exit(0);
