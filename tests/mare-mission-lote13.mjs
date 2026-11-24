import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canStand, cell, sites, waterAt } from "../js/dimension/mare-mission-model.js";
import {
  LOTE13_FRAMES,
  LOTE13_PATHS,
  PROMPT_CATEGORIES,
  corridorDistance,
  curateDecor,
  lote13Cue,
  lote13Names,
  nextObjective,
  pathGuides,
  promptFor,
} from "../js/dimension/mare-mission-lote13.js";

const root = new URL("../", import.meta.url);
const exists = (rel) => fs.existsSync(new URL(rel, root));

const fakeMission = (data = [], overrides = {}) => ({
  x: 16,
  y: 28,
  finished: false,
  p: { data, details: {}, lore: [], lote11: {} },
  ...overrides,
});

// 1. Folhas publicadas: toda arte citada pelo lote existe no disco.
test("lote 13 — as folhas citadas existem", () => {
  const sprites = new Set(lote13Names);
  assert.ok(
    [...sprites].every((name) =>
      exists(`assets/sprites/mare-missao-lote13/${name}.png`),
    ),
    "sprite do lote 13 faltando",
  );
  for (const name of ["trilha-tabua", "cabo-guia"])
    assert.ok(
      exists(`assets/textures/mare-missao-lote13/${name}.png`),
      `textura ${name} faltando`,
    );
  assert.ok(exists("tools/preparar-mare-lote13.py"));
  assert.deepEqual(Object.keys(LOTE13_FRAMES).sort(), [
    "farol-pulso",
    "interacao-onda",
    "marcador-objetivo",
    "terminal-estados",
  ]);
});

// 2. Percurso: nenhuma tábua, poste ou seta cai em parede ou água.
test("lote 13 — percurso inteiro em célula livre", () => {
  let samples = 0;
  for (const path of Object.values(LOTE13_PATHS)) {
    for (let i = 1; i < path.length; i++) {
      const [x0, y0] = path[i - 1];
      const [x1, y1] = path[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.3));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        assert.equal(cell(x, y), 0, `percurso cruza parede em ${x},${y}`);
        assert.ok(!waterAt(x, y), `percurso cruza água em ${x},${y}`);
        assert.ok(canStand(x, y), `percurso cruza prop em ${x},${y}`);
        samples++;
      }
    }
  }
  assert.ok(samples > 140, "percurso curto demais para a baía");

  const guides = pathGuides();
  assert.ok(guides.planks.length > 20);
  assert.ok(guides.posts.length >= 6);
  assert.ok(guides.cables.length >= guides.posts.length - 2);
  assert.ok(guides.arrows.length >= 4);
  for (const post of guides.posts) {
    assert.equal(cell(post.x, post.y), 0, `poste em parede ${post.x},${post.y}`);
    assert.ok(!waterAt(post.x, post.y), `poste na água ${post.x},${post.y}`);
    // Folga mínima: o mastro não pode nascer colado em sino, gerador ou muro.
    for (const [dx, dy] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]])
      assert.ok(canStand(post.x + dx, post.y + dy), `poste sem folga em ${post.x},${post.y}`);
  }
  for (const plank of guides.planks) assert.equal(cell(plank.x, plank.y), 0);
  for (const arrow of guides.arrows) assert.equal(cell(arrow.x, arrow.y), 0);
  for (const [a, b] of guides.cables) {
    assert.ok(guides.posts[a] && guides.posts[b], "cabo ligado a poste inexistente");
  }
  assert.equal(cell(guides.board.x, guides.board.y), 0);
});

// 3. Curadoria: menos decorativo solto, referências preservadas.
test("lote 13 — curadoria corta o decorativo solto", () => {
  const list = [
    { x: 4, y: 4, kind: "residuo" },
    { x: 4.4, y: 4.2, kind: "residuo" },
    { x: 4.8, y: 4.5, kind: "residuo" },
    { x: 12, y: 12, kind: "pin" },
    { x: 12.2, y: 12.1, kind: "pin" },
    { x: 20, y: 20, kind: "caixote" },
  ];
  const kept = curateDecor(list, { keep: 3.4, spacing: 1.5 });
  assert.ok(kept.length < list.length);
  assert.equal(kept.filter((d) => d.kind === "pin").length, 2, "pino é referência");
  assert.equal(curateDecor([{ x: 1, y: 1, art: "farolim" }], { keep: 0 }).length, 1);
  for (let i = 0; i < kept.length; i++)
    for (let j = i + 1; j < kept.length; j++) {
      const a = kept[i];
      const b = kept[j];
      if (a.kind === "pin" && b.kind === "pin") continue;
      assert.ok(
        Math.hypot(a.x - b.x, a.y - b.y) >= 1.5 - 1e-9,
        "dois decorativos colados demais",
      );
    }
  assert.ok(corridorDistance(16, 28) < corridorDistance(2, 2));
});

