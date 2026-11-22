// Batimetria contínua opcional em unidades do sistema de nado (não metros).
// Mesma função para o leito visível e para a profundidade navegável.
const bancos = Object.freeze([
  Object.freeze({x:45, y:27, raio:11, elevacao:.35}),
  Object.freeze({x:68, y:40, raio:12, elevacao:.38}),
  Object.freeze({x:79, y:24, raio:9, elevacao:.22}),
  Object.freeze({x:100, y:49, raio:10, elevacao:.30}),
]);
export function profundidadeOceano(map, x, y) {
  if (!map?.meta?.batimetriaOceano) return null;
  let fundo = 2;
  for (const b of bancos) {
    const d = Math.hypot(x-b.x, y-b.y) / b.raio;
    if (d < 1) { const t=1-d; fundo -= b.elevacao*t*t*(3-2*t); }
  }
  return Math.max(1.45, Math.min(2, fundo));
}
export function alturaLeitoOceano(map, x, y) {
  return -2.9 + (2-(profundidadeOceano(map,x,y) ?? 2))*1.15;
}
// Setores são nomes de navegação no mesmo mapa, não reinos separados.
export function setorOceano(map, x) {
  if (!map?.meta?.batimetriaOceano) return null;
  return x < 37 ? 'JARDINS DA TRAVESSIA' : x < 68 ? 'BANCOS DO AZUL' : x < 96 ? 'CHEGADA À DÁRSENA' : 'FRONTEIRA DAS CORRENTES';
}
