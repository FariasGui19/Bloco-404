// js/data/elevator.js
// =====================================================================
//  ANDARES DO ELEVADOR (de cima para baixo, como um painel real)
//  bloqueado: true → aparece com cadeado e mostra a "mensagem"
// =====================================================================
export const ANDARES = [
  {
    andar: '404',
    nome: '???',
    mapId: 'hub_piso_404',
    spawnId: 'elevador',
    bloqueado: true,
    mensagem: 'ACESSO NEGADO. ESTE ANDAR NÃO DEVERIA EXISTIR.',
  },
  {
    andar: '2',
    nome: 'SETOR SCI-FI',
    mapId: 'hub_piso_02',
    spawnId: 'elevador',
    bloqueado: true,
    mensagem: 'ANDAR SEM ENERGIA. MANUTENÇÃO EM ANDAMENTO.',
  },
  {
    andar: '1',
    nome: 'SETOR ANIME',
    mapId: 'hub_setor_anime',
    spawnId: 'vindo_do_saguao',
  },
  {
    andar: 'T',
    nome: 'HALL DOS ELEVADORES',
    mapId: 'hub_elevadores',
    spawnId: 'elevador',
  },
];