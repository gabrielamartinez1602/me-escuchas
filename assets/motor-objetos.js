/* Modelos 3D con iluminación neutra y UV impresas, independientes de los faroles. */
(function(){
 'use strict';const Base=window.EnojoRenderer;
 class ObjectRenderer extends Base{
 constructor(canvas){super(canvas);const gl=this.gl;const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const p=this.objectProgram=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute vec2 texcoord;attribute float printed;attribute float leafSide;uniform vec3 camera;uniform vec4 rotation;uniform vec4 lens;uniform float roll;uniform vec3 origin;uniform vec4 model;uniform vec4 motion;uniform float gateOpen;uniform vec2 wallOut;varying vec3 tint;varying vec3 worldPosition;varying vec3 worldNormal;varying vec2 uv;varying float paper;varying float depth;
 void main(){vec3 a=position;vec3 localNormal=normal;float t=motion.x,p=motion.y,amp=motion.w;
 float wave=sin(t*1.45+p),breath=sin(t*2.05+p*.73),gust=sin(t*1.3+p+a.x*2.3)+.32*sin(t*2.7+p*.4+a.x*4.);
 // Papel sujeto arriba: bordes inferiores se mueven con el aire.
 if(motion.z>.5&&motion.z<1.5){float freeEdge=1.-smoothstep(.55,1.08,a.y);a.z+=gust*.035*freeEdge*amp;}
 // Carrocería sobre suspensión; ruedas permanecen apoyadas.
 if(motion.z>1.5&&motion.z<2.5){float body=smoothstep(.30,.65,a.y);a.y+=(sin(t*4.2+p)*.009+sin(t*1.25+p)*.006)*body*amp;}
 // Respiración y leve giro de cabeza del perro, sin mover plato ni poste.
 if(motion.z>2.5&&motion.z<3.5&&a.x>-.45){float torso=smoothstep(.30,.55,a.y);a.y+=breath*.014*torso*amp;a.x+=sin(t*.75+p)*.018*smoothstep(.65,.9,a.y)*amp;}
 // Personas: cambio de peso y respiración. Los pies quedan anclados.
 if(motion.z>3.5&&motion.z<4.5){float body=smoothstep(.12,1.4,a.y);a.x+=wave*.024*body*amp;a.z+=breath*.012*body*amp;a.y+=breath*.008*body*amp;}
 // Reja: solo hojas centrales, con los pilares fijos.
 if(motion.z>4.5&&motion.z<5.5&&abs(leafSide)>.5){float side=leafSide,angle=-side*gateOpen*1.45,pivot=side*1.7;vec2 q=vec2(a.x-pivot,a.z);a.x=pivot+cos(angle)*q.x+sin(angle)*q.y;a.z=-sin(angle)*q.x+cos(angle)*q.y;localNormal=vec3(cos(angle)*normal.x+sin(angle)*normal.z,normal.y,-sin(angle)*normal.x+cos(angle)*normal.z);}
 // Monumento: remate sensible al viento, base y columna inmóviles.
 if(motion.z>5.5&&motion.z<6.5&&a.y>6.){a.z+=wave*.028*(a.y-6.)*amp;}
 // Flores y elementos pequeños: tallos/bordes flexibles, apoyo fijo.
 if(motion.z>6.5&&motion.z<7.5){float tip=smoothstep(.1,.7,a.y);a.x+=gust*.016*tip*amp;}
 a*=model.z;vec3 world=vec3(model.x*a.x+model.y*a.z,a.y,-model.y*a.x+model.x*a.z)+origin;
 world.xz+=wallOut*a.y*.045;worldPosition=world;worldNormal=vec3(model.x*localNormal.x+model.y*localNormal.z,localNormal.y,-model.y*localNormal.x+model.x*localNormal.z);
 vec3 q=world-camera;float x=q.x*rotation.x+q.z*rotation.y,z=q.x*rotation.y-q.z*rotation.x;float y=q.y*rotation.z-z*rotation.w;z=q.y*rotation.w+z*rotation.z;float xx=x*cos(roll)+y*sin(roll),yy=-x*sin(roll)+y*cos(roll);gl_Position=vec4(xx*lens.x,yy*lens.y+.02*z,lens.z*z+lens.w,z);tint=color;uv=texcoord;paper=printed;depth=z;}`));
 gl.attachShader(p,shader(gl.FRAGMENT_SHADER,`precision highp float;uniform sampler2D atlas;uniform vec4 reveal;uniform float voidAmount;uniform vec3 camera;varying vec3 tint;varying vec3 worldPosition;varying vec3 worldNormal;varying vec2 uv;varying float paper;varying float depth;
 void main(){vec3 albedo=tint;if(paper>.5)albedo*=texture2D(atlas,uv).rgb;
 // Luz ambiente neutra compartida: los objetos no se encienden con un farol.
 vec3 n=normalize(worldNormal);float shape=.62+.30*abs(dot(n,normalize(vec3(-.45,.75,.48))));
 if(paper<.5){albedo=max(albedo,vec3(.16,.17,.19));albedo=mix(albedo,sqrt(albedo),.35);}
 vec3 lit=albedo*shape*.85;
 // Un contorno suave conserva la lectura del volumen sin volverlo emisivo.
 vec3 V=normalize(camera-worldPosition);float rim=pow(1.-abs(dot(n,V)),3.);lit+=albedo*rim*.07;
 lit*=reveal.x*(1.-voidAmount);lit=mix(lit,vec3(.018,.018,.025)*(1.-voidAmount),smoothstep(35.,70.,depth));gl_FragColor=vec4(lit,1.);}
`));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 this.objectBuffer=gl.createBuffer();this.models=new Map((window.ENOJO_MODELOS||[]).map(m=>[m.id,m]));this.objectTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.objectTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([200,200,200,255]));for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 this.assetsReady=Promise.all([this.loadGeometry(),new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,this.objectTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);resolve()};im.onerror=()=>reject(Error('No se pudo cargar el atlas de objetos'));im.src=window.ME_TEXTURE_DATA})]).then(()=>{this.objectsReady=true});
 }
 async loadGeometry(){let data;if(window.DecompressionStream&&window.ENOJO_GEOMETRIA_GZ){const raw=atob(window.ENOJO_GEOMETRIA_GZ),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);data=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()}else{const res=await fetch('assets/objetos-geometria.bin');if(!res.ok)throw Error('Geometría no disponible');data=await res.arrayBuffer()}
 const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.objectBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);this.geometryBytes=data.byteLength;
 }
 setObjectScene(objects){this.objects=objects;this.resetObjectScene()}
 resetObjectScene(){this.finalObject=null;this.finalAt=null}
 draw(cam){super.draw(cam);this.drawObjects(cam)}
 drawObjects(cam){if(!this.objectsReady||!this.objects)return;const gl=this.gl,p=this.objectProgram;
 if(cam.finalCue&&this.finalAt===null&&cam.running){this.finalAt=cam.time;const sorted=this.objects.filter(o=>o.wall).slice().sort((a,b)=>{const score=o=>{const dx=o.position[0]-cam.x,dz=o.position[2]-cam.z;return Math.hypot(dx,dz)+(dx*cam.sin-dz*cam.cos<0?15:0)};return score(a)-score(b)});if(sorted.length)this.finalObject=window.EnojoObjectScene.placement(sorted[0].anchor,'13-carteles-busqueda')}
 const final=this.finalAt!==null,items=final?[...this.objects.filter(o=>!o.wall||!this.finalObject||Math.hypot(o.position[0]-this.finalObject.position[0],o.position[2]-this.finalObject.position[2])>3.2),this.finalObject]:this.objects.slice();if(cam.gate)items.push(cam.gate);gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,this.objectBuffer);
 const attributes=[['position',3,gl.FLOAT,false,0],['normal',3,gl.BYTE,true,12],['color',3,gl.UNSIGNED_BYTE,true,15],['texcoord',2,gl.UNSIGNED_SHORT,true,18],['printed',1,gl.UNSIGNED_BYTE,true,22],['leafSide',1,gl.BYTE,true,23]];
 for(const[name,size,type,normalized,offset]of attributes){const l=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,type,normalized,24,offset)}
 const set=(name,...values)=>gl['uniform'+values.length+'f'](gl.getUniformLocation(p,name),...values);
 const f=Math.max(Math.min(this.width,this.height)*1.03,this.height*.74),near=.15,far=220;set('camera',cam.x,cam.eye,cam.z);set('rotation',cam.cos,cam.sin,cam.cp,cam.sp);set('lens',2*f/this.width,2*f/this.height,(far+near)/(far-near),-2*far*near/(far-near));set('roll',cam.roll||0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.objectTexture);gl.uniform1i(gl.getUniformLocation(p,'atlas'),0);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);
 let visible=0;for(const item of items){if(!item)continue;const m=this.models.get(item.id);if(!m)continue;const isGate=item===cam.gate,dx=item.position[0]-cam.x,dz=item.position[2]-cam.z;if(!isGate&&(Math.hypot(dx,dz)>45||dx*cam.sin-dz*cam.cos< -8))continue;
 const amount=1;if(isGate){gl.clear(gl.DEPTH_BUFFER_BIT);const distance=Math.max(5.5,f*5.352/(this.width*.92),f*4.8/(this.height*.90)),sy=2*f/this.height;set('camera',0,2.4+distance*.02/sy,distance+(-1-distance)*(cam.gateZoom||0));set('rotation',1,0,1,0);set('roll',0);}set('voidAmount',isGate?(cam.gateFade||0):(cam.voidAmount||0));set('gateOpen',isGate?(cam.gateOpen||0):0);
 set('origin',...(isGate?[0,0,0]:item.position));set('model',isGate?1:Math.cos(item.yaw),isGate?0:Math.sin(item.yaw),item.scale,0);set('motion',cam.time||0,item.phase,item.kind,cam.reducedMotion?.15:1);set('wallOut',...(item.wall?item.out:[0,0]));set('reveal',isGate?(cam.gateReveal??1):1,0,0,0);gl.drawArrays(gl.TRIANGLES,m.offset/24,m.count);if(amount>.1)visible++;
 }for(const[name]of attributes)gl.disableVertexAttribArray(gl.getAttribLocation(p,name));this.canvas.dataset.objectsVisible=String(visible);this.canvas.dataset.finalAsset=cam.gate?'05-porton-cementerio':final?'13-carteles-busqueda':'';this.canvas.dataset.gateOpen=String(cam.gateOpen||0);this.canvas.dataset.gateVisible=String(!!cam.gate);this.canvas.dataset.sceneDarkness=String(cam.voidAmount||0);
 }
 }
 window.EnojoRenderer=ObjectRenderer;
})();
