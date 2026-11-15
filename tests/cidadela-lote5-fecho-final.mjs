// Testa o Lote 5 (fechamento definitivo) da Cidadela 404:
// - 10 novos assets DOOM × Bloco 404
// - Bônus exclusivos por arquétipo no [V] + parry duplo
// - Célula de sobrecarga E1M1, Placa Secreta E1M1, Console do Reator
// - Sequência de abates (combo), descrição dinâmica de embarque_dimensional
// - Flag de conclusão 100% (cidadela_100_porcento) + cutscene final de retorno (2 cenas)
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map, CITADEL_SECRET_E1M1, CITADEL_OVERDRIVE_CELL, CITADEL_REACTOR_CONSOLE } from '../js/data/worlds/cidadela-404/cidadela.js';
import { CITADEL_RETURN_SCENES } from '../js/ui/cutscene.js';
import { state } from '../js/game/state.js';
import { isCitadelComplete } from '../js/game/cidadela-missoes.js';
import { playCitadelSound } from '../js/game/cidadela-audio.js';
import { updateCitadel, getCitadelRuntime, clearCitadelRuntime, KEYS, wallAt } from '../js/game/cidadela-fps.js';

const BATCH5_ASSETS = [
  'assets/sprites/cidadela-404/melee-mare.png',
  'assets/sprites/cidadela-404/melee-nucleo.png',
  'assets/sprites/cidadela-404/melee-dominio.png',
  'assets/sprites/cidadela-404/melee-bio.png',
  'assets/sprites/cidadela-404/celula-sobrecarga-doom.png',
  'assets/sprites/cidadela-404/placa-secreta-404.png',
  'assets/sprites/cidadela-404/prop-console-reator.png',
  'assets/sprites/cidadela-404/piso-arena.png',
  'assets/sprites/cidadela-404/trofeu-cidadela-404.png',
  'assets/cutscenes/cidadela-aurora-limiar.jpg',
];
for (const file of BATCH5_ASSETS) assert(existsSync(file), `asset do lote 5 ausente: ${file}`);

assert(CITADEL_RETURN_SCENES.length >= 2, 'cutscene de retorno possui ao menos 2 cenas de fechamento');
assert.equal(CITADEL_RETURN_SCENES[1].image, 'assets/cutscenes/cidadela-aurora-limiar.jpg');

// Posições novas ficam em células caminháveis
for (const pt of [CITADEL_SECRET_E1M1, CITADEL_OVERDRIVE_CELL, CITADEL_REACTOR_CONSOLE]) {
  assert.equal(wallAt(map, { cidadela_estavel: true }, pt.x, pt.y), 0, `posição aberta esperada em (${pt.x}, ${pt.y})`);
}

const input = { keys: {}, pressed: new Set(), mouseDeltaX: 0, fpsFireHeld: false };
const step = (n = 1) => { for (let i = 0; i < n; i++) { updateCitadel(.033, state, input); input.pressed.clear(); } };
const press = (k) => { input.pressed.add(k); step(); };

function boot(flags = {}, archetype = 'mare_astral', activeQuest = null) {
  state.progress = {
    archetype,
    inventory: [],
    flags: { ...flags },
    activeQuest,
    archetypeProgress: { [archetype]: { level: 3, xp: 0 } },
    tools: {},
    citadelMaterials: { sucata_codigo: 0, nucleo_estatica: 0 },
  };
  state.world.currentMap = map;
  state.world.isLoading = false;
  state.world.fpsPaused = false;
  Object.assign(state.player, { health: 100, maxHealth: 100, energy: 40, maxEnergy: 100, invulnerable: 0, ultimate: { cooldown: 0 } });
  input.keys = {}; input.pressed.clear(); input.fpsFireHeld = false;
  clearCitadelRuntime();
  step();
  return getCitadelRuntime();
}

// 1. Bônus exclusivos por arquétipo no [V]
{
  // Maré Astral aplica lentidão no inimigo
  const gMare = boot({}, 'mare_astral');
  const imp = gMare.enemies[0];
  Object.assign(state.player, { x: imp.x - 1.0, y: imp.y });
  gMare.angle = 0;
  press('v');
  assert(imp.slow >= 1.9, 'Maré Astral aplica lentidão no golpe [V]');

  // Núcleo X10 recupera +3 EN por alvo atingido
  const gNucleo = boot({}, 'nucleo_dez_forma');
  const impN = gNucleo.enemies[0];
  Object.assign(state.player, { x: impN.x - 1.0, y: impN.y, energy: 20 });
  gNucleo.angle = 0;
  press('v');
  assert(state.player.energy >= 23, 'Núcleo X10 recupera +3 EN ao acertar com [V]');

  // Domínio Ancião causa dano maior (32) no [V]
  const gDom = boot({}, 'lamina_dominio_anciao');
  const impD = gDom.enemies[0];
  const hpBefore = impD.hp;
  Object.assign(state.player, { x: impD.x - 1.0, y: impD.y });
  gDom.angle = 0;
  press('v');
  assert.equal(hpBefore - impD.hp, 32, 'Domínio Ancião causa 32 de dano no [V]');

  // Bio-Forja ativa guarda (0.5s) e empurra mais
  const gBio = boot({}, 'motor_bio_forja');
  const impB = gBio.enemies[0];
  Object.assign(state.player, { x: impB.x - 1.0, y: impB.y });
  gBio.angle = 0;
  press('v');
  assert(gBio.guard > 0.35, 'Bio-Forja ativa guarda protetora ao golpear com [V]');
}

