import {details} from './mare-mission-details.js';
import {lore} from './mare-mission-lore.js';
import {combatProps} from './mare-mission-combat.js';
import {lote7Walls} from './mare-mission-lote7.js';
import {entry, systems, sites, anchor, currentSite, promptFor} from './mare-mission-circuit.js';
export {sites};

// Pátio aberto; os dois galpões são marcos laterais, não pedágios na rota.
export const CABINS = [[5, 5, 7, 6], [6, 20, 7, 7]];
export const notes = [
  {...lore.find(s => s.id === 'diario'), note: 'LER DIÁRIO DO FAROLEIRO'},
  {...lore.find(s => s.id === 'prontuario'), note: 'LER PRONTUÁRIO 07'},
];
// Mesmo elenco nos dois renderizadores. Só as notas entram no scanner;
// nenhum adereço retirado da cena conserva uma colisão invisível.
export const sceneryProps = [
  ...combatProps.filter(p => p.kind === 'pod'),
  {x: 7.4, y: 7.6, art: 'radio', scale: .55},
  {x: 8.4, y: 21.8, art: 'rede-pesca', scale: .86},
  {x: 8.7, y: 24.1, art: 'maca-quarentena', scale: .9},
  {x: 10.5, y: 8.2, art: 'tubo-vapor', scale: .65},
  {x: 11.4, y: 13.5, art: 'caldeira-sala', scale: 1},
  {x: 11.8, y: 15.2, art: 'caixote-madeira', scale: .7},
  {x: 26.7, y: 8.3, art: 'guindaste-baia', scale: 1.25},
  {x: 30.2, y: 10.6, art: 'boia-cromatica', scale: .65},
  {x: 27.7, y: 29.5, art: 'rede-deriva', scale: .78},
];
const solids = [...sites, ...notes];
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
  for (const [a, b, w, h] of CABINS) {
    if (
      x >= a &&
      x < a + w &&
      y >= b &&
      y < b + h &&
      (x === a || x === a + w - 1 || y === b || y === b + h - 1)
    ) {
      if (y === b + h - 1 && Math.abs(x - (a + 3)) <= 1) return 0;
      if (x === a + w - 1 && y >= b + 2 && y < b + h - 2) return 0;
      return x === a ? 2 : y === b && x === a + 3 ? 3 : 1;
    }
  }
  for (const [a, b, w, h] of lote7Walls) {
    if (x >= a && x < a + w && y >= b && y < b + h) return 2;
  }
  return 0;
}
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
    ? [...new Set(p.data.filter((id) => systems.some(site => site.id === id)))]
    : [];
  p.rank = 1 + p.data.length;
  p.elapsed = Number.isFinite(Number(p.elapsed)) ? Math.max(0, Number(p.elapsed)) : 0;
  p.lamp = Number.isFinite(Number(p.lamp)) ? Math.max(0, Math.min(100, Number(p.lamp))) : 100;
  p.lampOn = p.lampOn !== false;
  p.containment = Object.fromEntries(Object.entries(p.containment && typeof p.containment === 'object' && !Array.isArray(p.containment) ? p.containment : {}).filter(([k, v]) => typeof v === 'boolean' && ['cabo','lanterna','eco','painel'].includes(k)));
  p.lote5 = Object.fromEntries(Object.entries(p.lote5 && typeof p.lote5 === 'object' && !Array.isArray(p.lote5) ? p.lote5 : {}).filter(([k, v]) => v === true && ['valvula','painel','selo','cristal','caldeira','tubo'].includes(k)));
  p.nulo = Array.isArray(p.nulo) ? [...new Set(p.nulo.filter((id) => ['primeiro','segundo','terceiro','ultimo'].includes(id)))] : [];
  p.lote6 = Object.fromEntries(Object.entries(p.lote6 && typeof p.lote6 === 'object' && !Array.isArray(p.lote6) ? p.lote6 : {}).filter(([k, v]) => v === true && ['turbina','escada','fenda'].includes(k)));
  p.lote7 = Object.fromEntries(Object.entries(p.lote7 && typeof p.lote7 === 'object' && !Array.isArray(p.lote7) ? p.lote7 : {}).filter(([k, v]) => v === true && ['lampada'].includes(k)));
  p.lote8 = Object.fromEntries(Object.entries(p.lote8 && typeof p.lote8 === 'object' && !Array.isArray(p.lote8) ? p.lote8 : {}).filter(([k, v]) => v === true && ['concha'].includes(k)));
  p.lote9 = Object.fromEntries(Object.entries(p.lote9 && typeof p.lote9 === 'object' && !Array.isArray(p.lote9) ? p.lote9 : {}).filter(([k, v]) => v === true && ['lanterna', 'bote', 'guincho', 'drusa'].includes(k)));
  p.lore = Array.isArray(p.lore) ? [...new Set(p.lore.filter((id) => lore.some((l) => l.id === id)))] : [];
  p.details = Object.fromEntries(Object.entries(p.details && typeof p.details === 'object' && !Array.isArray(p.details) ? p.details : {}).filter(([k, v]) => v === true && details.some(d => d.id === k)));
  return {
    p,
    ...entry,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    stress: 0,
    idle: 0,
    cooldown: 0,
    ward: 0,
    finished: p.completed === true,
    timedOut: false,
    stamina:100,
    noise:0,
    decoy:null,
    crouched:false,
    lamp:p.lamp,
    lampOn:p.lampOn,
  };
}
export function canStand(x, y) {
  const pad = .30;
  return !cell(x-pad, y-pad) && !cell(x+pad, y-pad) && !cell(x-pad, y+pad) && !cell(x+pad, y+pad)
    && solids.every(s => (x-s.x)**2 + (y-s.y)**2 > s.r**2);
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
export function visible(a, b) {
  const steps = Math.ceil(Math.hypot(b.x-a.x, b.y-a.y) / .12);
  for (let i = 1; i < steps; i++) if (cell(a.x+(b.x-a.x)*i/steps, a.y+(b.y-a.y)*i/steps)) return false;
  return true;
}
const inReach = (m, s) => Math.hypot(m.x-s.x, m.y-s.y) <= 1.8 && visible(m, s);

// HUD e botão E consultam o mesmo alvo. Uma nota nunca rouba o foco do circuito.
export function scannerTarget(m) {
  const next = currentSite(m);
  if (!next) return null;
  if (inReach(m, next)) return next;
  const locked = sites.find(s => s !== next && !m.p.data.includes(s.id) && inReach(m, s));
  if (locked) return locked;
  return notes.find(n => !m.p.lore.includes(n.id) && inReach(m, n)) ?? null;
}
export function interact(m, site) {
  if (!sites.includes(site) || !inReach(m, site) || m.finished) return null;
  const cue = promptFor(m, site);
  if (cue?.kind !== 'mission') return null;
  if (site === anchor) {
    m.finished = m.p.completed = true;
  } else {
    m.p.data.push(site.id);
    m.p.rank = 1 + m.p.data.length;
  }
  return `${site.code} / ${site.short} — ${site.log}`;
}
