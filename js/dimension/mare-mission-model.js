// Local-only mission simulation: never writes global health, inventory or levels.
export const MARE_MISSION = "mare-cromatica:baia-v1";
export const SIZE = 32;
export function cell(x, y) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 1 || y < 1 || x >= 31 || y >= 31) return 2;
  // Cabins have actual door gaps; all exterior paths form a connected loop.
  for (const [a, b, w, h] of [
    [5, 5, 7, 6],
    [19, 5, 7, 7],
    [6, 20, 7, 7],
    [21, 21, 6, 6],
  ]) {
    if (
      x >= a &&
      x < a + w &&
      y >= b &&
      y < b + h &&
      (x === a || x === a + w - 1 || y === b || y === b + h - 1)
    ) {
      if (y === b + h - 1 && x === a + 3) return 0;
      return x === a ? 2 : y === b && x === a + 3 ? 3 : 1;
    }
  }
  return 0;
}
export const sites = Object.freeze([
  {
    id: "fita",
    x: 8.5,
    y: 8.5,
    art: "gravador",
    label: "Fita da guarda costeira",
  },
  { id: "sal", x: 22.5, y: 8.5, art: "residuo", label: "Resíduo mnemônico" },
  { id: "eco", x: 9.5, y: 23.5, art: "residuo", label: "Memória da evacuação" },
  {
    id: "terminal",
    x: 16,
    y: 16,
    art: "terminal",
    label: "Terminal de recompilação",
  },
  {
    id: "ancora",
    x: 24.5,
    y: 24.5,
    art: "ancora",
    label: "Âncora primária do Hub",
  },
]);
export const abilities = {
  mare_astral: "Radar de resina",
  nucleo_dez_forma: "Sobrecarga luminosa",
  dominio_anciao: "Barreira purificadora",
  motor_bio_forja: "Pulso de biomassa",
};
export function createMission(progress) {
  const p = (progress.mareMission ??= {
    version: 1,
    data: [],
    rank: 1,
    elapsed: 0,
    completed: false,
  });
  p.data = Array.isArray(p.data)
    ? [...new Set(p.data.filter((id) => ["fita", "sal", "eco"].includes(id)))]
    : [];
  p.rank = Math.max(1, Math.min(4, Number(p.rank) || 1));
  p.elapsed = Math.max(0, Number(p.elapsed) || 0);
  return {
    p,
    x: 16,
    y: 28,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    stress: 0,
    idle: 0,
    cooldown: 0,
    ward: 0,
    finished: false,
  };
}
export function canStand(x, y) {
  return [
    [-0.2, -0.2],
    [0.2, -0.2],
    [-0.2, 0.2],
    [0.2, 0.2],
  ].every(([a, b]) => !cell(x + a, y + b));
}
export function move(m, dx, dy) {
  if (canStand(m.x + dx, m.y)) m.x += dx;
  if (canStand(m.x, m.y + dy)) m.y += dy;
}
export function interact(m, site) {
  if (!site || Math.hypot(m.x - site.x, m.y - site.y) > 1.8)
    return "Aproxime-se do sinal.";
  if (["fita", "sal", "eco"].includes(site.id)) {
    if (!m.p.data.includes(site.id)) m.p.data.push(site.id);
    return site.id === "fita"
      ? "FITA: “O Aeroporto Central caiu em silêncio. Não deixem o X10 perder gravidade.”"
      : "Dados mnemônicos recuperados. Retorne ao terminal seguro.";
  }
  if (site.id === "terminal") {
    m.p.rank = 1 + m.p.data.length;
    m.stress = 0;
    return `Recompilação ${m.p.rank}/4. NULO: eu também aprendi seu padrão.`;
  }
  if (m.p.rank < 4)
    return "A âncora exige domínio local 4. Recupere três memórias e recompile.";
  m.finished = true;
  return "NULO: a âncora era a isca. Você trouxe a chave. Ruptura inevitável — memória preservada.";
}