// 2. Parry Duplo: >=2 projéteis concedem escudo e +7 EN por projétil
{
  const g = boot();
  Object.assign(state.player, { x: 5.0, y: 6.5, energy: 10 });
  g.angle = 0;
  g.shots.push(
    { x: 5.8, y: 6.4, dx: -1, dy: 0, damage: 8, life: 3 },
    { x: 5.9, y: 6.6, dx: -1, dy: 0, damage: 8, life: 3 },
  );
  press('v');
  assert(state.player.energy >= 24, 'parry duplo concede +14 EN');
  assert(g.shield > 0.7, 'parry duplo ativa escudo tático');
  assert(g.message.includes('PARRY DUPLO'), 'aviso confirma parry duplo');
}

// 3. Célula de Sobrecarga E1M1: acelera disparo, +35% dano e +20 EN
{
  const g = boot({ cidadela_chave_azul: true, cidadela_chave_amarela: true });
  Object.assign(state.player, { x: CITADEL_OVERDRIVE_CELL.x, y: CITADEL_OVERDRIVE_CELL.y, energy: 30 });
  step();
  assert(g.overdrive > 11.5, 'célula E1M1 ativa 12s de sobrecarga');
  assert(state.player.energy >= 50, 'célula E1M1 restaura +20 EN');
  const target = g.enemies.find(e => e.hp > 0);
  Object.assign(state.player, { x: target.x - 1.5, y: target.y });
  g.angle = 0;
  const hpBefore = target.hp;
  press(' ');
  assert.equal(hpBefore - target.hp, Math.round(28 * 1.35), 'sobrecarga E1M1 aumenta dano em +35%');
  assert(g.fire <= 0.16, 'sobrecarga E1M1 acelera cadência para 0.16s');
}

// 4. Sequência de abates (combo >= 3) restaura +4 EN
{
  const g = boot();
  Object.assign(state.player, { x: 4.5, y: 8.5, energy: 20 });
  g.angle = 0;
  g.enemies = [
    { type: 'imp', x: 5.5, y: 8.5, hp: 10, maxHp: 55, cooldown: 5, slow: 0 },
    { type: 'imp', x: 5.6, y: 8.5, hp: 10, maxHp: 55, cooldown: 5, slow: 0 },
    { type: 'imp', x: 5.7, y: 8.5, hp: 10, maxHp: 55, cooldown: 5, slow: 0 },
  ];
  press('v');
  step();
  assert.equal(g.combo, 3, 'três abates consecutivos somam combo 3');
  assert(state.player.energy >= 24, 'combo >= 3 restaura +4 EN');
}

// 5. Placa Secreta E1M1 + progresso dinâmico de embarque_dimensional
{
  const quest = { id: 'embarque_dimensional', title: 'EMBARQUE', status: 'active', description: 'Início' };
  const g = boot({}, 'mare_astral', quest);
  Object.assign(state.player, { x: CITADEL_SECRET_E1M1.x, y: CITADEL_SECRET_E1M1.y + 0.6, energy: 20 });
  press('e');
  assert(state.progress.flags.cidadela_segredo_e1m1, 'placa E1M1 marca flag secreta');
  assert(state.player.energy >= 35, 'placa E1M1 concede +15 EN');
  assert.equal(state.progress.archetypeProgress.mare_astral.xp, 15, 'placa E1M1 concede +15 XP');

  // Coletar chave azul atualiza descrição da missão principal
  Object.assign(state.player, { x: KEYS[0].x, y: KEYS[0].y + 0.5 });
  press('e');
  assert(state.progress.activeQuest.description.includes('1/3'), 'descrição de embarque_dimensional acompanha chaves 1/3');
}

// 6. Maestria 100% (cidadela_100_porcento) e Console do Reator
{
  const fullFlags = {
    cidadela_estavel: true,
    cidadela_arquivo_origem: true,
    cidadela_arquivo_retorno: true,
    cidadela_arquivo_memoria: true,
    cidadela_crt_entrada: true,
    cidadela_crt_galeria: true,
    cidadela_crt_forja: true,
    cidadela_eco_entrada: true,
    cidadela_eco_galeria: true,
    cidadela_eco_forja: true,
    cidadela_forja_concluida: true,
    cidadela_rede_concluida: true,
    cidadela_vozes_concluida: true,
    cidadela_fendas_concluidas: true,
    cidadela_vigilia_concluida: true,
    cidadela_rondas_concluidas: 1,
    cidadela_chave_azul: true,
    cidadela_chave_amarela: true,
    cidadela_chave_vermelha: true,
    cidadela_final_visto: true,
  };
  assert(isCitadelComplete({ flags: fullFlags }), 'isCitadelComplete retorna true quando todos os pilares estão completos');
  assert(!isCitadelComplete({ flags: { ...fullFlags, cidadela_rondas_concluidas: 0 } }), 'isCitadelComplete exige pelo menos 1 ronda setorial');

  const g = boot(fullFlags);
  Object.assign(state.player, { x: CITADEL_REACTOR_CONSOLE.x, y: CITADEL_REACTOR_CONSOLE.y - 0.6 });
  // Força uma atualização de progresso via interação
  Object.assign(state.player, { x: CITADEL_SECRET_E1M1.x, y: CITADEL_SECRET_E1M1.y + 0.6 });
  press('e');
  assert(state.progress.flags.cidadela_100_porcento, 'flag cidadela_100_porcento é ativada ao completar todos os pilares');

  Object.assign(state.player, { x: CITADEL_REACTOR_CONSOLE.x, y: CITADEL_REACTOR_CONSOLE.y - 0.6 });
  press('e');
  assert(g.message.includes('100% ESTABILIZADA'), 'console do reator exibe telemetria 100%');
}

// 7. Áudio do Lote 5 executa sem erro
for (const kind of ['overdrive', 'secret', 'trophy', 'parry_double']) {
  playCitadelSound(kind);
}

console.log('Lote 5 da Cidadela 404 (fechamento DOOM × Bloco 404): 7/7 testes ok.');
