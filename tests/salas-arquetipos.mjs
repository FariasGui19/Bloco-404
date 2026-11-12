// node --experimental-default-type=module tests/salas-arquetipos.mjs
// Salas de Missão iniciais por arquétipo: spawn válido, protocolo R → Q
// funcional, portão persistente e Fragmento de Eco coletável.
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { loadMap } from '../js/game/map-manager.js';
import { updateAbilities, getArchetypeAbilities } from '../js/game/abilities.js';
import { canStandAt } from '../js/game/collision.js';
import { isGateOpen } from '../js/game/gates.js';
import { getNearestCollectible, collectItem } from '../js/game/collectibles.js';
import { checkInteractions } from '../js/game/interactions.js';
import { closeDialogue } from '../js/ui/dialogue.js';

const element = () => {
  const listeners = {};
  return {
    dataset: {}, children: [],
    classList: { add() {}, remove() {} },
    addEventListener(type, fn) { listeners[type] = fn; },
    click() { listeners.click?.({ preventDefault() {}, stopPropagation() {} }); },
    appendChild(c) { this.children.push(c); },
    textContent: '',
    get innerHTML() { return this._html ?? ''; },
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; },
  };
};
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = { getElementById: id => elements[id], createElement: () => element() };
globalThis.window = { addEventListener() {} };
state.save.loaded = false;
state.save.activeSlot = null;
const press = key => { input.pressed.clear(); input.pressed.add(key); updateAbilities(0); input.pressed.clear(); };

const rooms = [
  { archetype: 'motor_bio_forja', map: 'sala_bio_forja', obstacle: 'grade_impeto_vivo',
    diagnosisFlag: 'bio_placa_diagnostico', fragment: 'fragmento_eco_bio', phase: false },
  { archetype: 'lamina_dominio_anciao', map: 'sala_dominio', obstacle: 'lacre_frequencia_sala',
    scanFlag: 'scan_lacre_sala', fragment: 'fragmento_eco_dominio', phase: false },
  { archetype: 'mare_astral', map: 'sala_mare', obstacle: 'fluxo_contido_sala',
    scanFlag: 'scan_fluxo_sala', fragment: 'fragmento_eco_mare', phase: true },
  { archetype: 'nucleo_dez_forma', map: 'sala_nucleo', obstacle: 'malha_cinetica_sala',
    scanFlag: 'scan_malha_sala', fragment: 'fragmento_eco_nucleo', phase: true },
];

for (const room of rooms) {
  state.progress = {
    archetype: room.archetype,
    abilities: getArchetypeAbilities(room.archetype),
    flags: {},
    inventory: [],
  };

  const ok = await loadMap(room.map, 'vindo_do_aeroporto');
  assert(ok, `${room.map} deve carregar`);

  // 1) Spawn seguro: nasce em chão livre, nunca dentro de parede/obstáculo
  const map = state.world.currentMap;
  assert(canStandAt(map, state.player.x, state.player.y, 0.25, state.player),
    `${room.map}: spawn (${state.player.x}, ${state.player.y}) inválido`);

  // 2) Chegada alinhada ao portal de saída
  assert(Math.hypot(state.player.x - 2.5, state.player.y - 5.5) < 0.6,
    `${room.map}: chegada deveria nascer na borda oeste`);

  // 3) O portão bloqueia a passagem leste antes de qualquer diagnóstico
  const obstacle = state.objects.find(o => o.id === room.obstacle);
  assert(obstacle, `${room.map}: obstáculo ${room.obstacle} presente`);
  assert(obstacle.bloqueia, `${room.map}: portão deve bloquear`);
  assert(!canStandAt(map, obstacle.x, obstacle.y, 0.2, state.player),
    `${room.map}: portão deve colidir`);

  // 4) Fragmento indisponível antes de abrir o portão
  assert.equal(getNearestCollectible(), null,
    `${room.map}: fragmento não pode ser alcançado com o portão fechado`);

  // 5) Q sozinho não abre nada (abordagem real: diagonal sul-oeste da grade)
  const approachY = room.map === 'sala_bio_forja' ? 6.8 : 5.5;
  const approachX = room.map === 'sala_bio_forja' ? 9.2 : (room.phase ? 8.7 : 8);
  Object.assign(state.player, { x: approachX, y: approachY, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 } });
  press('q');
  for (let i = 0; i < 24 && state.player.ability?.dash; i++) updateAbilities(0.03);
  assert(!isGateOpen(obstacle), `${room.map}: Q sem diagnóstico não abre o portão`);

  // 6) R diagnostica/lê o portão
  state.player.ability = { cooldowns: {}, dash: null, scanning: 0 };
  press('r');
  closeDialogue();
  const diagnosis = room.diagnosisFlag ?? room.scanFlag;
  assert(state.progress.flags[diagnosis], `${room.map}: R deveria gravar ${diagnosis}`);
  assert(!isGateOpen(obstacle), `${room.map}: leitura sozinha não abre o portão`);

  // 7) Q (e a travessia real, quando aplicável) abre o portão
  Object.assign(state.player, { x: approachX, y: approachY, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 } });
  press('q');
  for (let i = 0; i < 30 && state.player.ability?.dash; i++) updateAbilities(0.03);
  assert(isGateOpen(obstacle), `${room.map}: portão deveria abrir após R + Q`);

  // 8) Persistência entre visitas
  await loadMap(room.map, 'vindo_do_aeroporto');
  const reloaded = state.objects.find(o => o.id === room.obstacle);
  assert(isGateOpen(reloaded), `${room.map}: portão deve continuar aberto ao recarregar`);

  // 9) Fragmento disponível, coletável e inventariado
  const fragment = state.collectibles.find(c => c.id === room.fragment);
  assert(fragment, `${room.map}: fragmento ${room.fragment} registrado`);
  Object.assign(state.player, { x: fragment.x, y: fragment.y });
  const nearest = getNearestCollectible();
  assert(nearest && nearest.item.id === room.fragment, `${room.map}: fragmento ao alcance após abrir`);
  assert(collectItem(nearest.item), `${room.map}: fragmento deve ser coletável`);
  assert(state.progress.inventory.includes(room.fragment), `${room.map}: fragmento no inventário`);

  // 10) Portal de retorno ao aeroporto presente
  assert(state.portals.some(p => p.destino?.mapId === 'hub_aeroporto'),
    `${room.map}: portal de volta ao aeroporto presente`);

  console.log(`${room.map}: protocolo R → Q, portão, fragmento e retorno OK`);
}

