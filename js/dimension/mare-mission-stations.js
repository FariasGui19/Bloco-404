import * as THREE from '../vendor/three.module.js';
import { systems, circuitLegs, siteStatus, statusColor, statusLabel, cableColor } from './mare-mission-circuit.js';

// Um desenho por mudança de estado; nenhuma textura é criada por frame.
function display(site) {
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 52;
  const ctx = canvas.getContext('2d');
  const map = new THREE.CanvasTexture(canvas);
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, paint(status) {
    const ink = statusColor[status];
    ctx.fillStyle = '#0b191b'; ctx.fillRect(0, 0, 96, 52);
    ctx.fillStyle = '#25403e';
    for (let y = 3; y < 52; y += 4) ctx.fillRect(0, y, 96, 1);
    ctx.fillStyle = ink; ctx.fillRect(3, 4, 26, 25);
    ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#10201f'; ctx.fillText(site.code, 5, 23);
    ctx.fillStyle = '#cbded4'; ctx.font = '8px monospace'; ctx.fillText('H-03 / BAÍA', 33, 12);
    ctx.font = 'bold 12px monospace'; ctx.fillText(site.short, 32, 26);
    ctx.fillStyle = ink; ctx.font = 'bold 13px monospace'; ctx.fillText(statusLabel[status], 5, 45);
    // Barras distintas mesmo sem percepção de cor.
    for (let i = 0; i < (status === 'online' ? 3 : status === 'ready' ? 2 : 1); i++)
      ctx.fillRect(76+i*6, 42-i*4, 4, 5+i*4);
    map.needsUpdate = true;
  } };
}

