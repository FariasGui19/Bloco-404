import { canStand, cell, sites } from "./mare-mission-model.js";

// Lote 13 — leitura de espaço, objetivo e resposta ao E.
//
// Nada de mecânica nova: o que este módulo entrega é *orientação*. Um caminho
// de tábuas liga o píer às cabanas e ao terminal, postes com cabo marcam o
// percurso, setas apontam as entradas, e o objetivo ativo vira um marcador no
// mundo com um chip discreto na HUD. A curadoria de decoração existe para que a
// praia pare de parecer um depósito: só fica o que está perto do caminho.
//
// Tudo aqui é dado puro e determinístico — sem DOM, sem três —, então dá para
// testar em Node sem navegador.

// Caminhos andáveis conferidos contra `cell()` na grade 32×32. A aresta y=27
// tem dois muros, então a praia chega ao norte pelo corredor da cabana 2 (x≈9)
// e pela borda leste (x≈24-27).
export const LOTE13_PATHS = Object.freeze({
  // Praia oeste: píer até a porta da cabana 2.
  praia: [
    [16, 29],
    [11.4, 29.2],
    [9.2, 28.4],
    [9.4, 27.2],
    [9.4, 26.2],
  ],
  // Volta principal: píer, âncora, borda leste, travessia norte, porta da
  // cabana 1. É o caminho que recebe tábuas, postes e cabo.
  volta: [
    [16, 29],
    [20, 29.6],
    [23.2, 29.1],
    [24.6, 27.2],
    [24.5, 24.5],
    [25.4, 23.4],
    [26.5, 21],
    [26.6, 17.4],
    // Desvio do casulo e da válvula: a borda leste é estreita.
    [25.4, 15.7],
    [25.9, 14.4],
    [25.6, 13.2],
    [24.8, 12.6],
    // Travessia norte: 0,35 m abaixo da parede, longe da lente no muro.
    [21.6, 11.45],
    [18.8, 11.45],
    [16, 11.45],
    [13, 11.45],
    [10.6, 11.45],
    [9.6, 11.5],
    // Porta da cabana 1: única fresta daquele muro.
    [8.6, 11.3],
    [8.6, 9.8],
  ],
  // Ramo do terminal central.
  terminal: [
    [16, 11.45],
    [16, 13],
    [16, 16],
  ],
  // Ramo da memória do sal, a leste.
  sal: [
    [21.6, 11.45],
    [22.4, 10.2],
    [22.6, 9.0],
  ],
});

export const LOTE13_FRAMES = Object.freeze({
  "marcador-objetivo": 4,
  "farol-pulso": 6,
  "interacao-onda": 6,
  "terminal-estados": 4,
});

export const lote13Names = Object.freeze([
  "poste-sinalizador",
  "seta-chao",
  "placa-missao",
  ...Object.entries(LOTE13_FRAMES).flatMap(([base, count]) =>
    Array.from({ length: count }, (_, index) => `${base}-${index}`),
  ),
]);

const paths = Object.values(LOTE13_PATHS);

const segmentDistance = (x, y, [x0, y0], [x1, y1]) => {
  const dx = x1 - x0,
    dy = y1 - y0;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / length));
  return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t));
};

// Distância até o caminho mais próximo: é o critério da curadoria.
export function corridorDistance(x, y) {
  let best = Infinity;
  for (const path of paths)
    for (let i = 1; i < path.length; i++)
      best = Math.min(best, segmentDistance(x, y, path[i - 1], path[i]));
  return best;
}

// Só fica decoração encostada no caminho e sem empilhar em cima de outra. As
// peças marcadas como `pin` (o farolim, por exemplo) nunca saem: são estado de
// missão, não enfeite.
export function curateDecor(list, { keep = 3.4, spacing = 1.5 } = {}) {
  const kept = [];
  for (const prop of list) {
    // Pino, farolim e placa são referência de leitura: nunca saem.
    const pinned =
      prop.pin || prop.kind === "pin" || prop.kind === "farolim" || prop.art === "farolim";
    if (pinned) {
      kept.push(prop);
      continue;
    }
    if (corridorDistance(prop.x, prop.y) > keep) continue;
    if (
      kept.some(
        (other) => Math.hypot(other.x - prop.x, other.y - prop.y) < spacing,
      )
    )
      continue;
    kept.push(prop);
  }
  return kept;
}

