// Setor explorável da Estação Bio. Conceito em assets/concepts não é geometria jogável.
// 0.3.6: margens de canal, fundações sob as máquinas, escala revista, rota de missão
// desenhada no piso e fechamento explícito da primeira missão do setor.
import { buildGround } from '../../ground.js';

const size = 72;

// Canais de água: duas faixas retas com uma travessia estreita (deck) e uma
// passagem de terra larga por trecho. O deck é walkable; a água, não.
const canalVertical = (x, y) => (x === 25 || x === 26) && y >= 7 && y <= 64 && !(y >= 47 && y <= 52);
const canalHorizontal = (x, y) => (y === 39 || y === 40) && x >= 31 && x <= 65 && !(x >= 60 && x <= 63);
const deckPatio = (x, y) => x >= 24 && x <= 27 && y >= 19 && y <= 20;
const deckEstufa = (x, y) => x >= 45 && x <= 46 && y >= 38 && y <= 41;

const rows = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
  if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) return 'X';
  if (deckPatio(x, y)) return 'B';   // ponte no eixo X, sobre o canal vertical
  if (deckEstufa(x, y)) return 'b';  // ponte no eixo Y, sobre o canal horizontal
  if (canalVertical(x, y) || canalHorizontal(x, y)) return 'Y';
  return (x + y) % 5 === 0 ? 'T' : 'S';
}).join(''));

const ground = buildGround({ sheet: 'BEACH_FLOOR_SPRITE', rows, legend: {
  S: { tiles: [[0, 0]], walk: true },
  T: { tiles: [[1, 0]], walk: true },
  B: { tiles: [[1, 3]], walk: true, flip: true },
  b: { tiles: [[1, 3]], walk: true },
  Y: { tiles: [[1, 1]], walk: false },
  X: { tiles: [[1, 1]], walk: false },
} });

const bioBridges = [
  { id: 'bio_ponte_patio', axis: 'x', x0: 24, x1: 27, y0: 19, y1: 20, deck: 'B' },
  { id: 'bio_ponte_estufa', axis: 'y', x0: 45, x1: 46, y0: 38, y1: 41, deck: 'b' },
];

function gerarGuardaCorpos(ponte) {
  const alongX = ponte.axis === 'x';
  const inicio = alongX ? ponte.x0 : ponte.y0;
  const fim = (alongX ? ponte.x1 : ponte.y1) + 1;
  const longinquo = alongX ? ponte.y0 : ponte.x0;
  const proximo = (alongX ? ponte.y1 : ponte.x1) + 1;
  const trilhos = [];
  for (let t = inicio; t <= fim; t++) {
    for (const [side, coord] of [['longe', longinquo], ['perto', proximo]]) {
      trilhos.push({
        id: `${ponte.id}_${side}_${t}`,
        x: alongX ? t : coord,
        y: alongX ? coord : t,
        axis: ponte.axis, side, ultimo: t === fim, bridgeId: ponte.id,
        renderType: 'bioRail',
      });
    }
  }
  return trilhos;
}
const bioBridgeRails = bioBridges.flatMap(gerarGuardaCorpos);

// Margens baixas geradas em 0.3.6: ficam na terra, nunca sobre o tabuleiro.
// São peças rente ao chão (sem colisão), para dar borda real aos canais.
const margensBaixas = [];
for (const y of [9, 13, 17, 24, 28, 33, 43, 55, 59, 63]) {
  margensBaixas.push({ x: 24, y, espelhar: false });
  margensBaixas.push({ x: 27, y, espelhar: true });
}
for (const x of [33, 37, 41, 50, 55, 64]) {
  margensBaixas.push({ x, y: 38, espelhar: false });
  margensBaixas.push({ x, y: 41, espelhar: true });
}

// Fundações geradas em 0.3.6: cada máquina recebe uma placa do tamanho dela,
// desenhada antes do objeto (depthOffset negativo) para não "flutuar".
const fundacoes = [
  ['bio_terminal_principal', 12, 8, 360],
  ['bio_estufa_principal', 58, 47, 300],
  ['bio_reator_patio', 38, 17, 118],
  ['bio_reparo_condutor', 18, 14, 86],
  ['bio_reparo_regulador', 39, 21, 86],
  ['bio_no_condutor', 20, 14, 86],
  ['bio_no_regulador', 41, 23, 86],
  ['bio_valvula_estufa', 55, 53, 86],
  ['bio_plataforma_tecnica', 33, 26, 150],
];

