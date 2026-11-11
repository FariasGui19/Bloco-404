// Perspectiva submersa: renderer separado, coordenadas e colisões continuam
// pertencendo ao mapa do jogo. Não substitui/projeta as regras de gameplay.
// Fallback: sem WebGL o jogo mantém a câmera isométrica e seus controles.
import * as THREE from '../vendor/three.module.js';
import { getVidaAquatica, elementosDeRecife, atualizarCardumes } from '../game/vida-aquatica.js';
import { detalhesFauna } from '../game/fauna-ferida.js';
import { fragmentosColetados } from '../game/mare-missao.js';

let webgl = null, falhou = false, mapaAtual = null, cena = null, camera = null;
let avatar, avatar2, rastros, sonar3d, cardumes = [], fragmentos = [], bichos = [], anterior = 0, transicao = 0;
let suavX = 0, suavY = 0, suavZ = 0, cameraInicializada = false;
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
  descartarCena(); mapaAtual = map; cameraInicializada = false;
  cena = new THREE.Scene(); cena.background = new THREE.Color('#07566a');
  cena.fog = new THREE.FogExp2('#07566a', .038);
  cena.add(new THREE.HemisphereLight('#b6f5ef', '#103d48', 2.0));
  const sol = new THREE.DirectionalLight('#c3f7ef', 1.3); sol.position.set(-5, 12, -8); cena.add(sol);
  const rows = map.aguaPraia, h = rows.length, w = rows[0].length;
  const areia = textura('assets/sprites/tiles/fundo-mar-mare.png');
  areia.wrapS = areia.wrapT = THREE.RepeatWrapping; areia.repeat.set(w / 8, h / 8);
  // Relevo apenas visual: a batimetria e os obstáculos continuam pertencendo
  // à simulação do mapa, para não criar colisões invisíveis.
  const relevo = new THREE.PlaneGeometry(w, h, Math.min(w * 2, 160), Math.min(h * 2, 160));
  const vertices = relevo.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i);
    vertices.setZ(i, .10 * Math.sin(x * .48) * Math.cos(y * .37) + .06 * Math.sin(x * .9 + y * .6));
  }
  relevo.computeVertexNormals();
  const fundo = new THREE.Mesh(relevo, new THREE.MeshLambertMaterial({ map: areia, color: '#9ad5c9' }));
  fundo.rotation.x = -Math.PI / 2; fundo.position.set(w / 2, -2.9, h / 2); cena.add(fundo);
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#74e6e4', transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false }));
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
    if (r.tipo !== 0) continue;
    const s = new THREE.Sprite(coralMat); s.position.set(r.x, -2.55, r.y); s.scale.set(.7 * r.tamanho, .8 * r.tamanho, 1); cena.add(s);
  }
  cardumes = (vida?.cardumes ?? []).map(c => {
    const g = new THREE.Group();
    for (const p of c.peixes.slice(0, 7)) {
      const peixe = new THREE.Mesh(new THREE.OctahedronGeometry(.10, 0), new THREE.MeshLambertMaterial({color: '#b5e7df'}));
      peixe.scale.set(1.8, .7, .7); peixe.position.set(p.ox, Math.sin(p.fase) * .15, p.oy); g.add(peixe);
    }
    cena.add(g); return { data: c, object: g };
  });
  const cristalGeo = new THREE.OctahedronGeometry(.23, 0);
  const cristalMat = new THREE.MeshBasicMaterial({ color: '#87faff' });
  fragmentos = (state.player?.fragmentosMare ?? []).map(f => {
    const o = new THREE.Mesh(cristalGeo, cristalMat); o.position.set(f.x, -2.35, f.y); cena.add(o); return { data: f, object: o };
  });
  const bichoGeo = new THREE.SphereGeometry(.28, 8, 6), bichoMat = new THREE.MeshLambertMaterial({color:'#80c6ad'});
  bichos = detalhesFauna(map, state.progress, vida?.recifes).filter(b => b.def?.meio === 'agua').map(b => {
    const o = new THREE.Mesh(bichoGeo, bichoMat); o.scale.set(1.4, .6, .8); o.position.set(b.x, -2.35, b.y); cena.add(o); return { data: b, object: o };
  });
  const body = textura('assets/sprites/player/mare-nado-costas-3d.png');
  avatar = new THREE.Sprite(new THREE.SpriteMaterial({ map: body, transparent: true, depthWrite: false }));
  avatar.scale.set(1.65, .57, 1); cena.add(avatar);
  const body2 = textura('assets/sprites/player/mare-nado-costas-3d-b.png');
  avatar2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: body2, transparent: true, depthWrite: false }));
  avatar2.scale.copy(avatar.scale); cena.add(avatar2);
  rastros = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 6, 4), new THREE.MeshBasicMaterial({ color:'#a5f8ee', transparent:true, opacity:.65 }), 20);
  cena.add(rastros);
  sonar3d = new THREE.Mesh(new THREE.RingGeometry(.38, .44, 24), new THREE.MeshBasicMaterial({color:'#90fff2', side:THREE.DoubleSide, transparent:true, opacity:.85}));
  sonar3d.rotation.x = -Math.PI / 2; cena.add(sonar3d);
}

/** Devolve canvas e opacidade para compor no canvas do jogo; null em fallback. */
export function perspectivaSubmersa(map, state, view) {
  const n = state.player?.nado;
  if (mapaAtual && map !== mapaAtual) { transicao = 0; anterior = 0; descartarCena(); cena = null; mapaAtual = null; }
  const quer = !!(map?.aguaPraia && n?.ativo && n.mareAstral && n.profundidade > 1.25);
  if (!quer && transicao <= 0) { if (n) n.perspectiva3d = false; anterior = 0; return null; }
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
  const tx = p.x - fx * 3.1, ty = py + 1.35, tz = p.y - fz * 3.1;
  if (!cameraInicializada) { suavX = tx; suavY = ty; suavZ = tz; cameraInicializada = true; }
  const k = 1 - Math.exp(-7 * dt);
  suavX += (tx - suavX) * k; suavY += (ty - suavY) * k; suavZ += (tz - suavZ) * k;
  camera.position.set(suavX, suavY, suavZ);
  camera.lookAt(p.x + fx * 2.4, py - .3 + (n?.voo?.pitch ?? 0) * -1.1, p.y + fz * 2.4);
  avatar.position.set(p.x, py, p.y); avatar.material.rotation = (n?.voo?.roll ?? 0);
  avatar.position.y += Math.sin(agora * 3) * .035;
  avatar2.position.copy(avatar.position); avatar2.material.rotation = avatar.material.rotation;
  const mistura = .5 - .5 * Math.cos(agora * 5);
  avatar2.material.opacity = mistura * (Math.hypot(n?.vx ?? 0, n?.vy ?? 0) > .3 ? .65 : .15);
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
  for (const f of fragmentos) { f.object.visible = !pegos.has(f.data.id); f.object.rotation.y = agora; f.object.position.y = -2.35 + Math.sin(agora * 2 + f.data.fase) * .08; }
  for (const b of bichos) b.object.visible = !state.progress?.faunaTratada?.[b.data.id];
  const vida = getVidaAquatica(mapaAtual);
  if (quer && transicao >= .99) atualizarCardumes(vida?.cardumes ?? [], p, dt, true);
  for (const c of cardumes) c.object.position.set(c.data.x, -1.6 + Math.sin(agora + c.data.fase) * .18, c.data.y);
  webgl.render(cena, camera);
  return { canvas: webgl.domElement, alpha: transicao };
}