// Bancadas de verdade, na mesma posição e dentro do raio sólido do modelo.
// Cada máquina tem perfil próprio, display numerado e uma baliza visível de costas.
export function installStations(scene, mat, trail, cableSkin) {
  const records = systems.map((site, i) => {
    const group = new THREE.Group();
    group.name = `H03-${site.short}`;
    group.position.set(site.x, .19, site.y);
    group.rotation.y = Math.atan2(site.approach[0]-site.x, site.approach[1]-site.y);
    scene.add(group);
    const part = (geo, material, x, y, z) => {
      const p = new THREE.Mesh(geo, material); p.position.set(x,y,z); group.add(p); return p;
    };
    const box = (w,h,d,material,x,y,z) => part(new THREE.BoxGeometry(w,h,d),material,x,y,z);
    const tube = (r1,r2,h,material,x,y,z) => part(new THREE.CylinderGeometry(r1,r2,h,8),material,x,y,z);
    const lamp = new THREE.MeshBasicMaterial({ fog: true, toneMapped: false });
    const crt = display(site);
    let screenY, screenZ, dish, flywheel;
    if (i === 0) { // Marégrafo: parabólica vazada e receptor junto ao mastro.
      tube(.52,.58,.19,mat.concrete,0,.095,0);
      box(.78,.92,.58,mat.metalDark,0,.63,0);
      tube(.055,.085,1.38,mat.metal,-.12,1.56,-.08);
      dish = part(new THREE.ConeGeometry(.46,.23,10,1,true), mat.tiles,-.12,2.08,-.09);
      dish.material = mat.tiles.clone(); dish.material.side = THREE.DoubleSide; dish.rotation.x = 2.48;
      tube(.025,.035,.54,mat.black,-.12,2.2,.05).rotation.x = .65;
      screenY = .88; screenZ = .32;
    } else if (i === 1) { // Grupo gerador: patim, radiador de aletas e escape.
      box(1.78,.20,1.0,mat.concrete,0,.10,0);
      box(1.58,.79,.86,mat.containerRust,0,.64,0);
      for (let j = 0; j < 6; j++) box(.055,.49,.09,mat.black,-.69+j*.095,.65,.44);
      tube(.32,.32,1.12,mat.metalDark,0,1.04,-.07).rotation.z = Math.PI/2;
      tube(.085,.11,.87,mat.rust,-.58,1.55,-.16);
      tube(.17,.15,.08,mat.black,-.58,2.01,-.16);
      flywheel = tube(.26,.26,.10,mat.black,-.81,.70,0);
      flywheel.rotation.z = Math.PI/2;
      const spokes = new THREE.Mesh(new THREE.BoxGeometry(.46,.04,.09),mat.metal);
      spokes.position.y = .07; flywheel.add(spokes);
      const cross = spokes.clone(); cross.rotation.y = Math.PI/2; flywheel.add(cross);
      screenY = 1.20; screenZ = .43;
    } else { // Relé de fase: armário estreito, pala de chuva e três fusíveis.
      box(1.03,.17,.77,mat.concrete,0,.085,0);
      box(.94,1.52,.60,mat.metalDark,0,.91,0);
      box(1.07,.09,.81,mat.roof,0,1.7,0);
      for (let j = 0; j < 3; j++) tube(.06,.06,.24,mat.tiles,-.21+j*.21,.64,.32);
      screenY = 1.28; screenZ = .325;
    }
    box(.85,.49,.10,mat.black,0,screenY,screenZ);
    part(new THREE.PlaneGeometry(.77,.414),new THREE.MeshBasicMaterial({map:crt.map,toneMapped:false}),0,screenY,screenZ+.052);
    // Faixa em todas as faces, não só um marcador flutuante.
    box(i === 1 ? 1.62 : .8,.065,i === 1 ? .88 : .62,lamp,0,.42,0);
    tube(.095,.11,.28,lamp,.32,screenY+.44,-.08).name = 'baliza';
    tube(.13,.13,.055,mat.black,.32,screenY+.60,-.08);
    return { site, lamp, crt, dish, flywheel, status: null };
  });

  // Uma faixa de tábuas e uma derivação elétrica por trecho. Sem postes na
  // linha de visão, luzes dinâmicas ou objetos por metro de comprimento.
  const line = (points, width, y, material) => {
    const pos = [], uv = [], indices = [];
    for (let i=1; i<points.length; i++) {
      const [ax,az] = points[i-1], [bx,bz] = points[i];
      const len = Math.hypot(bx-ax,bz-az), nx = (az-bz)*width/(2*len), nz = (bx-ax)*width/(2*len);
      const j = pos.length/3;
      pos.push(ax+nx,y,az+nz, ax-nx,y,az-nz, bx+nx,y,bz+nz, bx-nx,y,bz-nz);
      uv.push(0,0,1,0,0,len/2,1,len/2);
      indices.push(j,j+2,j+1,j+1,j+2,j+3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.setIndex(indices); geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo,material));
  };
  const planks = new THREE.MeshLambertMaterial({ map: trail, color: 0xa0ada6, side: THREE.DoubleSide });
  const sheath = new THREE.MeshLambertMaterial({map:cableSkin,color:0x3b4542,side:THREE.DoubleSide});
  const wires = circuitLegs.map(({site, from, walk, cable}) => {
    line(walk, 1.85, .263, planks);
    line(cable, .14, .272, sheath);
    const material = new THREE.MeshBasicMaterial({color:0x82694c,side:THREE.DoubleSide});
    line(cable, .046, .278, material);
    return { site, from, material };
  });
  return function updateCircuit(m, t, reducedMotion) {
    for (const rec of records) {
      const status = siteStatus(m, rec.site);
      if (status === 'online' && !reducedMotion) {
        if (rec.dish) rec.dish.rotation.y = Math.sin(t*.7)*.25;
        if (rec.flywheel) rec.flywheel.rotation.x = t*3.6;
      }
      if (status === rec.status) continue;
      rec.status = status;
      rec.lamp.color.set(statusColor[status]); rec.crt.paint(status);
    }
    for (const leg of wires) leg.material.color.set(cableColor(m, leg));
  };
}
