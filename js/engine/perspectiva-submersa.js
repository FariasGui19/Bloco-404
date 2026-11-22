// Perspectiva submersa: renderer separado, coordenadas e colisões continuam
// pertencendo ao mapa do jogo. Não substitui/projeta as regras de gameplay.
// Fallback: sem WebGL o jogo mantém a câmera isométrica e seus controles.
import * as THREE from '../vendor/three.module.js';
import { estadoMar, animacaoMar } from '../game/mar-vivo.js';
import { alturaLeitoOceano } from '../game/oceano-regioes.js';
import { encontroConcluido, posicaoEncontro } from '../game/encontros-mare.js';
import { posicaoVidaRota } from '../game/vida-rota-mare.js';
import { getVidaAquatica, elementosDeRecife, atualizarCardumes } from '../game/vida-aquatica.js';
import { detalhesFauna } from '../game/fauna-ferida.js';
import { fragmentosColetados } from '../game/mare-missao.js';

let webgl = null, falhou = false, mapaAtual = null, cena = null, camera = null;
let avatar, avatarParado, misturaParado = 0, avatarVertices, rastros, sonar3d, particulas, algaInstancias, algaPontos = [], algas = [], raios3d = [], cardumes = [], fragmentos = [], bichos = [], anterior = 0, transicao = 0;
let balizas = [], vidaRota3d = [], fundoMar3d = [], encontros3d = [], gesto3d, subida3d, bolhasImpulso3d, bracada3d, luzesOceano = [], recursosEncontros = [];
const matrizReutilizada = new THREE.Object3D();
const corMarCalmo = new THREE.Color(), corMarRessaca = new THREE.Color('#123e4b');
let suavX = 0, suavY = 0, suavZ = 0, suavHeading = 0, cameraInicializada = false;
const minimo = (v, a, b) => Math.max(a, Math.min(b, v));