// Rede de pressão e rota da missão: polilinhas em coordenadas de tile, sempre
// sobre piso/deck. O estado vem dos reparos; nenhum item é concedido.
const bioNetwork = {
  paths: [
    [[18, 14], [20, 14], [20, 19], [24, 19], [27, 19], [34, 19], [34, 23], [41, 23]],
    [[39, 21], [39, 23], [41, 23]],
    [[41, 23], [45, 23], [45, 38], [45, 41], [50, 41], [50, 45], [50, 53], [55, 53]],
  ],
  nodes: [
    { id: 'bio_no_condutor', x: 20, y: 14 },
    { id: 'bio_no_regulador', x: 41, y: 23 },
    { id: 'bio_valvula_estufa', x: 55, y: 53 },
  ],
};
const bioRoute = {
  path: [
    [9, 10], [15, 15], [18, 14], [20, 14], [20, 19], [24, 19], [27, 19],
    [34, 19], [39, 21], [41, 23], [45, 23], [45, 38], [45, 41],
    [50, 41], [50, 50], [55, 53],
  ],
  stages: [
    { ate: 4, flag: 'gate_bio_reparo_condutor' },
    { ate: 8, flag: 'gate_bio_reparo_regulador' },
    { ate: 13, flag: 'bio_valvula_estufa_diagnostico' },
    { ate: 15, flag: 'gate_bio_valvula_estufa' },
  ],
};

<<<<<<< HEAD
const objects = [];

// Fundações primeiro: depthOffset negativo garante que fiquem atrás da máquina.
for (const [alvo, x, y, larguraPx] of fundacoes) {
  objects.push({
    id: `bio_fundacao_${alvo}`, tipo: 'decoracao', x, y, sprite: 'bio_fundacao',
    useCrop: true, larguraPx, pivotX: .5, pivotY: 1, depthOffset: -.65,
    filter: 'brightness(.82) saturate(.9)', bloqueia: false,
  });
}

// Margens baixas: apoio rente ao solo, sem hitbox (não obstruem a rota).
margensBaixas.forEach((m, i) => objects.push({
  id: `bio_margem_baixa_${i}`, tipo: 'decoracao', x: m.x, y: m.y,
  sprite: 'bio_margem_baixa', useCrop: true, larguraPx: 92,
  pivotX: .5, pivotY: 1, espelhar: m.espelhar, depthOffset: -.25,
  filter: 'brightness(.8) saturate(.9)', bloqueia: false,
}));

objects.push(
  // Pegada medida a partir do PNG (800x532 a 460 px de largura): ~7 tiles por eixo.
  { id: 'bio_terminal_principal', tipo: 'decoracao', x: 12, y: 8, sprite: 'bio_terminal', useCrop: true,
    larguraPx: 460, pivotX: .5, pivotY: 1, depthLayers: { count: 6, back: -9, front: 1.5 },
    sombra: [96, 32], bloqueia: true,
    hitbox: { offsetX: -7, offsetY: -7, width: 7, height: 7 } },
  { id: 'bio_reator_patio', tipo: 'decoracao', x: 38, y: 17, sprite: 'bio_reator', useCrop: true,
    larguraPx: 116, pivotX: .5, pivotY: 1, sombra: [26, 11], depthLayers: { count: 4, back: -1.6, front: .4 },
=======
const objects = [
  // Escala e pegada ampliadas juntas; peça única ordenada atrás da fachada.
  // A entrada de controle fica fora da base sólida, em 16,12.
  { id: 'bio_terminal_principal', tipo: 'decoracao', x: 14, y: 11, sprite: 'bio_terminal', useCrop: true,
    larguraPx: 520, pivotX: .5, pivotY: 1, depthOffset: -1.5,
    sombra: [120, 38], bloqueia: true,
    hitbox: { offsetX: -8, offsetY: -8, width: 8.1, height: 8.1 } },
  { id: 'bio_reator_patio', tipo: 'decoracao', x: 38, y: 17, sprite: 'bio_reator', useCrop: true,
    larguraPx: 150, pivotX: .5, pivotY: 1, sombra: [32, 13], depthLayers: { count: 4, back: -1.6, front: .4 },
>>>>>>> e5736762ec637ebe671540515d65b30b7c6323f4
    bloqueia: true, hitbox: { offsetX: -1.25, offsetY: -1.25, width: 1.25, height: 1.25 } },
  { id: 'bio_estufa_principal', tipo: 'decoracao', x: 58, y: 47, sprite: 'bio_estufa', useCrop: true,
    larguraPx: 390, pivotX: .5, pivotY: 1, sombra: [104, 36], depthLayers: { count: 6, back: -7.5, front: 1 },
    filterOnFlag: 'gate_bio_valvula_estufa', filterOn: 'brightness(1.10) saturate(1.10)',
    bloqueia: true, hitbox: { offsetX: -5.6, offsetY: -5.6, width: 6, height: 6 } },
);

// A cabeceira alta de 0.3.5 virou "lápide" sobre a ponte. Ficam só duas,
// pequenas e nas pontas dos canais, longe de qualquer tabuleiro.
for (const [id, x, y, espelhar] of [
  ['bio_cabeceira_norte', 24, 7, false],
  ['bio_cabeceira_oeste', 30, 38, true],
]) objects.push({ id, tipo: 'decoracao', x, y, sprite: 'bio_cabeceira', useCrop: true,
<<<<<<< HEAD
  larguraPx: 54, pivotX: .5, pivotY: 1, espelhar, filter: 'brightness(.7) saturate(.85)',
  sombra: [20, 8], bloqueia: true,
  hitbox: { offsetX: -.3, offsetY: -.3, width: .6, height: .6 } });
=======
  larguraPx: 64, pivotX: .5, pivotY: 1, espelhar, filter: 'brightness(.78) saturate(.88)',
  sombra: [25, 10], bloqueia: true,
  hitbox: { offsetX: -.35, offsetY: -.35, width: .7, height: .7 } });
