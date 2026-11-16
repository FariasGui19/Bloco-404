// Converte pixels do pôster (referencia-mestre.png) em coordenadas de mapa.
// Uso: node tools/qa/poster-to-world.mjs 327,269 400,274 ...
// A câmera é a mesma do render `--ref` (1:1 com o pôster). O loader soma 0.5
// em x/y antes de desenhar, então a coordenada de MAPA é world - 0.5.
import { view, camera, screenToWorld, worldToScreen } from '../../js/engine/camera.js';
const VW = 1408, VH = 768;
view.w = VW; view.h = VH; view.dpr = 1;
camera.zoom = camera.targetZoom = 0.5;
camera.x = VW - 1475; camera.y = VH + 305.5;
for (const arg of process.argv.slice(2)) {
  const [px, py] = arg.split(',').map(Number);
  const w = screenToWorld(px, py);
  const back = worldToScreen(w.x, w.y);
  console.log(`${arg.padEnd(12)} -> mapa x=${(w.x - .5).toFixed(2)} y=${(w.y - .5).toFixed(2)}  (volta ${Math.round(back.x)},${Math.round(back.y)})`);
}