const samplePath = (path, step) => {
  const samples = [];
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1],
      [x1, y1] = path[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    const count = Math.max(1, Math.round(length / step));
    for (let k = 0; k < count; k++) {
      const t = k / count;
      samples.push({
        x: x0 + (x1 - x0) * t,
        y: y0 + (y1 - y0) * t,
        angle: Math.atan2(y1 - y0, x1 - x0),
      });
    }
  }
  const last = path[path.length - 1];
  samples.push({ x: last[0], y: last[1], angle: samples.at(-1)?.angle ?? 0 });
  return samples;
};

// Poste precisa de folga: `canStand` já exclui muro, água e prop interativo, e
// a margem evita que o mastro nasça colado no sino ou no gerador.
const postClear = (x, y, pad = 0.3) =>
  canStand(x, y) &&
  [
    [pad, 0],
    [-pad, 0],
    [0, pad],
    [0, -pad],
  ].every(([dx, dy]) => canStand(x + dx, y + dy));

// Guias do percurso: tábuas, postes, cabo entre postes e setas nas bifurcações.
export function pathGuides({ plankStep = 2.4, postStep = 8.2, offset = 1.95 } = {}) {
  const planks = [];
  for (const key of ["praia", "volta"]) {
    const path = LOTE13_PATHS[key];
    for (const sample of samplePath(path, plankStep)) {
      planks.push({ x: sample.x, y: sample.y, angle: sample.angle });
    }
  }
  const posts = [];
  const volta = samplePath(LOTE13_PATHS.volta, postStep);
  volta.forEach((sample, index) => {
    if (index === 0) return;
    for (const side of [offset, -offset, offset * 1.5, -offset * 1.5]) {
      const x = sample.x + Math.cos(sample.angle + Math.PI / 2) * side;
      const y = sample.y + Math.sin(sample.angle + Math.PI / 2) * side;
      if (cell(x, y) !== 0 || !postClear(x, y)) continue;
      const crowded = posts.some((post) => Math.hypot(post.x - x, post.y - y) < 5.4);
      if (crowded) break;
      posts.push({ x, y });
      break;
    }
  });
  const cables = [];
  for (let i = 1; i < posts.length; i++) {
    const a = posts[i - 1],
      b = posts[i];
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    if (span > 2 && span < 11) cables.push([i - 1, i]);
  }
  // Setas: só onde o jogador precisa escolher um lado.
  const arrows = [
    { x: 15.1, y: 29.2, angle: Math.PI },
    { x: 16.9, y: 29.2, angle: 0 },
    { x: 9.4, y: 27.9, angle: -Math.PI / 2 },
    { x: 16, y: 12.1, angle: -Math.PI / 2 },
    { x: 22.1, y: 10.6, angle: -Math.PI / 2 },
    { x: 24.7, y: 26.4, angle: -Math.PI / 2 },
  ].filter((arrow) => cell(arrow.x, arrow.y) === 0);
  const board = { x: 18.1, y: 28.2, angle: Math.PI * 0.82 };
  return { planks, posts, cables, arrows, board };
}

const byId = (id) => sites.find((site) => site.id === id);

const nearestSite = (m, list) =>
  list
    .map((site) => ({ site, distance: Math.hypot(site.x - m.x, site.y - m.y) }))
    .sort((a, b) => a.distance - b.distance)[0];

// Próximo passo imediato, na ordem real da missão. Devolve null quando nada
// resta — a HUD some com o chip em vez de repetir "concluído".
export function nextObjective(m, { fendaOpen = false, side = null } = {}) {
  if (!m || m.finished) return null;
  const data = Array.isArray(m.p?.data) ? m.p.data : [];
  const memoryIds = ["fita", "sal", "eco"];
  if (data.length < memoryIds.length) {
    const left = memoryIds.filter((id) => !data.includes(id)).map(byId).filter(Boolean);
    const near = nearestSite(m, left);
    return {
      kind: "mission",
      action: "RECUPERAR MEMÓRIA",
      label: near?.site.label ?? "memória",
      have: data.length,
      need: memoryIds.length,
      target: near ? { x: near.site.x, y: near.site.y } : null,
      distance: near ? Math.round(near.distance) : null,
      side,
    };
  }
  if (!fendaOpen) {
    const terminal = byId("terminal");
    const distance = Math.round(Math.hypot(terminal.x - m.x, terminal.y - m.y));
    return {
      kind: "mission",
      action: "RECOMPILAR NO TERMINAL",
      label: terminal.label,
      have: 0,
      need: 1,
      target: { x: terminal.x, y: terminal.y },
      distance,
      side,
    };
  }
  const anchor = byId("ancora");
  return {
    kind: "mission",
    action: "ALCANÇAR A ÂNCORA",
    label: anchor.label,
    have: 0,
    need: 1,
    target: { x: anchor.x, y: anchor.y },
    distance: Math.round(Math.hypot(anchor.x - m.x, anchor.y - m.y)),
    side,
  };
}

