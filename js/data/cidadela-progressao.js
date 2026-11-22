// A progressão é por dimensão e arquétipo. Marcos são finitos e não podem ser
// acumulados repetindo combate, retorno ao mapa ou interação com o mesmo CRT.
export const CITADEL_MILESTONES = Object.freeze([
  ...['azul','amarela','vermelha'].map(id=>`cidadela_chave_${id}`),
  ...['origem','retorno','memoria'].map(id=>`cidadela_arquivo_${id}`),
  ...['entrada','galeria','forja'].map(id=>`cidadela_crt_${id}`),
  'cidadela_estavel','cidadela_rede_concluida','cidadela_vozes_concluida',
  ...['entrada','galeria','forja'].map(id=>`cidadela_fenda_${id}_selada`),
  ...['entrada','galeria','forja'].map(id=>`cidadela_cofre_${id}_aberto`),
  'cidadela_treino_concluido',
  ...['entrada','galeria','forja'].map(id=>`cidadela_eco_${id}`),
  'cidadela_vigilia_concluida',
]);
export const CITADEL_THRESHOLDS = Object.freeze([0,4,9,14]);
export const CITADEL_LOCAL_KITS = Object.freeze({
  mare_astral: Object.freeze([
    {rank:2,icon:'mare-corrente',name:'CORRENTE DE RETORNO',description:'Q CONCEDE ESCUDO POR 1,2s.'},
    {rank:4,icon:'mare-sonar',name:'SONAR PROFUNDO',description:'R DESACELERA MAIS E GERA MENOS ECO.'},
  ]),
  nucleo_dez_forma: Object.freeze([
    {rank:2,icon:'nucleo-vetor',name:'VETOR BLINDADO',description:'Q AVANÇA MAIS E CONCEDE ESCUDO POR 1s.'},
    {rank:4,icon:'nucleo-carga',name:'CARGA DE VETOR',description:'R CARREGA O PRÓXIMO TIRO: +12 DANO / 5s.'},
  ]),
  lamina_dominio_anciao: Object.freeze([
    {rank:2,icon:'dominio-corte',name:'ARCO DE RUPTURA',description:'Q AMPLIA ALCANCE E DANO DO CORTE.'},
    {rank:4,icon:'dominio-guarda',name:'GUARDA DA LEITURA',description:'R CONCEDE GUARDA POR 0,8s.'},
  ]),
  motor_bio_forja: Object.freeze([
    {rank:2,icon:'bio-blindagem',name:'MALHA ADAPTATIVA',description:'Q AMPLIA O ESCUDO PARA 3,5s.'},
    {rank:4,icon:'bio-reparo',name:'REPARO DE CAMPO',description:'Q RESTAURA ATÉ 8 DE VIDA.'},
  ]),
});
