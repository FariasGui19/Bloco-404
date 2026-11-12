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

// ---------------------------------------------------------------------
// Verificação dedicada do Santuário do Anel — Lâmina Domínio Ancião
// ---------------------------------------------------------------------
{
  const { existsSync, readFileSync } = await import('node:fs');
  const { getQuestState } = await import('../js/game/quests.js');
  const { advanceDialogue } = await import('../js/ui/dialogue.js');
  const { camera, snapCameraTo, updateCamera } = await import('../js/engine/camera.js');
  const { getCurrentMap } = await import('../js/game/map-manager.js');

  const domSprites = [
    'piso-obsidiana.png', 'piso-runa.png', 'parede-canto.png', 'parede-plana.png',
    'parede-relevo.png', 'porta-doca.png', 'altar-lamina.png', 'lacre-frequencia.png',
    'pilar-dominio.png', 'pira-dominio.png', 'estela-registro.png', 'armeiro-dominio.png',
    'monolito-intacto.png', 'monolito-partido.png',
  ];
  const mainJs = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  for (const file of domSprites) {
    assert(existsSync(new URL(`../assets/sprites/sala-dominio/${file}`, import.meta.url)), `sprite Domínio ${file} presente`);
    assert(mainJs.includes(`assets/sprites/sala-dominio/${file}`), `sprite Domínio ${file} registrado no main.js`);
  }

  state.progress = {
    archetype: 'lamina_dominio_anciao',
    abilities: getArchetypeAbilities('lamina_dominio_anciao'),
    flags: {},
    inventory: [],
  };
  await loadMap('sala_dominio', 'vindo_do_aeroporto');
  const domMap = getCurrentMap();
  assert.equal(domMap.meta?.estiloSala, 'dominio_anciao', 'sala_dominio usa estiloSala dominio_anciao');
  assert(!state.objects.some(o => o.sprite === 'hub_props'), 'sala_dominio não usa placeholders hub_props');

  // A missão Prova da Ruptura inicia automaticamente para Lâmina Domínio Ancião
  let qState = getQuestState(state.progress, 'prova_da_ruptura');
  assert(qState && qState.status === 'active', 'prova_da_ruptura inicia ativa na sala_dominio');

  // Lacre usa alinhamento diagonal (-2:+1 com skewY) e colunas de profundidade
  const lacre = state.objects.find(o => o.id === 'lacre_frequencia_sala');
  assert.equal(lacre.sprite, 'dom_sala_lacre_frequencia');
  assert(lacre.colunas?.count > 1, 'lacre_frequencia_sala usa colunas para profundidade diagonal');

  // Etapa 1: Postura do Domínio [R] revela o ponto frágil + ativa zoom tático de postura
  Object.assign(state.player, {
    x: 8.2, y: 6.0, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 },
  });
  camera.targetZoom = 1.3;
  camera.zoom = 1.3;
  snapCameraTo(state.player.x, state.player.y, domMap);
  const camBaseX = camera.x;

  press('r');
  qState = getQuestState(state.progress, 'prova_da_ruptura');
  assert.equal(qState.objectives[0].done, true, 'objetivo 1 (revelar ponto frágil com R) concluído');
  assert(state.player.ability?.reveal?.timeLeft > 0, 'Postura do Domínio ativa reveal tático');

  for (let i = 0; i < 25; i++) {
    updateCamera(0.05, state.player.x, state.player.y, null, domMap, {
      ability: state.player.ability,
      flags: state.progress.flags,
    });
  }
  assert(camera.x > camBaseX + 5, 'câmera antecipa o enquadramento do Lacre na Passarela do Anel');
  assert(camera.zoom > camera.targetZoom * 1.03, 'Postura do Domínio aplica foco aproximado de câmera');

  // Etapa 2: Golpe de Ruptura [Q] parte o Lacre com tremor de câmera e flash de clivagem
  state.player.ability.cooldowns = {};
  press('q');
  qState = getQuestState(state.progress, 'prova_da_ruptura');
  assert.equal(qState.objectives[1].done, true, 'objetivo 2 (partir Lacre com Q) concluído');
  assert(state.player.ultimate?.shake?.timeLeft > 0, 'Golpe de Ruptura dispara tremor de impacto na câmera');
  assert(state.player.ability?.ruptureFlash?.timeLeft > 0, 'Golpe de Ruptura dispara flash diagonal de clivagem');

  // Etapa 3: coletar Fragmento de Eco na Câmara da Coroa
  const frag = state.collectibles.find(c => c.id === 'fragmento_eco_dominio');
  Object.assign(state.player, { x: frag.x, y: frag.y });
  assert(collectItem(frag), 'fragmento_eco_dominio coletado');
  closeDialogue();
  qState = getQuestState(state.progress, 'prova_da_ruptura');
  assert.equal(qState.objectives[2].done, true, 'objetivo 3 (coletar fragmento Domínio) concluído');

  // Etapa 4: consagrar o juramento no Altar da Lâmina Ancestral
  const altar = state.objects.find(o => o.id === 'pedestal_lamina');
  assert.equal(altar.sprite, 'dom_sala_altar_lamina');
  Object.assign(state.player, { x: altar.x, y: altar.y + 1.5, health: 40, maxHealth: 100 });
  await checkInteractions(true);
  advanceDialogue();
  elements.dialogueChoices.children[0].click();
  closeDialogue();

  assert.equal(state.progress.flags.santuario_dominio_consagrado, true, 'santuario_dominio_consagrado gravado');
  assert.equal(state.progress.flags.missao_dominio_concluida, true, 'recompensa da Prova da Ruptura concedida');
  assert(state.progress.inventory.includes('insignia_anel_dominio'), 'insignia_anel_dominio entregue no inventário');
  assert.equal(state.player.health, 100, 'consagração restaura integridade do operador');

  // Prova opcional na ala sul: clivar o Monólito de Prova em duas metades incandescentes
  const monolito = state.objects.find(o => o.id === 'monolito_prova_dominio');
  assert.equal(monolito.sprite, 'dom_sala_monolito_intacto');
  Object.assign(state.player, {
    x: monolito.x - 1.2, y: monolito.y + 1.2, facing: 'right', energy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 },
  });
  press('q');
  assert.equal(monolito.sprite, 'dom_sala_monolito_partido', 'Monólito de Prova troca para sprite partido ao meio');
  assert.equal(monolito.bloqueia, false, 'Monólito partido deixa a arena livre');
  console.log('sala_dominio: missão prova_da_ruptura, câmera de postura/impacto, consagração e monólito OK');
}

