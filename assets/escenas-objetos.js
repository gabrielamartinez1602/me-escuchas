/* Objetos de la calle: posiciones arquitectónicas, independientes de los faroles. */
(function(){
 'use strict';
 const wall=new Set(['05-porton-cementerio','08-placa-muro','13-carteles-busqueda','16-manta-donde-estan']);
 const car=new Set(['04-sedan','12-camioneta']);
 const scenes=[['01-senal-calle','02-peaton'],['03-personaje-gorra'],['04-sedan'],['07-perro-cadena'],['06-persona-sentada'],['12-camioneta','17-personaje-tactico'],['13-carteles-busqueda'],['09-vigilia'],['10-ofrenda','11-retrato-flor'],['16-manta-donde-estan'],['15-memorial-zapatos']];
 function placement(anchor,id,index=0){
  const nx=anchor.nx,nz=anchor.nz,out=[-nx,-nz],tangent=[nz,-nx],wallPoint=anchor.wallPoint;
  let yaw=Math.atan2(out[0],out[1]),scale=1,y=.17,inset=.53,along=index?.9:-.8;
  if(wall.has(id)){inset=id.startsWith('05')?.50:.20;y=id.startsWith('05')?.17:id.startsWith('08')?1.45:1.55;along=0}
  if(id.startsWith('05'))scale=.85;
  if(id.startsWith('07')){scale=.95;along=0;inset=.55}
  if(id.startsWith('01')){scale=.95;along=-1.5;inset=.65}
  if(id.startsWith('15')){scale=1;inset=.55}
  if(id.startsWith('10')){scale=1;along=-.8}
  if(id.startsWith('11')){scale=1;along=.9}
  if(car.has(id)){yaw=Math.atan2(tangent[0],tangent[1]);inset=id.startsWith('12')?2.8:2.6;y=0;along=0}
  if(id.startsWith('17')){inset=.55;along=2.8}
  const position=[wallPoint[0]+out[0]*inset+tangent[0]*along,y,wallPoint[1]+out[1]*inset+tangent[1]*along];
  return {id,anchor,position,yaw,scale,wall:wall.has(id),out,phase:Math.abs(wallPoint[0]*.71+wallPoint[1]*.37),kind:id.startsWith('05')?5:wall.has(id)?1:car.has(id)?2:id.startsWith('07')?3:id.startsWith('14')?6:(id.startsWith('10')||id.startsWith('11')||id.startsWith('15')||id.startsWith('01'))?7:4};
 }
 function build(cfg,lamps=[]){
  const anchors=[],r=cfg.anchoMedio;
  // Dos puntos por cuadra, alternando fachadas. Las esquinas quedan libres.
  const zs=[cfg.limites.back,...cfg.callesZ.slice().sort((a,b)=>a-b),cfg.limites.front];
  for(const x of cfg.callesX)for(let j=0;j<zs.length-1;j++){const lo=zs[j]+r+5,hi=zs[j+1]-r-5;if(hi-lo<6)continue;for(const [f,side]of [[.23,1],[.72,-1]])anchors.push({nx:side,nz:0,wallPoint:[x+side*r,lo+(hi-lo)*f],lo,hi,axis:1})}
  const xs=[cfg.limites.left,...cfg.callesX.slice().sort((a,b)=>a-b),cfg.limites.right];
  for(const z of cfg.callesZ)for(let j=0;j<xs.length-1;j++){const lo=xs[j]+r+5,hi=xs[j+1]-r-5;if(hi-lo<6)continue;const side=j%2?1:-1;anchors.push({nx:0,nz:side,wallPoint:[(lo+hi)/2,z+side*r],lo,hi,axis:0})}
  // Evita situar las escenas justo al pie de un farol, sin depender de su encendido.
  for(const a of anchors){const fixed=1-a.axis,wall=a.wallPoint[fixed],normal=fixed===0?a.nx:a.nz;
   const poles=lamps.filter(l=>Math.abs(l.poleBase[fixed===0?0:2]-(wall-normal*.65))<.2).map(l=>l.poleBase[a.axis===1?2:0]);
   const original=a.wallPoint[a.axis],candidates=Array.from({length:31},(_,i)=>a.lo+(a.hi-a.lo)*i/30).filter(v=>poles.every(p=>Math.abs(v-p)>4.5));
   if(candidates.length)a.wallPoint[a.axis]=candidates.sort((x,y)=>Math.abs(x-original)-Math.abs(y-original))[0];
  }
  anchors.sort((a,b)=>{const score=v=>Math.abs(v.wallPoint[0])<8?Math.abs(v.wallPoint[1]+14):500+Math.hypot(...v.wallPoint);return score(a)-score(b)});
  const objects=anchors.flatMap((anchor,i)=>scenes[i%scenes.length].map((id,j)=>placement(anchor,id,j)));
  // Monumento a escala original, en un cruce abierto, no miniaturizado en una banqueta.
  const angel=placement({nx:1,nz:0,wallPoint:[-48,-180]},'14-monumento-angel');angel.position=[-48,0,-180];angel.yaw=0;objects.push(angel);
  return objects;
 }
 window.EnojoObjectScene={build,placement,scenes};
})();
