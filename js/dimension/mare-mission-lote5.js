// Maré Cromática — lote 5: sala de máquinas da baía.
//
// The layer is optional: it never gates data, rank, the anchor or the bridge.
// It gives the bay a readable machine room, a pressure valve that actually
// changes the ambience, a guardian silhouette and a recompilation seal that
// closes the local loop. Data stays dependency-free so the mission model can
// use the collision radii without import cycles.
export const lote5Props = Object.freeze([
  { id: 'caldeira5', x: 27.5, y: 25.5, art: 'caldeira-sala', scale: 0.9, r: 0.55, kind: 'lote5-inspect', label: 'Caldeira da baía' },
  { id: 'tubo5', x: 7.5, y: 11.5, art: 'tubo-vapor', scale: 0.72, r: 0.34, kind: 'lote5-inspect', label: 'Tubo de vapor' },
  { id: 'cristal5', x: 10.5, y: 17.5, art: 'cristal-mare', scale: 0.55, r: 0.36, kind: 'lote5-lore', label: 'Cristal de maré' },
  { id: 'valvula5', x: 25.0, y: 14.0, art: 'valvula-pressao', scale: 0.66, r: 0.42, kind: 'lote5-valve', label: 'Válvula de pressão' },
  { id: 'painel5', x: 14.0, y: 27.0, art: 'painel-recompilacao', scale: 0.58, r: 0.42, kind: 'lote5-panel', label: 'Painel de recompilação' },
  { id: 'porta5', x: 20.5, y: 26.0, art: 'porta-recompilacao', scale: 0.9, r: 0.62, kind: 'lote5-door', label: 'Porta da sala de máquinas' },
  { id: 'selo5', x: 28.5, y: 28.5, art: 'selo-recompilado', scale: 0.6, r: 0.4, kind: 'lote5-seal', label: 'Selo de recompilação' },
]);

export const isInteractiveLote5 = (prop) => Boolean(prop && prop.kind?.startsWith('lote5-'));

export const lote5Readout = (m) => {
  const s = m.p.lote5 ?? {};
  return `${s.valvula ? 'VÁLVULA OK' : 'VÁLVULA PENDENTE'} · ${s.painel ? 'PAINEL OK' : 'PAINEL PENDENTE'} · ${s.selo ? 'SELO RECOMPILADO' : 'SELO ABERTO'}`;
};

export function useLote5(m, prop) {
  if (!isInteractiveLote5(prop)) return null;
  if (Math.hypot(m.x - prop.x, m.y - prop.y) > 1.8) return 'Aproxime-se do mecanismo.';
  const s = (m.p.lote5 ??= {});
  if (prop.kind === 'lote5-valve') {
    if (s.valvula) return 'A válvula já está firme. O vapor agora corre para os escapes altos.';
    s.valvula = true;
    m.stress = Math.max(0, m.stress - 14);
    return 'VÁLVULA DE PRESSÃO FECHADA — o assobio do vapor cai e a sala de máquinas para de empurrar resina para o corredor.';
  }
  if (prop.kind === 'lote5-panel') {
    s.painel = true;
    return `PAINEL DE RECOMPILAÇÃO — ${s.valvula ? 'pressão estável' : 'pressão ainda alta'} · ${s.selo ? 'selo recompilado' : 'selo em espera'}.`;
  }
  if (prop.kind === 'lote5-seal') {
    if (s.selo) return 'O selo pulsa em três tempos. A baía já reconheceu este eco.';
    if (!s.valvula || !s.painel) return 'O SELO PEDE UMA LEITURA COMPLETA: feche a válvula e consulte o painel antes de tocá-lo.';
    s.selo = true;
    m.stress = Math.max(0, m.stress - 20);
    return 'SELO RECOMPILADO — as memórias da sala de máquinas fecham o circuito. NULO: “agora vocês dois respiram no mesmo ritmo.”';
  }
  if (prop.kind === 'lote5-lore') {
    if (s.cristal) return 'O cristal já guardou sua leitura.';
    s.cristal = true;
    return 'CRISTAL DE MARÉ — a luz atravessa o sal e desenha uma rota que não está no mapa. O mar também guarda caminhos.';
  }
  if (prop.id === 'caldeira5') {
    s.caldeira = true;
    m.stress = Math.max(0, m.stress - 5);
    return 'CALDEIRA — a chapa ainda está quente. Alguém manteve a baía viva muito depois da evacuação.';
  }
  if (prop.id === 'tubo5') {
    s.tubo = true;
    return 'TUBO DE VAPOR — o fluxo pulsa no mesmo compasso do sino. Não é o mar: é a máquina imitando o mar.';
  }
  return 'A porta da sala de máquinas está selada por dentro. O selo é a única chave.';
}

export function lote5Complete(m) {
  return Boolean(m?.p?.lote5?.selo);
}
