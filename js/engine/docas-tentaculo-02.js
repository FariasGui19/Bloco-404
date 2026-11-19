import { getSprite } from './sprites.js';

export const PARTES_TENTACULO_02=['emerge','dobra','alcance','recolhe'];
export const AGUA_TENTACULO_02=['anel','espuma','reflexo','gotas','refluxo','esteira'];
export const FOLHAS_TENTACULO_02=Object.fromEntries([
  ...PARTES_TENTACULO_02.map(name=>[`tentaculo-${name}`,{w:384,h:320,frames:15,columns:5,anchor:[144,282]}]),
  ...AGUA_TENTACULO_02.map(name=>[`agua-${name}`,{w:256,h:128,frames:16,columns:4,anchor:[128,64]}]),
]);
export const SPRITES_TENTACULO_02=Object.keys(FOLHAS_TENTACULO_02).map(id=>({id:`docas_t02_${id}`,src:`assets/sprites/docas-tentaculo-02/${id}.webp`}));
export function poseTentaculo02(p){
  const index=Math.min(59,Math.floor(Math.max(0,Math.min(1,p))*60));
  return {id:`tentaculo-${PARTES_TENTACULO_02[Math.floor(index/15)]}`,frame:index%15};
}
function draw(ctx,id,f,x,y,s,alpha){
  const info=FOLHAS_TENTACULO_02[id],img=getSprite(`docas_t02_${id}`);
  if(!img||alpha<=.012)return false;
  ctx.save();ctx.globalAlpha*=alpha;
  ctx.drawImage(img,f%info.columns*info.w,Math.floor(f/info.columns)*info.h,info.w,info.h,
    x-info.anchor[0]*s,y-info.anchor[1]*s,info.w*s,info.h*s);
  ctx.restore();return true;
}
// Same contract as the previous limb: world x/y is the root, not its bounds.
// At 2× paint density the displayed dimensions and root remain unchanged.
export function desenharTentaculo02(ctx,x,y,escala,p,alpha=1){
  const pose=poseTentaculo02(p);
  if(!getSprite(`docas_t02_${pose.id}`))return false;
  if(alpha<=.012)return true;
  const s=escala/2;
  const f=Math.min(15,Math.floor(Math.max(0,Math.min(1,p))*16));
  for(const [id,a,dy] of [['esteira',.55,4],['reflexo',.65,13],['anel',.5,0]])
    draw(ctx,`agua-${id}`,f,x,y+dy*escala,s,alpha*a);
  draw(ctx,pose.id,pose.frame,x,y,s,alpha);
  for(const [id,a] of [['refluxo',.36],['espuma',.5],['gotas',.6]])
    draw(ctx,`agua-${id}`,f,x,y+3*escala,s,alpha*a);
  return true;
}