// 4. Objetivo: três estados, sempre com alvo e distância.
test("lote 13 — próximo passo acompanha a missão", () => {
  const first = nextObjective(fakeMission([]));
  assert.equal(first.action, "RECUPERAR MEMÓRIA");
  assert.equal(first.have, 0);
  assert.equal(first.need, 3);
  assert.ok(first.target && first.distance >= 0);
  assert.equal(nextObjective(fakeMission(["fita"])).have, 1);

  const terminal = nextObjective(fakeMission(["fita", "sal", "eco"]), {
    fendaOpen: false,
  });
  assert.equal(terminal.action, "RECOMPILAR NO TERMINAL");
  assert.deepEqual(terminal.target, { x: 16, y: 16 });

  const anchor = nextObjective(fakeMission(["fita", "sal", "eco"]), {
    fendaOpen: true,
  });
  assert.equal(anchor.action, "ALCANÇAR A ÂNCORA");
  assert.deepEqual(anchor.target, { x: 24.5, y: 24.5 });

  assert.equal(nextObjective(fakeMission([], { finished: true })), null);
  assert.ok(nextObjective(fakeMission([]), { side: "x" }).side === "x");
  // A âncora é o alvo mais distante do spawn: a distância não é constante.
  assert.notEqual(first.distance, anchor.distance);
});

// 5. Prompt: cada família tem etiqueta, glifo e lado sonoro próprios.
test("lote 13 — prompt diferencia missão, registro, coleta e inspeção", () => {
  const mission = promptFor({ id: "fita" });
  assert.equal(mission.kind, "mission");
  assert.equal(mission.line, "[E] ◆ MISSÃO · RECUPERAR A FITA");
  assert.notEqual(promptFor({ id: "terminal" }).verb, mission.verb);
  assert.equal(promptFor({ id: "diario" }).kind, "lore");
  assert.equal(promptFor({ id: "armario" }).kind, "collect");
  assert.equal(promptFor({ id: "radio" }).kind, "inspect");
  assert.equal(promptFor({ id: "radio" }).line, "[E] ◇ INSPEÇÃO · ACIONAR O RÁDIO");
  assert.equal(promptFor({ kind: "lote7-lamp" }).kind, "inspect");
  assert.equal(promptFor({ kind: "lote8-concha" }).kind, "collect");
  assert.equal(promptFor({}).kind, "inspect");
  assert.equal(promptFor(null), null);
  const tones = new Set(Object.values(PROMPT_CATEGORIES).map((c) => c.tone));
  assert.equal(tones.size, Object.keys(PROMPT_CATEGORIES).length, "tom repetido");
  assert.equal(lote13Cue("mission").glyph, "◆");
  assert.equal(lote13Cue("nada").glyph, "◇");
});

// 6. Integração: a missão consome o lote 13, sem duplicar a HUD.
test("lote 13 — missão usa percurso, curadoria, chip e prompt", () => {
  const mission = fs.readFileSync(new URL("js/dimension/mare-mission.js", root), "utf8");
  const world = fs.readFileSync(
    new URL("js/dimension/mare-mission-world3d.js", root),
    "utf8",
  );
  const css = fs.readFileSync(new URL("css/dimension.css", root), "utf8");
  assert.match(mission, /path: pathGuides\(\)/);
  assert.match(mission, /curateDecor\(/);
  assert.match(mission, /nextObjective\(m, \{ fendaOpen: fendaOpen\(m\)/);
  assert.match(mission, /const nearCue = near \? promptFor\(near\) : null/);
  assert.match(mission, /world3d\.setMarker\?\.\(next\?\.target \?\? null\)/);
  assert.match(mission, /world3d\.pulse\?\.\(near\.x, near\.y, cue\.wave\)/);
  assert.match(mission, /class="mare-next"/);
  assert.match(css, /\.mare-next \{ position:absolute/);
  assert.match(css, /aside\[data-kind="lore"\]/);
  assert.match(world, /setTerminalState/);
  assert.match(world, /const ringBeacon = \(\) => \{/);
  // O percurso não pode reaproveitar nomes do cenário antigo.
  assert.ok(!/const cableMat = new THREE\.MeshLambertMaterial/.test(world));
  assert.ok(!/^\s{2}const waves = \[\];$/m.test(world));
  // O alvo da bússola sai do objetivo atual, não de uma constante.
  assert.match(mission, /next\?\.target \?\? \{ x: 24\.5, y: 24\.5 \}/);
  assert.ok(sites.some((site) => site.id === "ancora"));
});