// ---------------------------------------------------------------------
// Verificação dedicada da Dársena Abissal & Aquário Oceânico (Maré Astral)
// ---------------------------------------------------------------------
{
  const { existsSync, readFileSync } = await import('node:fs');
  const { getQuestState } = await import('../js/game/quests.js');
  const { advanceDialogue } = await import('../js/ui/dialogue.js');
  const { camera, updateCamera, snapCameraTo } = await import('../js/engine/camera.js');
  const { aguaDoDegrau, tileAtWorld, profundidadeSubmersaEm } = await import('../js/game/nado.js');

  const mareSprites = [
    'piso-ardosia-mare.png', 'piso-grade-mare.png', 'parede-canto-mare.png',
    'parede-tubos-mare.png', 'parede-aquario-mare.png', 'porta-eclusa-mare.png',
    'gerador-corrente-mare.png', 'fluxo-contido-mare.png', 'fluxo-aberto-mare.png',
    'arco-conduto-mare.png', 'arco-conduto-enseada.png', 'pilar-hidro-mare.png',
    'lanterna-abissal-mare.png', 'terminal-sonar-mare.png', 'valvula-pressao-mare.png',
    'valvula-ativa-mare.png',
  ];
  const mainJs = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  for (const file of mareSprites) {
    assert(existsSync(new URL(`../assets/sprites/sala-mare/${file}`, import.meta.url)), `sprite sala-mare presente: ${file}`);
    assert(mainJs.includes(`assets/sprites/sala-mare/${file}`), `${file} registrado em js/main.js`);
  }

  state.progress = {
    archetype: 'mare_astral',
    abilities: getArchetypeAbilities('mare_astral'),
    flags: {},
    inventory: [],
    questLog: {},
    nado: { nivel: 0, provas: {}, respeito: 0 },
  };

  await loadMap('sala_mare', 'vindo_do_aeroporto');
  const mareMap = state.world.currentMap;
  assert.equal(mareMap.meta?.estiloSala, 'mare_astral', 'sala_mare usa estiloSala mare_astral');
  assert(Array.isArray(mareMap.aguaPraia) && mareMap.aguaPraia.length === 12, 'sala_mare possui grade aguaPraia integrada');
  assert.equal(tileAtWorld(mareMap, 17.5, 5.5), 'D', 'Grande Aquário Oceânico possui célula de água funda real (D)');
  assert(profundidadeSubmersaEm(mareMap, 17.5, 5.5) > 1.25, 'Grande Aquário Oceânico suporta mergulho profundo em perspectiva 3D');

  let qState = getQuestState(state.progress, 'calibragem_de_corrente');
  assert(qState && qState.status === 'active', 'calibragem_de_corrente inicia automaticamente em sala_mare');

  // Etapa 1: Senso de Corrente [R] lê o Fluxo Contido + lente tática de câmera
  Object.assign(state.player, {
    x: 8.7, y: 5.5, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 },
  });
  camera.targetZoom = 1.3;
  camera.zoom = 1.3;
  snapCameraTo(state.player.x, state.player.y, mareMap);
  const camCorredorX = camera.x;

  press('r');
  qState = getQuestState(state.progress, 'calibragem_de_corrente');
  assert.equal(qState.objectives[0].done, true, 'objetivo 1 (ler janela laminar com R) concluído');
  for (let i = 0; i < 25; i++) {
    updateCamera(0.05, state.player.x, state.player.y, null, mareMap, {
      ability: state.player.ability,
      flags: state.progress.flags,
    });
  }
  assert(camera.x > camCorredorX + 5, 'câmera antecipa o Fluxo Contido no corredor de pressão');
  assert(camera.zoom > camera.targetZoom * 1.03, 'Senso de Corrente aplica lente aproximada de câmera');

  // Etapa 2: Passo de Corrente [Q] atravessa o Fluxo Contido e dispara tideFlash
  state.player.ability.cooldowns = {};
  press('q');
  for (let i = 0; i < 30 && state.player.ability?.dash; i++) updateAbilities(0.03);
  qState = getQuestState(state.progress, 'calibragem_de_corrente');
  assert.equal(qState.objectives[1].done, true, 'objetivo 2 (atravessar Fluxo Contido com Q) concluído');
  assert(state.player.ability?.tideFlash?.timeLeft > 0, 'Passo de Corrente dispara onda fluida tideFlash');

  // Etapa 3: coletar Fragmento de Eco no Relicário de Coral
  const fragMare = state.collectibles.find(c => c.id === 'fragmento_eco_mare');
  Object.assign(state.player, { x: fragMare.x, y: fragMare.y });
  assert(collectItem(fragMare), 'fragmento_eco_mare coletado');
  closeDialogue();
  qState = getQuestState(state.progress, 'calibragem_de_corrente');
  assert.equal(qState.objectives[2].done, true, 'objetivo 3 (coletar fragmento Maré) concluído');

  // Etapa 4: sintonizar o fragmento no Núcleo Hidrodimensional
  const gerador = state.objects.find(o => o.id === 'gerador_corrente');
  Object.assign(state.player, { x: gerador.x, y: gerador.y + 1.4, health: 45, maxHealth: 100 });
  await checkInteractions(true);
  advanceDialogue();
  elements.dialogueChoices.children[0].click();
  closeDialogue();
  assert.equal(state.progress.flags.darsena_mare_sincronizada, true, 'darsena_mare_sincronizada gravada');
  assert.equal(state.progress.flags.missao_mare_concluida, true, 'recompensa da Calibragem de Corrente concedida');
  assert(state.progress.inventory.includes('amuleto_corrente_mare'), 'amuleto_corrente_mare entregue no inventário');
  assert.equal(state.player.health, 100, 'sintonização restaura integridade do operador');

  // Mirante do Aquário: alterna perspectiva panorâmica de câmera
  const mirante = state.objects.find(o => o.id === 'mirante_aquario_mare');
  Object.assign(state.player, { x: mirante.x, y: mirante.y + 0.9 });
  await checkInteractions(true);
  closeDialogue();
  assert.equal(state.progress.flags.observatorio_aquario_mare, true, 'Modo Observatório Abissal ativado');
  camera.zoom = 1.3;
  for (let i = 0; i < 30; i++) {
    updateCamera(0.05, 4.5, 2.2, null, mareMap, { ability: {}, flags: state.progress.flags });
  }
  assert(camera.zoom < camera.targetZoom * 0.90, 'Modo Observatório abre o zoom panorâmico sobre os janelões e o aquário');

  // Válvula auxiliar opcional (+25 XP)
  const valvula = state.objects.find(o => o.id === 'valvula_pressao_mare');
  Object.assign(state.player, { x: valvula.x, y: valvula.y - 1.0 });
  await checkInteractions(true);
  closeDialogue();
  assert.equal(state.progress.flags.valvula_pressao_mare_equalizada, true, 'válvula auxiliar equalizada');
  assert.equal(valvula.sprite, 'mare_sala_valvula_ativa', 'válvula troca para sprite ativo');

  // TRAVA DA ROTA OCEÂNICA: sem visitar Praia Inicial e sem concluir Aprender a Nadar, a comporta NÃO abre!
  const comporta = state.objects.find(o => o.id === 'comporta_aquario_mare');
  assert.equal(comporta.bloqueia, true, 'comporta do aquário inicia fechada');
  assert(!canStandAt(mareMap, 14.3, 5.6, 0.25, state.player), 'rampa do aquário bloqueada antes do treino de nado');
  Object.assign(state.player, { x: 13.4, y: 5.5 });
  await checkInteractions(true);
  closeDialogue();
  assert(!isGateOpen(comporta), 'comporta continua fechada antes da Praia Inicial');
  assert(!state.progress.flags.rota_livre_enseada_aberta, 'rota livre para Enseada permanece fechada');

  // Visitar a Praia Inicial grava visitou_praia_inicial automaticamente, mas ainda exige aprendeu_a_nadar
  await loadMap('ilha_praia_inicial', 'inicio');
  assert.equal(state.progress.flags.visitou_praia_inicial, true, 'visita à Praia Inicial registrada');
  await loadMap('sala_mare', 'vindo_do_aeroporto');
  const comportaReload1 = state.objects.find(o => o.id === 'comporta_aquario_mare');
  Object.assign(state.player, { x: 13.4, y: 5.5 });
  await checkInteractions(true);
  closeDialogue();
  assert(!isGateOpen(comportaReload1), 'comporta exige concluir o treino de nado além de visitar a praia');

  // Concluir o treino de nado libera a comporta, o nado livre no Grande Aquário e a rota direta até a Enseada dos Ecos!
  state.progress.flags.aprendeu_a_nadar = true;
  state.progress.nado = { nivel: 4, provas: { boiar: true, respirar: true, travessia: true, fundo: true }, respeito: 0.5 };
  await checkInteractions(true);
  advanceDialogue();
  elements.dialogueChoices.children[0].click();
  closeDialogue();

  assert(isGateOpen(comportaReload1), 'comporta do aquário abre após Praia + Aprender a Nadar + Calibragem');
  assert.equal(state.progress.flags.rota_livre_enseada_aberta, true, 'rota_livre_enseada_aberta ativada');
  assert(canStandAt(state.world.currentMap, 14.3, 5.6, 0.25, state.player), 'rampa do aquário liberada após abrir comporta');
  assert(aguaDoDegrau(4)(state.world.currentMap, 17.5, 5.8), 'operador treinado nada livremente na bacia do Grande Aquário');

  // Travessia completa: sala_mare -> ilha_enseada_ecos -> sala_mare
  const portalIda = state.portals.find(p => p.id === 'conduto_enseada_mare');
  assert(portalIda && portalIda.destino?.mapId === 'ilha_enseada_ecos', 'portal de nado livre aponta para ilha_enseada_ecos');
  await loadMap(portalIda.destino.mapId, portalIda.destino.spawnId);
  assert.equal(state.world.currentMap.id, 'ilha_enseada_ecos', 'chegou à Enseada dos Ecos pelo conduto oceânico');
  assert(Math.hypot(state.player.x - 28.2, state.player.y - 12.6) < 0.5, 'emerge no mar leste da Enseada perto do Caminho das Correntes');
  const portalVolta = state.portals.find(p => p.id === 'retorno_darsena_mare');
  assert(portalVolta && portalVolta.destino?.mapId === 'sala_mare', 'portal de retorno submerso aponta de volta para sala_mare');
  await loadMap(portalVolta.destino.mapId, portalVolta.destino.spawnId);
  assert.equal(state.world.currentMap.id, 'sala_mare', 'retornou ao Grande Aquário da Dársena Abissal');
  console.log('sala_mare: missão calibragem_de_corrente, câmera multi-perspectiva, aquário vivo e rota livre Enseada OK');
}

