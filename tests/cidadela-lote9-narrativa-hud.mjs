// Testa o Lote 9 (fechamento narrativo, HUD de armas, galeria, Fase 2 escudo, eco e áudio):
// - 10 artes novas (2 cutscenes finais, 4 ícones HUD de arma, parede-galeria,
//   registro-galeria, vigilante-escudo-fase2, impacto-eco)
// - 3ª cena em CITADEL_END_SCENES e CITADEL_RETURN_SCENES
// - Lore por arquétipo nas missões pós-vitória e 4 novos tons de áudio
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/cidadela-404/cidadela.js';
import { CITADEL_END_SCENES, CITADEL_RETURN_SCENES } from '../js/ui/cutscene.js';
import { state } from '../js/game/state.js';
import { playCitadelSound } from '../js/game/cidadela-audio.js';
import { interactCitadelMission } from '../js/game/cidadela-missoes.js';
import { updateCitadel, renderCitadel, getCitadelRuntime, clearCitadelRuntime } from '../js/game/cidadela-fps.js';

const RGBA_SPRITES = [
  'hud-arma-mare.png',
  'hud-arma-nucleo.png',
  'hud-arma-dominio.png',
  'hud-arma-bio.png',
  'registro-galeria.png',
  'vigilante-escudo-fase2.png',
  'impacto-eco.png',
];
for (const file of [...RGBA_SPRITES, 'parede-galeria.png']) {
  assert(existsSync(`assets/source-art/cidadela-404/${file}`), `source-art ausente: ${file}`);
  assert(existsSync(`assets/sprites/cidadela-404/${file}`), `sprite ausente: ${file}`);
}
for (const file of RGBA_SPRITES) {
  assert.equal(readFileSync(`assets/sprites/cidadela-404/${file}`)[25], 6, `esperado PNG RGBA: ${file}`);
}
for (const jpg of ['cidadela-desfecho-vigilante.jpg', 'cidadela-epilogo-nulo.jpg']) {
  assert(existsSync(`assets/source-art/cidadela-404/${jpg}`), `source-art cutscene ausente: ${jpg}`);
  assert(existsSync(`assets/cutscenes/${jpg}`), `cutscene ausente: ${jpg}`);
}
assert.equal(CITADEL_END_SCENES.length, 3, 'desfecho possui 3 quadros');
assert.equal(CITADEL_END_SCENES[2].image, 'assets/cutscenes/cidadela-desfecho-vigilante.jpg');
assert.equal(CITADEL_RETURN_SCENES.length, 3, 'retorno possui 3 quadros');
assert.equal(CITADEL_RETURN_SCENES[2].image, 'assets/cutscenes/cidadela-epilogo-nulo.jpg');

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

// 1. Renderizador desenha todas as artes novas nos devidos contextos
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

  for (const [arch, file] of [
    ['mare_astral', 'hud-arma-mare.png'],
    ['nucleo_dez_forma', 'hud-arma-nucleo.png'],
    ['lamina_dominio_anciao', 'hud-arma-dominio.png'],
    ['motor_bio_forja', 'hud-arma-bio.png'],
  ]) {
    const g = boot({}, arch);
    drawn.length = 0;
    renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
    assert(drawn.some(s => s.endsWith(file)), `ícone HUD da arma desenhado para ${arch}`);
    assert.ok(g);
  }

  // Galeria: parede-galeria + registro-galeria + impacto-eco
  const g = boot({ cidadela_estavel: true, cidadela_chave_azul: true }, 'mare_astral');
  Object.assign(state.player, { x: 11.5, y: 6.5 });
  g.angle = -Math.PI / 2; // olhando para norte onde fica registro galeria (10.5, 4.5) e parede da galeria
  g.impacts = [{ x: 11.5, y: 5.0, color: 'cyan', life: 0.25 }];
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('parede-galeria.png')), 'parede-galeria.png desenhada no Setor 02');
  assert(drawn.some(s => s.endsWith('registro-galeria.png')), 'registro-galeria.png desenhado na Galeria');
  assert(drawn.some(s => s.endsWith('impacto-eco.png')), 'impacto-eco.png desenhado no impacto ciano');

  // Escudo Fase 2 do Vigilante
  Object.assign(state.player, { x: 25.5, y: 6.5 });
  g.angle = 0;
  Object.assign(g.boss, { dead: false, hp: 100, phaseTwo: true, cycle: 0, shieldFlash: 0.2 });
  drawn.length = 0;
  renderCitadel({ width: 960, height: 540, getContext: () => ctx }, state);
  assert(drawn.some(s => s.endsWith('vigilante-escudo-fase2.png')), 'vigilante-escudo-fase2.png desenhado na Fase 2 blindada');
}

// 2. Missões entregam lore por arquétipo e marcam 100% automaticamente ao completar todos os requisitos
{
  const progress = {
    archetype: 'lamina_dominio_anciao',
    flags: {
      cidadela_estavel: true,
      cidadela_arquivo_origem: true, cidadela_arquivo_retorno: true, cidadela_arquivo_memoria: true,
      cidadela_crt_entrada: true, cidadela_crt_galeria: true, cidadela_crt_forja: true,
      cidadela_eco_entrada: true, cidadela_eco_galeria: true, cidadela_eco_forja: true,
      cidadela_forja_concluida: true,
      cidadela_fendas_concluidas: true,
      cidadela_vigilia_concluida: true,
      cidadela_rondas_concluidas: 1,
    },
    questLog: {
      cidadela_rede_escuta: {
        status: 'active',
        counters: [1, 1, 1, 0],
        claimed: false,
      },
    },
  };
  const resRede = interactCitadelMission(progress, { kind: 'probe' });
  assert(resRede?.changed && resRede.missionDone, 'conclusão de Rede de Escuta sinaliza missionDone');
  assert(resRede.message.includes('Domínio Ancião'), 'lore de conclusão cita o arquétipo do jogador');
}

// 3. Novos tons de áudio executam sem erro
for (const tone of ['relay_sync', 'recording_play', 'sector_clear', 'mission_complete']) {
  playCitadelSound(tone);
}

console.log('Lote 9 da Cidadela 404 (fechamento narrativo, HUD e galeria): 3/3 grupos de testes ok.');
