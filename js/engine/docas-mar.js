// Pontos determinísticos de água livre no setor sul, calculados uma vez por mapa.
// A folga evita pintar ondulação sobre a terra e a face visível da margem.
function dentro(x,y,p){let sim=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)sim=!sim;}return sim;}
export function criarOndasCais(terraPolys){
 const ondas=[];let seed=40412;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<1000;i++){
  const x=100+rand()*800,y=535+rand()*340;
  if([[0,0],[-22,0],[22,0],[0,-35],[0,12]].some(([dx,dy])=>terraPolys.some(p=>dentro(x+dx,y+dy,p))))continue;
  ondas.push({x,y,largura:8+rand()*16,fase:rand()*Math.PI*2,cor:rand()});
 }
 return ondas;
}