// ---------------------------------------------------------------------
// Verificação dedicada da Base dos Vetores & Viaduto (Núcleo 10X)
// ---------------------------------------------------------------------
{
  const { existsSync, readFileSync } = await import('node:fs');
  const { getQuestState } = await import('../js/game/quests.js');
  const { advanceDialogue } = await import('../js/ui/dialogue.js');
  const { camera, updateCamera, snapCameraTo } = await import('../js/engine/camera.js');
  const { toggleNucleoForm } = await import('../js/game/nucleo-form.js');
  const { getInteractionPrompt, findNearestInteraction } = await import('../js/game/interactions.js');

  const nucleoSprites = [
    'piso-grafite.png', 'piso-cinetico.png', 'parede-canto.png', 'parede-modular.png',
    'porta-doca.png', 'eixo-adaptacao.png', 'malha-cinetica.png', 'pilar-cinetico.png',
    'terminal-registro.png', 'bigorna-contrapeso.png', 'contrapeso-liberado.png',
    'regulador-inercia.png', 'relicario-vetor.png', 'arco-viaduto.png',
  ];
  const mainJs = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  for (const file of nucleoSprites) {
    assert(existsSync(new URL(`../assets/sprites/sala-nucleo/${file}`, import.meta.url)), `sprite sala-nucleo presente: ${file}`);
    assert(mainJs.includes(`assets/sprites/sala-nucleo/${file}`), `${file} registrado em js/main.js`);
  }
  assert(mainJs.includes('assets/sprites/backgrounds/camara-nucleo-visao.jpg'), 'arte canônica visao_nucleo registrada');

  state.progress = {
    archetype: 'nucleo_dez_forma',
    abilities: getArchetypeAbilities('nucleo_dez_forma'),
    flags: {},
    inventory: [],
    questLog: {},
    archetypeProgress: { nucleo_dez_forma: { level: 1, xp: 0 } },
  };

  await loadMap('sala_nucleo', 'vindo_do_aeroporto');
  const nucleoMap = state.world.currentMap;
  assert.equal(nucleoMap.meta?.estiloSala, 'nucleo_10x', 'sala_nucleo usa estiloSala nucleo_10x');
  assert.equal(nucleoMap.layout.length, 12, 'Base dos Vetores tem 12 linhas');
  assert.equal(nucleoMap.layout[0].length, 18, 'Base dos Vetores tem 18 colunas');
  assert.equal(nucleoMap.walkMask.length, 12, 'walkMask acompanha o layout');

  let qState = getQuestState(state.progress, 'sincronia_dos_vetores');
  assert(qState && qState.status === 'active', 'sincronia_dos_vetores inicia automaticamente em sala_nucleo');

  // Etapa 1: Eco Scan [R] lê a Malha Cinética + lente tática de câmera
  Object.assign(state.player, {
    x: 8.7, y: 5.5, facing: 'right', energy: 100, maxEnergy: 100,
    ability: { cooldowns: {}, dash: null, scanning: 0 },
  });
  camera.targetZoom = 1.3;
  camera.zoom = 1.3;
  snapCameraTo(state.player.x, state.player.y, nucleoMap);
  const camCorredorX = camera.x;

  press('r');
  closeDialogue();
  qState = getQuestState(state.progress, 'sincronia_dos_vetores');
  assert.equal(qState.objectives[0].done, true, 'objetivo 1 (ler janela cinética com R) concluído');
  for (let i = 0; i < 25; i++) {
    updateCamera(0.05, state.player.x, state.player.y, null, nucleoMap, {
      ability: state.player.ability,
      flags: state.progress.flags,
      form: state.player.nucleoForm,
    });
  }
  assert(camera.x > camCorredorX + 5, 'câmera antecipa a Malha Cinética no corredor de aceleração');
  assert(camera.zoom > camera.targetZoom * 1.03, 'Eco Scan aplica lente tática de câmera');

  // Etapa 2: Pulso Veloz [Q] atravessa a Malha Cinética no vão duplo
  state.player.ability.cooldowns = {};
  press('q');
  for (let i = 0; i < 30 && state.player.ability?.dash; i++) updateAbilities(0.03);
  qState = getQuestState(state.progress, 'sincronia_dos_vetores');
  assert.equal(qState.objectives[1].done, true, 'objetivo 2 (atravessar Malha Cinética com Q) concluído');
  assert(state.player.x > 10.85, 'Pulso Veloz cruza a divisória x=10');

  // Etapa 3: coletar Fragmento de Eco no Relicário de Vetor
  const fragNucleo = state.collectibles.find(c => c.id === 'fragmento_eco_nucleo');
  Object.assign(state.player, { x: fragNucleo.x, y: fragNucleo.y });
  assert(collectItem(fragNucleo), 'fragmento_eco_nucleo coletado');
  closeDialogue();
  qState = getQuestState(state.progress, 'sincronia_dos_vetores');
  assert.equal(qState.objectives[2].done, true, 'objetivo 3 (coletar fragmento Núcleo) concluído');

  // Etapa 4: sincronizar o fragmento no Eixo de Adaptação
  const eixo = state.objects.find(o => o.id === 'nucleo_adaptacao');
  Object.assign(state.player, { x: eixo.x, y: eixo.y + 1.7, health: 45, maxHealth: 100, energy: 30, maxEnergy: 100 });
  await checkInteractions(true);
  advanceDialogue();
  elements.dialogueChoices.children[0].click();
  closeDialogue();
  assert.equal(state.progress.flags.base_vetores_sincronizada, true, 'base_vetores_sincronizada gravada');
  assert.equal(state.progress.flags.missao_nucleo_concluida, true, 'recompensa da Sincronia dos Vetores concedida');
  assert(state.progress.inventory.includes('selo_vetor_nucleo'), 'selo_vetor_nucleo entregue no inventário');
  assert.equal(state.player.health, 100, 'sincronização restaura integridade do operador');
  assert.equal(state.player.energy, 100, 'sincronização restaura energia do operador');

  // Regulador de Inércia opcional (+25 XP)
  const regulador = state.objects.find(o => o.id === 'regulador_inercia_nucleo');
  Object.assign(state.player, { x: regulador.x, y: regulador.y - 1.2 });
  await checkInteractions(true);
  closeDialogue();
  assert.equal(state.progress.flags.regulador_inercia_nucleo_calibrado, true, 'regulador de inércia calibrado');

  // Mirante dos Anéis: alterna lente panorâmica de câmera
  const mirante = state.objects.find(o => o.id === 'mirante_vetores_nucleo');
  Object.assign(state.player, { x: mirante.x, y: mirante.y + 1.2 });
  await checkInteractions(true);
  closeDialogue();
  assert.equal(state.progress.flags.observatorio_vetores_nucleo, true, 'Lente Panorâmica dos Anéis ativada');
  camera.zoom = 1.3;
  for (let i = 0; i < 30; i++) {
    updateCamera(0.05, 4.5, 2.2, null, nucleoMap, { ability: {}, flags: state.progress.flags, form: null });
  }
  assert(camera.zoom < camera.targetZoom * 0.90, 'Mirante abre o zoom panorâmico sobre o Eixo de Adaptação');

  // Contrapeso do Viaduto: exige nível 4 + Quebra Sistemas + leitura [R] + impacto [Q]
  const contrapeso = state.objects.find(o => o.id === 'contrapeso_viaduto');
  assert.equal(contrapeso.bloqueia, true, 'contrapeso inicia bloqueando');
  assert(!state.progress.flags.rota_viaduto_vetores_aberta, 'rota do viaduto inicia fechada');
  Object.assign(state.player, {
    x: contrapeso.x, y: contrapeso.y - 1.5, facing: 'down', energy: 100, maxEnergy: 100,
    nucleoForm: null, nucleoRuntime: { remaining: 0, recharge: 0 },
    ability: { cooldowns: {}, dash: null, scanning: 0, cast: null, effect: null },
  });
  press('r');
  closeDialogue();
  assert.equal(state.progress.flags.scan_contrapeso_nucleo, true, 'Eco Scan lê o ponto de carga do contrapeso');
  assert(!toggleNucleoForm(state.progress, state.player, 'forma_bruta'), 'Quebra Sistemas não transforma abaixo do nível 4');
  press('q');
  for (let i = 0; i < 30 && state.player.ability?.dash; i++) updateAbilities(0.03);
  assert(!isGateOpen(contrapeso), 'Pulso Veloz não parte contrapeso de peso');

  // Sobe ao nível 4 e assume a Quebra Sistemas para demolir com Q
  state.progress.archetypeProgress.nucleo_dez_forma.level = 4;
  Object.assign(state.player, {
    x: contrapeso.x, y: contrapeso.y - 1.5, facing: 'down', energy: 100, maxEnergy: 100,
    nucleoForm: null, nucleoRuntime: { remaining: 0, recharge: 0 },
    ability: { cooldowns: {}, dash: null, scanning: 0, cast: null, effect: null },
  });
  assert(toggleNucleoForm(state.progress, state.player, 'forma_bruta'), 'Quebra Sistemas transforma no nível 4');
  state.player.ability.effect = null;
  press('q');
  for (let i = 0; i < 40 && state.player.ability?.cast; i++) updateAbilities(0.03);
  assert(isGateOpen(contrapeso), 'Pancada de Peso [Q] parte o contrapeso após leitura');
  assert.equal(contrapeso.sprite, 'nucleo_sala_contrapeso_liberado', 'contrapeso troca para sprite liberado');
  assert.equal(contrapeso.bloqueia, true, 'contrapeso partido vira entulho sólido; a rota livre é o portal, não o corpo da bigorna');
  assert.equal(state.progress.flags.rota_viaduto_vetores_aberta, true, 'rota_viaduto_vetores_aberta ativada');
  assert(state.player.ability?.massFlash?.timeLeft > 0, 'demolição dispara flash de massa');

  // Travessia física: sala_nucleo -> viaduto_dos_vetores -> ilha_estacao_bio
  const portalIda = state.portals.find(p => p.id === 'entrada_viaduto_vetores');
  assert(portalIda && portalIda.destino?.mapId === 'viaduto_dos_vetores', 'eclusa leste aponta para o Viaduto dos Vetores');
  await loadMap(portalIda.destino.mapId, portalIda.destino.spawnId);
  assert.equal(state.world.currentMap.id, 'viaduto_dos_vetores', 'chegou ao Viaduto dos Vetores');
  assert.equal(state.world.currentMap.meta?.sideView, true, 'Viaduto usa perspectiva side-view');
  assert(canStandAt(state.world.currentMap, state.player.x, state.player.y, 0.25, state.player), 'spawn do viaduto caminhável');
  assert.equal(state.progress.flags.visitou_viaduto_vetores, true, 'visita ao viaduto registrada');

  const terminal = state.objects.find(o => o.id === 'terminal_carga_viaduto');
  Object.assign(state.player, { x: terminal.x, y: terminal.y + 1.2, nucleoForm: null });
  await checkInteractions(true);
  closeDialogue();
  assert.equal(state.progress.flags.terminal_carga_viaduto_registrado, true, 'terminal de carga registra passagem');

  const registro = state.collectibles.find(c => c.id === 'registro_vetor_externo');
  Object.assign(state.player, { x: registro.x, y: registro.y });
  assert(collectItem(registro), 'registro_vetor_externo coletável no viaduto');
  closeDialogue();
  assert(state.progress.inventory.includes('registro_vetor_externo'), 'registro_vetor_externo no inventário');
  assert.equal(state.progress.flags.collected_registro_vetor_externo, true, 'flag de coletado gravada');

  const portalEstacao = state.portals.find(p => p.id === 'chegada_estacao_bio_viaduto');
  assert(portalEstacao && portalEstacao.destino?.mapId === 'ilha_estacao_bio', 'viaduto aponta para a Estação que Respira');
  await loadMap(portalEstacao.destino.mapId, portalEstacao.destino.spawnId);
  assert.equal(state.world.currentMap.id, 'ilha_estacao_bio', 'chegou à Estação que Respira pelo viaduto');
  assert(canStandAt(state.world.currentMap, state.player.x, state.player.y, 0.25, state.player), 'spawn vindo_do_viaduto caminhável na Estação');
  const portalVoltaEstacao = state.portals.find(p => p.id === 'retorno_viaduto_vetores');
  assert(portalVoltaEstacao && portalVoltaEstacao.destino?.mapId === 'viaduto_dos_vetores', 'Estação tem portal recíproco de volta ao viaduto');
  assert.equal(portalVoltaEstacao.requiresFlag, 'rota_viaduto_vetores_aberta', 'retorno da Estação exige a rota liberada');

  await loadMap('viaduto_dos_vetores', 'vindo_da_estacao');
  const portalVoltaBase = state.portals.find(p => p.id === 'retorno_base_vetores');
  assert(portalVoltaBase && portalVoltaBase.destino?.mapId === 'sala_nucleo', 'viaduto tem portal de retorno à Base dos Vetores');
  await loadMap(portalVoltaBase.destino.mapId, portalVoltaBase.destino.spawnId);
  assert.equal(state.world.currentMap.id, 'sala_nucleo', 'retornou à Base dos Vetores pelo viaduto');
  assert(canStandAt(state.world.currentMap, state.player.x, state.player.y, 0.25, state.player), 'spawn vindo_do_viaduto caminhável na Base');

  // Persistência entre visitas: gates abertos, missão concluída, sem recompensa duplicada
  const selosAntes = state.progress.inventory.filter(id => id === 'selo_vetor_nucleo').length;
  await loadMap('sala_nucleo', 'vindo_do_aeroporto');
  const malhaReload = state.objects.find(o => o.id === 'malha_cinetica_sala');
  const contrapesoReload = state.objects.find(o => o.id === 'contrapeso_viaduto');
  assert(isGateOpen(malhaReload), 'Malha Cinética continua aberta ao recarregar');
  assert(isGateOpen(contrapesoReload), 'Contrapeso continua partido ao recarregar');
  assert.equal(contrapesoReload.sprite, 'nucleo_sala_contrapeso_liberado', 'sprite liberado persiste');
  qState = getQuestState(state.progress, 'sincronia_dos_vetores');
  assert.equal(qState.status, 'completed', 'missão permanece concluída');
  assert.equal(state.progress.inventory.filter(id => id === 'selo_vetor_nucleo').length, selosAntes, 'selo não duplica ao recarregar');

  // Prompt contextual do contrapeso antes do nível 4
  state.progress.archetypeProgress.nucleo_dez_forma.level = 1;
  state.progress.flags.scan_contrapeso_nucleo = true;
  state.progress.flags.base_vetores_sincronizada = true;
  const contrapesoPrompt = state.objects.find(o => o.id === 'contrapeso_viaduto');
  contrapesoPrompt.aberto = false;
  contrapesoPrompt.bloqueia = true;
  delete state.progress.flags.gate_contrapeso_viaduto;
  Object.assign(state.player, { x: contrapesoPrompt.x, y: contrapesoPrompt.y - 1.5, nucleoForm: null });
  const nearest = findNearestInteraction();
  assert(nearest && nearest.data.id === 'contrapeso_viaduto', 'contrapeso é a interação mais próxima');
  assert(getInteractionPrompt(nearest).includes('NÍVEL 4'), 'prompt do contrapeso exige Quebra Sistemas nível 4');

  console.log('sala_nucleo: missão sincronia_dos_vetores, câmera multi-perspectiva, Quebra Sistemas nível 4 e rota física Viaduto -> Estação OK');
}

console.log('Salas de Missão: spawn, protocolo, persistência e fragmentos OK.');
