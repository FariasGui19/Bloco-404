// Cena em resolução fixa: assets do mapa e pequenas folhas de efeitos. Nenhum
// bitmap de panorama é carregado; cada plano tem profundidade independente.
const PATHS = {
  fauna: 'assets/sprites/fauna/fauna-costeira.png',
  pool: 'assets/sprites/enseada-animacao-lote7/piscina.png',
  palm: 'assets/sprites/enseada-animacao-lote7/palmeira-baixa.png',
  tallPalm: 'assets/sprites/enseada-animacao-lote7/palmeira-alta.png',
  rocks: 'assets/sprites/enseada-5/rochas-borda-piscina.png',
  waterTiles: 'assets/sprites/tiles/beach-shore.png',
  shell: 'assets/sprites/enseada-lote2/gruta-oeste-compacta.png',
  coral: 'assets/sprites/enseada-animacao-lote6/corais-amarelos.png',
};
const EFFECTS = ['mar','onda','ondulacao','vapor','bolhas','chuva','respingo','mao','brilho','cascata'];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

export function createDioramaRenderer(canvas) {
  const images = {};
  for (const [key, src] of Object.entries(PATHS)) { const image = new Image(); image.src = src; images[key] = image; }
  for (const name of EFFECTS) { const image = new Image(); image.src = `assets/sprites/enseada-fpv-lote1/${name}.png`; images[name] = image; }
  const ctx = canvas.getContext('2d', { alpha: false });
  const ready = key => images[key]?.complete && images[key].naturalWidth > 0;
  const image = (key,x,y,w,h) => { if (ready(key)) ctx.drawImage(images[key],Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
  const sheet = (key,frame,x,y,w,h,cols=8, row=0, rows=1) => {
    if (!ready(key)) return;
    const img=images[key], sw=img.naturalWidth/cols, sh=img.naturalHeight/rows;
    ctx.drawImage(img, ((Math.floor(frame)%cols+cols)%cols)*sw, row*sh, sw, sh, Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  };
  const effect = (key, t, x, y, w=32, h=w, speed=8, phase=0) => sheet(key,Math.floor(t*speed+phase)%8,x,y,w,h);
  const plan = (x,y,depth,fn) => { ctx.save();ctx.translate(Math.round(-x*depth),Math.round(-y*depth*.6));fn();ctx.restore(); };
  function sky(t) {
    ctx.fillStyle='#80cad1';ctx.fillRect(-35,-30,550,135);
    for (let i=0;i<7;i++) { ctx.fillStyle=i%2?'#cdebe0':'#e3f2df'; const x=(i*93+31)%560-30,y=22+(i%3)*12;ctx.fillRect(x,y,50,5);ctx.fillRect(x+9,y-5,28,5);ctx.fillRect(x+19,y-9,12,4); }
    // Ilhas distantes em silhueta, com contornos escalonados de pixel art.
    ctx.fillStyle='#528b87';ctx.beginPath();ctx.moveTo(-25,90);ctx.lineTo(20,90);ctx.lineTo(37,82);ctx.lineTo(55,82);ctx.lineTo(68,73);ctx.lineTo(79,73);ctx.lineTo(95,84);ctx.lineTo(121,90);ctx.lineTo(320,90);ctx.lineTo(336,80);ctx.lineTo(356,80);ctx.lineTo(368,72);ctx.lineTo(381,72);ctx.lineTo(405,87);ctx.lineTo(510,90);ctx.lineTo(510,112);ctx.lineTo(-25,112);ctx.fill();
  }
  function sea(t) {
    ctx.fillStyle='#328e9a';ctx.fillRect(-35,94,550,140);
    ctx.fillStyle='#47acb0';ctx.fillRect(-35,119,550,35);
    ctx.fillStyle='#6bc7bb';ctx.fillRect(-35,154,550,40);
    // Recorte de água rasa do tileset da praia, sem as bordas isométricas.
    // Os brilhos animados são sobrepostos a esse material do jogo.
    if (ready('waterTiles')) {
      const tile=images.waterTiles;ctx.save();ctx.globalAlpha=.18;
      for(let y=98;y<200;y+=27) for(let x=-40;x<525;x+=62)
        ctx.drawImage(tile, tile.naturalWidth*.60, tile.naturalHeight*.085, tile.naturalWidth*.055, tile.naturalHeight*.045, x,y,62,27);
      ctx.restore();
    }
    for(let yy=96;yy<195;yy+=24) for(let xx=-40;xx<525;xx+=32) effect('mar',t,xx,yy,32,24,4,(xx+yy)/32);
    for(let i=0;i<12;i++) effect('onda',t,-30+i*46,137+(i%3)*10,36,20,5,i);
  }
  function palms(t) {
    const frame=Math.floor(t*5)%8;
    sheet('tallPalm',frame,-40,24,143,149);sheet('palm',(frame+2)%8,2,62,90,96);
    sheet('tallPalm',(frame+3)%8,365,21,146,154);sheet('palm',(frame+5)%8,405,68,91,94);
  }
  function rain(t, intensity) {
    if (intensity < .02) return;
    ctx.save(); ctx.globalAlpha=.28+intensity*.65;
    for(let y=-15;y<200;y+=30) for(let x=-22;x<510;x+=32) {
      if (((x*3+y*7+17000)%11)/11 > intensity) continue;
      effect('chuva',t,x,y,32,32,8,(x+y)/32);
    }
    ctx.restore();
    for(let i=0;i<Math.round(14*intensity);i++) effect('respingo',t,30+i*31,138+(i%3)*16,22,15,8,i*3);
    for(let i=0;i<4;i++) effect('respingo',t,i<2?65+i*24:330+i*17,153+(i%2)*13,20,15,8,i*2);
  }
  function foregroundWater(t) {
    ctx.fillStyle='#3bafa5';ctx.fillRect(-30,174,540,130);
    ctx.fillStyle='#55c4b0';ctx.fillRect(-30,214,540,90);
    for(let yy=176;yy<305;yy+=25) for(let xx=-32;xx<525;xx+=32) effect('mar',t,xx,yy,32,25,4,(xx+yy)/32);
  }
  function caveFrame(x,y,t,rainAmount) {
    // A textura vem da própria gruta usada no mapa. O recorte perfura a
    // abertura: mar e chuva continuam camadas independentes atrás da concha.
    ctx.save();ctx.translate(Math.round(-x*17),Math.round(-y*10));
    ctx.beginPath();ctx.rect(-40,-30,560,330);
    ctx.moveTo(92,182);ctx.lineTo(92,109);ctx.lineTo(99,82);ctx.lineTo(114,60);ctx.lineTo(141,42);ctx.lineTo(177,31);ctx.lineTo(303,31);ctx.lineTo(339,42);ctx.lineTo(366,60);ctx.lineTo(381,82);ctx.lineTo(388,109);ctx.lineTo(388,182);ctx.lineTo(405,230);ctx.lineTo(75,230);ctx.closePath();
    ctx.clip('evenodd');
    ctx.fillStyle='#493447';ctx.fillRect(-40,-30,560,330);
    // Um único sprite da gruta é ampliado e espelhado, não um fundo pronto.
    image('shell',-165,-100,430,380);
    ctx.save();ctx.translate(480,0);ctx.scale(-1,1);image('shell',-165,-100,430,380);ctx.restore();
    ctx.fillStyle='rgba(49,31,56,.30)';ctx.fillRect(-40,-30,560,330);
    ctx.restore();
    if(rainAmount>.02) for(let i=0;i<8;i++) effect('respingo',t,75+i*42-x*17,184+(i%2)*3-y*10,20,16,8,i*2);
  }
  return function draw(scene, manager, t, still, x, y) {
    if (!ctx) return;
    ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,480,270);
    const climate=manager.state.clima ?? {}, rainAmount=clamp(climate.chuva ?? 0,0,1);
    plan(x,y,2,()=>sky(t));
    plan(x,y,4,()=>sea(t));
    plan(x,y,8,()=>{
      palms(t);
      if(scene==='fonte') {
        // Folha real da piscina da Enseada, atrás da linha de água.
        sheet('pool',Math.floor(t*5)%8,40,71,400,155);
        effect('cascata',t,300,102,24,37,8);
      } else {
        image('rocks',24,142,115,88);image('rocks',341,141,115,88);
        sheet('coral',Math.floor(t*4)%8,355,154,52,44);
      }
    });
    plan(x,y,5,()=>rain(t,rainAmount));
    if(scene==='fonte') {
      plan(x,y,10,()=>{
        foregroundWater(t);
        // A mesma folha 8x4 da fauna costeira, com as patas submersas.
        ctx.save();ctx.beginPath();ctx.rect(0,0,480,184);ctx.clip();
        const bob=still?0:Math.round(Math.sin(t*2)*2);
        sheet('fauna',[0,1,2,1][Math.floor(t*2)%4],154,126+bob,160,112,8,3,4);
        ctx.restore();
        for(let i=0;i<5;i++) effect('ondulacao',t,139+i*28,177+(i%2)*4,56,25,5,i*2);
        for(let i=0;i<9;i++) effect('bolhas',t,18+i*51,193+(i%3)*19,22,22,5,i*3);
        for(let i=0;i<8;i++) effect('vapor',t,20+i*57,140+(i%3)*9,35,48,5,i*2);
        if(manager.petTime>0) {
          const elapsed=2.4-manager.petTime, progress=Math.sin(Math.PI*clamp(elapsed/2.4,0,1));
          effect('mao',elapsed,239-progress*20,198-progress*60,90,90,3);
          effect('brilho',elapsed,209,160,24,24,6);
        }
      });
    } else {
      plan(x,y,11,()=>{
        ctx.fillStyle='#dfc995';ctx.fillRect(-25,206,530,80);
        for(let i=0;i<20;i++){ ctx.fillStyle=i%2?'#bfa579':'#f0dcaa';ctx.fillRect((i*71)%500-10,208+(i*19)%70,3+i%3,2); }
        image('rocks',-45,190,110,86);image('rocks',413,185,110,86);
      });
      caveFrame(x,y,t,rainAmount);
    }
    const darkness=clamp((1-(climate.luz ?? 1))*.65,0,.4);
    if(darkness) {ctx.fillStyle=`rgba(12,30,48,${darkness})`;ctx.fillRect(0,0,480,270);}
  };
}
