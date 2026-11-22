// Fundamento reutilizável, sem habilitar voo em mapas ou trajes que ainda
// não têm colisão/renderização vertical. A autorização é sempre explícita.
export function podeVoarLivre({capacidadeAerea=false,sincronizacao=1,exigeSincronizacao=false}={}) {
  return capacidadeAerea && (!exigeSincronizacao || sincronizacao>=4);
}
export function atualizarVooLivre(v,controles,dt) {
  const t=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0,k=1-Math.exp(-3*t);
  const x=(+!!controles.direita)-(+!!controles.esquerda),y=(+!!controles.frente)-(+!!controles.tras),z=(+!!controles.subir)-(+!!controles.descer);
  const length=Math.hypot(x,y)||1, boost=controles.propulsao?1.6:1;
  v.vx+=(x/length*8*boost-v.vx)*k;v.vy+=(y/length*8*boost-v.vy)*k;v.vz+=(z*4-v.vz)*k;
  v.x+=v.vx*t;v.y+=v.vy*t;v.altura=Math.max(0,v.altura+v.vz*t);
  if(v.altura===0 && v.vz<0)v.vz=0;
  v.roll+=(-x*.32-v.roll)*k;v.pitch+=(y*.22-v.pitch)*k;return v;
}