function textura(url) {
  const t = new THREE.TextureLoader().load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  if (url.includes('/mare-animacao/')) t.magFilter = THREE.NearestFilter;
  return t;
}
function iniciar() {
  if (webgl || falhou) return !!webgl;
  if (typeof document === 'undefined' || typeof WebGL2RenderingContext === 'undefined') { falhou = true; return false; }
  try {
    webgl = new THREE.WebGLRenderer({ alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    webgl.setPixelRatio(1);
    webgl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); falhou = true; webgl = null; });
    camera = new THREE.PerspectiveCamera(58, 1, .08, 85);
    return true;
  } catch (e) { console.warn('[NADO] WebGL indisponível; câmera isométrica preservada.', e); falhou = true; return false; }
}
function descartarCena() {
  if (!cena) return;
  const geometrias = new Set(), materiais = new Set(), texturas = new Set();
  for (const m of recursosEncontros) { materiais.add(m); if (m.map) texturas.add(m.map); }
  recursosEncontros = [];
  cena.traverse(o => { if (o.geometry) geometrias.add(o.geometry); for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m) { materiais.add(m); if (m.map) texturas.add(m.map); } });
  for (const g of geometrias) g.dispose();
  for (const m of materiais) m.dispose();
  for (const t of texturas) t.dispose();
}
function montar(map, state) {
  descartarCena(); mapaAtual = map; cameraInicializada = false; misturaParado = 0;
  cena = new THREE.Scene(); cena.background = new THREE.Color('#07566a');
  cena.fog = new THREE.FogExp2('#07566a', .038);
  cena.add(new THREE.HemisphereLight('#b6f5ef', '#103d48', 2.0));
  const sol = new THREE.DirectionalLight('#c3f7ef', 1.3); sol.position.set(-5, 12, -8); cena.add(sol);
  const rows = map.aguaPraia, h = rows.length, w = rows[0].length;
  const areia = textura('assets/sprites/tiles/fundo-mar-mare.png');
  areia.wrapS = areia.wrapT = THREE.RepeatWrapping; areia.repeat.set((w + 160) / 8, (h + 160) / 8);
  // Relevo apenas visual: a batimetria e os obstáculos continuam pertencendo
  // à simulação do mapa, para não criar colisões invisíveis.
  const relevo = new THREE.PlaneGeometry(w + 160, h + 160, 160, 160);
  const vertices = relevo.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i);
    const detalhe = map.meta?.batimetriaOceano ? .05 * Math.sin(x * .48) * Math.cos(y * .37)
      : .10 * Math.sin(x * .48) * Math.cos(y * .37) + .06 * Math.sin(x * .9 + y * .6);
    vertices.setZ(i, alturaLeitoOceano(map, x + w/2, h/2 - y) + 2.9 + detalhe);
  }
  relevo.computeVertexNormals();
  const fundo = new THREE.Mesh(relevo, new THREE.MeshLambertMaterial({ map: areia, color: '#9ad5c9' }));
  fundo.rotation.x = -Math.PI / 2; fundo.position.set(w / 2, -2.9, h / 2); cena.add(fundo);
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(w + 160, h + 160), new THREE.MeshBasicMaterial({ color: '#74e6e4', transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false }));
  teto.rotation.x = -Math.PI / 2; teto.position.set(w / 2, .1, h / 2); cena.add(teto);
  // Instâncias: custo proporcional ao mapa apenas na montagem, não por frame.
  const terra = [], decks = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = rows[y][x];
    if ('Bb'.includes(c)) decks.push([x, y]);
    else if (!'YyDdX'.includes(c)) terra.push([x, y]);
  }
  const rocha = textura('assets/sprites/tiles/rocha-abissal.png');
  rocha.wrapS = rocha.wrapT = THREE.RepeatWrapping;
  const montarBlocos = (pontos, altura, topo, cor, mapa = null) => {
    if (!pontos.length) return;
    const geo = new THREE.BoxGeometry(1, altura, 1);
    if (mapa) { const uv = geo.attributes.uv; for (let i = 0; i < 16; i++) uv.setY(i, uv.getY(i) * altura); }
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({color: cor, map: mapa}), pontos.length);
    const dummy = new THREE.Object3D();
    pontos.forEach(([x, y], i) => { dummy.position.set(x + .5, topo - altura / 2, y + .5); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.instanceMatrix.needsUpdate = true; cena.add(mesh);
  };
  montarBlocos(terra, 3.2, .3, '#b0d2c8', rocha);
  montarBlocos(decks, .16, 0, '#806d4e');
  const estacaGeo = new THREE.CylinderGeometry(.16, .20, 2.8, 7);
  const estacaMat = new THREE.MeshLambertMaterial({color:'#375e61'});
  for (const p of map.pilaresSubmersos ?? []) {
    const m = new THREE.Mesh(estacaGeo, estacaMat); m.position.set(p.x, -1.45, p.y); cena.add(m);
  }
  const vida = getVidaAquatica(map);
  const coral = textura('assets/sprites/praia/coral-astral-submerso.png');
  const coralMat = new THREE.SpriteMaterial({ map: coral, transparent: true, depthWrite: false });
  for (const r of elementosDeRecife(vida?.recifes ?? [])) {
    const s = new THREE.Sprite(coralMat); s.position.set(r.x, alturaLeitoOceano(map,r.x,r.y) + .35 + r.tipo * .05, r.y); s.scale.set((r.tipo === 0 ? .7 : .45) * r.tamanho, (.6 + .15 * r.tipo) * r.tamanho, 1); cena.add(s);
  }
  // Algas e pedras pertencem aos mesmos recifes, não introduzem novos
  // obstáculos invisíveis nem ocupam rotas ou pontos de interação.
  const algaGeo = new THREE.ConeGeometry(.11, .68, 5);
  const algaMat = new THREE.MeshLambertMaterial({color:'#398b76'});
  const pedraGeo = new THREE.DodecahedronGeometry(.28, 0);
  const pedraMat = new THREE.MeshLambertMaterial({color:'#446f67'});
  algas = [];
  for (const r of elementosDeRecife(vida?.recifes ?? [])) {
    if (r.tipo === 1) {
      const alga = new THREE.Mesh(algaGeo, algaMat);
      alga.position.set(r.x, alturaLeitoOceano(map,r.x,r.y) + .37, r.y); alga.scale.setScalar(r.tamanho); cena.add(alga); algas.push({object:alga, fase:r.fase});
    } else if (r.tipo === 2) {
      const pedra = new THREE.Mesh(pedraGeo, pedraMat);
      pedra.position.set(r.x, alturaLeitoOceano(map,r.x,r.y) + .18, r.y); pedra.scale.set(1.3 * r.tamanho, .6 * r.tamanho, r.tamanho); cena.add(pedra);
    }
  }
  // Vegetação visual em grupos pequenos de água. Duas faces cruzadas por
  // planta permanecem legíveis de todos os ângulos em uma única draw call.
  const algaTextura = textura('assets/sprites/praia/alga-submersa.png');
  algaInstancias = null; algaPontos = [];
  if (map.meta?.rotaMare) {
    // Amostragem espalhada pelo trecho inteiro, não só pelas primeiras linhas.
    for (let i=0; i<70; i++) {
      const x=1+((i*37)%Math.max(1,w-2)), y=1+((i*23+Math.floor(i/7)*11)%Math.max(1,h-2));
      if ('YyDdX'.includes(rows[y][x])) algaPontos.push({x:x+.5,y:y+.5,altura:.6+((x*17+y*13)%5)*.12,fase:(x*3+y)%7});
    }
  } else for (let y = 1; y < h - 1 && algaPontos.length < 70; y++) for (let x = 1; x < w - 1 && algaPontos.length < 70; x++) {
    if (!'YyDdX'.includes(rows[y][x]) || ((x * 73 + y * 139) % 47 !== 0)) continue;
    algaPontos.push({ x:x + .5, y:y + .5, altura:.6 + ((x * 17 + y * 13) % 5) * .12, fase:(x * 3 + y) % 7 });
  }
  for (const a of algaPontos) a.solo = alturaLeitoOceano(map,a.x,a.y);
  if (algaPontos.length) {
    const mat = new THREE.MeshBasicMaterial({map:algaTextura, transparent:true, alphaTest:.35, side:THREE.DoubleSide});
    algaInstancias = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, algaPontos.length * 2);
    algaInstancias.frustumCulled = false; cena.add(algaInstancias);
  } else algaTextura.dispose();
  const luzGeo = new THREE.CylinderGeometry(.18, .65, 2.7, 6, 1, true);
  const luzMat = new THREE.MeshBasicMaterial({color:'#8ee8da',transparent:true,opacity:.035,depthWrite:false,side:THREE.DoubleSide});
  raios3d = (vida?.raios ?? []).filter(r => 'YyDdX'.includes(rows[Math.floor(r.y)]?.[Math.floor(r.x)] ?? '?')).map(r => {
    const o = new THREE.Mesh(luzGeo, luzMat); o.position.set(r.x, -1.3, r.y); o.rotation.z = .18; cena.add(o); return {object:o, fase:r.fase};
  });
  cardumes = (vida?.cardumes ?? []).map(c => {
    const g = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(.10, 0);
    const mat = new THREE.MeshLambertMaterial({color: ['#c1ece7', '#e8a98e', '#70dcca'][c.cor % 3]});
    const caudaGeo = new THREE.ConeGeometry(.08, .13, 3);
    for (const p of c.peixes.slice(0, 7)) {
      const peixe = new THREE.Group();
      const corpo = new THREE.Mesh(geo, mat); corpo.scale.set(1.8, .7, .7); peixe.add(corpo);
      const cauda = new THREE.Mesh(caudaGeo, mat); cauda.rotation.z = -Math.PI / 2; cauda.position.x = -.19; peixe.add(cauda);
      peixe.position.set(p.ox, Math.sin(p.fase) * .15, p.oy); g.add(peixe);
    }
    cena.add(g); return { data: c, object: g };
  });
  // Os três jardins pertencem a esta rota, não a mapas antigos. Instâncias
  // compartilham geometria e material: não há objetos novos a cada quadro.
  if (map.pontosCorrente?.length) {
    const pontos = map.pontosCorrente;
    const corais = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({map: coral, transparent:true, alphaTest:.25, side:THREE.DoubleSide}), pontos.length * 36);
    const pedras = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshLambertMaterial({color:'#486f70'}), pontos.length * 8);
    const dummy = new THREE.Object3D();
    pontos.forEach((p, k) => {
      for (let i=0; i<18; i++) {
        const ang = i * 2.399 + k, raio = 1.8 + (i % 5) * .48;
        const x = p.x + Math.cos(ang) * raio, z = p.y + Math.sin(ang) * raio;
        const altura = .38 + ((i * 7 + k) % 6) * .07;
        for (let lado=0; lado<2; lado++) {
          dummy.position.set(x, alturaLeitoOceano(map,x,z) + .03 + altura / 2, z);
          dummy.rotation.set(0, lado * Math.PI / 2 + ang, 0);
          dummy.scale.set(altura, altura, 1); dummy.updateMatrix();
          corais.setMatrixAt(k * 36 + i * 2 + lado, dummy.matrix);
        }
      }
      for (let i=0; i<8; i++) {
        const ang = i * Math.PI / 4 + k, raio = 2.4 + (i % 3) * .6;
        const px=p.x + Math.cos(ang)*raio, pz=p.y + Math.sin(ang)*raio;
        dummy.position.set(px, alturaLeitoOceano(map,px,pz) + .14, pz);
        dummy.rotation.set(0, ang, 0); dummy.scale.set(.35 + i % 3 * .12, .18 + i % 2 * .1, .35);
        dummy.updateMatrix(); pedras.setMatrixAt(k * 8 + i, dummy.matrix);
      }
    });
    corais.instanceMatrix.needsUpdate = pedras.instanceMatrix.needsUpdate = true;
    cena.add(corais, pedras);
  }
  // Balizas de missão visíveis de longe, sem colisões nem luzes dinâmicas.
  const balizaGeo = new THREE.OctahedronGeometry(.35, 0);
  const balizaMat = new THREE.MeshBasicMaterial({color:'#98fff0'});
  const aroGeo = new THREE.TorusGeometry(.65, .035, 6, 24);
  const aroMat = new THREE.MeshBasicMaterial({color:'#50d6cc'});
  balizas = (map.pontosCorrente ?? []).map(ponto => {
    const grupo = new THREE.Group();
    const nucleo = new THREE.Mesh(balizaGeo, balizaMat); grupo.add(nucleo);
    const aro = new THREE.Mesh(aroGeo, aroMat); aro.rotation.x = Math.PI / 2; grupo.add(aro);
    grupo.position.set(ponto.x, -1.85, ponto.y); cena.add(grupo);
    return {ponto, grupo, aro};
  });
  const cristalGeo = new THREE.OctahedronGeometry(.23, 0);
  const cristalMat = new THREE.MeshBasicMaterial({ color: '#87faff' });
  fragmentos = (state.player?.fragmentosMare ?? []).map(f => {
    const o = new THREE.Mesh(cristalGeo, cristalMat); o.position.set(f.x, -2.35, f.y); cena.add(o); return { data: f, object: o };
  });
  const fauna = detalhesFauna(map, state.progress, vida?.recifes).filter(b => b.def?.meio === 'agua');
  const faunaSprites = {
    tartaruga: ['tartaruga-marinha', 1.0, .55],
    golfinho: ['golfinho-marinho', 1.1, .56],
    estrela: ['estrela-marinha', .55, .48],
    cavalo_marinho: ['cavalo-marinho', .37, .70],
    peixe_palhaco: ['peixe-palhaco', .65, .42],
  };
  const materiaisFauna = new Map();
  const marcadorGeo = new THREE.RingGeometry(.38, .41, 32);
  const marcadorMat = new THREE.MeshBasicMaterial({color:'#a6fff1', side:THREE.DoubleSide, transparent:true, opacity:.6, depthWrite:false});
  bichos = fauna.map(b => {
    const def = faunaSprites[b.tipo];
    let o;
    if (def) {
      if (!materiaisFauna.has(b.tipo)) materiaisFauna.set(b.tipo, new THREE.SpriteMaterial({map:textura(`assets/sprites/fauna/${def[0]}-3d.png`), transparent:true, depthWrite:false}));
      o = new THREE.Sprite(materiaisFauna.get(b.tipo)); o.scale.set(def[1], def[2], 1);
    } else {
      o = new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), new THREE.MeshLambertMaterial({color:'#80c6ad'}));
      o.scale.set(1.4, .6, .8);
    }
    o.position.set(b.x, -2.35, b.y); cena.add(o);
    const marcador = new THREE.Mesh(marcadorGeo, marcadorMat);
    marcador.rotation.x = -Math.PI / 2; marcador.position.set(b.x, -2.76, b.y); cena.add(marcador);
    return { data: b, object: o, marcador };
  });
  // A fachada também existe no mergulho, na mesma coordenada da entrada.
  if (map.meta?.rotaMare) {
    const fachada = new THREE.Sprite(new THREE.SpriteMaterial({map:textura('assets/sprites/oceano-vivo/darsena-marinha.png'),transparent:true,depthWrite:false,alphaTest:.04}));
    fachada.scale.set(7, 4.2, 1); fachada.position.set(87.5, -1.0, 30.5); cena.add(fachada);
  }
  // Cáusticas em poucos planos compartilhados, sem luzes dinâmicas por peixe.
  luzesOceano = [];
  if (map.meta?.rotaMare) {
    const geo=new THREE.PlaneGeometry(4.5,2.4);
    const mat=new THREE.MeshBasicMaterial({map:textura('assets/sprites/mare-animacao/luz-ondulante.png'),transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    for (const p of (map.detalhesOceano ?? []).filter((_,i)=>i%7===0)) {
      const luz=new THREE.Mesh(geo,mat);luz.rotation.x=-Math.PI/2;
      luz.position.set(p.x,alturaLeitoOceano(map,p.x,p.y)+.07,p.y);cena.add(luz);luzesOceano.push({luz,fase:p.fase});
    }
  }
  // Texturas compartilhadas por espécie, construídas uma vez por mapa.
  const materiaisRota = new Map();
  vidaRota3d = (map.vidaRota ?? []).map((item, indice) => {
    if (!materiaisRota.has(item.tipo)) materiaisRota.set(item.tipo, new THREE.SpriteMaterial({
      map:textura(`assets/sprites/${item.origem ?? 'rota-mare'}/${item.tipo}.png`), transparent:true, depthWrite:false, opacity:.9,
    }));
    const sprite = new THREE.Sprite(materiaisRota.get(item.tipo));
    sprite.visible = !item.soSuperficie;
    const vertical = ['alga','agua-viva','cavalo-marinho'].includes(item.tipo);
    const tamanho = item.tipo === 'cavalo-marinho' ? item.tamanho * .55 : item.tamanho;
    sprite.scale.set(tamanho * (vertical ? .65 : 1.7), tamanho * (vertical ? 1.1 : .85), 1);
    cena.add(sprite); return {item, indice, sprite};
  });
  const materiaisFundo = new Map();
  fundoMar3d = (map.fundoMar ?? []).map((item, indice) => {
    if (!materiaisFundo.has(item.tipo)) materiaisFundo.set(item.tipo, new THREE.SpriteMaterial({
      map:textura(`assets/sprites/${item.origem ?? 'mar-vivo'}/${item.tipo}.png`), transparent:true, depthWrite:false, alphaTest:.04,
    }));
    const sprite=new THREE.Sprite(materiaisFundo.get(item.tipo));
    const largo=item.tipo === 'ruina-submersa' || item.tipo === 'peixes-luz';
    sprite.scale.set(item.tamanho*(largo ? 1.4 : .75),item.tamanho*(largo ? .85 : 1),1);
    cena.add(sprite); return {item, indice, sprite};
  });
  const materiaisEncontro = new Map();
  const materialEncontro = id => {
    if (!materiaisEncontro.has(id)) {
      const material=new THREE.SpriteMaterial({map:textura(`assets/sprites/mare-encontros/${id}.png`),transparent:true,depthWrite:false,alphaTest:.04});
      materiaisEncontro.set(id,material);recursosEncontros.push(material);
    }
    return materiaisEncontro.get(id);
  };
  encontros3d = (map.encontrosMare ?? []).map((item, indice) => {
    const normal=materialEncontro(item.sprite), concluido=item.spriteConcluido ? materialEncontro(item.spriteConcluido) : normal;
    const sprite=new THREE.Sprite(normal);
    const vertical=item.id === 'coral';
    sprite.scale.set(item.tamanho*(vertical ? .75 : 1.1),item.tamanho*(vertical ? 1.0 : .72),1);
    const marcador=new THREE.Mesh(marcadorGeo,marcadorMat);marcador.rotation.x=-Math.PI/2;
    marcador.position.set(item.x,alturaLeitoOceano(map,item.x,item.y)+.14,item.y);marcador.scale.setScalar(.7);
    cena.add(sprite,marcador);return {item,indice,sprite,normal,concluido,marcador};
  });
  gesto3d=null; subida3d=null;
  if (map.encontrosMare?.length) {
    gesto3d=new THREE.Sprite(materialEncontro('anel-cuidado'));
    subida3d=new THREE.Sprite(materialEncontro('bolhas-subida'));
    gesto3d.visible=subida3d.visible=false;cena.add(gesto3d,subida3d);
  }
  bolhasImpulso3d = bracada3d = null;
  if (map.meta?.rotaMare) {
    const efeito = nome => new THREE.Sprite(new THREE.SpriteMaterial({map:textura(`assets/sprites/mare-animacao/${nome}.png`),transparent:true,depthWrite:false,opacity:.55}));
    bolhasImpulso3d=efeito('bolhas-impulso'); bracada3d=efeito('bracada-mare');
    bolhasImpulso3d.visible=bracada3d.visible=false;cena.add(bolhasImpulso3d,bracada3d);
  }
  // A folha é deformada suavemente como uma nadadeira; não há sobreposição
  // de poses semitransparentes nem saltos entre quadros desenhados distintos.
  const body = textura('assets/sprites/player/mare-nado-costas-3d.png');
  const corpoGeo = new THREE.PlaneGeometry(1, 1, 24, 2);
  avatarVertices = new Float32Array(corpoGeo.attributes.position.array);
  avatar = new THREE.Mesh(corpoGeo, new THREE.MeshBasicMaterial({map:body, transparent:true, depthWrite:false, side:THREE.DoubleSide}));
  avatar.scale.set(1.65, .57, 1); cena.add(avatar);
  const poseParada = textura('assets/sprites/player/mare-nado-parado-3d.png');
  avatarParado = new THREE.Sprite(new THREE.SpriteMaterial({map:poseParada, transparent:true, depthWrite:false, opacity:0}));
  avatarParado.scale.set(.72, 1.46, 1); cena.add(avatarParado);
  particulas = new THREE.InstancedMesh(new THREE.SphereGeometry(.025, 5, 4), new THREE.MeshBasicMaterial({color:'#b7e8db', transparent:true, opacity:.45}), 90);
  cena.add(particulas);
  rastros = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 6, 4), new THREE.MeshBasicMaterial({ color:'#a5f8ee', transparent:true, opacity:.65 }), 20);
  cena.add(rastros);
  sonar3d = new THREE.Mesh(new THREE.RingGeometry(.38, .44, 24), new THREE.MeshBasicMaterial({color:'#90fff2', side:THREE.DoubleSide, transparent:true, opacity:.85}));
  sonar3d.rotation.x = -Math.PI / 2; cena.add(sonar3d);
}

