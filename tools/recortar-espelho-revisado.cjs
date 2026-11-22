// Remove o fundo magenta das três artes de substituição.
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('node:fs');
(async () => {
  for (const nome of ['espelho', 'altar', 'pedras']) {
    const path = `assets/sprites/enseada-espelho-revisado/${nome}`;
    const im = await loadImage(`${path}-fonte.png`);
    const c = createCanvas(im.width, im.height), ctx = c.getContext('2d');
    ctx.drawImage(im, 0, 0);
    const img = ctx.getImageData(0, 0, im.width, im.height), a = img.data;
    let left = im.width, top = im.height, right = -1, bottom = -1;
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
      const i = (y * im.width + x) * 4, r = a[i], g = a[i+1], b = a[i+2];
      const mag = Math.min(r-g, b-g);
      // A auréola gerada ao redor do cristal não pertence ao objeto; o jogo
      // já desenha iluminação dinâmica. Delimita só a silhueta do pedestal.
      const contornoCristal = [[252, 627, 651], [270, 622, 660], [290, 608, 670],
        [320, 596, 687], [350, 586, 695], [370, 574, 706], [375, 550, 730]];
      let foraCristal = false;
      if (nome === 'altar' && y >= 252 && y < 375) {
        const j = contornoCristal.findIndex(([yy]) => yy >= y);
        const [y1, l1, r1] = contornoCristal[Math.max(0, j-1)];
        const [y2, l2, r2] = contornoCristal[Math.max(0, j)];
        const f = y2 === y1 ? 0 : (y-y1)/(y2-y1);
        foraCristal = x < l1 + (l2-l1)*f || x > r1 + (r2-r1)*f;
      }
      if (nome === 'altar' && (x < 545 || x > 735 || y < 252 || y > 570 || foraCristal)) a[i+3] = 0;
      else if (mag > 55 && r > 110 && b > 110) {
        const alpha = Math.max(0, Math.min(1, (150-mag)/95));
        a[i+3] = Math.round(a[i+3]*alpha);
        if (alpha > 0) { a[i] = Math.max(0, Math.min(255,(r-255*(1-alpha))/alpha)); a[i+2] = Math.max(0, Math.min(255,(b-255*(1-alpha))/alpha)); }
      }
      if (a[i+3] > 32) { left = Math.min(left,x); right = Math.max(right,x); top = Math.min(top,y); bottom = Math.max(bottom,y); }
    }
    ctx.putImageData(img,0,0);
    if (right < left) throw Error(`Recorte vazio: ${nome}`);
    const out = createCanvas(right-left+1,bottom-top+1);
    out.getContext('2d').drawImage(c,left,top,out.width,out.height,0,0,out.width,out.height);
    fs.writeFileSync(`${path}.png`,out.toBuffer('image/png'));
    console.log(nome, left,top,out.width,out.height);
  }
})().catch(e => { console.error(e); process.exitCode=1; });
