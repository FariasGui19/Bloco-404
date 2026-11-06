// js/data/worlds/hub-404/elevadores.js
export const map = {
  id: 'hub_elevadores',

  meta: {
    nome: 'HALL DOS ELEVADORES — BLOCO 404',
    tipo: 'interior',
    dimensao: 'hub_404',
    alturaParede: 1.5,
    corFundo: '#0b0d12',
    estiloPiso: 'placas',                    // chão com a folha de placas
    ambiente: { poeira: 30, cor: '#35E6D3' },
  },

  spawnPoints: {
    inicio: { x: 6.5, y: 6.6 },
    vindo_do_saguao: { x: 6.5, y: 6.6 },
    elevador: { x: 6.5, y: 3.6 },
  },

  corChao: '#1b1f27',

  //          x: 0  1  2  3  4  5  6  7  8  9 10 11 12
  layout: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  // Placas especiais: 'x,y': [linha, coluna] da folha de chão
  pisos: {
    '3,2': [1, 3],   // plataforma cyan na frente do elevador A
    '6,2': [1, 3],   // elevador B
    '9,2': [1, 3],   // elevador C
    '6,3': [0, 2],   // borda de perigo no meio
    '6,4': [2, 1],   // luz azul central
    '6,5': [2, 0],   // corredor com seta
    '6,6': [2, 0],
    '6,7': [2, 0],
    '6,8': [1, 1],   // saída (colchetes âmbar)
  },

  // Paredes especiais: 'x,y': [linha, coluna] da folha de paredes
  paredes: {
    '1,0': [0, 3],   // listras
    '11,0': [0, 3],
    '0,4': [2, 1],   // quadro elétrico
    '0,7': [0, 2],   // faixa cyan
  },

  actors: [],

  objects: [
    // ---------- 3 elevadores ----------
    {
      id: 'elev_a', tipo: 'porta_elevador', x: 3, y: 1,
      porta: { modo: 'auto' }, scale: 0.45, bloqueia: true,
      hitbox: { offsetX: -0.5, offsetY: -0.3, width: 1.0, height: 0.6 },
      brilho: { cor: '#35E6D3', raio: 1.3, forca: 0.3 },
    },
    {
      id: 'elev_b', tipo: 'porta_elevador', x: 6, y: 1,
      porta: { modo: 'auto' }, scale: 0.45, bloqueia: true,
      hitbox: { offsetX: -0.5, offsetY: -0.3, width: 1.0, height: 0.6 },
      brilho: { cor: '#35E6D3', raio: 1.3, forca: 0.3 },
    },
    {
      // O elevador C "às vezes para em andares que não existem"
      id: 'elev_c', tipo: 'porta_elevador', x: 9, y: 1,
      porta: { modo: 'glitch' }, scale: 0.45, bloqueia: true,
      hitbox: { offsetX: -0.5, offsetY: -0.3, width: 1.0, height: 0.6 },
      brilho: { cor: '#b388ff', raio: 1.3, forca: 0.3 },
    },

    // ---------- Decoração ----------
    {
      id: 'planta_e', tipo: 'planta', x: 1.2, y: 2.4, ajusteY: 9,
      sprite: 'hub_props', frame: { col: 3, row: 1 }, scale: 0.45, anchorY: 0.95,
      bloqueia: true, hitbox: { offsetX: -0.3, offsetY: -0.3, width: 0.6, height: 0.6 },
    },
    {
      id: 'planta_d', tipo: 'planta', x: 11, y: 1, ajusteY: 12,
      sprite: 'hub_props', frame: { col: 3, row: 1 }, scale: 0.45, anchorY: 0.95,
      bloqueia: true, hitbox: { offsetX: -0.3, offsetY: -0.3, width: 0.6, height: 0.6 },
    },
    {
      id: 'poste_e', tipo: 'poste', x: 3.9, y: 3.9, ajusteY: 9,
      sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.45, anchorY: 0.95,
      bloqueia: true, hitbox: { offsetX: -0.15, offsetY: -0.15, width: 0.3, height: 0.3 },
      brilho: { cor: '#35E6D3', raio: 1.6, forca: 0.22 },
    },
    {
      id: 'poste_d', tipo: 'poste', x: 8, y: 4, ajusteY: 1,
      sprite: 'hub_props', frame: { col: 3, row: 2 }, scale: 0.45, anchorY: 0.95,
      bloqueia: true, hitbox: { offsetX: -0.15, offsetY: -0.15, width: 0.3, height: 0.3 },
      brilho: { cor: '#35E6D3', raio: 1.6, forca: 0.22 },
    },
    {
      id: 'banco_e', tipo: 'banco', x: 1.05, y: 5.85, ajusteY: 40,
      sprite: 'hub_props', frame: { col: 1, row: 1 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, hitbox: { offsetX: -0.83, offsetY: -0.7, width: 1.38, height: 0.73 },
    },
    {
      id: 'banco_d', tipo: 'banco', x: 10, y: 6, ajusteY: 26,
      sprite: 'hub_props', frame: { col: 1, row: 1 }, scale: 0.5, anchorY: 0.94,
      bloqueia: true, hitbox: { offsetX: -0.83, offsetY: -0.7, width: 1.38, height: 0.73 },
    },
    {
      id: 'catraca_e', tipo: 'catraca', x: 5.25, y: 7.85, ajusteY: 16,
      sprite: 'hub_props', frame: { col: 1, row: 2 }, scale: 0.42, anchorY: 0.94,
      bloqueia: true, hitbox: { offsetX: -0.35, offsetY: -0.3, width: 0.7, height: 0.6 },
    },
    {
      id: 'catraca_d', tipo: 'catraca', x: 6.6, y: 7.6, ajusteY: 26,
      sprite: 'hub_props', frame: { col: 1, row: 2 }, scale: 0.42, anchorY: 0.94,
      bloqueia: true, hitbox: { offsetX: -0.35, offsetY: -0.3, width: 0.7, height: 0.6 },
    },
    {
      id: 'painel_andares', tipo: 'painel', x: 11, y: 4, ajusteY: 12,
      sprite: 'hub_props', frame: { col: 0, row: 2 }, scale: 0.42, anchorY: 0.94,
      bloqueia: true, hitbox: { offsetX: -0.25, offsetY: -0.25, width: 0.5, height: 0.5 },
      brilho: { cor: '#35E6D3', raio: 1, forca: 0.25 },
      interacao: {
        label: 'LER PAINEL DE ANDARES',
        speaker: 'PAINEL DE ANDARES',
        distancia: 1.4,
        dialogue: [
          'ANDAR 404 — ACESSO NEGADO.',
          'ANDAR 2 — SETOR SCI-FI — SEM ENERGIA.',
          'ANDAR 1 — SETOR ANIME — OPERACIONAL.',
          'TÉRREO — HALL DOS ELEVADORES.',
          'AVISO: O ELEVADOR C ÀS VEZES PARA EM ANDARES QUE NÃO EXISTEM.',
        ],
      },
    },
  ],

  portals: [
    { id: 'chamar_a', tipo: 'elevator', x: 3, y: 2, label: 'CHAMAR ELEVADOR A', menu: 'elevador', interactionDistance: 1.2 },
    { id: 'chamar_b', tipo: 'elevator', x: 6, y: 2, label: 'CHAMAR ELEVADOR B', menu: 'elevador', interactionDistance: 1.2 },
    { id: 'chamar_c', tipo: 'elevator', x: 9, y: 2, label: 'CHAMAR ELEVADOR C', menu: 'elevador', interactionDistance: 1.2 },
    {
      id: 'para_saguao',
      tipo: 'door',
      x: 6,
      y: 8,
      label: 'VOLTAR AO SAGUÃO CENTRAL',
      destino: { mapId: 'hub_saguao', spawnId: 'vindo_dos_elevadores' },
      transition: 'fade',
    },
  ],
}; 