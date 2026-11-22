// Rasterize static terrain at its stable projected size, not every frame.
// During zoom gestures the original path stays active to avoid rebuild churn.
let record=null;
export function desenharTerrenoDocas(ctx,img,x,y,w,h,zoom,dpr=1){
 const q=Math.min(1,zoom*dpr,2048/img.width,2048/img.height);
 if(typeof document==='undefined'||zoom*dpr>=1){ctx.drawImage(img,x,y,w,h,x,y,w,h);return;}
 if(record?.img!==img||record?.q!==q)record={img,q,frames:0,canvas:null};
 record.frames++;
 if(!record.canvas&&record.frames>=3){const c=document.createElement('canvas');c.width=Math.ceil(img.width*q);c.height=Math.ceil(img.height*q);const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.drawImage(img,0,0,c.width,c.height);record.canvas=c;}
 if(record.canvas)ctx.drawImage(record.canvas,x*q,y*q,w*q,h*q,x,y,w,h);
 else ctx.drawImage(img,x,y,w,h,x,y,w,h);
}
