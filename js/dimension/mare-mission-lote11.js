// Maré Cromática — lote 11: farol, sinal e quarentena.
//
// Dez folhas novas (três texturas de material e sete props). Quatro props são
// interativos e mexem na missão de verdade: a mesa de cartas revela a baía, o
// sino de neblina baixa a tensão (mas faz barulho), o gerador devolve carga e
// acende o farolim, e a placa guarda o último aviso da quarentena.
export const lote11Names = Object.freeze([
  "lente-farolim",
  "mesa-cartas",
  "sino-neblina",
  "gerador-quarentena",
  "boia-cromatica",
  "rede-deriva",
  "placa-quarentena",
]);

export const lote11Textures = Object.freeze([
  "papel-carta",
  "vidro-farol",
  "corda-alcatrao",
]);

// O farolim fica no ponto oeste da enseada: aceso, varre a água com o feixe.
export const LOTE11_BEACON = Object.freeze({ x: 3.6, y: 28.8 });

export const lote11Props = Object.freeze([
  {
    id: "cartas11",
    x: 11.6,
    y: 28.2,
    art: "mesa-cartas",
    scale: 0.62,
    r: 0.62,
    kind: "lote11-cartas",
    label: "Mesa de cartas",
  },
  {
    id: "placa11",
    x: 6.0,
    y: 29.4,
    art: "placa-quarentena",
    scale: 0.62,
    r: 0.5,
    kind: "lote11-placa",
    label: "Placa de quarentena",
  },
  {
    id: "sino11",
    x: 26.6,
    y: 11.8,
    art: "sino-neblina",
    scale: 0.7,
    r: 0.55,
    kind: "lote11-sino",
    label: "Sino de neblina",
  },
  {
    id: "gerador11",
    x: 22.8,
    y: 28.1,
    art: "gerador-quarentena",
    scale: 0.6,
    r: 0.6,
    kind: "lote11-gerador",
    label: "Gerador de quarentena",
  },
]);

export const lote11Decor = Object.freeze([
  { x: 13.6, y: 29.6, art: "rede-deriva", scale: 0.92, kind: "rede" },
  { x: 24.6, y: 30.0, art: "rede-deriva", scale: 0.78, kind: "rede" },
  { x: 30.9, y: 20.4, art: "boia-cromatica", scale: 0.56, kind: "boia" },
  { x: LOTE11_BEACON.x, y: LOTE11_BEACON.y, art: "lente-farolim", scale: 0.95, lift: 1.15, kind: "farolim" },
]);

export const isInteractiveLote11 = (prop) =>
  Boolean(prop && prop.kind?.startsWith("lote11-"));

const reach = (m, prop) => Math.hypot(m.x - prop.x, m.y - prop.y) <= 1.9;

export const lote11Flags = (m) => {
  if (!m?.p) return {};
  return (m.p.lote11 ??= {});
};

export const lote11BeaconOn = (m) => Boolean(m?.p?.lote11?.power);

export const lote11Count = (m) => {
  const f = m?.p?.lote11 ?? {};
  return ["cartas", "placa", "sino", "power"].filter((k) => f[k]).length;
};

// Pulso do sino: 1 no instante do toque, caindo a zero em 2,4 s.
export function lote11RingPulse(m) {
  const at = m?.p?.lote11?.sino;
  if (typeof at !== "number") return 0;
  const age = (m.p.elapsed ?? 0) - at;
  if (age < 0 || age > 2.4) return 0;
  return 1 - age / 2.4;
}

export function useLote11(m, prop) {
  if (!isInteractiveLote11(prop)) return null;
  if (!reach(m, prop)) return "O objeto está fora do alcance.";
  const flags = lote11Flags(m);
  const elapsed = m.p.elapsed ?? 0;
  switch (prop.kind) {
    case "lote11-cartas": {
      if (flags.cartas)
        return "MESA DE CARTAS — a rota já está na sua cabeça. O lápis marcou o sino, a boia e o gerador.";
      flags.cartas = true;
      flags.chart = elapsed;
      m.stress = Math.max(0, (m.stress ?? 0) - 10);
      return "MESA DE CARTAS — a carta de maré está riscada a lápis: SINO ao leste, BOIA no canal e GERADOR no píer. A tensão cai.";
    }
    case "lote11-sino": {
      const last = typeof flags.sino === "number" ? flags.sino : -99;
      if (elapsed - last < 4.5)
        return "SINO DE NEBLINA — o bronze ainda vibra. Espere a onda terminar.";
      flags.sino = elapsed;
      m.stress = Math.max(0, (m.stress ?? 0) - 16);
      // O sino acalma quem toca, mas o som atravessa a baía.
      m.noise = Math.max(m.noise ?? 0, 0.6);
      return "SINO DE NEBLINA — a nota limpa a neblina por um instante. A tensão cai, mas o som corre a baía inteira.";
    }
    case "lote11-gerador": {
      if (flags.power)
        return "GERADOR DE QUARENTENA — o motor mantém o farolim aceso. O ponteiro treme, mas não para.";
      flags.power = true;
      flags.powerAt = elapsed;
      m.lamp = 100;
      m.lampOn = true;
      m.stamina = Math.max(m.stamina ?? 0, 80);
      m.stress = Math.max(0, (m.stress ?? 0) - 6);
      return "GERADOR DE QUARENTENA — o motor pega e o farolim acende: a luz abre na areia e a lanterna volta a 100%.";
    }
    case "lote11-placa": {
      if (flags.placa)
        return "PLACA DE QUARENTENA — o aviso já foi lido. O trefoil continua apontando para o mar.";
      flags.placa = true;
      m.stress = Math.max(0, (m.stress ?? 0) - 4);
      return "PLACA DE QUARENTENA — “área isolada por decisão do Núcleo; não prestar socorro sem autorização”. O carimbo é de hoje.";
    }
    default:
      return null;
  }
}

export function lote11Cue(kind) {
  if (kind === "lote11-cartas")
    return { hz: 330, dur: 0.7, gain: 0.014, wave: "triangle" };
  if (kind === "lote11-sino")
    return { hz: 196, dur: 1.7, gain: 0.02, wave: "sine" };
  if (kind === "lote11-gerador")
    return { hz: 72, dur: 1.2, gain: 0.024, wave: "sawtooth" };
  if (kind === "lote11-placa")
    return { hz: 262, dur: 0.5, gain: 0.014, wave: "triangle" };
  return null;
}

export function lote11Readout(m) {
  const f = m?.p?.lote11 ?? {};
  return `SINAL ${lote11Count(m)}/4 · FAROL ${f.power ? "ON" : "OFF"}`;
}

// Linha de objetivo extra: quando a mesa foi lida, a baía passa a dizer para
// onde olhar. Sem isso, a missão segue igual.
export function lote11Hint(m) {
  const f = m?.p?.lote11 ?? {};
  if (!f.cartas) return null;
  if (!f.power) return "FAROLIM — leve carga ao gerador do píer";
  if (!f.sino) return "SINO — teste o bronze na praia leste";
  if (!f.placa) return "PLACA — leia o aviso da quarentena";
  return "BAÍA MARCADA — sinais do farolim completos";
}
