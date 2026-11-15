// Testa o Lote 7 (conclusão absoluta) da Cidadela 404:
// - 9 artes finais (piso de corredor, teto da cidadela, cobertura direcional
//   completa do elite e núcleo aberto/dano dedicados da Fase 2 do Vigilante)
// - Sinergias extras dos 4 arquétipos ([Q] parry Domínio, [V]/[Q] cura Bio,
//   [R] combo Núcleo X10, [Q] overdrive + arquivo Maré Astral)
// - Saudação 100% e novos tons de áudio (parry_q, radar_ping)
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map, CITADEL_ARCHIVES } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { playCitadelSound } from '../js/game/cidadela-audio.js';
import { updateCitadel, renderCitadel, getCitadelRuntime, clearCitadelRuntime } from '../js/game/cidadela-fps.js';

const BATCH7_ASSETS = [
  'assets/sprites/cidadela-404/piso-corredor.png',
  'assets/sprites/cidadela-404/teto-cidadela.png',
  'assets/sprites/cidadela-404/imp-elite-lateral-passo-a.png',
  'assets/sprites/cidadela-404/imp-elite-lateral-passo-b.png',
  'assets/sprites/cidadela-404/imp-elite-lateral-dano.png',
  'assets/sprites/cidadela-404/imp-elite-lateral-colapso.png',
  'assets/sprites/cidadela-404/imp-elite-costas-ataque.png',
  'assets/sprites/cidadela-404/vigilante-fase2-aberto.png',
  'assets/sprites/cidadela-404/vigilante-fase2-dano.png',
];
for (const file of BATCH7_ASSETS) assert(existsSync(file), `asset do lote 7 ausente: ${file}`);

const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0, fpsFireHeld: false };
const step = (n = 1) => { for (let i = 0; i < n; i++) { updateCitadel(.033, state, input); input.pressed.clear(); } };
const press = (k) => { input.pressed.add(k); step(); };

function boot(flags = {}, archetype = 'mare_astral') {
  state.progress = {
    archetype,
    inventory: [],
    flags: { ...flags },
    archetypeProgress: { [archetype]: { level: 3, xp: 0 } },
    tools: {},
    citadelMaterials: { sucata_codigo: 0, nucleo_estatica: 0 },
  };
  state.world.currentMap = map;
  state.world.isLoading = false;
  state.world.fpsPaused = false;
  Object.assign(state.player, { health: 100, maxHealth: 100, energy: 60, maxEnergy: 100, invulnerable: 0, ultimate: { cooldown: 0 } });
  input.keys = {}; input.pressed.clear(); input.fpsFireHeld = false;
  clearCitadelRuntime();
  step();
  return getCitadelRuntime();
}

// 1. Saudação 100% na inicialização
{
  const g = boot({ cidadela_estavel: true, cidadela_final_visto: true, cidadela_100_porcento: true });
  assert(g.message.includes('100% ESTABILIZADA'), 'saudação inicial reconhece 100% da Cidadela');
}

// 2. Sinergias extras dos 4 arquétipos
{
  // Domínio Ancião: [Q] Ruptura faz parry de projétil frontal (+5 EN)
  const gDom = boot({}, 'lamina_dominio_anciao');
  Object.assign(state.player, { x: 4.5, y: 5.5, energy: 40 });
  gDom.angle = 0;
  gDom.shots.push({ x: 6.0, y: 5.5, dx: -1, dy: 0, damage: 10, life: 3 });
  press('q');
  assert(state.player.energy >= 27, 'Ruptura [Q] do Domínio faz parry de projéteis (+5 EN após custo 18)');
  assert(gDom.message.includes('PARRY'), 'aviso confirma parry na Ruptura [Q]');

  // Bio-Forja: [V] enquanto escudo ativo cura +2 PV
  const gBio = boot({}, 'motor_bio_forja');
  const imp = gBio.enemies[0];
  Object.assign(state.player, { x: imp.x - 1.0, y: imp.y, health: 80 });
  gBio.angle = 0;
  gBio.shield = 2.5;
  press('v');
  assert.equal(state.player.health, 82, 'Bio-Forja cura +2 PV ao acertar [V] sob escudo');

  // Núcleo X10: [R] radar com sequência >= 2 restaura +4 EN
  const gNuc = boot({}, 'nucleo_dez_forma');
  state.player.energy = 30;
  gNuc.combo = 2;
  gNuc.comboTimer = 5;
  press('r');
  assert(state.player.energy >= 34, 'Radar [R] do Núcleo X10 restaura +4 EN com sequência >= 2');

  // Maré Astral: [Q] com overdrive reduz recarga para 4.5s e arquivo inédito dá +2 EN
  const gMare = boot({}, 'mare_astral');
  gMare.overdrive = 8;
  state.player.energy = 50;
  press('q');
  assert(gMare.q <= 4.5, 'Maré Astral reduz recarga de [Q] para 4.5s durante sobrecarga E1M1');
  gMare.dash = 0;
  const firstArchive = CITADEL_ARCHIVES[0];
  Object.assign(state.player, { x: firstArchive.x, y: firstArchive.y, energy: 50 });
  press('e');
  assert(state.player.energy >= 52, 'Maré Astral recupera +2 EN ao registrar arquivo inédito');
}