// ---------------------------------------------------------------------
// Verificação dedicada da Oficina Bio-Forja (arte 2:1, missão e bancada)
// ---------------------------------------------------------------------
{
  const { existsSync, readFileSync } = await import('node:fs');
  const { getQuestState } = await import('../js/game/quests.js');

  const bioSprites = [
    'piso-placa.png', 'piso-grade.png', 'parede-canto.png', 'parede-tubos.png',
    'parede-tanque.png', 'porta-eclusa.png', 'banco-reconstrucao.png',
    'grade-contencao.png', 'pilar-contencao.png', 'pilar-sensor.png', 'incubadora-eco.png',
  ];
  const mainJs = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  for (const file of bioSprites) {
    assert(existsSync(new URL(`../assets/sprites/sala-bio/${file}`, import.meta.url)), `sprite ${file} presente`);
    assert(mainJs.includes(`assets/sprites/sala-bio/${file}`), `sprite ${file} registrado no main.js`);
  }

  state.progress = {
    archetype: 'motor_bio_forja',
    abilities: getArchetypeAbilities('motor_bio_forja'),
    flags: {},
    inventory: [],
  };
  await loadMap('sala_bio_forja', 'vindo_do_aeroporto');

  // A missão da oficina inicia automaticamente para Motor Bio-Forja
  let qState = getQuestState(state.progress, 'forja_do_propulsor');
  assert(qState && qState.status === 'active', 'forja_do_propulsor inicia ativa na sala_bio_forja');

  // Grade usa fatiamento diagonal (colunas) e sprite isométrico 2:1
  const grade = state.objects.find(o => o.id === 'grade_impeto_vivo');
  assert.equal(grade.sprite, 'bio_sala_grade_contencao');
  assert(grade.colunas?.count > 1, 'grade_impeto_vivo usa colunas para profundidade diagonal');

  // Etapa 1: R diagnostica
  Object.assign(state.player, { x: 9.2, y: 6.8, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 } });
  press('r');
  closeDialogue();
  qState = getQuestState(state.progress, 'forja_do_propulsor');
  assert.equal(qState.objectives[0].done, true, 'objetivo 1 (diagnosticar grade) concluído');

  // Etapa 2: Q rompe a grade em qualquer faixa do vão duplo (ex.: y = 6.0 reto)
  Object.assign(state.player, { x: 8.8, y: 6.4, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 } });
  press('q');
  for (let i = 0; i < 30 && state.player.ability?.dash; i++) updateAbilities(0.03);
  qState = getQuestState(state.progress, 'forja_do_propulsor');
  assert.equal(qState.objectives[1].done, true, 'objetivo 2 (romper grade) concluído');

  // Etapa 3: coletar Fragmento de Eco
  const frag = state.collectibles.find(c => c.id === 'fragmento_eco_bio');
  Object.assign(state.player, { x: frag.x, y: frag.y });
  assert(collectItem(frag));
  closeDialogue();
  qState = getQuestState(state.progress, 'forja_do_propulsor');
  assert.equal(qState.objectives[2].done, true, 'objetivo 3 (coletar fragmento) concluído');

  // Etapa 4: sincronizar no Banco de Reconstrução
  const { advanceDialogue } = await import('../js/ui/dialogue.js');
  const banco = state.objects.find(o => o.id === 'maquina_bio');
  assert.equal(banco.sprite, 'bio_sala_banco_reconstrucao');
  Object.assign(state.player, { x: banco.x, y: banco.y + 1.5 });
  await checkInteractions(true);
  advanceDialogue();
  elements.dialogueChoices.children[0].click();
  closeDialogue();

  assert.equal(state.progress.flags.oficina_bio_sincronizada, true, 'oficina_bio_sincronizada gravada');
  assert.equal(state.progress.flags.missao_bio_forja_concluida, true, 'recompensa de missão concedida');
  assert(state.progress.inventory.includes('selo_forja_bio'), 'selo_forja_bio entregue no inventário');

  // Reparo opcional do regulador auxiliar sul
  const condutor = state.objects.find(o => o.id === 'condutor_oficina_bio');
  Object.assign(state.player, { x: condutor.x, y: condutor.y - 1.0 });
  await checkInteractions(true);
  closeDialogue();
  assert.equal(condutor.sprite, 'bio_condutor_ativo', 'regulador auxiliar troca para sprite ativo');
  console.log('sala_bio_forja: missão forja_do_propulsor, sincronia no Banco e reparo auxiliar OK');
}

console.log('Salas de Missão: spawn, protocolo, persistência e fragmentos OK.');
