import { CAIS_SUL } from './cais-sul.js';

// Registro do segundo recorte pelos mastros, lanterna rosa e proa. A origem
// do cais continua intacta: estes pontos usam o mesmo espaço da planta.
const proporcao = .70;
const unidade = CAIS_SUL.escala / proporcao;
export const COSTA_OESTE = {
  x: CAIS_SUL.x - 275*unidade,
  y: CAIS_SUL.y - 390*unidade,
  escala: unidade,
  mar: { id:'mar', x:0, y:0, w:955, h:895 },
  areia: { id:'areia', x:120, y:103, w:805, h:423 },
  rochas: [
    {id:'promontorio', x:128, y:123, w:153, h:159, pe:269},
    {id:'quebra-mar', x:112, y:239, w:197, h:102, pe:330},
    {id:'laje-mare', x:403, y:352, w:104, h:67, pe:412},
    {id:'pedras-atracacao', x:738, y:390, w:153, h:125, pe:491},
  ],
  vegetacao: [
    {id:'musgo-promontorio', x:165, y:68, w:169, h:100, pe:156},
    {id:'palmeiras', x:300, y:0, w:217, h:262, pe:248},
    {id:'cristais', x:360, y:143, w:209, h:169, pe:295},
  ],
  tentaculo: {id:'tentaculo', x:100, y:441, w:177, h:151, base:[170,575], quadros:32, colunas:8, duracao:2.9},
  // Borda do trecho de areia, do promontório à rocha junto do guarda-cais.
  margem: [[162,131],[153,158],[160,198],[151,219],[139,238],[129,253],[145,283],
    [153,304],[179,320],[218,328],[263,326],[304,328],[343,341],[378,353],
    [413,366],[447,388],[479,405],[513,411],[547,429],[581,442],[619,460],
    [656,479],[695,493],[724,497],[746,480],[771,453],[799,427],[824,403]],
  blocos: [
    [[151,146],[212,147],[234,190],[217,219],[256,237],[250,269],[224,280],[187,271],[152,282],[131,258]],
    [[148,291],[184,268],[216,278],[234,313],[219,327],[163,322]],
    [[424,378],[457,358],[485,371],[498,394],[490,411],[441,411],[409,397]],
    [[374,236],[420,214],[491,221],[530,245],[516,277],[486,290],[415,288],[375,270]],
    [[760,465],[795,424],[829,404],[850,432],[856,460],[807,486],[769,498]],
  ],
};

export const plantaCosta = ([x,y]) => [COSTA_OESTE.x+x*unidade,COSTA_OESTE.y+y*unidade];
export const ESCADA_OESTE = {id:'escada-oeste', x:982, y:26, w:182, h:132};
export const SPRITES_COSTA_OESTE = [COSTA_OESTE.mar,COSTA_OESTE.areia,
  ...COSTA_OESTE.rochas,...COSTA_OESTE.vegetacao,COSTA_OESTE.tentaculo,ESCADA_OESTE]
  .map(({id})=>({id:`docas_costa_${id}`,
    src:`assets/sprites/docas-costa-oeste/${id}.${['mar','areia'].includes(id)?'webp':'png'}`}));
