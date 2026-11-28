// Rede H-03. Os IDs de telemetria são os três IDs já gravados em mareMission.data.
// Não há uma segunda contagem, flags de desbloqueio nem migração de save.
export const entry = { x: 16, y: 28 };
export const systems = Object.freeze([
  { id: 'fita', code: '01', short: 'SENSOR', label: 'Sensor costeiro', sector: 'Píer de entrada',
    x: 14.9, y: 24.2, approach: [16, 25.3], r: .93, art: 'radio', scale: .93,
    action: 'SINTONIZAR SENSOR COSTEIRO', log: 'Frequência fixada. Partida do gerador liberada.', hz: 523 },
  { id: 'sal', code: '02', short: 'GERADOR', label: 'Gerador auxiliar', sector: 'Setor dos galpões',
    x: 13.7, y: 12.9, approach: [15, 13.7], r: 1.22, art: 'gerador-quarentena', scale: 1,
    action: 'REATIVAR GERADOR AUXILIAR', log: 'Energia nos galpões. Painel da estação alimentado.', hz: 147 },
  { id: 'eco', code: '03', short: 'PAINEL', label: 'Painel da âncora', sector: 'Estação da âncora',
    x: 23.1, y: 18.2, approach: [21.7, 18], r: .98, art: 'terminal-estados-0', scale: 1,
    action: 'SINCRONIZAR PAINEL DA ÂNCORA', log: 'Fase alinhada. Estabilização da âncora autorizada.', hz: 659 },
]);
export const anchor = Object.freeze({ id: 'ancora', code: 'A', short: 'ÂNCORA', label: 'Âncora do portal', sector: 'Portal da baía',
  x: 26.8, y: 25.8, approach: [25.75, 24.5], r: 1.57, art: 'ancora-cromatica', scale: 1.5,
  action: 'ESTABILIZAR ÂNCORA', log: 'Âncora estável. Retorno pelo Setor Limiar confirmado.', hz: 392 });
export const sites = Object.freeze([...systems, anchor]);
export const statusColor = { offline: '#ed6959', ready: '#ffbc59', online: '#68f3d4' };
export const statusLabel = { offline: 'SEM REDE', ready: 'PRONTO', online: 'ONLINE' };

// A passarela termina a distância de uso, não no centro sólido das máquinas.
// O cabo se afasta da faixa de caminhada para entrar na base de cada equipamento.
const via = [[], [[16, 20], [16, 15.5]], [[18, 13.7], [20.4, 15.4]], [[22, 21.5], [24.3, 23.5]]];
export const circuitLegs = sites.map((site, i) => {
  const from = sites[i - 1] ?? entry;
  return { site, from, walk: [from.approach ?? [entry.x, entry.y], ...via[i], site.approach],
    cable: [[from.x, from.y], ...via[i], [site.x, site.y]] };
});

export function currentSite(m) {
  if (m.finished) return null;
  return systems.find(s => !m.p.data.includes(s.id)) ?? anchor;
}
export function siteStatus(m, site) {
  if (site === anchor ? m.p.completed : m.p.data.includes(site.id)) return 'online';
  return site === currentSite(m) ? 'ready' : 'offline';
}
// O trecho de saída acende assim que a máquina passa a fornecer sinal.
// A faixa de entrada do píer também fica acesa após a primeira sintonia.
export function cableColor(m, { from, site }) {
  if (m.p.data.includes(from.id) || m.p.data.includes(site.id)) return '#58cbb1';
  return siteStatus(m, site) === 'ready' ? '#da9c49' : '#785e48';
}
export function nextObjective(m) {
  const target = currentSite(m);
  return target && { target, action: target.action, label: `${target.code} / ${target.sector}`,
    have: m.p.data.length, need: systems.length, distance: Math.round(Math.hypot(target.x - m.x, target.y - m.y)) };
}
export function promptFor(m, site) {
  if (!site || m.finished) return null;
  if (sites.includes(site)) {
    const status = siteStatus(m, site);
    if (status === 'online') return null;
    if (status === 'offline') return { kind: 'locked', line: `${site.short} SEM REDE · Aguardando ${currentSite(m).label.toLowerCase()}.` };
    return { kind: 'mission', line: `[E] ${site.action}` };
  }
  if (site.note && !m.p.lore.includes(site.id)) return { kind: 'lore', line: `[E] ${site.note} · NOTA OPCIONAL` };
  return null; // cenário não tem um verbo de inspeção implícito
}

// Azimute da HUD relativo à frente da câmera (norte = -π/2 nos eixos x/z).
export function relativeBearing(m, target) {
  const a = Math.atan2(target.y - m.y, target.x - m.x) - m.angle;
  return Math.atan2(Math.sin(a), Math.cos(a)) * 180 / Math.PI;
}
