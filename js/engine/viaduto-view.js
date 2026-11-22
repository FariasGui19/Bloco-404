// js/engine/viaduto-view.js
// =====================================================================
// VIADUTO DOS VETORES — passarela industrial sobre o canal da Estação.
// A câmera é a MESMA side-view do Aeroporto (64 px/X, 22 px/Y). A arte é
// pintada; movimento, luz e água são camadas leves por cima dela. Nada aqui
// decide colisão ou portal: layout/walkMask e portais continuam no mapa.
// =====================================================================
import { getSprite } from './sprites.js';
import { svWorldToScreen } from './camera.js';
import { drawSideObject } from './side-view.js';
import { listCombatFeedback } from '../game/combat-feedback.js';

const GREEN = '#8cff9e';
const AMBER = '#ffc94a';
const BACK_Y = 3;
const FRONT_Y = 7;
const START_X = 1;
const END_X = 33;

const point = (x, y, vw, vh, z) => svWorldToScreen(x, y, vw, vh, z);
const fract = n => n - Math.floor(n);
const hash = n => fract(Math.sin(n * 127.1 + 404.1) * 43758.5453);

function line(ctx, x0, y0, x1, y1, color, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

function glow(ctx, x, y, radius, color, strength = .25, squash = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, squash);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  g.addColorStop(0, `rgba(${color},${strength})`);
  g.addColorStop(.3, `rgba(${color},${strength * .38})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function plate(ctx, x, y, w, title, subtitle, color = GREEN) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,15,14,.92)'; ctx.fillRect(x, y, w, subtitle ? 35 : 22);
  ctx.strokeStyle = color; ctx.lineWidth = .8; ctx.strokeRect(x + .5, y + .5, w - 1, (subtitle ? 35 : 22) - 1);
  ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, 3, (subtitle ? 35 : 22) - 2);
  ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#def5e8';
  ctx.fillText(title, x + 11, y + 14);
  if (subtitle) {
    ctx.font = '8px monospace'; ctx.fillStyle = '#95b6a9'; ctx.fillText(subtitle, x + 11, y + 27);
  }
  ctx.restore();
}

// exported para teste de geometria: o pórtico olha PARA a rota, nunca de costas.
export function viadutoPortalFacing(id) {
  return id === 'retorno_base_vetores' ? 'right' : 'left';
}

function drawBackdrop(ctx, map, vw, vh, z, t) {
  const horizon = point(0, 3.8, vw, vh, z).y;
  ctx.fillStyle = '#08191c'; ctx.fillRect(0, 0, vw, vh);
  const pano = getSprite('viaduto_panorama_noite');
  if (pano) {
    // Placa inteira, sem costura repetida no céu. A origem acompanha só 12%
    // da câmera: a estação fica longe; a treliça é que passa junto ao corpo.
    const w = Math.max(vw + 240, (horizon + 100) * pano.width / pano.height);
    const h = w * pano.height / pano.width;
    const x = -(w - vw) / 2 - Math.sin(t * .025) * 8 - Math.max(-85, Math.min(85, (svWorldToScreen(17, 0, vw, vh, z).x - vw / 2) * .12));
    ctx.drawImage(pano, x, horizon - h * .665, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, '#092126'); g.addColorStop(1, '#173e3d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
  }
  // Água abaixo da margem pintada: reflexos partidos, compridos e baratos.
  const waterY = horizon + 24 * z;
  const water = ctx.createLinearGradient(0, waterY, 0, vh);
  water.addColorStop(0, 'rgba(7,31,33,0)'); water.addColorStop(1, 'rgba(4,18,23,.76)');
  ctx.fillStyle = water; ctx.fillRect(0, waterY, vw, Math.max(0, vh - waterY));
  ctx.save();
  for (let i = 0; i < 62; i++) {
    const y = waterY + hash(i + 2) * Math.max(30, vh - waterY);
    const x = hash(i + 91) * vw + Math.sin(t * .35 + i) * 16;
    const len = (12 + hash(i + 33) * 95) * z;
    const a = .035 + .065 * (.5 + .5 * Math.sin(t * .8 + i * 2));
    line(ctx, x, y, x + len, y, `rgba(132,224,195,${a})`, (i % 4 === 0 ? 2 : 1) * z);
  }
  // Vapor da estação, atrás de toda a estrutura de manutenção.
  for (let i = 0; i < 7; i++) {
    const k = fract(t * .035 + i / 7);
    const x = vw * .65 + k * 70 * z;
    const y = horizon - 95 * z - k * 105 * z;
    ctx.globalAlpha = .065 * Math.sin(k * Math.PI);
    ctx.fillStyle = '#b4d8ce'; ctx.beginPath();
    ctx.ellipse(x, y, (14 + k * 35) * z, (8 + k * 14) * z, -.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Duas aves distantes cruzam o horizonte; não são entidades/colisores.
  ctx.save(); ctx.strokeStyle = 'rgba(9,28,30,.8)'; ctx.lineWidth = 1.4 * z;
  for (let i = 0; i < 3; i++) {
    const x = fract(t * .012 + i * .037) * (vw + 100) - 50;
    const y = horizon - (145 + i * 11) * z + Math.sin(t * .7 + i) * 5;
    const flap = Math.sin(t * 5 + i) * 3 * z;
    ctx.beginPath(); ctx.moveTo(x - 6 * z, y + flap); ctx.quadraticCurveTo(x - 2 * z, y - 2 * z, x, y);
    ctx.quadraticCurveTo(x + 2 * z, y - 2 * z, x + 6 * z, y + flap); ctx.stroke();
  }
  ctx.restore();
}

function drawServiceWall(ctx, vw, vh, z, t, active) {
  const a = point(START_X, BACK_Y, vw, vh, z), b = point(END_X, BACK_Y, vw, vh, z);
  // Anteparo de serviço da margem oposta. Aberto acima: não tapa o panorama.
  ctx.fillStyle = '#142725'; ctx.fillRect(a.x, a.y - 35 * z, b.x - a.x, 36 * z);
  line(ctx, a.x, a.y - 35 * z, b.x, b.y - 35 * z, '#426052', 3 * z);
  for (let wx = 1; wx < 33; wx += 2) {
    const p = point(wx + .5, BACK_Y, vw, vh, z);
    if (p.x < -150 || p.x > vw + 150) continue;
    ctx.fillStyle = '#20332e'; ctx.fillRect(p.x - 3 * z, p.y - 64 * z, 6 * z, 64 * z);
    ctx.fillStyle = '#537060'; ctx.fillRect(p.x - 3 * z, p.y - 64 * z, z, 61 * z);
    line(ctx, p.x, p.y - 51 * z, p.x + 128 * z, p.y - 51 * z, '#314b40', 2 * z);
    if (wx % 4 === 1) {
      ctx.fillStyle = active ? '#83dba2' : '#806d3c'; ctx.fillRect(p.x - 4 * z, p.y - 30 * z, 8 * z, 3 * z);
    }
  }
  // Guindastes de verdade ao fundo, em escala menor e sem sombra no passeio.
  for (const [wx, scale, flip] of [[7.2, .65, false], [24.8, .78, true]]) {
    const p = point(wx, 2.85, vw, vh, z);
    const sprite = getSprite('viaduto_guindaste');
    if (!sprite || p.x < -300 || p.x > vw + 300) continue;
    const h = 365 * scale * z, w = h * sprite.width / sprite.height;
    ctx.save(); ctx.translate(p.x, p.y); if (flip) ctx.scale(-1, 1);
    ctx.globalAlpha = .83; ctx.drawImage(sprite, -w / 2, -h + 4 * z, w, h);
    // O braço pintado da peça vai de x~0 até +140; o cabo nasce no carrinho.
    const hookX = w * .32, top = -h * .73, sway = Math.sin(t * .65 + wx) * 4 * z;
    const hookY = -h * .30 + Math.sin(t * .42 + wx) * 7 * z;
    line(ctx, hookX, top, hookX + sway, hookY, '#718178', 1.1 * z);
    ctx.strokeStyle = '#ba9c60'; ctx.lineWidth = 2.4 * z;
    ctx.beginPath(); ctx.arc(hookX + sway + 2 * z, hookY + 3 * z, 4 * z, -.5, Math.PI * 1.2); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 3) > 0 ? AMBER : '#684a25';
    ctx.fillRect(-3 * z, -h + 5 * z, 5 * z, 3 * z);
    ctx.restore();
  }
}

function drawDeck(ctx, vw, vh, z, t, active) {
  const back = point(0, BACK_Y, vw, vh, z).y;
  const front = point(0, FRONT_Y, vw, vh, z).y;
  const x0 = point(START_X, 0, vw, vh, z).x, x1 = point(END_X, 0, vw, vh, z).x;
  // A laje tem espessura. A treliça pintada fica ABAIXO dela, não no lugar
  // do chão e muito menos repetida como uma cerca na frente do personagem.
  const floor = ctx.createLinearGradient(0, back, 0, front);
  floor.addColorStop(0, '#26352f'); floor.addColorStop(.5, '#344139'); floor.addColorStop(1, '#1c2b27');
  ctx.fillStyle = floor; ctx.fillRect(x0, back, x1 - x0, front - back);
  for (let wx = START_X; wx < END_X; wx++) {
    const p = point(wx, BACK_Y, vw, vh, z);
    if (p.x < -100 || p.x > vw + 100) continue;
    const w = 64 * z;
    ctx.fillStyle = wx % 2 ? 'rgba(130,151,127,.045)' : 'rgba(0,0,0,.06)';
    ctx.fillRect(p.x + z, back + z, w - 2 * z, front - back - 2 * z);
    line(ctx, p.x, back, p.x, front, '#111e19', 1.2 * z);
    for (const dy of [9, 77]) {
      ctx.fillStyle = '#718072'; ctx.fillRect(p.x + 5 * z, back + dy * z, 2 * z, 2 * z);
      ctx.fillStyle = '#0c1712'; ctx.fillRect(p.x + w - 7 * z, back + dy * z, 2 * z, 2 * z);
    }
    if (wx % 3 === 0) {
      ctx.fillStyle = '#101e18'; ctx.fillRect(p.x + 15 * z, back + 40 * z, 33 * z, 13 * z);
      for (let k = 0; k < 5; k++) line(ctx, p.x + (18 + k * 6) * z, back + 42 * z, p.x + (18 + k * 6) * z, back + 51 * z, '#425347', z);
    }
    // Seta no sentido da estação, com uma onda de indução percorrendo a rota.
    const pulse = .22 + .3 * Math.max(0, Math.sin(t * 2.2 - wx * .48));
    ctx.strokeStyle = active ? `rgba(140,255,158,${pulse})` : 'rgba(188,156,80,.22)'; ctx.lineWidth = 2 * z;
    const cy = back + 24 * z;
    ctx.beginPath(); ctx.moveTo(p.x + 25 * z, cy - 4 * z); ctx.lineTo(p.x + 32 * z, cy); ctx.lineTo(p.x + 25 * z, cy + 4 * z); ctx.stroke();
  }
  // Faixas de borda descontínuas: leitura de manutenção, não pista de corrida.
  for (const y of [back + 3 * z, front - 5 * z]) {
    line(ctx, x0, y, x1, y, '#0b1712', 4 * z);
    for (let wx = 1; wx < 33; wx += .5) {
      const x = point(wx, 0, vw, vh, z).x;
      if (x < -40 || x > vw + 40) continue;
      line(ctx, x, y, x + 15 * z, y, '#9b8950', 2 * z);
    }
  }
  ctx.fillStyle = '#0a1512'; ctx.fillRect(x0, front, x1 - x0, 12 * z);
  line(ctx, x0, front + z, x1, front + z, '#637764', 2 * z);
  line(ctx, x0, front + 10 * z, x1, front + 10 * z, active ? '#64bd83' : '#4e634c', 1.5 * z);
  const truss = getSprite('viaduto_vao_trelica');
  if (truss) {
    const w = 320 * z, h = w * truss.height / truss.width;
    const first = Math.max(START_X, Math.floor((-w - x0) / w));
    for (let i = first; i < 11; i++) {
      const x = x0 + i * w;
      if (x > vw + w || x + w < x0) continue;
      const left = Math.max(x, x0), right = Math.min(x + w, x1);
      if (right <= left) continue;
      const sx = (left - x) / w * truss.width, sw = (right - left) / w * truss.width;
      ctx.drawImage(truss, sx, 0, sw, truss.height, left, front + 11 * z, right - left, h);
    }
  }
  // Pilares de sustentação mergulham no canal, com reflexo quebrado.
  for (const wx of [3.5, 11.5, 19.5, 27.5, 32.5]) {
    const x = point(wx, 0, vw, vh, z).x;
    if (x < -80 || x > vw + 80) continue;
    const top = front + 75 * z;
    ctx.fillStyle = '#102421'; ctx.fillRect(x - 13 * z, top, 26 * z, vh - top);
    ctx.fillStyle = '#294039'; ctx.fillRect(x - 13 * z, top, 5 * z, vh - top);
    line(ctx, x - 35 * z, top + 8 * z, x, top + 56 * z, '#314a3e', 7 * z);
    line(ctx, x + 35 * z, top + 8 * z, x, top + 56 * z, '#1b322b', 7 * z);
    for (let i = 0; i < 5; i++) {
      const y = top + 65 * z + i * 12 * z;
      line(ctx, x - (15 - i * 2) * z + Math.sin(t + i) * 4, y, x + (15 - i * 2) * z, y, `rgba(75,126,105,${.15 - i * .022})`, 3 * z);
    }
  }
}

function drawLamp(ctx, wx, wy, vw, vh, z, t, active) {
  const p = point(wx, wy, vw, vh, z), sprite = getSprite('viaduto_totem_sinal');
  if (!sprite || p.x < -150 || p.x > vw + 150) return;
  const h = 205 * z, w = h * sprite.width / sprite.height;
  // A lâmpada da arte fica à direita do mastro (x~65 de 88).
  const lx = p.x + w * .245, ly = p.y - h + 39 * z;
  const breath = .88 + .08 * Math.sin(t * 1.7 + wx);
  ctx.save();
  const beam = ctx.createLinearGradient(lx, ly, lx, p.y);
  beam.addColorStop(0, `rgba(255,203,111,${.17 * breath})`); beam.addColorStop(1, 'rgba(255,203,111,0)');
  ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(lx - 5 * z, ly); ctx.lineTo(lx + 5 * z, ly);
  ctx.lineTo(lx + 61 * z, p.y + 4 * z); ctx.lineTo(lx - 52 * z, p.y + 4 * z); ctx.closePath(); ctx.fill();
  glow(ctx, lx, ly + 4 * z, 33 * z, '255,203,111', .34 * breath);
  glow(ctx, lx, p.y, 65 * z, '255,203,111', .13 * breath, .28);
  ctx.drawImage(sprite, p.x - w / 2, p.y - h + 4 * z, w, h);
  ctx.fillStyle = active ? '#adffbd' : '#ffc94a'; ctx.fillRect(p.x + 4 * z, p.y - h * .48, 3 * z, 3 * z);
  ctx.restore();
}

function drawPod(ctx, vw, vh, z, t, active) {
  // Ciclo de logística completo: entra, desacelera na bomba, troca a carga,
  // sai. O trilho é AÉREO e fica atrás do passeio; não é um portal falso.
  const cycle = fract(t / 26);
  const ease = cycle < .12 ? cycle / .12 : cycle > .88 ? (1 - cycle) / .12 : 1;
  const wx = 4.5 + Math.min(1, ease) * 23 + Math.sin(t * .38) * .10;
  const rail0 = point(3, 2.3, vw, vh, z), rail1 = point(31, 2.3, vw, vh, z);
  line(ctx, rail0.x, rail0.y - 177 * z, rail1.x, rail1.y - 177 * z, '#0b1916', 8 * z);
  line(ctx, rail0.x, rail0.y - 180 * z, rail1.x, rail1.y - 180 * z, '#526657', 2 * z);
  const p = point(wx, 2.3, vw, vh, z), sprite = getSprite('viaduto_pod_carga');
  if (!sprite || p.x < -180 || p.x > vw + 180) return;
  const w = 184 * z, h = w * sprite.height / sprite.width;
  const y = p.y - 174 * z + Math.sin(t * 1.8) * .7 * z;
  ctx.save();
  ctx.globalAlpha = .94; ctx.drawImage(sprite, p.x - w / 2, y, w, h);
  glow(ctx, p.x, y + h * .82, 50 * z, '116,255,160', active ? .15 : .07, .22);
  ctx.fillStyle = AMBER; ctx.fillRect(p.x + w * .36, y + h * .46, 3 * z, 3 * z);
  ctx.restore();
}

function drawPortal(ctx, portal, flags, vw, vh, z, t) {
  const p = point(portal.x + .5, 5.45, vw, vh, z);
  if (p.x < -160 || p.x > vw + 160) return;
  const west = viadutoPortalFacing(portal.id) === 'right';
  const locked = !!portal.requiresFlag && !flags[portal.requiresFlag];
  const color = locked ? '#ae8950' : west ? '#8ab8a0' : GREEN;
  const w = 126 * z, h = 164 * z;
  ctx.save(); ctx.translate(p.x, p.y);
  // Soleira apoiada no chão + batentes com profundidade para dentro da rota.
  ctx.fillStyle = '#14231e'; ctx.beginPath(); ctx.ellipse(0, 3 * z, 69 * z, 17 * z, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3b4b40'; ctx.fillRect(-w / 2, -4 * z, w, 9 * z);
  line(ctx, -w / 2, -4 * z, w / 2, -4 * z, '#84917a', 2 * z);
  ctx.scale(west ? 1 : -1, 1);
  const opening = ctx.createLinearGradient(-40 * z, 0, 42 * z, 0);
  opening.addColorStop(0, '#071411'); opening.addColorStop(1, '#17372d');
  ctx.fillStyle = opening; ctx.fillRect(-45 * z, -h + 17 * z, 90 * z, h - 18 * z);
  // Jambas assimétricas: a face lateral aparece do lado interno do passeio.
  ctx.fillStyle = '#263a31'; ctx.beginPath();
  ctx.moveTo(45 * z, -h + 12 * z); ctx.lineTo(61 * z, -h + 24 * z); ctx.lineTo(61 * z, 0); ctx.lineTo(45 * z, -8 * z); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4b5b4d'; ctx.fillRect(-60 * z, -h + 10 * z, 17 * z, h - 10 * z);
  ctx.fillStyle = '#35483c'; ctx.fillRect(43 * z, -h + 10 * z, 14 * z, h - 10 * z);
  ctx.fillStyle = '#526251'; ctx.fillRect(-60 * z, -h + 7 * z, 116 * z, 14 * z);
  ctx.fillStyle = '#1b2b23'; ctx.fillRect(-55 * z, -h + 22 * z, 107 * z, 6 * z);
  for (const x of [-52, 48]) {
    ctx.fillStyle = '#17251e'; ctx.fillRect((x - 4) * z, -5 * z, 18 * z, 8 * z);
    for (let k = 0; k < 3; k++) line(ctx, (x - 2) * z, (-40 - k * 12) * z, (x + 8) * z, (-47 - k * 12) * z, '#b29a51', 4 * z);
    line(ctx, x * z, (-h + 34) * z, x * z, -12 * z, color, 2 * z);
    line(ctx, (x + (x < 0 ? -7 : 7)) * z, (-h + 28) * z, (x + (x < 0 ? -7 : 7)) * z, -10 * z, '#14261d', 3 * z);
  }
  line(ctx, -43 * z, (-h + 29) * z, 43 * z, (-h + 29) * z, color, 2 * z);
  // Porta física recuada, nunca um retângulo neon flutuando de frente.
  const scan = fract(t * .23);
  ctx.fillStyle = 'rgba(126,211,158,.08)'; ctx.fillRect(-41 * z, (-h + 34) * z, 82 * z, (h - 40) * scan);
  line(ctx, -40 * z, (-h + 34 + (h - 40) * scan) * z, 40 * z, (-h + 34 + (h - 40) * scan) * z, 'rgba(146,255,181,.38)', z);
  ctx.fillStyle = '#83eaa1'; ctx.fillRect(-6 * z, -h + 12 * z, 12 * z, 4 * z);
  ctx.restore();
  const title = west ? 'BASE DOS VETORES' : 'ESTAÇÃO QUE RESPIRA';
  plate(ctx, p.x - 83 * z, p.y - h - 32 * z, 166 * z, title, west ? '← DOCA D4 · RETORNO' : 'SETOR BIO · ACESSO →', color);
}

function drawCollectible(ctx, item, vw, vh, z, t) {
  const p = point(item.x, item.y, vw, vh, z), bob = Math.sin(t * 2.6) * 3 * z;
  glow(ctx, p.x, p.y - 17 * z, 32 * z, '133,255,180', .24);
  ctx.save(); ctx.translate(p.x, p.y - 22 * z - bob);
  ctx.fillStyle = '#172e25'; ctx.strokeStyle = '#96ffba'; ctx.lineWidth = 1.5 * z;
  ctx.beginPath(); ctx.moveTo(0, -12 * z); ctx.lineTo(9 * z, -4 * z); ctx.lineTo(9 * z, 7 * z);
  ctx.lineTo(0, 13 * z); ctx.lineTo(-9 * z, 7 * z); ctx.lineTo(-9 * z, -4 * z); ctx.closePath(); ctx.fill(); ctx.stroke();
  line(ctx, 0, -10 * z, 0, 11 * z, '#5ba97a', z);
  ctx.fillStyle = '#d7ffe2'; ctx.fillRect(-2 * z, -3 * z, 4 * z, 6 * z);
  ctx.restore();
}

function drawFrontRail(ctx, vw, vh, z) {
  // Meio tile além da máscara caminhável: o corrimão nunca corta o rosto
  // nem as pernas de quem anda na borda frontal (y máximo ~6.75).
  const y = point(0, FRONT_Y + .35, vw, vh, z).y;
  const x0 = point(START_X, 0, vw, vh, z).x, x1 = point(END_X, 0, vw, vh, z).x;
  // Guarda-corpo baixo e aberto: emoldura o canal sem grades sobre o rosto.
  ctx.save(); ctx.globalAlpha = .86;
  for (let wx = 1; wx <= 33; wx += 2) {
    const x = point(wx, 0, vw, vh, z).x;
    if (x < -20 || x > vw + 20) continue;
    ctx.fillStyle = '#152820'; ctx.fillRect(x - 2 * z, y - 25 * z, 4 * z, 27 * z);
    ctx.fillStyle = '#657761'; ctx.fillRect(x - 2 * z, y - 25 * z, z, 25 * z);
  }
  line(ctx, x0, y - 24 * z, x1, y - 24 * z, '#4d6350', 3 * z);
  line(ctx, x0, y - 25 * z, x1, y - 25 * z, '#8b9875', z);
  ctx.restore();
}

function drawWeather(ctx, map, state, vw, vh, z, t) {
  const rain = state.clima?.chuva ?? 0;
  if (rain > .05) {
    ctx.save(); ctx.strokeStyle = `rgba(167,210,204,${.12 + rain * .15})`; ctx.lineWidth = .8 * z;
    ctx.beginPath();
    for (let i = 0; i < Math.floor(100 * rain); i++) {
      const x = fract(hash(i) + t * .08) * (vw + 80) - 40;
      const y = fract(hash(i + 101) + t * .8) * vh;
      ctx.moveTo(x, y); ctx.lineTo(x - 5 * z, y + 14 * z);
    }
    ctx.stroke(); ctx.restore();
  }
  // Vagalumes/spray luminoso: posições determinísticas, zero allocation por frame.
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const x = hash(i + 501) * vw + Math.sin(t * .35 + i) * 18;
    const y = point(0, 3.1, vw, vh, z).y - hash(i + 701) * 100 * z + Math.cos(t * .6 + i) * 8;
    ctx.globalAlpha = .15 + .3 * Math.max(0, Math.sin(t * 1.2 + i * 2));
    ctx.fillStyle = i % 4 ? '#a8efbc' : '#ffd486'; ctx.fillRect(x, y, 1.5 * z, 1.5 * z);
  }
  ctx.restore();
}

export function renderViadutoVetores(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, dpr, time, callbacks = {}) {
  const t = Number.isFinite(time) ? time / 1000 : 0;
  const z = zoom || 1, flags = state.progress?.flags ?? {};
  const active = !!flags.rota_viaduto_vetores_aberta;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  const shake = state.player?.ultimate?.shake;
  if (shake?.timeLeft > 0) {
    const k = shake.timeLeft / (shake.duration || .26), power = (shake.power ?? 2) * k;
    ctx.translate(Math.sin(t * 143) * power, Math.cos(t * 117) * power * .6);
  }
  drawBackdrop(ctx, map, viewW, viewH, z, t);
  drawServiceWall(ctx, viewW, viewH, z, t, active);
  drawPod(ctx, viewW, viewH, z, t, active);
  drawDeck(ctx, viewW, viewH, z, t, active);

  // Bomba real do lado de trás: a tubulação alimenta a faixa de indução.
  const pump = (state.objects ?? []).find(o => o.id === 'bomba_inducao_viaduto');
  if (pump) {
    drawSideObject(ctx, pump, cameraX, cameraY, viewW, viewH, z, time);
    const p = point(pump.x, pump.y, viewW, viewH, z);
    if (p.x > -150 && p.x < viewW + 150) {
      const calibrated = !!flags.bomba_viaduto_estabilizada;
      glow(ctx, p.x, p.y - 58 * z, 42 * z, '116,255,160', .12 + .05 * Math.sin(t * 2));
      ctx.save(); ctx.strokeStyle = calibrated ? GREEN : AMBER; ctx.lineWidth = 1.6 * z;
      ctx.beginPath(); ctx.arc(p.x + 27 * z, p.y - 49 * z, 8 * z, t * (calibrated ? 1.2 : .25), t * (calibrated ? 1.2 : .25) + Math.PI * 1.5); ctx.stroke();
      ctx.restore();
      plate(ctx, p.x - 67 * z, p.y - 116 * z, 134 * z, calibrated ? 'INDUÇÃO ESTÁVEL' : 'BOMBA DE INDUÇÃO', calibrated ? 'CARGA CONTÍNUA · 100%' : '[E] ESTABILIZAR · +25 XP', calibrated ? GREEN : AMBER);
    }
  }
  for (const wx of [4.5, 12.5, 20.5, 28.5]) drawLamp(ctx, wx, 3.12, viewW, viewH, z, t, active);
  for (const portal of state.portals ?? []) drawPortal(ctx, portal, flags, viewW, viewH, z, t);

  // Fila de entidades a MESMA profundidade Y da física e do Aeroporto.
  const queue = [];
  for (const obj of state.objects ?? []) {
    if (obj.id === 'bomba_inducao_viaduto' || obj.oculto || obj.invisivel) continue;
    queue.push({ kind: 'object', y: obj.y, item: obj });
  }
  for (const item of state.collectibles ?? []) {
    if (item.requiresFlag && !flags[item.requiresFlag]) continue;
    if (flags[`collected_${item.id}`]) continue;
    queue.push({ kind: 'collectible', y: item.y, item });
  }
  for (const actor of state.actors ?? []) queue.push({ kind: 'actor', y: actor.y, item: actor });
  if (state.player) queue.push({ kind: 'player', y: state.player.y, item: state.player });
  queue.sort((a, b) => a.y - b.y);
  for (const entry of queue) {
    const item = entry.item;
    if (entry.kind === 'object') {
      drawSideObject(ctx, item, cameraX, cameraY, viewW, viewH, z, time);
      if (item.id === 'terminal_carga_viaduto') {
        const p = point(item.x, item.y, viewW, viewH, z);
        plate(ctx, p.x - 61 * z, p.y - 119 * z, 122 * z, 'REGISTRO DE CARGA', flags.terminal_carga_viaduto_registrado ? 'PASSAGEM CONFIRMADA' : '[E] REGISTRAR · +25 XP');
      }
    } else if (entry.kind === 'collectible') drawCollectible(ctx, item, viewW, viewH, z, t);
    else {
      const p = point(item.x, item.y, viewW, viewH, z);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(z, z);
      if (entry.kind === 'player') callbacks.drawPlayer?.(item, 0, 0);
      else callbacks.drawActor?.(item, 0, 0);
      ctx.restore();
      item._topo = entry.kind === 'player' && item.nucleoForm === 'forma_bruta' ? 170 : 130;
    }
  }
  // Impacto da Quebra também treme/ondeia no exterior, não só na sala iso.
  const flash = state.player?.ability?.massFlash;
  if (flash?.timeLeft > 0) {
    const p = point(flash.x, flash.y, viewW, viewH, z), k = 1 - flash.timeLeft / flash.duration;
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = AMBER; ctx.lineWidth = 3 * z;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, (18 + k * 85) * z, (6 + k * 22) * z, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  for (const text of listCombatFeedback()) {
    const p = point(text.x, text.y, viewW, viewH, z), k = text.life / text.duration;
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 3); ctx.font = `bold ${text.crit ? 15 : 11}px monospace`;
    ctx.textAlign = 'center'; ctx.fillStyle = text.color; ctx.strokeStyle = '#07140e'; ctx.lineWidth = 3;
    const y = p.y - (1 - k) * 30 * z;
    ctx.strokeText(text.text, p.x, y); ctx.fillText(text.text, p.x, y); ctx.restore();
  }
  drawFrontRail(ctx, viewW, viewH, z);
  drawWeather(ctx, map, state, viewW, viewH, z, t);
  if (state.player?.target) {
    const p = point(state.player.target.x, state.player.target.y, viewW, viewH, z);
    ctx.save(); ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 12 * z, 5 * z, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  ctx.restore();

  // HUD fora do tremor. Só informação do mundo real, sem cobrir a paisagem.
  const width = Math.min(338, viewW - 32), x = Math.max(16, (viewW - width) / 2);
  plate(ctx, x, 16, width, 'VIADUTO DOS VETORES', 'CANAL 04 · BASE ←→ ESTAÇÃO QUE RESPIRA');
  if (viewW > 760) {
    ctx.save(); ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#aac4b5';
    ctx.fillText(`${state.clima?.atual === 'chuva' ? 'CHUVA' : 'TURNO NOTURNO'} · ${flags.bomba_viaduto_estabilizada ? 'INDUÇÃO ESTÁVEL' : 'MANUTENÇÃO EM CURSO'}`, viewW - 22, 34);
    ctx.restore();
  }
}
