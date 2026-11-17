// Cena em resolução fixa: assets do mapa e pequenas folhas de efeitos. Nenhum
// bitmap de panorama é carregado; cada plano tem profundidade independente.
const PATHS = {
  fauna: 'assets/sprites/fauna/fauna-costeira.png',
  pool: 'assets/sprites/enseada-animacao-lote7/piscina.png',
  palm: 'assets/sprites/enseada-animacao-lote7/palmeira-baixa.png',
  tallPalm: 'assets/sprites/enseada-fpv-polimento/palmeira-sem-franja.png',
  rocks: 'assets/sprites/enseada-5/rochas-borda-piscina.png',
  waterTiles: 'assets/sprites/tiles/beach-shore.png',
  shellFrame: 'assets/sprites/enseada-fpv-polimento/moldura-gruta.png',
  poolFrame: 'assets/sprites/enseada-fpv-polimento/moldura-fonte.png',
  forest: 'assets/sprites/enseada-fpv-polimento/mata-sem-franja.png',
  trees: 'assets/sprites/enseada-animacao-lote6/arvores-redondas.png',
  coral: 'assets/sprites/enseada-animacao-lote6/corais-amarelos.png',
};
const EFFECTS = ['mar','onda','ondulacao','vapor','bolhas','chuva','respingo','brilho','cascata'];
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
  function sky() {
    // Céu em faixas tonais e nuvens agrupadas, sem imagem panorâmica.
    const colors=['#548f9b','#599ca6','#68adb5','#7cbec4','#98cfc9','#b4dcd1'];
    colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(-45,-35+i*23,570,24);});
    const cloud = (x,y,s) => {
      ctx.save();ctx.translate(x,y);ctx.scale(s,s);
      ctx.fillStyle='#91bfbb';ctx.fillRect(2,13,42,4);ctx.fillRect(9,17,29,2);
      ctx.fillStyle='#cce1d6';ctx.fillRect(0,10,49,5);ctx.fillRect(4,6,37,5);
      ctx.fillRect(11,3,22,5);ctx.fillRect(17,0,12,5);
      ctx.fillStyle='#e6e9d9';ctx.fillRect(12,5,17,2);ctx.fillRect(19,2,8,2);ctx.fillRect(5,9,8,2);ctx.restore();
    };
    cloud(25,19,1.0);cloud(126,37,.65);cloud(200,61,.64);cloud(295,53,.72);cloud(281,13,1.1);cloud(405,39,.7);
    // Recortes de vegetação do próprio mapa formam ilhas e o horizonte.
    ctx.save();ctx.globalAlpha=.55;
    sheet('trees',0,-30,65,105,56);sheet('trees',3,352,62,121,62);
    sheet('trees',1,110,78,74,30);sheet('trees',4,298,80,82,29);ctx.restore();
  }
  function sea(t) {
    ctx.fillStyle='#328e9a';ctx.fillRect(-35,94,550,250);
    ctx.fillStyle='#47acb0';ctx.fillRect(-35,119,550,35);
    ctx.fillStyle='#6bc7bb';ctx.fillRect(-35,154,550,155);
    // Recorte de água rasa do tileset da praia, sem as bordas isométricas.
    // Os brilhos animados são sobrepostos a esse material do jogo.
    if (ready('waterTiles')) {
      const tile=images.waterTiles;ctx.save();ctx.globalAlpha=.38;
      for(let y=98;y<315;y+=27) for(let x=-40;x<525;x+=62)
        ctx.drawImage(tile, tile.naturalWidth*.59, tile.naturalHeight*.085, tile.naturalWidth*.055, tile.naturalHeight*.045, x,y,62,27);
      ctx.restore();
    }
    for(let yy=96;yy<315;yy+=24) for(let xx=-40;xx<525;xx+=32) effect('mar',t,xx,yy,32,24,4,(xx+yy)/32);
    for(let i=0;i<12;i++) effect('onda',t,-30+i*46,137+(i%3)*10,36,20,5,i);
  }
  function palms(t) {
    const frame=Math.floor(t*5)%8;
    sheet('forest',frame,-36,50,164,106);sheet('forest',(frame+2)%8,350,49,164,106);
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
    ctx.fillStyle='#287c79';ctx.fillRect(-40,174,560,130);
    ctx.fillStyle='#399e91';ctx.fillRect(-40,195,560,110);
    // Textura da água rasa da Enseada com reflexos independentes por cima.
    if (ready('waterTiles')) {
      const tile=images.waterTiles;ctx.save();ctx.globalAlpha=.48;
      for(let y=176;y<310;y+=31) for(let x=-50;x<530;x+=66)
        ctx.drawImage(tile,tile.naturalWidth*.59,tile.naturalHeight*.085,tile.naturalWidth*.055,tile.naturalHeight*.045,x,y,66,31);
      ctx.restore();
    }
    for(let yy=176;yy<305;yy+=25) for(let xx=-32;xx<525;xx+=32) effect('mar',t,xx,yy,32,25,4,(xx+yy)/32);
  }
  function drawFrame(key) {
    // Com object-fit: cover, um celular em retrato recorta boa parte das
    // laterais do canvas. Ajusta somente a moldura ao trecho visível; os
    // demais planos mantêm a escala e não são esticados.
    const ratio = (globalThis.innerWidth || 16) / (globalThis.innerHeight || 9);
    const visible = ratio < 480 / 270 ? 270 * ratio : 480;
    const width = visible + Math.min(80, visible * .16);
    image(key, 240 - width / 2, -24, width, 315);
  }
  function caveFrame(x,y,t,rainAmount) {
    // Moldura transparente em primeiro plano; horizonte e mar continuam
    // atrás dela, movendo-se em velocidades distintas com o olhar.
    plan(x,y,17,()=>drawFrame('shellFrame'));
    if(rainAmount>.02) for(let i=0;i<6;i++) effect('respingo',t,78+i*54-x*17,189+(i%2)*3-y*10,15,12,8,i*2);
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
          const elapsed=2.4-manager.petTime;
          effect('ondulacao',elapsed,205,171,48,19,4);
          effect('brilho',elapsed,229,178,13,13,5);
          effect('brilho',elapsed,269,186,9,9,5,3);
        }
      });
      plan(x,y,15,()=>drawFrame('poolFrame'));
    } else {
      plan(x,y,11,()=>{
        // Água e espuma avançam até os pés da moldura, sem uma faixa
        // chapada de areia entre a paisagem e a interface.
        ctx.fillStyle='rgba(32,77,77,.24)';ctx.fillRect(-30,206,540,80);
        for(let i=0;i<7;i++) effect('onda',t,25+i*66,204+(i%2)*8,46,20,5,i*2);
        image('rocks',-45,190,110,86);image('rocks',413,185,110,86);
      });
      caveFrame(x,y,t,rainAmount);
    }
    const darkness=clamp((1-(climate.luz ?? 1))*.65,0,.4);
    if(darkness) {ctx.fillStyle=`rgba(12,30,48,${darkness})`;ctx.fillRect(0,0,480,270);}
  };
}
