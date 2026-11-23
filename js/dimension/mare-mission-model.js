import {details} from './mare-mission-details.js';
import {lore} from './mare-mission-lore.js';
import {combatProps} from './mare-mission-combat.js';
import {lote5Props} from './mare-mission-lote5.js';
import {lote6Props} from './mare-mission-lote6.js';
import {lote7Props,lote7Walls} from './mare-mission-lote7.js';
// Local-only mission simulation: never writes global health, inventory or levels.
export const MARE_MISSION = "mare-cromatica:baia-v1";
export const SIZE = 32;
// Linha d'água da enseada: leste profundo, com uma curva suave. O jogador
// caminha até a arrebentação; a água profunda é o limite natural do mapa.
export const shoreX = (y) => 28.25 + Math.sin(y * 0.31 + 0.6) * 0.85;
export const waterAt = (x, y) => x > shoreX(y);
// Píer de serviço sudeste: passarela sobre a água, caminhável.
export const DOCKS = Object.freeze([{ x: 27.4, z: 26.0, w: 6.0, d: 8.6 }]);
export const onDock = (x, y) => DOCKS.some((d) => Math.abs(x - d.x) <= d.w / 2 && Math.abs(y - d.z) <= d.d / 2);
export function cell(x, y) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 1 || y < 1 || x >= 31 || y >= 31) return 2;
  // Água profunda: colisão natural, sem parede desenhada. O píer de serviço
  // devolve chão de madeira mesmo sobre a lâmina d'água.
  if (onDock(x, y)) return 0;
  if (waterAt(x, y)) return 4;
  // Cabins have actual door gaps; all exterior paths form a connected loop.
  for (const [a, b, w, h] of [
    [5, 5, 7, 6],
    [6, 20, 7, 7],
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
  for (const [a, b, w, h] of lote7Walls) {
    if (x >= a && x < a + w && y >= b && y < b + h) return 2;
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
  p.elapsed = Number.isFinite(Number(p.elapsed)) ? Math.max(0, Number(p.elapsed)) : 0;
  p.containment = Object.fromEntries(Object.entries(p.containment && typeof p.containment === 'object' && !Array.isArray(p.containment) ? p.containment : {}).filter(([k, v]) => typeof v === 'boolean' && ['cabo','lanterna','eco','painel'].includes(k)));
  p.lote5 = Object.fromEntries(Object.entries(p.lote5 && typeof p.lote5 === 'object' && !Array.isArray(p.lote5) ? p.lote5 : {}).filter(([k, v]) => v === true && ['valvula','painel','selo','cristal','caldeira','tubo'].includes(k)));
  p.nulo = Array.isArray(p.nulo) ? [...new Set(p.nulo.filter((id) => ['primeiro','segundo','terceiro','ultimo'].includes(id)))] : [];
  p.lote6 = Object.fromEntries(Object.entries(p.lote6 && typeof p.lote6 === 'object' && !Array.isArray(p.lote6) ? p.lote6 : {}).filter(([k, v]) => v === true && ['turbina','escada','fenda'].includes(k)));
  p.lote7 = Object.fromEntries(Object.entries(p.lote7 && typeof p.lote7 === 'object' && !Array.isArray(p.lote7) ? p.lote7 : {}).filter(([k, v]) => v === true && ['lampada'].includes(k)));
  p.lore = Array.isArray(p.lore) ? [...new Set(p.lore.filter((id) => lore.some((l) => l.id === id)))] : [];
  p.details = Object.fromEntries(Object.entries(p.details && typeof p.details === 'object' && !Array.isArray(p.details) ? p.details : {}).filter(([k, v]) => v === true && details.some(d => d.id === k)));
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
    stamina:100,
    noise:0,
    decoy:null,
    crouched:false,
  };
}
export function canStand(x, y) {
  return [
    [-0.2, -0.2],
    [0.2, -0.2],
    [-0.2, 0.2],
    [0.2, 0.2],
  ].every(([a, b]) => !cell(x + a, y + b)) && details.every(s=>Math.hypot(x-s.x,y-s.y)>(s.r??.46)) && lore.every(s=>Math.hypot(x-s.x,y-s.y)>(s.r??.46)) && combatProps.every(s=>Math.hypot(x-s.x,y-s.y)>(s.r??.46)) && lote5Props.every(s=>Math.hypot(x-s.x,y-s.y)>(s.r??.46)) && lote6Props.every(s=>Math.hypot(x-s.x,y-s.y)>(s.r??.46)) && lote7Props.every(s=>Math.hypot(x-s.x,y-s.y)>(s.r??.46));
}
export function move(m, dx, dy) {
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  const length=Math.hypot(dx,dy),factor=length>8?8/length:1;
  dx*=factor;dy*=factor;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/.08));
  for(let i=0;i<steps;i++){
    if (canStand(m.x + dx/steps, m.y)) m.x += dx/steps;else if('vx' in m)m.vx=0;
    if (canStand(m.x, m.y + dy/steps)) m.y += dy/steps;else if('vy' in m)m.vy=0;
  }
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
