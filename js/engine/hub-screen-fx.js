// A animação é ambiental: não decide desbloqueio, interação ou progressão.
export function hasHubScreenFx(mapId, id) {
  return mapId === 'hub_saguao' && (id === 'totem' || id === 'metro');
}

// Coordenadas locais da célula hub_props: moldura e pedestal são sempre
// o mesmo sprite; os efeitos são recortados à tela/interior, sem deslocá-los.
export function drawHubScreenFx(ctx, id, t) {
  ctx.save();
  if (id === 'totem') {
    ctx.beginPath(); ctx.moveTo(112, 91); ctx.lineTo(173, 60); ctx.lineTo(205, 136); ctx.lineTo(137, 168); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = 'rgba(223,255,253,.28)'; ctx.lineWidth = 3;
    const scan = (t * 23) % 130;
    ctx.beginPath(); ctx.moveTo(90, 60 + scan); ctx.lineTo(220, -5 + scan); ctx.stroke();
    ctx.strokeStyle = 'rgba(9,105,124,.38)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const y = 95 + i * 17; ctx.beginPath(); ctx.moveTo(130, y); ctx.lineTo(175, y - 21); ctx.stroke(); }
  } else if (id === 'metro') {
    ctx.beginPath(); ctx.ellipse(138, 190, 40, 69, .33, 0, Math.PI * 2); ctx.clip();
    ctx.translate(138, 190); ctx.rotate(.33);
    // Arcos e partículas giram sobre o vórtice existente; nenhum pixel
    // da moldura ou da rampa é alterado. Funciona mesmo com o acesso bloqueado.
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const phase = (t * .8 + i / 3) % 1;
      ctx.strokeStyle = `rgba(210,255,255,${.72 * (1 - phase * .75)})`;
      ctx.lineWidth = 4.5 - phase * 1.4;
      ctx.beginPath(); ctx.ellipse(0, 0, 6 + phase * 30, 10 + phase * 53, 0, t * 1.9 + i * 2.1, t * 1.9 + i * 2.1 + 2.1); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(228,255,255,.82)';
    for (let i = 0; i < 5; i++) {
      const phase = (t * .32 + i / 5) % 1, a = t * 1.9 + i * 2.4;
      ctx.beginPath(); ctx.arc(Math.cos(a) * (4 + phase * 30), Math.sin(a) * (7 + phase * 50), 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

