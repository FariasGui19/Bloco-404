// Maré Cromática — lote 9: a baía aprende a socorrer.
//
// Sete props pintados + três texturas de material. Quatro props são
// interativos e mexem na mecânica real: querosene recarrega a lanterna, o bote
// vira checkpoint, o guincho devolve fôlego e a drusa registra o eco.
export const lote9Names = Object.freeze([
  "lanterna-querosene",
  "bote-salva-vidas",
  "guincho-manual",
  "cristal-drusa",
  "peixe-morto",
  "bandeira-sinal",
  "cogumelo-sal",
]);

export const lote9Textures = Object.freeze([
  "metal-corroido",
  "lona-encardida",
  "pedra-molhada",
]);

export const lote9Props = Object.freeze([
  {
    id: "lanterna9",
    x: 14.0,
    y: 22.0,
    art: "lanterna-querosene",
    scale: 0.72,
    r: 0.5,
    kind: "lote9-lanterna",
    label: "Lanterna de querosene",
  },
  {
    id: "bote9",
    x: 27.2,
    y: 26.6,
    art: "bote-salva-vidas",
    scale: 1.0,
    r: 0.72,
    kind: "lote9-bote",
    label: "Bote de salvamento",
  },
  {
    id: "guincho9",
    x: 16.0,
    y: 21.0,
    art: "guincho-manual",
    scale: 0.72,
    r: 0.5,
    kind: "lote9-guincho",
    label: "Guincho manual",
  },
  {
    id: "drusa9",
    x: 29.6,
    y: 26.8,
    art: "cristal-drusa",
    scale: 0.72,
    r: 0.5,
    kind: "lote9-drusa",
    label: "Drusa cromática",
  },
]);

export const lote9Decor = Object.freeze([
  { x: 23.2, y: 28.6, art: "peixe-morto", scale: 0.5 },
  { x: 11.0, y: 28.6, art: "peixe-morto", scale: 0.44 },
  { x: 14.6, y: 28.55, art: "bandeira-sinal", scale: 0.92 },
  { x: 25.0, y: 28.6, art: "bandeira-sinal", scale: 0.8 },
  { x: 9.0, y: 28.7, art: "cogumelo-sal", scale: 0.62 },
  { x: 21.8, y: 21.6, art: "cogumelo-sal", scale: 0.52 },
]);

export const isInteractiveLote9 = (prop) =>
  Boolean(prop && prop.kind?.startsWith("lote9-"));

const reach = (m, prop) => Math.hypot(m.x - prop.x, m.y - prop.y) <= 1.8;

export function useLote9(m, prop) {
  if (!isInteractiveLote9(prop)) return null;
  if (!reach(m, prop)) return "O objeto está fora do alcance.";
  const flags = (m.p.lote9 ??= {});
  switch (prop.kind) {
    case "lote9-lanterna": {
      if (flags.lanterna)
        return "LANTERNA DE QUEROSENE — vazia. Você já levou o pouco combustível que restava.";
      if ((m.lamp ?? 0) >= 90)
        return "LANTERNA DE QUEROSENE — o tanque ainda está cheio. Guarde o combustível para quando a chama baixar.";
      flags.lanterna = true;
      const before = Math.round(m.lamp ?? 0);
      m.lamp = Math.min(100, (m.lamp ?? 0) + 55);
      m.lampOn = true;
      return `LANTERNA DE QUEROSENE — o combustível rende ${Math.round(m.lamp) - before}% de carga. O vidro volta a esquentar.`;
    }
    case "lote9-bote": {
      const already = m.p.checkpoint === "bote";
      m.p.checkpoint = "bote";
      m.stamina = Math.max(m.stamina ?? 0, 70);
      if (flags.bote)
        return already
          ? "BOTE DE SALVAMENTO — o casco continua aqui. O eco retorna a este ponto."
          : "BOTE DE SALVAMENTO — o ponto de retorno mudou para o casco.";
      flags.bote = true;
      return "BOTE DE SALVAMENTO — a corda range. O eco agora retorna a este casco se você colapsar.";
    }
    case "lote9-guincho": {
      if (flags.guincho) return "GUINCHO MANUAL — o cabo já está solto e a manivela não puxa mais nada.";
      flags.guincho = true;
      m.stamina = 100;
      m.stress = Math.max(0, (m.stress ?? 0) - 28);
      return "GUINCHO MANUAL — o cabo cede aos poucos. Fôlego restaurado e a tensão cai.";
    }
    case "lote9-drusa": {
      if (flags.drusa) return "DRUSA CROMÁTICA — já registrada. O eco de 66.6 Hz continua no dente de cristal.";
      flags.drusa = true;
      return "DRUSA CROMÁTICA — os cristais devolvem a sua própria respiração. Frequência 66.6 registrada.";
    }
    default:
      return null;
  }
}

export function lote9Cue(kind) {
  if (kind === "lote9-lanterna") return { hz: 392, dur: 0.55, gain: 0.018, wave: "triangle" };
  if (kind === "lote9-bote") return { hz: 146, dur: 1.1, gain: 0.016, wave: "sine" };
  if (kind === "lote9-guincho") return { hz: 98, dur: 0.38, gain: 0.026, wave: "sawtooth" };
  if (kind === "lote9-drusa") return { hz: 528, dur: 0.9, gain: 0.016, wave: "sine" };
  return null;
}

export function lote9Readout(m) {
  const f = m?.p?.lote9 ?? {};
  const parts = [
    `QUEROSENE ${f.lanterna ? "OK" : "—"}`,
    `BOTE ${m?.p?.checkpoint === "bote" ? "OK" : "—"}`,
    `DRUSA ${f.drusa ? "1/1" : "0/1"}`,
  ];
  return parts.join(" · ");
}