// Categorias do prompt. O mesmo verbo genérico em tudo era o que fazia a
// interação parecer "dura"; agora cada família tem etiqueta, glifo e cor.
export const PROMPT_CATEGORIES = Object.freeze({
  mission: { tag: "MISSÃO", glyph: "◆", tone: 520, wave: 0xffcf87 },
  lore: { tag: "REGISTRO", glyph: "✦", tone: 740, wave: 0x9fd8ff },
  collect: { tag: "COLETA", glyph: "▣", tone: 640, wave: 0x9dffc8 },
  inspect: { tag: "INSPEÇÃO", glyph: "◇", tone: 420, wave: 0xd8d2c4 },
});

const VERBS = Object.freeze({
  fita: ["mission", "RECUPERAR A FITA"],
  sal: ["mission", "RECUPERAR O RESÍDUO"],
  eco: ["mission", "RECUPERAR A MEMÓRIA"],
  terminal: ["mission", "RECOMPILAR"],
  ancora: ["mission", "ANCORAR O ECO"],
  diario: ["lore", "LER O DIÁRIO"],
  lente: ["lore", "EXAMINAR A LENTE"],
  mapa: ["lore", "LER O MAPA"],
  maca: ["lore", "EXAMINAR A MACA"],
  prontuario: ["lore", "LER O PRONTUÁRIO"],
  caixa: ["lore", "ABRIR A CAIXA DE SINAL"],
  armario: ["collect", "ABRIR A RESERVA"],
  boia: ["inspect", "VINCULAR A BALIZA"],
  radio: ["inspect", "ACIONAR O RÁDIO"],
  sino: ["inspect", "TOCAR O SINO"],
  gerador: ["inspect", "RELIGAR O GERADOR"],
  valvula: ["inspect", "ABRIR A VÁLVULA"],
  rede: ["inspect", "EXAMINAR A REDE"],
  retrato: ["lore", "EXAMINAR O RETRATO"],
  "lote11-cartas": ["lore", "LER O QUADRO DE MARÉS"],
  "lote11-placa": ["lore", "LER A PLACA"],
  "lote11-sino": ["mission", "TOCAR O SINO DE NEBLINA"],
  "lote11-gerador": ["mission", "LEVAR CARGA AO GERADOR"],
  "lote8-concha": ["collect", "REGISTRAR A CONCHA"],
  "lote5-panel": ["mission", "RECOMPILAR NO PAINEL"],
  "lote5-seal": ["mission", "REABRIR O SELO"],
  "lote5-door": ["mission", "ABRIR A FENDA"],
  "lote6-turbine": ["mission", "RELIGAR A TURBINA"],
  "lote6-rift": ["mission", "ATRAVESSAR A FENDA"],
  "lote6-stairs": ["inspect", "DESCER A ESCADA"],
  "lote7-lamp": ["inspect", "ACENDER A LÂMPADA"],
  nulo: ["mission", "RESPONDER AO NULO"],
});

const PREFIX_CATEGORY = [
  ["lote5-", "inspect"],
  ["lote6-", "inspect"],
  ["lote7-", "inspect"],
  ["lote8-", "collect"],
  ["lote9-", "collect"],
  ["lote11-", "inspect"],
];

export function promptFor(prop) {
  if (!prop) return null;
  const key = prop.kind ?? prop.id;
  const direct = VERBS[prop.id] ?? VERBS[prop.kind];
  const prefix = PREFIX_CATEGORY.find(([head]) => String(key ?? "").startsWith(head));
  const kind = direct?.[0] ?? prefix?.[1] ?? (prop.decor ? "inspect" : "inspect");
  const category = PROMPT_CATEGORIES[kind] ?? PROMPT_CATEGORIES.inspect;
  const verb = direct?.[1] ?? (kind === "collect" ? "RECOLHER" : kind === "lore" ? "EXAMINAR" : "INSPECIONAR");
  return {
    kind,
    ...category,
    verb,
    line: `[E] ${category.glyph} ${category.tag} · ${verb}`,
    detail: typeof prop.label === "string" ? prop.label : "",
  };
}

export function lote13Cue(kind) {
  return PROMPT_CATEGORIES[kind] ?? PROMPT_CATEGORIES.inspect;
}