>>>>>>> e5736762ec637ebe671540515d65b30b7c6323f4

// Nós da rede. O da estufa é o passo final da primeira missão do setor.
for (const node of bioNetwork.nodes) {
  const objeto = {
    id: node.id, tipo: 'obstaculo', nome: 'DISTRIBUIDOR DE PRESSÃO', x: node.x, y: node.y,
    sprite: 'bio_distribuidor', useCrop: true, larguraPx: 72, pivotX: .5, pivotY: 1,
    sombra: [24, 10], bloqueia: true,
    hitbox: { offsetX: -.34, offsetY: -.34, width: .68, height: .68 },
  };
  if (node.id === 'bio_valvula_estufa') {
    objeto.nome = 'VÁLVULA DA ESTUFA';
    objeto.moduleSystem = {
      id: 'bio_valvula_estufa', diagnosisFlag: 'bio_valvula_estufa_diagnostico',
      requiresFlag: 'gate_bio_reparo_regulador', allowedArchetypes: ['motor_bio_forja'],
      distance: 2.2, label: 'DIAGNOSTICAR VÁLVULA DA ESTUFA', speaker: 'LINK BIO-FORJA',
      dialogue: [
        'LINHA DE PRESSÃO ATIVA ATÉ A ESTUFA.',
        'A VÁLVULA AINDA OPERA EM REGIME PARCIAL.',
        'USE E PARA ABRIR O FLUXO E REGISTRAR A LEITURA DO SETOR.',
      ],
    };
    objeto.interacao = { label: 'ABRIR FLUXO PARCIAL', distancia: 1.65 };
    objeto.filterOnFlag = 'gate_bio_valvula_estufa';
    objeto.filterOn = 'brightness(1.22) saturate(1.25)';
    objeto.gate = {
      anyOf: [{ arquetipo: 'motor_bio_forja' }],
      requiresFlag: 'bio_valvula_estufa_diagnostico',
      prerequisiteFlag: 'gate_bio_reparo_regulador',
      diagnosisArchetype: 'motor_bio_forja',
      falhaDiagnostico: ['USE R PARA DIAGNOSTICAR A VÁLVULA ANTES DE ABRIR O FLUXO.'],
      falhaPrerequisito: ['A LINHA AINDA ESTÁ FRIA. REPARE O CONDUTOR E O REGULADOR PRIMEIRO.'],
      promptPrerequisito: 'REPARE A LINHA PRIMEIRO',
      falha: ['ESTE SISTEMA EXIGE BIO-FORJA.'],
      sucesso: [
        'FLUXO PARCIAL ABERTO. A REDE RESPONDE ATÉ A ESTUFA.',
<<<<<<< HEAD
        'PRIMEIRA MISSÃO DO SETOR INICIAL: CONCLUÍDA. LEITURA REGISTRADA NO DIÁRIO.',
        'O NÚCLEO PROFUNDO CONTINUA PARA UMA MISSÃO FUTURA. SEM RECOMPENSA OU DESBLOQUEIO.',
=======
        'O INTERIOR REAGE, MAS O NÚCLEO AINDA PEDE UMA RECONSTRUÇÃO MAIS PROFUNDA.',
        'RETORNE AO TERMINAL E ENTRE NA SALA DE CONTROLE PARA SINCRONIZAR A LINHA.',
>>>>>>> e5736762ec637ebe671540515d65b30b7c6323f4
      ],
      manterVisivel: true, manterColisao: true,
    };
  }
  objects.push(objeto);
}

