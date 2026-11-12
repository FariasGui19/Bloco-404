// js/data/worlds/hub-404/viaduto-vetores.js
// =====================================================================
// VIADUTO DOS VETORES — ligação exterior da Base dos Vetores (Núcleo 10X)
//
// Passarela de manutenção em side-view 2.5D sobre o canal da Estação que
// Respira. A perspectiva muda na eclusa; a física continua a do mapa
// (layout/walkMask + colisão padrão). Não é um portal temático solto: o
// jogador caminha pelo viaduto e chega ao setor exterior da Estação Bio.
// =====================================================================

const width = 34;
const height = 9;
const layout = Array.from({ length: height }, (_, y) =>
  Array.from({ length: width }, (_, x) => (x >= 1 && x <= 32 && y >= 3 && y <= 6 ? 0 : 1))
);

export const map = {
  id: 'viaduto_dos_vetores',
  meta: {
    nome: 'VIADUTO DOS VETORES — MANUTENÇÃO EXTERNA',
    tipo: 'exterior',
    dimensao: 'hub_404',
    estiloSala: 'viaduto_vetores',
    sideView: true,
    corFundo: '#0a1418',
    minZoom: 0.9,
    ambiente: { poeira: 10, cor: '#9cffb8' },
  },
  corChao: '#1a2422',
  layout,
  walkMask: layout.map(row => row.map(cell => cell === 1 ? '#' : '.').join('')),
  spawnPoints: {
    inicio: { x: 2.5, y: 5.5 },
    vindo_da_base_nucleo: { x: 2.5, y: 5.5 },
    vindo_da_estacao: { x: 29.5, y: 5.5 },
  },
  objects: [
    { id: 'terminal_carga_viaduto', tipo: 'painel', nome: 'TERMINAL DE CARGA DO VIADUTO', x: 7.5, y: 3.4,
      sprite: 'nucleo_sala_terminal_registro', sheetCols: 1, sheetRows: 1, scale: 0.16, anchorY: 0.95,
      bloqueia: true, hitbox: { offsetX: -0.32, offsetY: -0.24, width: 0.64, height: 0.48 },
      brilho: { cor: '#74ff8a', raio: 0.8, forca: 0.22 },
      interacao: { label: 'REGISTRAR PASSAGEM PELO VIADUTO (+25 XP)', speaker: 'TERMINAL DE CARGA', distancia: 1.7 } },
    { id: 'pilar_viaduto_1', tipo: 'decoracao', x: 11.5, y: 3.0,
      sprite: 'nucleo_sala_pilar_cinetico', sheetCols: 1, sheetRows: 1, scale: 0.22, anchorY: 0.95, bloqueia: false },
    { id: 'pilar_viaduto_2', tipo: 'decoracao', x: 22.5, y: 3.0,
      sprite: 'nucleo_sala_pilar_cinetico', sheetCols: 1, sheetRows: 1, scale: 0.22, anchorY: 0.95, bloqueia: false },
  ],
  collectibles: [
    { id: 'registro_vetor_externo', tipo: 'fragmento', nome: 'REGISTRO DE VETOR EXTERNO', x: 18.5, y: 5.5,
      requiresFlag: 'rota_viaduto_vetores_aberta', xpReward: 25, interactionDistance: 1.35,
      label: 'RECOLHER REGISTRO DE VETOR EXTERNO (+25 XP)',
      dialogue: [
        'UMA CÁPSULA DE MANUTENÇÃO GUARDA A PRIMEIRA LEITURA DE VETOR FORA DA BASE.',
        'O VIADUTO NÃO É UM ATALHO: É A PROVA DE QUE SUA FORMA MANIPULA O MUNDO EXTERIOR.',
        'EXPERIÊNCIA DE CAMPO REGISTRADA (+25 XP). SIGA A LESTE PARA A ESTAÇÃO QUE RESPIRA.',
      ] },
  ],
  portals: [
    { id: 'retorno_base_vetores', tipo: 'door', x: 1, y: 5,
      requiresFlag: 'rota_viaduto_vetores_aberta', lockedLabel: 'ECLUSA DA BASE SELADA',
      label: 'RETORNAR À BASE DOS VETORES (NÚCLEO 10X)', interactionDistance: 1.7,
      destino: { mapId: 'sala_nucleo', spawnId: 'vindo_do_viaduto' }, transition: 'fade' },
    { id: 'chegada_estacao_bio_viaduto', tipo: 'door', x: 31, y: 5,
      requiresFlag: 'rota_viaduto_vetores_aberta', lockedLabel: 'ACESSO À ESTAÇÃO SELADO',
      label: 'ENTRAR NA ESTAÇÃO QUE RESPIRA', interactionDistance: 1.7,
      destino: { mapId: 'ilha_estacao_bio', spawnId: 'vindo_do_viaduto' }, transition: 'fade' },
  ],
};
