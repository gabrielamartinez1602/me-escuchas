'use strict';
/* ENOJO: escenario geométrico continuo, sin librerías ni fundidos entre PNG.
   Unidades en metros. CIUDAD se edita en assets/ciudad.js.
   El sensor controla orientación, no estima posición física ni pasos reales. */
const cfg=window.CIUDAD,$=id=>document.getElementById(id),canvas=$('world');
let renderer;try{renderer=new window.EnojoRenderer(canvas)}catch(error){document.getElementById('intro').innerHTML='<h1>Vista 3D no disponible</h1><p>Activa la aceleración gráfica o abre esta página en otro navegador.</p>';throw error}
const ui={intro:$('intro'),title:$('title'),prompt:$('prompt'),menu:$('menu'),panel:$('panel'),notice:$('notice'),volume:$('volume'),reset:$('reset'),ending:$('ending')};
let cover=null,newsPoints=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const damp=(v,t,k,dt)=>v+(t-v)*(1-Math.exp(-k*dt));
const angleDelta=(a,b)=>((a-b+Math.PI*3)%(Math.PI*2))-Math.PI;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let w=1,h=1,dpr=1,ready=false,started=false,auto=false,distance=0,velocity=0,phase=0,last=0,noticeTimer,drag=null,hold=0,lookX=0,lookY=0,yawOffset=0,pitch=0,roll=0;
const keys=new Set(),sensor={enabled:false,base:null,pitch:0,yaw:0,stamp:0,token:0};
const faces=[];let seed=21;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function message(text){clearTimeout(noticeTimer);ui.notice.textContent=text;ui.notice.hidden=false;noticeTimer=setTimeout(()=>ui.notice.hidden=true,4800)}
function face(points,color,emissive=0){const center=points.reduce((a,p)=>a.map((n,i)=>n+p[i]/points.length),[0,0,0]);faces.push({points,color,emissive,center,radius:Math.max(...points.map(p=>Math.hypot(p[0]-center[0],p[2]-center[2])))});}
function quad(a,b,c,d,color,emissive=0){face([a,b,c,d],color,emissive)}
// Una sola red conectada. Todos los módulos comparten plano, bordes y escala.
const lamps=[];
function box(x0,y0,z0,x1,y1,z1,color){quad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],color);quad([x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],color);quad([x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],color);quad([x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],color);quad([x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],color)}
function beam(a,b,r,color){const d=b.map((v,i)=>v-a[i]),length=Math.hypot(...d),v=d.map(n=>n/length);let side=Math.abs(v[1])>.8?[1,0,0]:[0,1,0];const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];let s=cross(v,side),n=Math.hypot(...s);s=s.map(x=>x/n*r);const t=cross(v,s);const ends=[a,b].map(p=>[[1,1],[-1,1],[-1,-1],[1,-1]].map(([i,j])=>p.map((x,k)=>x+i*s[k]+j*t[k])));for(let i=0;i<4;i++)quad(ends[0][i],ends[0][(i+1)%4],ends[1][(i+1)%4],ends[1][i],color);face(ends[1],color)}
// Poste vertical, brazo curvo y cabezal ovalado: piezas volumétricas, no planos doblados.
function roundTube(a,b,r,color,sides=8){const vector=b.map((v,i)=>v-a[i]),len=Math.hypot(...vector),axis=vector.map(v=>v/len),helper=Math.abs(axis[1])>.9?[1,0,0]:[0,1,0];const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];let u=cross(axis,helper),norm=Math.hypot(...u);u=u.map(v=>v/norm);const v=cross(axis,u);const ring=p=>Array.from({length:sides},(_,i)=>p.map((x,k)=>x+r*(u[k]*Math.cos(i/sides*Math.PI*2)+v[k]*Math.sin(i/sides*Math.PI*2))));const first=ring(a),last=ring(b);for(let i=0;i<sides;i++)quad(first[i],first[(i+1)%sides],last[(i+1)%sides],last[i],color);face(last,color);face(first.slice().reverse(),color)}
function classicLamp(ox,oz,tx,tz,nx,nz,u){
 const point=(along,y,inset)=>[ox+tx*along+nx*inset,y,oz+tz*along+nz*inset];
 const A=point(u,.17,-.65),B=point(u,5.03,-.65),metal='#292b33';
 roundTube(A,point(u,.42,-.65),.16,'#22242b');roundTube(point(u,.42,-.65),point(u,.73,-.65),.12,metal);
 roundTube(point(u,.62,-.65),B,.075,metal);roundTube(point(u,5,-.65),point(u,5.08,-.65),.105,'#383a43');
 const start=point(u,4.76,-.65),control=point(u,5.72,-1.02),end=point(u,5.55,-1.65);let previous=start;
 for(let i=1;i<=8;i++){const t=i/8,next=start.map((v,k)=>(1-t)*(1-t)*v+2*(1-t)*t*control[k]+t*t*end[k]);roundTube(previous,next,.065,metal);previous=next}
 const center=point(u,5.55,-2.12),sides=12;
 const ring=(y,scale)=>Array.from({length:sides},(_,i)=>{const angle=i/sides*Math.PI*2;return[center[0]+tx*Math.cos(angle)*.29*scale+nx*Math.sin(angle)*.62*scale,y,center[2]+tz*Math.cos(angle)*.29*scale+nz*Math.sin(angle)*.62*scale]});
 const profiles=[[5.46,1],[5.60,1],[5.74,.7],[5.78,.18]];let lower=ring(...profiles[0]);
 for(let r=1;r<profiles.length;r++){const upper=ring(...profiles[r]);for(let i=0;i<sides;i++)quad(lower[i],lower[(i+1)%sides],upper[(i+1)%sides],upper[i],metal);lower=upper}face(lower,'#34363f');
 const lens=ring(5.445,.79);face(lens,'#ff263b',1);
 const position=[center[0],5.435,center[2]],direction=[-nx*.16,-1,-nz*.16],norm=Math.hypot(...direction);
 lamps.push({position,direction:direction.map(v=>v/norm),poleBase:A,poleTop:B,range:19,intensity:2.2,fixtureCenter:[center[0],5.445,center[2]]});
}