// Reparo opcional em sequência, independente dos coletáveis antigos e do save.
for (const cfg of [
  { id: 'bio_reparo_condutor', x: 18, y: 14, nome: 'CONDUTOR DA ESTAÇÃO', broken: 'bio_condutor_quebrado', fixed: 'bio_condutor_ativo', diagnosis: 'bio_reparo_condutor_diagnostico', label: 'CONDUTOR',
    dialogue: ['CONDUTOR INTERROMPIDO. PRESSIONE E PARA RECONSTRUIR.', 'DEPOIS, PROCURE O REGULADOR NO PÁTIO.'], success: ['CONDUTOR RESTAURADO. O REGULADOR DO PÁTIO AGORA PODE SER DIAGNOSTICADO.'] },
  { id: 'bio_reparo_regulador', x: 39, y: 21, nome: 'REGULADOR DO PÁTIO', broken: 'bio_regulador_quebrado', fixed: 'bio_regulador_ativo', diagnosis: 'bio_reparo_regulador_diagnostico', prerequisite: 'gate_bio_reparo_condutor', label: 'REGULADOR',
    dialogue: ['PRESSÃO INSTÁVEL. USE E PARA RECONSTRUIR A VÁLVULA.'], success: ['REGULADOR RECONSTRUÍDO. A LINHA DE PRESSÃO FOI RESTABELECIDA.'] },
]) objects.push({ id: cfg.id, tipo: 'obstaculo', nome: cfg.nome, x: cfg.x, y: cfg.y, sprite: cfg.broken, scale: .27,
  bloqueia: true, hitbox: { offsetX: -.35, offsetY: -.35, width: .7, height: .7 },
  moduleSystem: { id: cfg.id, diagnosisFlag: cfg.diagnosis, requiresFlag: cfg.prerequisite, allowedArchetypes: ['motor_bio_forja'], distance: 2.2, label: `DIAGNOSTICAR ${cfg.label}`, speaker: 'LINK BIO-FORJA', dialogue: cfg.dialogue },
  interacao: { label: `RECONSTRUIR ${cfg.label}`, distancia: 1.65 },
  gate: { anyOf: [{ arquetipo: 'motor_bio_forja' }], requiresFlag: cfg.diagnosis, prerequisiteFlag: cfg.prerequisite, diagnosisArchetype: 'motor_bio_forja',
    falhaDiagnostico: ['USE R PARA DIAGNOSTICAR ESTE SISTEMA ANTES DE RECONSTRUIR.'],
    falhaPrerequisito: ['A LINHA ESTÁ SEM ENERGIA. REPARE O CONDUTOR DA CHEGADA PRIMEIRO.'], promptPrerequisito: 'REPARE O CONDUTOR PRIMEIRO',
    falha: ['ESTE SISTEMA EXIGE BIO-FORJA.'], sucesso: cfg.success, manterVisivel: true, manterColisao: true, spriteAberto: cfg.fixed } });

// Vegetação industrial de baixa altura, distribuída junto aos caminhos.
for (const [id, x, y, sprite, scale] of [
<<<<<<< HEAD
  ['bio_vida_cano_entrada', 20, 13, 'bio_mato_cano', .21],
  ['bio_vida_ventilacao_patio', 34, 16, 'bio_mato_ventilacao', .19],
  ['bio_vida_barris_patio', 40, 25, 'bio_mato_barris', .20],
  ['bio_vida_fissura_trilha', 43, 32, 'bio_mato_fissura', .18],
  ['bio_vida_cano_estufa', 52, 44, 'bio_mato_cano', .21],
  ['bio_vida_barris_estufa', 57, 52, 'bio_mato_barris', .20],
]) objects.push({ id, tipo: 'decoracao', x, y, sprite, scale, bloqueia: true, hitbox: { offsetX: -.3, offsetY: -.3, width: .6, height: .6 } });

