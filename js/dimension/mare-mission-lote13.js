import { cell } from './mare-mission-model.js';
import { sites, systems, circuitLegs, siteStatus, statusColor, statusLabel, cableColor } from './mare-mission-circuit.js';

// Arte do scanner já publicada no lote 13. O mapa e o relatório são compostos
// sobre a mesma superfície 384×216, com ou sem WebGL.
export const lote13Names = ['seta-chao', ...Object.entries({
  'marcador-objetivo': 4, 'interacao-onda': 6, 'terminal-estados': 4,
}).flatMap(([name, n]) => Array.from({length:n}, (_,i) => `${name}-${i}`))];

export function drawServiceMap(g, m) {
  g.save();
  const ox = 27, oy = 50, scale = 4;
  g.fillStyle = '#091719'; g.fillRect(16, 26, 352, 161);
  g.strokeStyle = '#4d746d'; g.strokeRect(16.5, 26.5, 351, 160);
  g.fillStyle = '#cce4d7'; g.font = 'bold 8px monospace';
  g.fillText('H-03  /  CARTA DE SERVIÇO', 26, 40);
  g.font = '7px monospace'; g.fillStyle = '#98bdb1'; g.fillText('[M] FECHAR', 313, 40);
  for (let y=0;y<32;y++) for (let x=0;x<32;x++) {
    const c = cell(x+.5,y+.5);
    g.fillStyle = c === 4 ? '#21464e' : c ? '#495956' : '#142c2c';
    g.fillRect(ox+x*scale,oy+y*scale,scale,scale);
  }
  g.lineWidth = 1.2;
  for (const leg of circuitLegs) {
    g.strokeStyle = cableColor(m, leg);
    g.beginPath(); leg.cable.forEach(([x,y],i) => g[i ? 'lineTo' : 'moveTo'](ox+x*scale,oy+y*scale)); g.stroke();
  }
  g.font = 'bold 7px monospace';
  for (const site of sites) {
    const x = ox+site.x*scale, y = oy+site.y*scale, status = siteStatus(m,site);
    g.fillStyle = statusColor[status]; g.fillRect(x-2,y-2,4,4);
    if (status === 'ready') { g.strokeStyle = g.fillStyle; g.strokeRect(x-4.5,y-4.5,9,9); }
    g.fillText(site.code,x+5,y-3);
  }
  g.save(); g.translate(ox+m.x*scale,oy+m.y*scale); g.rotate(m.angle);
  g.fillStyle='#fff9e1'; g.beginPath(); g.moveTo(5,0); g.lineTo(-3,-2.7); g.lineTo(-3,2.7); g.closePath(); g.fill(); g.restore();

  // Diário derivado dos IDs já persistidos: as liberações continuam consultáveis
  // depois de a transmissão curta sair do HUD, inclusive ao carregar a partida.
  g.fillStyle='#d6e8df'; g.font='bold 8px monospace';
  g.fillText(`ESTRUTURA HÚMIDA   ${m.p.data.length}/${systems.length}`,168,60);
  sites.forEach((s,i) => {
    const y=76+i*25, status=siteStatus(m,s);
    g.font='bold 7px monospace'; g.fillStyle=statusColor[status];
    g.fillText(`${s.code} / ${s.short}   ${statusLabel[status]}`,168,y);
    g.fillStyle='#b4c9bd'; g.font='7px monospace';
    g.fillText(status==='online' ? s.log.split('. ')[1] : s.sector,168,y+9);
  });
  g.restore();
}

export function drawBayReport(g, m) {
  g.save();
  g.fillStyle='#081618'; g.fillRect(56,62,272,91);
  g.strokeStyle=m.timedOut ? '#cb8a67' : statusColor.online;
  g.strokeRect(56.5,62.5,271,90);
  g.fillStyle=g.strokeStyle; g.font='7px monospace'; g.fillText('NEXO-04  /  TELEMETRIA DE RETORNO',68,76);
  g.font='bold 13px monospace'; g.fillText(m.timedOut ? 'JANELA ENCERRADA' : 'ÂNCORA ESTABILIZADA',68,96);
  g.font='8px monospace'; g.fillStyle='#cde1d6';
  g.fillText(`ESTRUTURA HÚMIDA   ${m.p.data.length}/3 SISTEMAS`,68,113);
  g.fillText(m.timedOut ? 'Retirada à Fenda. Seus sinais permanecem.' : 'Baía concluída. Ponte para o Limiar aberta.',68,128);
  g.fillStyle='#91afa5'; g.font='7px monospace';
  g.fillText(m.timedOut ? 'REENTRE PELO PORTAL PARA RETOMAR' : 'DESTINO CONFIRMADO  /  SETOR LIMIAR',68,143);
  g.restore();
}