function facade(ox,oz,tx,tz,nx,nz,length,hasLamp){
 const height=6.1+random()*2.2,topSlope=(random()-.5)*.5,base=cfg.paleta.fachadas[Math.floor(random()*4)];
 // p es una transformación afín: puertas, rejas y sombras permanecen sobre la pared.
 const p=(u,y,depth=0)=>[ox+tx*u+nx*(depth-y*.045),y,oz+tz*u+nz*(depth-y*.045)];
 const rect=(u,y,ww,hh,fill,depth=-.035)=>quad(p(u,y,depth),p(u+ww,y,depth),p(u+ww,y+hh,depth),p(u,y+hh,depth),fill);
 quad(p(0,0),p(length,0),p(length,height+topSlope),p(0,height),base);
 quad(p(0,height),p(length,height+topSlope),p(length,height+topSlope,10),p(0,height,10),'#26272d');
 quad(p(0,5.7),p(0,height),p(0,height,10),p(0,5.7,10),'#28292f');quad(p(length,5.7),p(length,height+topSlope),p(length,height+topSlope,10),p(length,5.7,10),'#24252b');
 rect(0,0,length,1.05,'#46464d',-.025);
 const doorWidth=Math.min(1.25,length*.19);rect(.4,.12,doorWidth,3.05,'#111116',-.075);rect(.4,.12,.055,3.05,'#c92c38',-.105);rect(.4,3.17,doorWidth,.055,'#f03945',-.11);
 const u=length*.5,ww=Math.min(1.38,length*.26),wy=1.6,wh=2.02;
 rect(u-.13,wy-.15,ww+.26,wh+.3,'#57565d',-.065);rect(u,wy,ww,wh,'#0d0d13',-.09);rect(u,wy,ww,.07,'#a62532',-.11);rect(u,wy,.055,wh,'#e43844',-.12);
 for(let bar=1;bar<=5;bar++)rect(u+ww*bar/6,wy,.035,wh,bar%2?'#6d4e58':'#a02835',-.125);rect(u,wy+.5,ww,.035,'#63525a',-.13);rect(u,wy+1.4,ww,.035,'#63525a',-.13);
 if(height>7.4){rect(.5,4.6,1.05,1.35,'#15151b',-.075);for(let bar=1;bar<=4;bar++)rect(.5+bar*.21,4.6,.03,1.35,'#53464f',-.1)}
 // Borde rojo fino, en lugar de grandes picos extruidos al azar.
 rect(0,1.05,.04,height-1.05,'#b62936',-.08);
 quad(p(0,height+.03,-.02),p(length,height+topSlope+.03,-.02),p(length,height+topSlope+.14,-.22),p(0,height+.14,-.22),'#202027');
 if(hasLamp)classicLamp(ox,oz,tx,tz,nx,nz,length*.34);
}
const xs=cfg.callesX,zs=cfg.callesZ,road=cfg.anchoMedio;
// Bordes exteriores incluidos: ningún tramo termina en paredes abiertas.
const xb=[-96,-48,0,48,96],zb=[-300,-240,-180,-120,-60,0,60];
for(let xi=0;xi<xb.length-1;xi++)for(let zi=0;zi<zb.length-1;zi++){
 const left=xb[xi]+road,right=xb[xi+1]-road,back=zb[zi]+road,front=zb[zi+1]-road;
 box(left+.3,0,back+.3,right-.3,5.7,front-.3,'#25262c');
 // Banqueta continua con vértices exactos. No usa la curvatura de la pared.
 box(left-1,.03,back-1,right+1,.17,front+1,'#66666d');
 const row=(ox,oz,tx,tz,nx,nz,len)=>{const count=Math.ceil(len/6),step=len/count;for(let k=0;k<count;k++){
  const x=ox+tx*k*step,z=oz+tz*k*step,along=tz?z+tz*step*.34:x+tx*step*.34;
  // Tres faroles por tramo entre cruces: dos en una banqueta y uno en la opuesta.
  const side=tz?nx:nz,origin=tz?oz:ox,sign=tz||tx,low=Math.min(origin,origin+sign*len);
  const targets=(side>0?[.25,.75]:[.5]).map(f=>low+len*f);
  const streetExists=tz?xs.some(v=>Math.abs(ox-nx*road-v)<.01):zs.some(v=>Math.abs(oz-nz*road-v)<.01);
  const hasLamp=streetExists&&targets.some(v=>Math.abs(along-v)<step/2);
  facade(x,z,tx,tz,nx,nz,step,hasLamp);
 }};
 row(left,front,1,0,0,-1,right-left);row(right,back,-1,0,0,1,right-left);row(left,back,0,1,1,0,front-back);row(right,front,0,-1,-1,0,front-back);
 // Pilastras sólidas sellan la junta entre los dos planos inclinados de cada esquina.
 for(const x of [left,right])for(const z of [back,front])box(x-.4,0,z-.4,x+.4,8.65,z+.4,'#35353d');

}
// Suelo único opaco, más adoquines unidos por una retícula compartida.
quad([-130,-.04,-340],[130,-.04,-340],[130,-.04,85],[-130,-.04,85],'#17181e');
const step=1.3;
for(let ix=-74;ix<74;ix++)for(let iz=-218;iz<29;iz++){
 const x=ix*step,z=iz*step,cx=x+step/2,cz=z+step/2;
 if(!xs.some(v=>Math.abs(cx-v)<road+.4)&&!zs.some(v=>Math.abs(cz-v)<road+.4))continue;
 const color=cfg.paleta.piso[Math.floor(random()*4)];
 quad([x,0,z],[x+step,0,z],[x+step,0,z+step],[x,0,z+step],color);
 const diamond=[[cx,.008,z+.045],[x+step-.045,.008,cz],[cx,.008,z+step-.045],[x+.045,.008,cz]];
 const shade=['#3a3a42','#48484f','#303139','#24252c'][Math.floor(random()*4)];face(diamond,shade);
}
// Cúpula lejana: un referente discreto, fijo en el mundo.
const dome={x:20,z:-282,y:8,r:4};
box(dome.x-3.8,0,dome.z-3.8,dome.x+3.8,dome.y,dome.z+3.8,'#202129');
for(let ring=0;ring<6;ring++){const a=ring/6*Math.PI/2,b=(ring+1)/6*Math.PI/2;for(let k=0;k<24;k++){const u=k/24*Math.PI*2,v=(k+1)/24*Math.PI*2;const point=(lat,lon)=>[dome.x+Math.cos(lat)*Math.cos(lon)*dome.r,dome.y+Math.sin(lat)*dome.r,dome.z+Math.cos(lat)*Math.sin(lon)*dome.r];quad(point(a,u),point(a,v),point(b,v),point(b,u),'#202129')}}
beam([dome.x,11.7,dome.z],[dome.x,14,dome.z],.09,'#12131a');beam([dome.x-.6,13.3,dome.z],[dome.x+.6,13.3,dome.z],.09,'#12131a');
// La ciudad termina en bordes físicos comunes, no en una salida predeterminada.
function cutPlane(points,axis,limit,greater){const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ia=greater?a[axis]>=limit:a[axis]<=limit,ib=greater?b[axis]>=limit:b[axis]<=limit;if(ia)out.push(a);if(ia!==ib){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+(b[j]-v)*t))}}return out}
const bounds=cfg.limites;
const finalFaces=faces.map(f=>{let points=f.points;for(const [axis,limit,greater] of [[0,bounds.left,true],[0,bounds.right,false],[2,bounds.back,true],[2,bounds.front,false]])points=cutPlane(points,axis,limit,greater);return {...f,points}}).filter(f=>f.points.length>=3);
renderer.upload(finalFaces);renderer.setLights(lamps.filter(l=>l.position[0]>bounds.left+.5&&l.position[0]<bounds.right-.5&&l.position[2]>bounds.back+.5&&l.position[2]<bounds.front-.5));
const objectScene=window.EnojoObjectScene.build(cfg,renderer.lights);renderer.setObjectScene(objectScene);
const obstacles=objectScene.filter(o=>o.kind===2||o.id.startsWith("14")).map(o=>{const halfWidth=o.id.startsWith("14")?1.5:o.id.startsWith("12")?1.29:1.10,halfLength=o.id.startsWith("14")?1.5:o.id.startsWith("12")?3.02:2.27;const hx=Math.abs(Math.cos(o.yaw))*halfWidth+Math.abs(Math.sin(o.yaw))*halfLength,hz=Math.abs(Math.sin(o.yaw))*halfWidth+Math.abs(Math.cos(o.yaw))*halfLength;return {minX:o.position[0]-hx,maxX:o.position[0]+hx,minZ:o.position[2]-hz,maxZ:o.position[2]+hz}});
const walker=new window.EnojoNavigation.Walker({obstacles,start:cfg.inicio,xs,zs,road,sidewalk:1,radius:.3,bounds});
const sky=new Image();sky.src=window.ENOJO_CIELO;
function draw(cam){renderer.draw({...cam,roll});newsPoints?.update({...cam,roll},renderer.activeLights,soundtrack,state==='running'&&!finale)}
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);renderer.resize(w,h,dpr)}

