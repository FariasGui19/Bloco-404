// Ajusta a arte escolhida ao paredão existente; a aba frontal fica atrás da rocha.
const {createCanvas, loadImage} = require('@napi-rs/canvas');
const {writeFileSync} = require('node:fs');
(async () => {
  const image = await loadImage('assets/sprites/enseada-camp/chao-gerado.png');
  const source = createCanvas(image.width, image.height), s = source.getContext('2d');
  s.drawImage(image, 0, 0);
  const raw = s.getImageData(0, 0, image.width, image.height).data;
  let x0=image.width, y0=image.height, x1=0, y1=0;
  for(let y=0; y<image.height; y++) for(let x=0; x<image.width; x++) if(raw[(y*image.width+x)*4+3]>10){ x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y); }
  const canvas = createCanvas(800, 300), ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,x0,y0,x1-x0+1,y1-y0+1,0,0,800,270);
  const img=ctx.getImageData(0,0,800,300), data=img.data;
  // Prolongar apenas a faixa verde frontal da arte, sob a parede da escada.
  // As amostras vêm da grama gerada, sem pintar uma nova forma vetorial.
  for (let x=4; x<796; x++) {
    let bottom=269; while(bottom>0 && data[(bottom*800+x)*4+3]<200) bottom--;
    if(bottom<100) continue;
    const start=Math.max(0,bottom-15);
    for(let y=start; y<300; y++) {
      const dst=(y*800+x)*4;
      // Pequena variação de cor da própria paleta da grama gerada.
      const noise = ((x*17+y*31+(x*y)%11)%7)-3;
      data[dst]=135+noise; data[dst+1]=168+noise; data[dst+2]=58+noise; data[dst+3]=255;
    }
  }
  ctx.putImageData(img,0,0);writeFileSync('assets/sprites/enseada-camp/chao-encaixado.png', canvas.toBuffer('image/png'));
})();