// 3. Renderizador desenha piso-corredor, teto-cidadela, elite 4-direções e Fase 2 aberto/dano
{
  const drawn = [];
  const noop = () => {};
  const ctx = {
    imageSmoothingEnabled: false,
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', globalAlpha: 1,
    fillRect: noop, clearRect: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, closePath: noop, stroke: noop, fill: noop,
    save: noop, restore: noop, setTransform: noop, translate: noop, scale: noop,
    measureText: (t) => ({ width: String(t).length * 5 }),
    fillText: noop,
    drawImage: (img) => { if (img?.src) drawn.push(img.src); },
  };
  globalThis.document = { createElement: () => ({ width: 480, height: 270, getContext: () => ctx }) };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.Image = class { constructor() { this.width = 128; this.height = 128; } set src(v) { this._src = v; this.onload?.(); } get src() { return this._src; } };

  const g = boot({ cidadela_chave_azul: true, cidadela_chave_amarela: true, cidadela_chave_vermelha: true }, 'mare_astral');
  const render = () => { drawn.length = 0; renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state); };

  // Corredores iniciais: teto + piso de corredor
  Object.assign(state.player, { x: 4.5, y: 5.5 });
  g.angle = 0;
  g.enemies = [{ type: 'elite', x: 6.5, y: 5.5, hp: 95, maxHp: 95, facing: Math.PI / 2, moving: true, walkPhase: 0 }];
  render();
  assert(drawn.some(s => s.endsWith('teto-cidadela.png')), 'teto-cidadela.png desenhado');
  assert(drawn.some(s => s.endsWith('piso-corredor.png')), 'piso-corredor.png desenhado nos corredores');
  assert(drawn.some(s => s.endsWith('imp-elite-lateral-passo-a.png')), 'elite usa passada lateral');

  g.enemies[0].hurt = 0.15;
  render();
  assert(drawn.some(s => s.endsWith('imp-elite-lateral-dano.png')), 'elite usa dano lateral');

  g.enemies[0].hurt = 0; g.enemies[0].hp = 0; g.enemies[0].death = 0.25;
  render();
  assert(drawn.some(s => s.endsWith('imp-elite-lateral-colapso.png')), 'elite usa colapso lateral');

  g.enemies[0] = { type: 'elite', x: 6.5, y: 5.5, hp: 95, maxHp: 95, facing: 0, windup: 0.4 };
  render();
  assert(drawn.some(s => s.endsWith('imp-elite-costas-ataque.png')), 'elite usa ataque de costas');

  // Arena: Fase 2 aberto e dano dedicados
  Object.assign(state.player, { x: 25.5, y: 6.5 });
  g.enemies = [];
  Object.assign(g.boss, { dead: false, hp: 100, phaseTwo: true, cycle: 5.0, hurt: 0 });
  render();
  assert(drawn.some(s => s.endsWith('vigilante-fase2-aberto.png')), 'Vigilante Fase 2 usa núcleo aberto dedicado');

  g.boss.hurt = 0.15;
  render();
  assert(drawn.some(s => s.endsWith('vigilante-fase2-dano.png')), 'Vigilante Fase 2 usa frame de dano dedicado');
}

// 4. Novos tons de áudio executam sem erro
for (const tone of ['parry_q', 'radar_ping']) playCitadelSound(tone);

console.log('Lote 7 da Cidadela 404 (conclusão absoluta): 4/4 grupos de testes ok.');
