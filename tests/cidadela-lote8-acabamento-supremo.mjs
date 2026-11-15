// Testa o Lote 8 (acabamento supremo) da Cidadela 404:
// - 10 artes finais (Sonda 100%, Elite costas dano/colapso, teto Arena/Oficina,
//   parede corredor entrada, projétil Vigilante Fase 2, impacto Elite,
//   colapso núcleo do Vigilante e ícone HUD sobrecarga)
// - Tiros dedicados Fase 2, impacto próprio de elite, flash de escudo absorvido
//   e 5 novos tons de áudio (boss_shot, boss_death, elite_hurt, shield_hit, combo_streak)
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { state } from '../js/game/state.js';
import { playCitadelSound } from '../js/game/cidadela-audio.js';
import { updateCitadel, renderCitadel, getCitadelRuntime, clearCitadelRuntime } from '../js/game/cidadela-fps.js';

const RGBA_SPRITES = [
  'sonda-nexo-100.png',
  'imp-elite-costas-dano.png',
  'imp-elite-costas-colapso.png',
  'projetil-vigilante-fase2.png',
  'impacto-elite.png',
  'vigilante-morte-nucleo.png',
  'hud-sobrecarga-icone.png',
];
const TEXTURES = [
  'teto-arena.png',
  'teto-oficina.png',
  'parede-corredor-entrada.png',
];
for (const file of [...RGBA_SPRITES, ...TEXTURES]) {
  assert(existsSync(`assets/source-art/cidadela-404/${file}`), `source-art ausente: ${file}`);
  assert(existsSync(`assets/sprites/cidadela-404/${file}`), `sprite ausente: ${file}`);
}
for (const file of RGBA_SPRITES) {
  assert.equal(readFileSync(`assets/sprites/cidadela-404/${file}`)[25], 6, `esperado PNG RGBA: ${file}`);
}

const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0, fpsFireHeld: false };
const step = (n = 1) => { for (let i = 0; i < n; i++) { updateCitadel(.033, state, input); input.pressed.clear(); } };

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

// 1. Renderizador usa todas as 10 artes do Lote 8 nos locais corretos
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

  // Corredor inicial: parede-corredor-entrada + elite de costas dano/colapso + impacto elite + hud sobrecarga
  Object.assign(state.player, { x: 4.5, y: 5.5 });
  g.angle = 0;
  g.overdrive = 6;
  g.enemies = [{ type: 'elite', x: 6.5, y: 5.5, hp: 95, maxHp: 95, facing: 0, hurt: 0.15 }];
  g.impacts = [{ x: 6.5, y: 5.5, color: 'elite', life: 0.25 }];
  render();
  assert(drawn.some(s => s.endsWith('parede-corredor-entrada.png')), 'parede-corredor-entrada.png desenhada');
  assert(drawn.some(s => s.endsWith('imp-elite-costas-dano.png')), 'imp-elite-costas-dano.png desenhada');
  assert(drawn.some(s => s.endsWith('impacto-elite.png')), 'impacto-elite.png desenhado');
  assert(drawn.some(s => s.endsWith('hud-sobrecarga-icone.png')), 'hud-sobrecarga-icone.png desenhado no HUD');

  g.enemies[0].hurt = 0; g.enemies[0].hp = 0; g.enemies[0].death = 0.25;
  render();
  assert(drawn.some(s => s.endsWith('imp-elite-costas-colapso.png')), 'imp-elite-costas-colapso.png desenhada');

  // Arena: teto-arena + projétil Fase 2 + meltdown do Vigilante
  Object.assign(state.player, { x: 25.5, y: 6.5 });
  g.enemies = [];
  g.shots = [{ x: 27.0, y: 6.5, dx: -1, dy: 0, damage: 11, life: 2, kind: 'boss_p2' }];
  Object.assign(g.boss, { dead: true, hp: 0, phaseTwo: true, death: 1.1 });
  render();
  assert(drawn.some(s => s.endsWith('teto-arena.png')), 'teto-arena.png desenhado na Arena');
  assert(drawn.some(s => s.endsWith('projetil-vigilante-fase2.png')), 'projetil-vigilante-fase2.png desenhado');
  assert(drawn.some(s => s.endsWith('vigilante-morte-nucleo.png')), 'vigilante-morte-nucleo.png desenhado na queda inicial');

  // Pós-vitória 100%: Sonda 100% + teto-oficina na Oficina
  state.progress.flags.cidadela_estavel = true;
  state.progress.flags.cidadela_100_porcento = true;
  g.boss.death = 0;
  Object.assign(state.player, { x: 23.0, y: 6.5 });
  render();
  assert(drawn.some(s => s.endsWith('sonda-nexo-100.png')), 'sonda-nexo-100.png desenhada quando 100% estabilizada');

  Object.assign(state.player, { x: 10.5, y: 16.5 });
  render();
  assert(drawn.some(s => s.endsWith('teto-oficina.png')), 'teto-oficina.png desenhado na Oficina da Vigília');
}

// 2. Combate: impacto de elite, disparo boss_p2 na Fase 2 e flash de escudo absorvido
{
  const g = boot({ cidadela_chave_vermelha: true }, 'motor_bio_forja');
  Object.assign(state.player, { x: 25.5, y: 6.5 });
  g.angle = 0;
  g.shield = 3;
  g.shots.push({ x: 25.6, y: 6.5, dx: -1, dy: 0, damage: 10, life: 2, kind: 'elite' });
  step();
  assert(g.shieldHit > 0, 'escudo ativo registra flash ciano ao absorver projétil');
  assert.equal(g.damage, 0, 'dano com escudo ativo não dispara flash vermelho de visor');
  assert.equal(g.impacts.at(-1)?.color, 'elite', 'projétil de elite gera impacto visual de elite');

  // Tiro de Fase 2 do Vigilante gera kind boss_p2
  Object.assign(g.boss, { dead: false, hp: 120, phaseTwo: true, cycle: 2.5, cooldown: 0 });
  g.shots.length = 0;
  step();
  assert(g.shots.some(s => s.kind === 'boss_p2'), 'Vigilante na Fase 2 dispara projéteis boss_p2');
}

// 3. Novos tons de áudio executam sem erro
for (const tone of ['boss_shot', 'boss_death', 'elite_hurt', 'shield_hit', 'combo_streak']) {
  playCitadelSound(tone);
}

console.log('Lote 8 da Cidadela 404 (acabamento supremo): 3/3 grupos de testes ok.');
