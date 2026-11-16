// Imprime a posição real na tela dos props da Enseada com a MESMA câmera do render.
// Uso: node tools/qa/dump-enseada.mjs <zoom> <cx> <cy>
const zoom = Number(process.argv[2] ?? 1.05);
const cx = Number(process.argv[3] ?? 12), cy = Number(process.argv[4] ?? 32);
const VW = Number(process.env.QA_W ?? 1600), VH = Number(process.env.QA_H ?? 900);
const camX = (cx - cy) * 32, camY = (cx + cy) * 16;
const { map } = await import('../../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js');
const tela = (x, y) => {
  const wx = (x - y) * 32, wy = (x + y) * 16;
  return [Math.round((wx - camX) * zoom + VW / 2), Math.round((wy - camY) * zoom + VH / 2)];
};
const alvos = process.argv.slice(5);
for (const o of map.objects) {
  if (alvos.length && !alvos.some(a => o.id.includes(a))) continue;
  const w = o.larguraPx ?? 0;
  const [sx, sy] = tela(o.x + .5, o.y + .5);
  const meiaW = Math.round(w / 2 * zoom);
  console.log(`${o.id.padEnd(34)} x=${String(o.x).padStart(7)} y=${String(o.y).padStart(7)}  pe=(${sx},${sy})  faixaX=${sx - meiaW}..${sx + meiaW}  larg=${w}`);
}
