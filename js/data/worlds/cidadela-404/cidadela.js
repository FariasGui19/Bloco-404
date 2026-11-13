// Geometria ortogonal compartilhada pelo raycaster, colisão e minimapa.
// Três eclusas sucessivas garantem uma rota legível sem depender de cor.
const layout = Array.from({ length: 13 }, () => Array(32).fill(1));
for (const [a, b] of [[1, 7], [9, 14], [16, 21], [23, 30]]) {
  for (let y = 2; y <= 10; y++) for (let x = a; x <= b; x++) layout[y][x] = 0;
}
for (const x of [8, 15, 22]) for (let y = 5; y <= 7; y++) layout[y][x] = 0;
// Pilares deixam as salas menos vazias e oferecem cobertura; corredores,
// registros, pontos de chegada e centro da arena permanecem transitáveis.
for (const [x,y] of [[3,3],[3,9],[6,6], [10,3],[12,6],[14,3],
  [17,4],[18,7],[20,9], [25,4],[25,8],[27,3],[27,9]]) layout[y][x] = 1;
export const map = {
  id: 'cidadela_404',
  meta: { nome: 'CIDADELA DO CÓDIGO QUEIMADO', dimensao: 'cidadela_404', camera: 'retro-fps', rules: { abilities: 'adaptadas', stats: 'operador' } },
  layout, spawnPoints: { inicio: { x: 2.5, y: 6.5 } },
  actors: [], objects: [], portals: [], collectibles: [],
};

// Elementos cenográficos não bloqueiam o jogador nem servem de cobertura;
// a geometria de colisão continua expressa exclusivamente em layout.
export const CITADEL_DECOR = [
  {type:'crate',x:2.4,y:2.45,scale:.56}, {type:'barrel',x:3.8,y:10.35,scale:.58},
  {type:'drone',x:5.5,y:10.3,scale:.35}, {type:'column',x:7.4,y:2.5,scale:1.0},
  {type:'generator',x:9.6,y:2.5,scale:.74}, {type:'vent',x:11.3,y:10.3,scale:.65},
  {type:'beacon',x:14.4,y:10.2,scale:.58}, {type:'antenna',x:16.5,y:2.5,scale:.78},
  {type:'crate',x:18.5,y:10.25,scale:.56}, {type:'barrel',x:21.3,y:10.3,scale:.58},
  {type:'generator',x:24.3,y:2.5,scale:.78}, {type:'vent',x:24.2,y:10.25,scale:.65},
  {type:'column',x:29.35,y:10.25,scale:1.0}, {type:'reactor',x:30.4,y:6.5,scale:1.35},
];
export const CITADEL_ARCHIVES = [
  {id:'origem',flag:'cidadela_arquivo_origem',x:4.5,y:2.6,label:'ORIGEM',log:'O PEDIDO FOI OUVIDO ANTES DO ENVIO.'},
  {id:'retorno',flag:'cidadela_arquivo_retorno',x:13.5,y:10.2,label:'RETORNO',log:'ECHOVORE APRENDE COM IMPULSOS E RADAR.'},
  {id:'memoria',flag:'cidadela_arquivo_memoria',x:20.5,y:2.6,label:'MEMÓRIA',log:'FIGURA NOS CRTS. IDENTIDADE NÃO CONFIRMADA.'},
];

// Pontos opcionais de exploração depois da vitória. Não bloqueiam caminhos.
export const CITADEL_POSTGAME = Object.freeze({
  sonda: {kind:'probe',x:24.5,y:6.5,scale:.55},
  transmissor: {kind:'transmitter',x:26.5,y:10.2,scale:.75},
  treino: {kind:'training',x:29.5,y:3.5,scale:.65},
  reles: [
    {kind:'relay',id:'entrada',x:4.5,y:4.4,scale:.65,label:'ENTRADA'},
    {kind:'relay',id:'galeria',x:11.5,y:8.5,scale:.65,label:'GALERIA'},
    {kind:'relay',id:'forja',x:19.5,y:6.5,scale:.65,label:'FORJA'},
  ],
  registros: [
    {kind:'recording',id:'entrada',x:6.5,y:9.5,scale:.42,label:'ENTRADA',log:'A EQUIPE ISOLAVA O RUÍDO, NÃO UMA PESSOA.'},
    {kind:'recording',id:'galeria',x:10.5,y:4.5,scale:.42,label:'GALERIA',log:'A RESPOSTA NÃO IDENTIFICA QUEM A ENVIOU.'},
    {kind:'recording',id:'forja',x:21.35,y:9.5,scale:.42,label:'FORJA',log:'A RETIRADA FOI ORDENADA; O REATOR FICOU.'},
  ],
  decor: [
    {type:'listening_beacon',x:2.6,y:8.15,scale:.55},
    {type:'listening_beacon',x:16.5,y:4.4,scale:.55},
    {type:'signal_fragment',x:27.5,y:10.25,scale:.4},
  ],
});

// Desafios opcionais sem paredes móveis: sair ou morrer cancela a tentativa;
// o selo e o cofre só persistem após a conclusão correspondente.
export const CITADEL_BREACHES = Object.freeze([
  {id:'entrada',label:'ENTRADA',bounds:[1,8],x:7.35,y:7.5,cache:{x:7.35,y:9.5},spawns:[[5.5,7.5],[7.2,9.5],[5.5,10.3]]},
  {id:'galeria',label:'GALERIA',bounds:[9,15],x:14.3,y:5.5,cache:{x:14.4,y:8.5},spawns:[[11.5,5.5],[13.5,7.5],[10.5,9.5]]},
  {id:'forja',label:'FORJA',bounds:[16,22],x:21.35,y:5.5,cache:{x:21.35,y:7.5},spawns:[[19.5,5.5],[20.5,7.5],[17.5,8.5]]},
]);
export const CITADEL_BREACH_CONSOLE = Object.freeze({kind:'breach_console',x:28.5,y:10.25});