// Teste barato contra as mesmas células sólidas da cena. Fora do mapa há
// mar visual; não movemos o jogador nem alteramos as colisões do mundo.
export function cameraLivre(map, px, py, cx, cy) {
  const rows = map?.aguaPraia;
  if (!rows) return {x: cx, y: cy};
  const dx = cx - px, dy = cy - py, distancia = Math.hypot(dx, dy);
  const passos = Math.ceil(distancia / .08);
  for (let i = 1; i <= passos; i++) {
    const t = i / passos, x = px + dx * t, y = py + dy * t;
    const c = rows[Math.floor(y)]?.[Math.floor(x)];
    if (c != null && !'YyDdXBb'.includes(c)) {
      const livre = Math.max(0, t - .12 / Math.max(distancia, .01));
      return {x: px + dx * livre, y: py + dy * livre};
    }
  }
  return {x: cx, y: cy};
}

/** Devolve canvas e opacidade para compor no canvas do jogo; null em fallback. */
export function perspectivaSubmersa(map, state, view) {
  const n = state.player?.nado;
  if (mapaAtual && map !== mapaAtual) { transicao = 0; anterior = 0; descartarCena(); cena = null; mapaAtual = null; }
  const quer = !!(map?.aguaPraia && n?.ativo && n.mareAstral && n.profundidade > 1.25);
  if (!quer && transicao <= 0) { if (n) n.perspectiva3d = false; anterior = 0; cameraInicializada = false; return null; }
  if (!iniciar()) { if (n) n.perspectiva3d = false; transicao = 0; return null; }
  if (quer && mapaAtual !== map) montar(map, state);
  if (!cena || !mapaAtual) return null;
  const agora = performance.now() / 1000;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const visual = reduced ? 0 : agora;
  const dt = anterior ? minimo(agora - anterior, 0, .05) : 0; anterior = agora;
  transicao = minimo(transicao + (quer ? 1 : -1) * dt * 2.8, 0, 1);
  if (n) n.perspectiva3d = quer;
  if (transicao <= 0) return null;
  const largura = Math.max(1, Math.round(view.w)), altura = Math.max(1, Math.round(view.h));
  if (webgl.domElement.width !== largura || webgl.domElement.height !== altura) webgl.setSize(largura, altura, false);
  camera.aspect = largura / altura; camera.updateProjectionMatrix();
  const p = state.player;
  const heading = n?.voo?.heading ?? Math.atan2(n?.dirY ?? 1, n?.dirX ?? 0);
  const fx = Math.cos(heading), fz = Math.sin(heading);
  const profundidade = minimo(n?.profundidade ?? 1.4, .9, 2);
  const py = -profundidade * 1.15;
  const marAtual = estadoMar(state.clima);
  cena.fog.density = .035 + (profundidade - .9) * .013 + (map.meta?.rotaMare ? marAtual.mar * .014 : 0);
  corMarCalmo.set(profundidade > 1.7 ? '#064657' : '#07566a');
  cena.background.copy(corMarCalmo).lerp(corMarRessaca, map.meta?.rotaMare ? marAtual.mar * .4 : 0);
  cena.fog.color.copy(cena.background);
  if (!cameraInicializada) suavHeading = heading;
  const deltaAngulo = Math.atan2(Math.sin(heading - suavHeading), Math.cos(heading - suavHeading));
  suavHeading += deltaAngulo * (1 - Math.exp(-9 * dt));
  const cfx = Math.cos(suavHeading), cfz = Math.sin(suavHeading);
  const posicao = cameraLivre(map, p.x, p.y, p.x - cfx * 3.1, p.y - cfz * 3.1);
  const tx = posicao.x, ty = Math.min(-.16, py + 1.15), tz = posicao.y;
  if (!cameraInicializada) { suavX = tx; suavY = ty; suavZ = tz; cameraInicializada = true; }
  const k = 1 - Math.exp(-7 * dt);
  suavX += (tx - suavX) * k; suavY += (ty - suavY) * k; suavZ += (tz - suavZ) * k;
  // Revalida depois da suavização: ao virar perto de uma parede, a câmera
  // não deve atravessar a ilha nem ficar presa dentro dela.
  const segura = cameraLivre(map, p.x, p.y, suavX, suavZ);
  camera.position.set(segura.x, Math.min(-.16, suavY), segura.y);
  camera.lookAt(p.x + cfx * 2.4, py - .3 + (n?.voo?.pitch ?? 0) * -1.1, p.y + cfz * 2.4);
  // Ao soltar os controles, termina o planeio e passa à postura vertical
  // de flutuação; ao acelerar volta suavemente à braçada horizontal.
  const gesto = p.mareAcao?.timeLeft > 0 ? Math.sin(Math.PI * (1-p.mareAcao.timeLeft/p.mareAcao.duration)) : 0;
  const repouso = !!p.nadoParado && !(n?.arrancada > 0) && Math.hypot(n?.vx ?? 0, n?.vy ?? 0) < .9;
  misturaParado += ((repouso ? 1 : 0) - misturaParado) * (1 - Math.exp(-7 * dt));
  avatar.material.opacity = 1 - misturaParado;
  avatarParado.material.opacity = misturaParado;
  avatarParado.visible = misturaParado > .01; avatar.visible = misturaParado < .99;
  avatarParado.position.set(p.x, py + Math.sin(visual * 1.8) * .045, p.y);
  avatarParado.material.rotation = Math.sin(visual * 1.3) * .045 + (n?.voo?.roll ?? 0) * .3 + gesto*.12;
  avatar.position.set(p.x, py + Math.sin(visual * 3) * .035, p.y);
  avatar.quaternion.copy(camera.quaternion); avatar.rotateZ((n?.voo?.roll ?? 0) - gesto*.14 + (n?.subindoVisual ? -.09 : 0));
  const verticesAvatar = avatar.geometry.attributes.position;
  const impulsoAtivo = n?.arrancada > 0;
  const movimento = impulsoAtivo ? 1 : Math.min(1, Math.hypot(n?.vx ?? 0, n?.vy ?? 0) / 2);
  for (let i = 0; i < verticesAvatar.count; i++) {
    const x = avatarVertices[i * 3], y = avatarVertices[i * 3 + 1];
    const peso = Math.max(0, .3 - x);
    const alcance = Math.max(0, x - .18);
    verticesAvatar.setX(i, x + gesto * alcance * .12);
    verticesAvatar.setY(i, y + Math.sin(visual * (impulsoAtivo ? 11 : 2.5 + movimento * 3) + x * 5) * peso * (.015 + .11 * movimento) + gesto * alcance * .11);
  }
  verticesAvatar.needsUpdate = true;
  const particula = matrizReutilizada;
  particula.rotation.set(0,0,0); particula.scale.set(1,1,1);
  for (let i = 0; i < 90; i++) {
    const x = ((i * 37.17) % 12) - 6, z = ((i * 19.31) % 12) - 6;
    particula.position.set(p.x + x, -2.7 + ((i * .73 + visual * .12) % 2.5), p.y + z);
    particula.updateMatrix(); particulas.setMatrixAt(i, particula.matrix);
  }
  particulas.instanceMatrix.needsUpdate = true;
  sonar3d.visible = !!(n?.submerso && p.ability?.sonarAquatico);
  if (sonar3d.visible) { sonar3d.position.set(p.ability.sonarAquatico.x, -2.7, p.ability.sonarAquatico.y); sonar3d.scale.setScalar(1 + .15 * Math.sin(agora * 5)); }
  // Na rota, a esteira em pixel art substitui as esferas geométricas.
  rastros.visible = !!(n?.arrancada > 0) && !map.meta?.rotaMare;
  if (rastros.visible) {
    const dummy = matrizReutilizada; dummy.rotation.set(0,0,0);
    for (let i = 0; i < 20; i++) {
      const t = (agora * 2 + i / 20) % 1;
      const lateral = Math.sin(i * 8.1) * .28;
      dummy.position.set(p.x - fx * (t * 2) - fz * lateral, py + Math.sin(i * 6) * .18 + t * .35, p.y - fz * (t * 2) + fx * lateral);
      dummy.scale.setScalar(.55 + t); dummy.updateMatrix(); rastros.setMatrixAt(i, dummy.matrix);
    }
    rastros.instanceMatrix.needsUpdate = true;
  }
  for (const b of balizas) {
    // Evita um marcador gigante sobre o nadador ao passar pela baliza.
    b.grupo.visible = !map.meta?.rotaMare || Math.hypot(p.x-b.ponto.x,p.y-b.ponto.y) > 1.8;
    b.grupo.position.y = -1.85 + Math.sin(agora * 1.5 + b.ponto.x) * .10;
    b.grupo.rotation.y = agora * .55;
    b.aro.scale.setScalar(state.progress?.flags?.[`corrente_sintonizada_${b.ponto.id}`] ? .65 : 1 + .12 * Math.sin(agora * 2));
  }
  const pegos = fragmentosColetados(state.progress);
  for (const f of fragmentos) { f.object.visible = !pegos.has(f.data.id); f.object.rotation.y = agora; f.object.position.y = -2.35 + Math.sin(agora * 2 + (f.data.fase ?? 0)) * .08; }
  for (const b of bichos) {
    b.object.visible = b.data.estado !== 'curado' && !state.progress?.faunaTratada?.[b.data.id];
    b.marcador.visible = b.object.visible && Math.hypot(p.x - b.data.x, p.y - b.data.y) < 3.5;
    b.object.position.y = -2.35 + Math.sin(agora * 1.4 + b.data.fase) * .08;
    if (b.object.isSprite) b.object.material.rotation = Math.sin(agora * 1.6 + b.data.fase) * .06;
  }
  for (const b of vidaRota3d) {
    const pos = posicaoVidaRota(b.item,b.indice,agora,reduced);
    b.sprite.position.set(pos.x, (b.item.tipo === 'alga' ? -2.45 : -1.8) + pos.altura, pos.y);
  }
  for (const b of encontros3d) {
    const feito=encontroConcluido(state.progress,b.item.id);
    b.sprite.visible=!(b.item.id === 'rede' && feito);
    b.marcador.visible=!feito && Math.hypot(p.x-b.item.x,p.y-b.item.y)<7;
    b.sprite.material=feito ? b.concluido : b.normal;
    const animal=['tartaruga','arraia','peixe'].includes(b.item.id);
    const pos=posicaoEncontro(b.item,state.progress,agora,reduced);
    b.sprite.position.set(pos.x, alturaLeitoOceano(map,pos.x,pos.y) + (animal ? .8 : .38)+pos.altura, pos.y);
  }
  if (gesto3d) {
    gesto3d.visible=gesto > .01;
    if (gesto3d.visible) {gesto3d.position.set(p.x+fx*.7,py+.15,p.y+fz*.7);gesto3d.scale.set(1.1+gesto*.5,.5+gesto*.2,1);}
    subida3d.visible=!!n?.subindoVisual;
    if (subida3d.visible) {subida3d.position.set(p.x,py+.6,p.y);subida3d.scale.set(.35,1.2,1);}
  }
  for (const b of fundoMar3d) {
    const a=animacaoMar(b.indice,agora,state.clima,reduced);
    const flutuante=b.item.tipo === 'medusa-luz' || b.item.tipo === 'peixes-luz';
    b.sprite.position.set(b.item.x, flutuante ? -1.85 + a.deslocamento*.12 : alturaLeitoOceano(map,b.item.x,b.item.y)+.36, b.item.y);
  }
  if (bolhasImpulso3d) {
    bolhasImpulso3d.visible=impulsoAtivo && !reduced;
    if (bolhasImpulso3d.visible) {bolhasImpulso3d.position.set(p.x-fx*.85,py,p.y-fz*.85);bolhasImpulso3d.scale.set(1.4,.5,1);}
    bracada3d.visible=movimento>.2 && !impulsoAtivo && !reduced;
    if (bracada3d.visible) {bracada3d.position.set(p.x+fx*.3,py,p.y+fz*.3);bracada3d.scale.set(.75,.5,1);bracada3d.material.opacity=.12+.1*(.5+.5*Math.sin(agora*4));}
    for (const l of luzesOceano) l.luz.rotation.z=reduced?0:Math.sin(agora*.25+l.fase)*.04;
  }
  for (const a of algas) a.object.rotation.z = Math.sin(visual * 1.1 + a.fase) * .15;
  if (algaInstancias) {
    const matriz = matrizReutilizada;
    algaPontos.forEach((a, i) => {
      for (let face = 0; face < 2; face++) {
        matriz.position.set(a.x, a.solo + a.altura / 2, a.y);
        matriz.rotation.set(0, face * Math.PI / 2, Math.sin(visual * .9 + a.fase) * .06);
        matriz.scale.set(a.altura, a.altura, 1); matriz.updateMatrix();
        algaInstancias.setMatrixAt(i * 2 + face, matriz.matrix);
      }
    });
    algaInstancias.instanceMatrix.needsUpdate = true;
  }
  for (const r of raios3d) r.object.rotation.z = .18 + Math.sin(visual * .4 + r.fase) * .04;
  const vida = getVidaAquatica(mapaAtual);
  if (quer && transicao >= .99 && !reduced) atualizarCardumes(vida?.cardumes ?? [], p, dt, true);
  for (const c of cardumes) {
    c.object.position.set(c.data.x, -1.6 + Math.sin(visual + c.data.fase) * .18, c.data.y);
    c.object.rotation.y = c.data.flip ? Math.PI : 0;
    c.object.children.forEach((peixe, i) => { peixe.rotation.y = Math.sin(visual * 4 + i) * .15; peixe.children[1].rotation.y = Math.sin(visual * 8 + i) * .45; });
  }
  webgl.render(cena, camera);
  return { canvas: webgl.domElement, alpha: transicao };
}
