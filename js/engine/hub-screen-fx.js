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
    ctx.strokeStyle = 'rgba(200,255,255,.23)'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const angle = t * .8 + i * Math.PI * 2 / 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 15 + i * 8, 23 + i * 12, 0, angle, angle + 1.15); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(224,255,255,.35)';
    for (let i = 0; i < 5; i++) { const a = t * .6 + i * 1.26; ctx.beginPath(); ctx.arc(Math.cos(a) * (12 + i * 3), Math.sin(a) * (20 + i * 4), 1.4, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