objects.push({ id: 'bio_plataforma_tecnica', tipo: 'decoracao', x: 33, y: 26, sprite: 'bio_plataforma', scale: .24,
  depthOffset: -.6, sombra: [40, 16], bloqueia: true, hitbox: { offsetX: -2, offsetY: -2, width: 2, height: 2 } });
=======
  ['bio_vida_cano_entrada', 20, 13, 'bio_mato_cano', .23],
  ['bio_vida_ventilacao_patio', 34, 16, 'bio_mato_ventilacao', .21],
  ['bio_vida_barris_patio', 40, 25, 'bio_mato_barris', .22],
  ['bio_vida_fissura_trilha', 43, 32, 'bio_mato_fissura', .20],
  ['bio_vida_cano_estufa', 51, 48, 'bio_mato_cano', .23],
  ['bio_vida_barris_estufa', 57, 52, 'bio_mato_barris', .22],
]) objects.push({ id, tipo: 'decoracao', x, y, sprite, scale, bloqueia: true, hitbox: { offsetX: -.3, offsetY: -.3, width: .6, height: .6 } });

objects.push({ id: 'acesso_controle_bio', tipo: 'decoracao', x: 16, y: 12, bioMarker: 'CONTROLE', bloqueia: false });
objects.push({ id: 'estacao_cabo_chegada', tipo: 'decoracao', x: 8, y: 13, cableStation: 'PRAIA', bloqueia: false });

objects.push({ id: 'bio_plataforma_tecnica', tipo: 'decoracao', x: 33, y: 26, sprite: 'bio_plataforma', scale: .28,
  depthOffset: -.6, sombra: [46, 18], bloqueia: true, hitbox: { offsetX: -2, offsetY: -2, width: 2, height: 2 } });
>>>>>>> e5736762ec637ebe671540515d65b30b7c6323f4
for (const [id, x, y, sprite, scale] of [
  ['bio_margem_canto_entrada', 8, 17, 'bio_margem_canto', .17],
  ['bio_margem_cano_patio', 29, 22, 'bio_margem_cano', .16],
  ['bio_margem_ruina_trilha', 50, 29, 'bio_margem_ruina', .15],
  ['bio_margem_mureta_estufa', 48, 54, 'bio_margem_mureta', .16],
]) objects.push({ id, tipo: 'decoracao', x, y, sprite, scale, depthOffset: -.4, bloqueia: true,
  hitbox: { offsetX: -.4, offsetY: -.4, width: .8, height: .8 } });

for (const [id, x, y, sprite, scale] of [
  ['bio_modulo_floreira_entrada', 18, 11, 'bio_floreira', .20],
  ['bio_modulo_luz_entrada', 19, 18, 'bio_luminaria', .20],
  ['bio_modulo_tubos_patio', 33, 15, 'bio_tubos', .20],
  ['bio_modulo_caixa_patio', 38, 25, 'bio_caixa', .18],
  ['bio_modulo_floreira_patio', 42, 23, 'bio_floreira', .19],
  ['bio_modulo_luz_trilha', 49, 32, 'bio_luminaria', .20],
  ['bio_modulo_caixa_estufa', 53, 52, 'bio_caixa', .18],
  ['bio_modulo_floreira_estufa', 56, 50, 'bio_floreira', .20],
]) objects.push({ id, tipo: 'decoracao', x, y, sprite, scale, bloqueia: true,
  hitbox: { offsetX: -.35, offsetY: -.35, width: .7, height: .7 } });

for (let y = 5; y < 68; y += 6) for (let x = 5; x < 68; x += 6) {
  const n = (x * 97 + y * 131 + x * y * 17) % 11;
  if (n > 5 || (x > 20 && x < 32 && y > 12 && y < 28) || (x > 39 && x < 53 && y > 33 && y < 46) || (x < 20 && y < 22) || (x > 29 && x < 42 && y > 12 && y < 25) || (x > 42 && x < 58 && y > 42 && y < 57)) continue;
  const px = x + ((x * y) % 5 - 2) * .4, py = y + ((x + 2 * y) % 5 - 2) * .4;
  if (ground.walkMask[Math.floor(py + .5)]?.[Math.floor(px + .5)] !== '.') continue;
  if (n > 2) continue; // menos árvores isoladas no complexo industrial
  objects.push({ id: `estacao_planta_${x}_${y}`, tipo: 'decoracao', x: px, y: py, sprite: 'vegetacao_tropical', frame: { col: n % 2 ? 2 : 3, row: 0 }, useCrop: true, larguraPx: 65 + (x * y) % 35, pivotX: .5, pivotY: 1, bloqueia: false });
}
for (const [id, x, y, label] of [['estacao_chegada', 13, 15, 'CHEGADA'], ['estacao_patio', 36, 20, 'PÁTIO'], ['estacao_estufa', 50, 50, 'ESTUFA']]) objects.push({ id, tipo: 'decoracao', x, y, routeMarker: label, bloqueia: false });

