// Quadros derivados das artes aprovadas: postes, apoios e rochas não se movem.
// Uso (dependência opcional de QA): npm install --no-save --no-package-lock @napi-rs/canvas
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('node:fs');
const dest = 'assets/sprites/enseada-animacao-lote2';
fs.mkdirSync(dest,{recursive:true});
const canvas = (w,h) => createCanvas(w,h);
(async()=>{
  const im = await loadImage('assets/sprites/enseada-cais-revisao/rede.png');
  const mesh = canvas(im.width,im.height), mg = mesh.getContext('2d');
  const shape = g => {g.beginPath();g.moveTo(245,320);g.lineTo(830,65);g.lineTo(830,222);g.lineTo(245,464);g.closePath();};
  mg.save();shape(mg);mg.clip();mg.drawImage(im,0,0);mg.restore();
  const fixed = canvas(im.width,im.height), fg = fixed.getContext('2d');
  fg.drawImage(im,0,0);fg.save();fg.globalCompositeOperation='destination-out';shape(fg);fg.fill();fg.restore();
  for(const [name,amount] of [['rede-baixa',-7],['rede-alta',7]]){
    const c=canvas(im.width,im.height), g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(fixed,0,0);
    // Tiras contíguas alteram apenas a malha, com extremos presos aos postes.
    for(let x=245;x<830;x+=2){
      const w=Math.min(2,830-x), phase=(x-245)/585, dy=Math.round(amount*Math.sin(Math.PI*phase));
      g.drawImage(mesh,x,0,w,im.height,x,dy,w,im.height);
    }
    fs.writeFileSync(`${dest}/${name}.png`,c.toBuffer('image/png'));
  }
  const birds=await loadImage('assets/sprites/enseada-sudeste/gaivotas-rochedo.png');
  for(const [name,x,y] of [['gaivota-esquerda',568,139],['gaivota-direita',660,311]]){
    const c=canvas(birds.width,birds.height),g=c.getContext('2d');g.drawImage(birds,0,0);
    // Uma pálpebra horizontal curta sobre o olho existente, sem mover o poleiro.
    g.fillStyle='#e9f1ef';g.fillRect(x-4,y-3,10,11);
    g.fillStyle='#242b34';g.fillRect(x-4,y+2,10,2);
    fs.writeFileSync(`${dest}/${name}.png`,c.toBuffer('image/png'));
  }
})().catch(e=>{console.error(e);process.exitCode=1});
