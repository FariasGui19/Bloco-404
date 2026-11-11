// Perspectiva submersa: renderer separado, coordenadas e colisões continuam
// pertencendo ao mapa do jogo. Não substitui/projeta as regras de gameplay.
// Fallback: sem WebGL o jogo mantém a câmera isométrica e seus controles.
import * as THREE from '../vendor/three.module.js';
import { getVidaAquatica, elementosDeRecife, atualizarCardumes } from '../game/vida-aquatica.js';
import { detalhesFauna } from '../game/fauna-ferida.js';
import { fragmentosColetados } from '../game/mare-missao.js';

let webgl = null, falhou = false, mapaAtual = null, cena = null, camera = null;
let avatar, avatarParado, misturaParado = 0, avatarVertices, rastros, sonar3d, particulas, algaInstancias, algaPontos = [], algas = [], raios3d = [], cardumes = [], fragmentos = [], bichos = [], anterior = 0, transicao = 0;
let suavX = 0, suavY = 0, suavZ = 0, suavHeading = 0, cameraInicializada = false;
const minimo = (v, a, b) => Math.max(a, Math.min(b, v));

function textura(url) {
  const t = new THREE.TextureLoader().load(url);
  t.colorSpace = THREE.SRGBColorSpace;
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
    vertices.setZ(i, .10 * Math.sin(x * .48) * Math.cos(y * .37) + .06 * Math.sin(x * .9 + y * .6));
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
    const s = new THREE.Sprite(coralMat); s.position.set(r.x, -2.55 + r.tipo * .05, r.y); s.scale.set((r.tipo === 0 ? .7 : .45) * r.tamanho, (.6 + .15 * r.tipo) * r.tamanho, 1); cena.add(s);
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
      alga.position.set(r.x, -2.53, r.y); alga.scale.setScalar(r.tamanho); cena.add(alga); algas.push({object:alga, fase:r.fase});
    } else if (r.tipo === 2) {
      const pedra = new THREE.Mesh(pedraGeo, pedraMat);
      pedra.position.set(r.x, -2.72, r.y); pedra.scale.set(1.3 * r.tamanho, .6 * r.tamanho, r.tamanho); cena.add(pedra);
    }
  }
  // Vegetação visual em grupos pequenos de água. Duas faces cruzadas por
  // planta permanecem legíveis de todos os ângulos em uma única draw call.
  const algaTextura = textura('assets/sprites/praia/alga-submersa.png');
  algaInstancias = null; algaPontos = [];
  for (let y = 1; y < h - 1 && algaPontos.length < 70; y++) for (let x = 1; x < w - 1 && algaPontos.length < 70; x++) {
    if (!'YyDdX'.includes(rows[y][x]) || ((x * 73 + y * 139) % 47 !== 0)) continue;
    algaPontos.push({ x:x + .5, y:y + .5, altura:.6 + ((x * 17 + y * 13) % 5) * .12, fase:(x * 3 + y) % 7 });
  }
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
  // A folha é deformada suavemente como uma nadadeira; não há sobreposição
  // de poses semitransparentes nem saltos entre quadros desenhados distintos.
  const body = textura('assets/sprites/player/mare-nado-costas-3d.png');
  const corpoGeo = new THREE.PlaneGeometry(1, 1, 24, 2);
  avatarVertices = new Float32Array(corpoGeo.attributes.position.array);
  avatar = new THREE.Mesh(corpoGeo, new THREE.MeshBasicMaterial({map:body, transparent:true, depthWrite:false, side:THREE.DoubleSide}));
  avatar.scale.set(1.65, .57, 1); cena.add(avatar);
  const poseParada = textura('assets/sprites/player/mare-nado-parado-3d.png');
  avatarParado = new THREE.Sprite(new THREE.SpriteMaterial({map:poseParada, transparent:true, depthWrite:false, opacity:0}));
  avatarParado.scale.set(.54, 1.10, 1); cena.add(avatarParado);
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
  cena.fog.density = .035 + (profundidade - .9) * .013;
  cena.background.set(profundidade > 1.7 ? '#064657' : '#07566a');
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
  const repouso = !!p.nadoParado && !(n?.arrancada > 0) && Math.hypot(n?.vx ?? 0, n?.vy ?? 0) < .9;
  misturaParado += ((repouso ? 1 : 0) - misturaParado) * (1 - Math.exp(-7 * dt));
  avatar.material.opacity = 1 - misturaParado;
  avatarParado.material.opacity = misturaParado;
  avatarParado.visible = misturaParado > .01; avatar.visible = misturaParado < .99;
  avatarParado.position.set(p.x, py + Math.sin(agora * 1.8) * .045, p.y);
  avatarParado.material.rotation = Math.sin(agora * 1.3) * .045 + (n?.voo?.roll ?? 0) * .3;
  avatar.position.set(p.x, py + Math.sin(agora * 3) * .035, p.y);
  avatar.quaternion.copy(camera.quaternion); avatar.rotateZ(n?.voo?.roll ?? 0);
  const verticesAvatar = avatar.geometry.attributes.position;
  const movimento = Math.min(1, Math.hypot(n?.vx ?? 0, n?.vy ?? 0) / 2);
  for (let i = 0; i < verticesAvatar.count; i++) {
    const x = avatarVertices[i * 3], y = avatarVertices[i * 3 + 1];
    const peso = Math.max(0, .3 - x);
    verticesAvatar.setY(i, y + Math.sin(agora * (2.5 + movimento * 3) + x * 5) * peso * (.015 + .11 * movimento));
  }
  verticesAvatar.needsUpdate = true;
  const particula = new THREE.Object3D();
  for (let i = 0; i < 90; i++) {
    const x = ((i * 37.17) % 12) - 6, z = ((i * 19.31) % 12) - 6;
    particula.position.set(p.x + x, -2.7 + ((i * .73 + agora * .12) % 2.5), p.y + z);
    particula.updateMatrix(); particulas.setMatrixAt(i, particula.matrix);
  }
  particulas.instanceMatrix.needsUpdate = true;
  sonar3d.visible = !!(n?.submerso && p.ability?.sonarAquatico);
  if (sonar3d.visible) { sonar3d.position.set(p.ability.sonarAquatico.x, -2.7, p.ability.sonarAquatico.y); sonar3d.scale.setScalar(1 + .15 * Math.sin(agora * 5)); }
  rastros.visible = !!(n?.arrancada > 0);
  if (rastros.visible) {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 20; i++) {
      const t = (agora * 2 + i / 20) % 1;
      const lateral = Math.sin(i * 8.1) * .28;
      dummy.position.set(p.x - fx * (t * 2) - fz * lateral, py + Math.sin(i * 6) * .18 + t * .35, p.y - fz * (t * 2) + fx * lateral);
      dummy.scale.setScalar(.55 + t); dummy.updateMatrix(); rastros.setMatrixAt(i, dummy.matrix);
    }
    rastros.instanceMatrix.needsUpdate = true;
  }
  const pegos = fragmentosColetados(state.progress);
  for (const f of fragmentos) { f.object.visible = !pegos.has(f.data.id); f.object.rotation.y = agora; f.object.position.y = -2.35 + Math.sin(agora * 2 + (f.data.fase ?? 0)) * .08; }
  for (const b of bichos) {
    b.object.visible = b.data.estado !== 'curado' && !state.progress?.faunaTratada?.[b.data.id];
    b.marcador.visible = b.object.visible && Math.hypot(p.x - b.data.x, p.y - b.data.y) < 3.5;
    b.object.position.y = -2.35 + Math.sin(agora * 1.4 + b.data.fase) * .08;
    if (b.object.isSprite) b.object.material.rotation = Math.sin(agora * 1.6 + b.data.fase) * .06;
  }
  for (const a of algas) a.object.rotation.z = Math.sin(agora * 1.1 + a.fase) * .15;
  if (algaInstancias) {
    const matriz = new THREE.Object3D();
    algaPontos.forEach((a, i) => {
      for (let face = 0; face < 2; face++) {
        matriz.position.set(a.x, -2.9 + a.altura / 2, a.y);
        matriz.rotation.set(0, face * Math.PI / 2, Math.sin(agora * .9 + a.fase) * .06);
        matriz.scale.set(a.altura, a.altura, 1); matriz.updateMatrix();
        algaInstancias.setMatrixAt(i * 2 + face, matriz.matrix);
      }
    });
    algaInstancias.instanceMatrix.needsUpdate = true;
  }
  for (const r of raios3d) r.object.rotation.z = .18 + Math.sin(agora * .4 + r.fase) * .04;
  const vida = getVidaAquatica(mapaAtual);
  if (quer && transicao >= .99) atualizarCardumes(vida?.cardumes ?? [], p, dt, true);
  for (const c of cardumes) {
    c.object.position.set(c.data.x, -1.6 + Math.sin(agora + c.data.fase) * .18, c.data.y);
    c.object.rotation.y = c.data.flip ? Math.PI : 0;
    c.object.children.forEach((peixe, i) => { peixe.rotation.y = Math.sin(agora * 4 + i) * .15; });
  }
  webgl.render(cena, camera);
  return { canvas: webgl.domElement, alpha: transicao };
}