/* Interacción sin botones de navegación. Reloj activo: 170 s; pausa y menú lo detienen. */
const DURATION=cfg.duracion;
let state='intro',elapsed=0,direction=1,lastTap=null,hideTimer,menuResume=false,lastStep=-1,movingSpeed=0;
let finale=null;
const preferences={volume:true};
const soundtrack=new window.EnojoSoundtrack();
function setAudioLevel(){soundtrack.apply(state,preferences.volume);newsPoints?.setVolume(preferences.volume)}
function stopHeart(){soundtrack.stop('corazon')}
async function unlockAudio(){setAudioLevel();const ok=await soundtrack.unlock();if(!ok)message('No se pudo activar el audio. Revisa el volumen y vuelve a tocar el icono de volumen.');setAudioLevel()}
function heartbeat(){const edge=Math.min(walker.x-bounds.left,bounds.right-walker.x,walker.z-bounds.back,bounds.front-walker.z),progress=Math.max(clamp(elapsed/DURATION,0,1),clamp((38-edge)/32,0,1),finale?.85+.15*clamp(finale.age/6,0,1):0);soundtrack.update(Math.min(1,progress+(newsPoints?.near||0)*.22),drag?1:0);newsPoints?.updateIntensity(soundtrack.intensity,elapsed);canvas.dataset.audioState=soundtrack.error?'error':soundtrack.context?.state||'locked';canvas.dataset.audioReady=String(!!soundtrack.buffers)}
// Corazón, fondo de tensión original y voces progresivas; los pasos permanecen silenciosos.
function footstep(){}
function showInstructions(kind){ui.intro.setAttribute('data-mode',kind);clearTimeout(hideTimer);ui.intro.hidden=false;ui.intro.classList.remove('leaving');ui.intro.setAttribute('aria-label',kind==='intro'?'Toca para comenzar':'Dos toques rápidos para continuar');ui.title.innerHTML=kind==='intro'?'Camina.<br>Mira.<br>Siente.':kind==='finished'?'Vacío.':'En pausa.';ui.prompt.textContent=kind==='intro'?(ready?'Toca la pantalla para comenzar':'Cargando la calle…'):kind==='finished'?'Reinicia desde el menú ☰.':'Dos toques rápidos sobre la calle para continuar.'}
function fadeInstructions(){clearTimeout(hideTimer);ui.intro.classList.add('leaving');hideTimer=setTimeout(()=>{if(state==='running')ui.intro.hidden=true},1550)}
function pause(){if(state!=='running')return;state='paused';drag=null;stopHeart();velocity=0;keys.clear();lastTap=null;showInstructions('paused');setAudioLevel()}
function resume(){if(state!=='paused')return;state='running';last=0;lastTap=null;fadeInstructions();unlockAudio();setAudioLevel()}
function finish(){if(!soundtrack.finalTone){newsPoints?.cutForFinale();soundtrack.finalize()}velocity=0;movingSpeed=0;state='finished';keys.clear();document.body.classList.add('finished');ui.intro.hidden=true;ui.ending.hidden=false;setAudioLevel();canvas.dataset.state='finished';canvas.dataset.elapsed=String(elapsed)}
function togglePause(){if(state==='running')pause();else if(state==='paused')resume();}
function recenter(){sensor.heading=null;sensor.anchor=yawOffset-lookX;sensor.base=null;sensor.pitch=0;sensor.yaw=0;sensor.stamp=0;sensor.armed=true}
function readSensor(e){if(!sensor.enabled||document.hidden)return;const angle=screen.orientation?.angle??window.orientation??0,a=angle*Math.PI/180;if(!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;const vertical=e.beta*Math.cos(a)+e.gamma*Math.sin(a),horizontal=e.gamma*Math.cos(a)-e.beta*Math.sin(a);if(!sensor.base)sensor.base={vertical,horizontal};sensor.pitch=clamp(((vertical-sensor.base.vertical+540)%360)-180,-30,30);if(Number.isFinite(e.alpha)){
 const alpha=e.alpha*Math.PI/180,beta=e.beta*Math.PI/180,gamma=e.gamma*Math.PI/180;
 // Proyección de la normal de pantalla: sigue el giro físico con el celular vertical.
 const fx=-(Math.cos(alpha)*Math.sin(gamma)+Math.sin(alpha)*Math.sin(beta)*Math.cos(gamma)),fy=-(Math.sin(alpha)*Math.sin(gamma)-Math.cos(alpha)*Math.sin(beta)*Math.cos(gamma));
 if(Math.hypot(fx,fy)>.15){const heading=Math.atan2(fx,fy);if(sensor.heading===null||sensor.heading===undefined){sensor.heading=heading;sensor.yaw=sensor.anchor||0}else{sensor.yaw+=Math.atan2(Math.sin(heading-sensor.heading),Math.cos(heading-sensor.heading));sensor.heading=heading}}
 }sensor.stamp=performance.now();if(state==='running'){const gesture=window.EnojoNavigation.directionGesture(sensor.pitch,direction,sensor.armed);direction=gesture.direction;sensor.armed=gesture.armed}}
async function enableSensor(){if(!window.isSecureContext||!window.DeviceOrientationEvent)return;const token=++sensor.token;try{if(typeof DeviceOrientationEvent.requestPermission==='function'){const result=await DeviceOrientationEvent.requestPermission();if(token!==sensor.token||result!=='granted')return}sensor.enabled=true;recenter()}catch{/* Sin permiso: caminata automática, arrastre y teclado. */}}
function begin(){if(!ready||state!=='intro')return;cover?.hide();state='running';started=true;last=0;lastTap=null;fadeInstructions();unlockAudio();enableSensor()}
function restart(){newsPoints?.reset();finale=null;sensor.token++;state='intro';drag=null;stopHeart();elapsed=0;distance=0;velocity=0;phase=0;direction=1;walker.reset();renderer.proximity.reset();renderer.resetObjectScene();movingSpeed=0;lastTap=null;lastStep=-1;last=0;keys.clear();lookX=lookY=yawOffset=pitch=roll=0;recenter();ui.panel.hidden=true;ui.menu.setAttribute('aria-expanded','false');ui.menu.setAttribute('aria-label','Abrir menú');document.body.classList.remove('finished');ui.ending.hidden=true;if(cover){ui.intro.hidden=true;cover.reset()}else showInstructions('intro');setAudioLevel();canvas.dataset.state='intro';canvas.dataset.elapsed='0'}
ui.menu.onclick=()=>{if(ui.panel.hidden){menuResume=state==='running';if(menuResume)pause();ui.panel.hidden=false;ui.menu.setAttribute('aria-expanded','true');ui.menu.setAttribute('aria-label','Cerrar menú')}else{ui.panel.hidden=true;ui.menu.setAttribute('aria-expanded','false');ui.menu.setAttribute('aria-label','Abrir menú');if(menuResume)resume();menuResume=false}};
ui.volume.onclick=()=>{preferences.volume=!preferences.volume;ui.volume.setAttribute('aria-pressed',String(preferences.volume));ui.volume.setAttribute('aria-label',preferences.volume?'Silenciar volumen':'Activar volumen');unlockAudio();setAudioLevel()};
ui.reset.onclick=restart;
// Un tap inicial empieza. Dos taps breves, cercanos y sin arrastre pausan/reanudan.
function down(e){if(cover?.visible)return;if(e.target.closest('#menu,#panel,#news-notice,#news-hotspots'))return;if(!ui.panel.hidden){ui.menu.click();return}if(e.isPrimary===false||e.button>0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,lx:lookX,ly:lookY,time:performance.now(),moved:false};if(e.target.setPointerCapture)e.target.setPointerCapture(e.pointerId)}
function move(e){if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>10)drag.moved=true;if(state==='running'&&drag.moved){lookX=drag.lx+dx*.0042;lookY=clamp(drag.ly-dy*.0027,-.65,.65)}}
function up(e){if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(d.moved||performance.now()-d.time>320){lastTap=null;return}if(state==='intro'){begin();return}const now=performance.now();if(lastTap&&now-lastTap.time<330&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<32){lastTap=null;togglePause()}else lastTap={time:now,x:e.clientX,y:e.clientY}}
addEventListener('pointerdown',down);addEventListener('pointermove',move);addEventListener('pointerup',up);addEventListener('pointercancel',()=>{drag=null;lastTap=null});
ui.intro.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(state==='intro')begin();else if(state==='paused')resume()}});
addEventListener('keydown',e=>{if(cover?.visible)return;if(e.target.closest('button,#news-notice,#news-hotspots'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key===' '){if(state==='intro')begin();else togglePause();return}if(state==='running'){if(e.key==='ArrowUp'||e.key==='s')direction=-1;if(e.key==='ArrowDown'||e.key==='w')direction=1}keys.add(e.key)});addEventListener('keyup',e=>keys.delete(e.key));
addEventListener('deviceorientation',readSensor,{passive:true});addEventListener('orientationchange',recenter);screen.orientation?.addEventListener('change',recenter);addEventListener('resize',resize);addEventListener('blur',()=>{if(state==='running')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();recenter();last=0});
function scheduledSpeed(t){return cfg.velocidadInicial+(cfg.velocidadFinal-cfg.velocidadInicial)*(clamp(t/DURATION,0,1)**1.5)}
function startGateFinale(){
 if(finale)return;
 const gate={id:'05-porton-cementerio',position:[walker.x+Math.sin(yawOffset)*7,0,walker.z-Math.cos(yawOffset)*7],yaw:-yawOffset,scale:1.2,wall:false,out:[0,0],phase:0,kind:5};
 finale={age:0,gate};velocity=0;movingSpeed=0;drag=null;
}
function advance(dt,now){
 movingSpeed=0;if(state!=='running')return;elapsed=Math.min(DURATION,elapsed+dt);
 if(finale){finale.age=Math.min(6,finale.age+dt);velocity=0;if(finale.age>=2.1&&!finale.audioCut){finale.audioCut=true;newsPoints?.cutForFinale();soundtrack.finalize()}if(finale.age>=6)finish();return}
 const edge=Math.min(walker.x-bounds.left,bounds.right-walker.x,walker.z-bounds.back,bounds.front-walker.z);
 if(elapsed>=DURATION-6||edge<=14||walker.exited){startGateFinale();return}
 velocity=damp(velocity,scheduledSpeed(elapsed)*(drag?1.8:1)*direction,4,Math.min(dt,.1));
 const moved=walker.move(velocity*dt,yawOffset);distance=walker.travelled;movingSpeed=dt>0?moved/dt:0;
 if(walker.exited)startGateFinale();
}
function frame(now){const actualDt=last?Math.max(0,(now-last)/1000):0,dt=Math.min(.05,actualDt);last=now;
 if(!document.hidden){
  const tracked=sensor.enabled&&sensor.base,side=tracked?sensor.yaw:0,up=tracked?-sensor.pitch*Math.PI/180:0;
  if(state==='running'){if(keys.has('ArrowLeft'))lookX-=dt*.8;if(keys.has('ArrowRight'))lookX+=dt*.8}
  yawOffset=damp(yawOffset,lookX+side,8,dt);pitch=damp(pitch,clamp(lookY+up,-.65,.65),7,dt);
  advance(actualDt,now);heartbeat();const moving=state==='running'?movingSpeed:0;phase+=moving*dt*3.1;const step=Math.floor(phase/Math.PI);if(moving>.15&&step!==lastStep){lastStep=step;footstep()}
  const comfort=reduce.matches,bob=comfort?0:Math.sin(phase*2)*.018*Math.min(1,moving),sway=comfort?0:Math.sin(phase)*.018*Math.min(1,moving);roll=damp(roll,comfort?0:Math.sin(phase)*.0015,6,dt);
  const edge=Math.min(walker.x-bounds.left,bounds.right-walker.x,walker.z-bounds.back,bounds.front-walker.z);
  const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)},darkness=finale?smooth(finale.age/.8):0,gateOpening=finale?smooth((finale.age-2.1)/2.6):0,gateFade=finale?smooth((finale.age-5.7)/.3):0;
  if(!(state==='intro'&&cover?.visible))draw({x:walker.x+Math.cos(yawOffset)*sway,z:walker.z+Math.sin(yawOffset)*sway,eye:1.66+bob,cos:Math.cos(yawOffset),sin:Math.sin(yawOffset),cp:Math.cos(pitch),sp:Math.sin(pitch),gate:finale&&finale.age>=1.2?finale.gate:null,gateReveal:finale?smooth((finale.age-1.2)/.5):0,gateOpen:gateOpening,gateZoom:finale?smooth((finale.age-3.1)/2.7):0,gateFade,voidAmount:darkness,time:elapsed,reducedMotion:reduce.matches,running:state==='running',finalCue:elapsed>=DURATION-25||edge<38,delta:state==='running'?dt:0});
  canvas.dataset.state=state;canvas.dataset.elapsed=elapsed.toFixed(2);canvas.dataset.x=walker.x.toFixed(3);canvas.dataset.z=walker.z.toFixed(3);canvas.dataset.heading=yawOffset.toFixed(3);canvas.dataset.direction=String(direction);
 }requestAnimationFrame(frame)
}
if(window.EnojoNewsPoints&&window.ENOJO_NOTICIAS?.length){newsPoints=new window.EnojoNewsPoints({lights:renderer.lights,news:window.ENOJO_NOTICIAS,cfg,volume:()=>preferences.volume,getAudioContext:()=>soundtrack.context,getAudioDestination:()=>soundtrack.newsInput,onActivity:active=>soundtrack.setDucking(active ? .82 : 1)})}
if(window.EnojoCover){cover=new window.EnojoCover(document.getElementById('covers'),()=>begin());ui.intro.hidden=true;}
let skyReady=false;
function completeReady(){ready=skyReady&&renderer.objectsReady;cover?.setReady(ready);ui.prompt.textContent=ready?'Toca la pantalla para comenzar.':'Cargando objetos de la calle…'}
sky.onload=()=>{renderer.setSky(sky);skyReady=true;completeReady()};sky.onerror=()=>{skyReady=true;completeReady()};if(sky.complete&&sky.naturalWidth)sky.onload();renderer.assetsReady.then(completeReady).catch(error=>{console.error(error);ui.prompt.textContent='No se pudieron cargar los objetos. Abre la carpeta completa desde un servidor web.'});resize();requestAnimationFrame(frame);
