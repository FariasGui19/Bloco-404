// Maré Cromática — lote 6: o arquivo do operador.
//
// This layer turns Nulo into a physical, recurring presence, adds a fast
// hunter variant, gives the bay new wall/floor material and opens the final
// rift transition. It never gates data, rank or the anchor: the main mission
// remains completable without any optional encounter.
export const lote6Props = Object.freeze([
  { id: 'turbina6', x: 12.4, y: 13.4, art: 'turbina-sala', scale: 1.35, r: 0.55, kind: 'lote6-turbine', label: 'Turbina da baía' },
  { id: 'escada6', x: 29.4, y: 24.6, art: 'escada-servico', scale: 1.15, r: 0.5, kind: 'lote6-stairs', label: 'Escada de serviço' },
  { id: 'fenda6', x: 28.8, y: 29.0, art: 'portal-mare', scale: 0.95, r: 0.6, kind: 'lote6-rift', label: 'Fenda de recompilação' },
]);

export const isInteractiveLote6 = (prop) => Boolean(prop && prop.kind?.startsWith('lote6-'));

export const nuloPoints = Object.freeze([
  {
    id: 'primeiro',
    x: 16,
    y: 5,
    line: 'NULO: “Você chegou antes do sino. Isso também é um dado.” O casaco dele tem o seu número de série, mas não o seu rosto.',
  },
  {
    id: 'segundo',
    x: 28.5,
    y: 11.5,
    line: 'NULO: “O arquivo não guarda pessoas. Guarda a forma como elas voltam.” Ele anota sua respiração sem olhar.',
  },
  {
    id: 'terceiro',
    x: 11.5,
    y: 18.5,
    line: 'NULO: “O farol não cegou ninguém. Nós pedimos que ele esquecesse.” A voz vem do capacete, mas a boca é sua.',
  },
  {
    id: 'ultimo',
    x: 19.5,
    y: 21.5,
    line: 'NULO: “A âncora era a isca. Você trouxe a chave. Obrigado por lembrar de mim.”',
  },
]);

export function nuloStageIndex(m) {
  if (m?.p?.rank >= 4) return 3;
  if (m?.p?.rank >= 2) return 2;
  if (m?.p?.data?.length) return 1;
  return 0;
}

export function nuloArt(m, t = 0) {
  return t % 13 > 10.8 ? 'nulo-operador-voz' : 'nulo-operador';
}

export function nuloEntity(m, t = 0) {
  const stage = nuloStageIndex(m), point = nuloPoints[stage];
  return {
    id: 'nulo',
    x: point.x,
    y: point.y,
    art: nuloArt(m, t),
    scale: 1.45,
    kind: 'nulo',
    label: 'Nulo — operador do arquivo',
    stage: point.id,
  };
}

export function useNulo(m, prop) {
  if (!prop || prop.kind !== 'nulo') return null;
  if (Math.hypot(m.x - prop.x, m.y - prop.y) > 1.8) return 'A figura espera fora do alcance.';
  const point = nuloPoints.find((p) => p.id === prop.stage) ?? nuloPoints[nuloStageIndex(m)];
  const seen = (m.p.nulo ??= []);
  if (!seen.includes(point.id)) {
    seen.push(point.id);
    m.stress = Math.max(0, m.stress - 8);
  }
  return point.line;
}

export const nuloReadout = (m) => `NULO ${(m.p.nulo ?? []).length}/4`;

export function nuloReportLine(m) {
  const count = (m.p.nulo ?? []).length;
  if (count >= 4) return 'NULO: “Agora você também é arquivo.”';
  if (count >= 2) return 'NULO: “O mar não devolve: ele recompila.”';
  return 'NULO: “O silêncio também é um registro.”';
}

export function useLote6(m, prop) {
  if (!isInteractiveLote6(prop)) return null;
  if (Math.hypot(m.x - prop.x, m.y - prop.y) > 1.8) return 'Aproxime-se da estrutura.';
  const flags = (m.p.lote6 ??= {});
  if (prop.kind === 'lote6-turbine') {
    if (flags.turbina) return 'A turbina já gira no compasso certo. O ar da baía voltou a circular.';
    flags.turbina = true;
    m.stress = Math.max(0, m.stress - 10);
    return 'TURBINA — as pás acordam e o vapor sobe em espiral. O som cobre seus passos por alguns segundos.';
  }
  if (prop.kind === 'lote6-stairs') {
    flags.escada = true;
    return 'ESCADA DE SERVIÇO — os degraus levam ao arquivo superior. Lá de cima, a baía parece um mapa dobrado.';
  }
  if (prop.kind === 'lote6-rift') {
    if ((m.p.rank ?? 1) < 4) return 'A FENDA ainda está selada. Recompile três memórias no terminal.';
    if (flags.fenda) return 'A FENDA já está aberta. A âncora espera o seu eco.';
    flags.fenda = true;
    m.stress = Math.max(0, m.stress - 12);
    return 'FENDA DE RECOMPILAÇÃO — a costura se abre em luz ciano e âmbar. A âncora reconhece o seu eco.';
  }
  return 'A estrutura range, mas não cede.';
}

export const lote6Readout = (m) => {
  const f = m.p.lote6 ?? {};
  return `${nuloReadout(m)} · ${f.turbina ? 'TURBINA ON' : 'TURBINA OFF'} · ${(m.p.rank ?? 1) >= 4 ? 'FENDA ABERTA' : 'FENDA SELADA'}`;
};

export const fendaOpen = (m) => (m?.p?.rank ?? 1) >= 4;

export function objectiveLine(m) {
  if (m?.finished) return 'ECO PRESERVADO — a ponte do Limiar aceitará seu registro.';
  if (fendaOpen(m)) return 'ÂNCORA A SUDESTE — a fenda responde; leve seu eco até a âncora.';
  const count = m?.p?.data?.length ?? 0;
  if (count >= 3) return 'TRÊS MEMÓRIAS — recompile no terminal central.';
  return `MEMÓRIAS ${count}/3 — recupere ${3 - count} registro(s) nas cabanas.`;
}
