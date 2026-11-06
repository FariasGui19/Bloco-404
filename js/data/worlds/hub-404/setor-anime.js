export const map = {
  id: 'hub_setor_anime',
  meta: {
    nome: 'PISO 1 - SETOR ANIME',
    tipo: 'interior',
    dimensao: 'hub_404',
    corFundo: '#0f0f14',
  },
  spawnPoints: {
    inicio: { x: 2.5, y: 2.5 },
    chegada_elevador: { x: 4.5, y: 3.5 }, // Ponto onde o player chega vindo do aeroporto
    vindo_do_saguao: { x: 2.5, y: 2.5 },   // Ponto onde surge vindo do Saguão Central
  },
  corChao: '#3a2a3a', 
  layout: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,2,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,0,0,0,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  actors: [
    { id: 'lutador_treinando', x: 6, y: 6, cor: '#ff9f1c', nome: 'Goku', fala: 'Perdi a noção de tempo treinando! A Chichi vai me matar...' },
  ],
  objects: [],
  portals: [
       {
      id: 'chamar_elevador',
      tipo: 'elevator',
      x: 4,
      y: 3,
      label: 'CHAMAR ELEVADOR',
      menu: 'elevador',
    },
  ],
};