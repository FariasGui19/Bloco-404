// Remove o fundo claro das artes isoladas geradas para o sudeste.
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('node:fs');
(async () => {
  for (const name of ['gaivotas-rochedo', 'conchas', 'cercado', 'encosta', 'lanterna', 'portal-completo', 'poste-praia']) {
    const im=await loadImage(`assets/sprites/enseada-sudeste/${name}-fonte.png`), w=im.width, h=im.height;
    const c=createCanvas(w,h), g=c.getContext('2d'); g.drawImage(im,0,0);
    const image=g.getImageData(0,0,w,h), a=image.data, seen=new Uint8Array(w*h), stack=new Int32Array(w*h); let count=0;
    const add=i=>{if(i<0||i>=w*h||seen[i])return;const p=i*4;if(a[p]>225&&a[p+1]>225&&a[p+2]>225){seen[i]=1;stack[count++]=i;}};
    for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
    while(count){const i=stack[--count],x=i%w;a[i*4+3]=0;if(x)add(i-1);if(x<w-1)add(i+1);if(i>=w)add(i-w);if(i<w*(h-1))add(i+w)}
    // Elimina pedras isoladas do recorte novo; preserva somente a massa do portal.
    if(name==='portal-completo') {
      const vis=new Uint8Array(w*h), q=new Int32Array(w*h); let maior=[];
      for(let i=0;i<w*h;i++) {
        if(vis[i] || a[i*4+3] < 32) continue;
        let inicio=0,fim=0; q[fim++]=i; vis[i]=1;
        while(inicio<fim) {
          const k=q[inicio++], x=k%w;
          for(const next of [x>0?k-1:-1,x<w-1?k+1:-1,k>=w?k-w:-1,k<w*(h-1)?k+w:-1]) {
            if(next>=0&&!vis[next]&&a[next*4+3]>=32){vis[next]=1;q[fim++]=next;}
          }
        }
        if(fim>maior.length) maior=Array.from(q.slice(0,fim));
      }
      const keep=new Uint8Array(w*h);for(const i of maior)keep[i]=1;
      for(let i=0;i<w*h;i++)if(!keep[i])a[i*4+3]=0;
    }
    // O cercado contém um fundo branco fechado e sombra cinza, não areia.
    if(name==='cercado')for(let i=0;i<a.length;i+=4){const r=a[i],g=a[i+1],b=a[i+2];if(Math.min(r,g,b)>207 && Math.max(r,g,b)-Math.min(r,g,b)<15)a[i+3]=0;}
    g.putImageData(image,0,0);fs.writeFileSync(`assets/sprites/enseada-sudeste/${name}.png`,c.toBuffer('image/png'));
  }
})();