export const map = {
  id: 'ilha_estacao_bio',
  meta: { nome: 'ESTAÇÃO QUE RESPIRA · SETOR INICIAL', tipo: 'exterior', dimensao: 'arquipelago', corFundo: '#1e6384', estiloPiso: 'livre', useBackgroundWalls: true, ambiente: { poeira: 8, cor: '#ffd98a' }, minZoom: .85 },
  corChao: '#e6c280',
  aguaPraia: rows.map(r => r.replaceAll('X', 'D')),
  layout: rows.map(r => [...r].map(c => (c === 'X' || c === 'Y' ? 1 : 0))),
  walkMask: ground.walkMask, pisos: ground.pisos,
<<<<<<< HEAD
  bioBridges, bioBridgeRails, bioNetwork, bioRoute,
  spawnPoints: { inicio: { x: 9.5, y: 10.5 } },
=======
  bioBridges, bioBridgeRails, bioNetwork,
  spawnPoints: { inicio: { x: 9.5, y: 13.5 }, vindo_controle: { x: 16.5, y: 12.5 } },
>>>>>>> e5736762ec637ebe671540515d65b30b7c6323f4
  objects,
  trainingTargets: [{ id: 'simulador_bio_1', x: 33, y: 18, maxHealth: 60 }, { id: 'simulador_bio_2', x: 48, y: 51, maxHealth: 60 }],
  collectibles: [
    { id: 'bio_estacao_condutor', nome: 'CONDUTOR', tipo: 'fragmento', x: 15, y: 15, label: 'EXAMINAR CONDUTOR', dialogue: ['UM CONDUTOR FALHOU NA ESTAÇÃO.', 'PROCURE O REGULADOR NO PÁTIO.'] },
    { id: 'bio_estacao_regulador', nome: 'REGULADOR', tipo: 'fragmento', x: 36, y: 20, requiresFlag: 'collected_bio_estacao_condutor', label: 'AJUSTAR REGULADOR', dialogue: ['A PRESSÃO COMEÇA A ESTABILIZAR.', 'REATIVE A ESTUFA NO SETOR MAIS DISTANTE.'] },
    { id: 'bio_estacao_estufa', nome: 'ESTUFA', tipo: 'fragmento', x: 50, y: 50, requiresFlag: 'collected_bio_estacao_regulador', label: 'ESTABILIZAR ESTUFA', dialogue: ['O PULSO DA ESTAÇÃO SE ESTABILIZA.', 'SETOR INICIAL CONCLUÍDO. O SISTEMA AINDA EXIGE UMA RECONSTRUÇÃO MAIS PROFUNDA.'] },
  ],
<<<<<<< HEAD
  portals: [{ id: 'estacao_voltar', tipo: 'door', x: 8, y: 10, label: 'VOLTAR À PRAIA', labelConcluido: 'RETORNAR · LEITURA REGISTRADA', missaoFlag: 'gate_bio_valvula_estufa', interactionDistance: 1.4, destino: { mapId: 'ilha_praia_inicial', spawnId: 'vindo_da_estacao' }, transition: 'fade' }],
=======
  portals: [{ id: 'entrar_controle_bio', tipo: 'door', x: 16, y: 12, label: 'ENTRAR NA SALA DE CONTROLE', interactionDistance: 1.3, destino: { mapId: 'bio_sala_controle', spawnId: 'inicio' }, transition: 'fade' },
    { id: 'estacao_voltar', tipo: 'door', x: 8, y: 13, label: 'EMBARCAR PARA A PRAIA', interactionDistance: 1.4, destino: { mapId: 'ilha_praia_inicial', spawnId: 'vindo_da_estacao' }, transition: 'fade' }],
>>>>>>> e5736762ec637ebe671540515d65b30b7c6323f4
};
