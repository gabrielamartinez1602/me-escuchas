/* Noticias en la calle: un MP3 por farol, activado por un toque real del usuario. */
(function(){
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const graphic=`<svg viewBox="0 0 200 260" aria-hidden="true"><ellipse class="stain-haze" cx="100" cy="112" rx="59" ry="72"/><path class="stain-core" d="M100 21L112 65 140 38 131 77 173 64 144 98 181 120 139 128 162 166 121 145 110 191 91 150 54 179 65 137 21 145 56 111 25 83 69 88 58 46 88 74Z"/><g class="stain-lines" fill="none"><path d="M100 21L140 38 173 64 181 120 162 166 110 191 54 179 21 145 25 83 58 46 100 21 131 77 56 111 162 166 144 98 54 179 112 65 181 120 69 88 110 191 139 128 58 46 121 145 25 83 140 38 91 150 173 64 65 137 100 21"/><path d="M91 150L109 205 95 230 109 253M121 145L96 203 110 226 99 257M69 88L107 111 144 98M56 111L98 122 139 128M112 65L100 126 110 191"/></g><path class="stain-heart" d="M98 91L115 109 104 137 86 117Z"/></svg>`;
 function project(p,cam,w,h){const dx=p[0]-cam.x,dz=p[2]-cam.z,dy=p[1]-cam.eye,x=dx*cam.cos+dz*cam.sin,z0=dx*cam.sin-dz*cam.cos,y=dy*cam.cp-z0*cam.sp,z=dy*cam.sp+z0*cam.cp;if(z<.35)return null;const f=Math.max(Math.min(w,h)*1.03,h*.74),a=cam.roll||0,xx=x*Math.cos(a)+y*Math.sin(a),yy=-x*Math.sin(a)+y*Math.cos(a);return {x:w/2+xx*f/z,y:h*.49-yy*f/z,size:clamp(f*1.5/z,38,210),depth:z}}
 function clearSight(a,b,cfg){const steps=Math.ceil(Math.hypot(b[0]-a.x,b[2]-a.z));for(let j=1;j<steps;j++){const t=j/steps,x=a.x+(b[0]-a.x)*t,z=a.z+(b[2]-a.z)*t;if(!cfg.callesX.some(v=>Math.abs(x-v)<cfg.anchoMedio+.4)&&!cfg.callesZ.some(v=>Math.abs(z-v)<cfg.anchoMedio+.4))return false}return true}

 function distribute(lights,news,start=[0,0]){
  const distance=l=>Math.abs(l.position[0]-start[0])+Math.abs(l.position[2]-start[1]);
  const sorted=lights.slice().sort((a,b)=>distance(a)-distance(b)||b.position[2]-a.position[2]||a.position[0]-b.position[0]);
  return new Map(sorted.map((light,i)=>[light,news[i%news.length]]));
 }
 class NewsPoints{
  constructor({lights,news,cfg,volume,onActivity,getAudioContext,getAudioDestination}){
   this.cfg=cfg;this.volume=volume;this.onActivity=onActivity;this.near=0;this.wave=new Uint8Array(256);this.envelope=0;this.token=0;this.current=null;this.activeButton=null;this.dismissTimer=null;
   this.assignments=distribute(lights,news,cfg.inicio);this.buttons=new Map();
   this.layer=document.createElement('div');this.layer.id='news-hotspots';document.body.append(this.layer);
   for(const [light,item]of this.assignments){
    const b=document.createElement('button');b.className='news-point';b.type='button';b.hidden=true;
    b.setAttribute('aria-label','Escuchar noticia: '+item.title);b.setAttribute('aria-pressed','false');
    b.innerHTML='<span class="news-point-art">'+graphic+'</span><span class="news-point-label">Escuchar</span>';
    b.addEventListener('click',e=>{e.stopPropagation();this.play(item,b)});
    for(const k of ['pointerdown','pointerup','pointercancel','dblclick'])b.addEventListener(k,e=>e.stopPropagation());
    this.layer.append(b);this.buttons.set(light,b);
   }
   this.playbacks=new Set();this.nextPlayback=0;this.getAudioContext=getAudioContext;this.getAudioDestination=getAudioDestination;this.news=news;this.intensity=0;this.mixIntensity=0;this.finalCut=false;this.buffers=new Map();this.newsBus=null;
   this.visualEnabled=true;this.headlines=new Set();this.headlineSerial=0;this.headlineLayer=document.createElement('div');this.headlineLayer.id='news-headlines';this.headlineLayer.setAttribute('aria-label','Titulares de las noticias');document.body.append(this.headlineLayer);
   this.notice=document.createElement('aside');this.notice.id='news-notice';this.notice.hidden=true;this.notice.setAttribute('aria-label','Controles de noticias');
   this.notice.innerHTML='<span class="news-sr"><span class="news-title"></span><span class="news-status" role="status" aria-live="polite"></span></span><button class="news-retry" type="button" aria-label="Repetir la última noticia">Repetir</button><button class="news-stop" type="button" aria-label="Salir de los titulares">×</button>';
   document.body.append(this.notice);this.title=this.notice.querySelector('.news-title');this.status=this.notice.querySelector('.news-status');this.playButton=this.notice.querySelector('.news-retry');
   this.playButton.onclick=()=>{if(this.current)this.play(this.current,this.activeButton)};
   this.notice.querySelector('.news-stop').onclick=()=>this.dismiss();
   for(const k of ['pointerdown','pointerup','pointermove','dblclick'])this.notice.addEventListener(k,e=>e.stopPropagation());
  }
  removeHeadline(entry){clearTimeout(entry.timer);entry.node.remove();this.headlines.delete(entry)}
  clearHeadlines(){for(const entry of [...this.headlines])this.removeHeadline(entry)}
  showHeadline(record){
   if(record.headlined||this.finalCut)return;record.headlined=true;
   const key=record.item.title.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
   if([...this.headlines].some(entry=>entry.key===key))return;
   if(this.headlines.size>=4)this.removeHeadline(this.headlines.values().next().value);
   const taken=new Set([...this.headlines].map(entry=>entry.slot));let slot=0;while(taken.has(slot))slot++;
   const node=document.createElement('div');node.className='news-headline';node.style.top=(19+slot*15)+'%';node.style.setProperty('--float-x',(++this.headlineSerial%2?12:-12)+'px');
   if(record.item.headlineUrl){const image=document.createElement('img');image.src=record.item.headlineUrl;image.alt=record.item.title;image.draggable=false;node.append(image)}else node.textContent=record.item.title;
   this.headlineLayer.hidden=!this.visualEnabled;this.headlineLayer.append(node);const entry={node,slot,key,timer:null};this.headlines.add(entry);entry.timer=setTimeout(()=>this.removeHeadline(entry),7400);
  }
  dismiss(){this.notice.hidden=true;this.clearHeadlines()}
  setStatus(text){this.status.textContent=text}
  updateMix(){
   const records=[...this.playbacks],foreground=records.at(-1),p=this.intensity||0;
   const level=.70+.25*p,background=.48/Math.sqrt(Math.max(1,records.length-1)),rate=.98+.08*p;
   // La selección más reciente queda al frente; las anteriores siguen completas a menor nivel.
   for(const record of records){
    const target=this.volume()?level*(record===foreground?1:background):0;
    record.mixLevel=target;
    if(record.voiceGain){const param=record.voiceGain.gain,now=this.newsBus.context.currentTime;param.cancelScheduledValues(now);param.setTargetAtTime(target,now,record===foreground?.12:.055)}
    if(record.audio){record.audio.muted=!this.volume();record.audio.volume=target;record.audio.playbackRate=rate}
    if(record.source)record.source.playbackRate.setTargetAtTime(rate,this.newsBus.context.currentTime,.12);
   }
   const playing=records.filter(record=>record.playing);
   this.onActivity?.(playing.length>0);
   for(const b of this.buttons.values()){const active=playing.some(record=>record.button===b);b.classList.toggle('is-playing',active);b.setAttribute('aria-pressed',String(active))}
   if(playing.length){this.setStatus(this.volume()?(playing.length===1?'Escuchando':playing.length+' noticias sonando hasta terminar'):'Audio silenciado en el menú');this.playButton.hidden=false}
  }
  setVolume(enabled){for(const record of this.playbacks)if(record.audio)record.audio.muted=!enabled;this.updateMix()}
  release(record){
   if(!this.playbacks.delete(record))return;
   record.playing=false;if(record.audio){record.audio.removeAttribute('src');record.audio.load();record.audio.remove()}if(record.source){record.source.onended=null;record.source.disconnect()}record.voiceGain?.disconnect();this.updateMix();
  }
  ended(record){
   if(!this.playbacks.has(record))return;
   this.release(record);
   if(!this.playbacks.size){this.setStatus('Fin del reporte');this.playButton.textContent='Repetir';this.playButton.hidden=false;}
  }
  failed(record,error){
   if(!this.playbacks.has(record))return;
   this.release(record);
   if(record.item===this.current){this.setStatus(error?.name==='NotAllowedError'?'Toca Escuchar para iniciar el audio.':'No se pudo reproducir. Toca para reintentar.');this.playButton.textContent='Repetir';this.playButton.hidden=false}
  }
  play(item,button){
   if(this.finalCut)return;
   clearTimeout(this.dismissTimer);this.current=item;this.activeButton=button;this.title.textContent=item.title;this.notice.hidden=false;this.playButton.hidden=false;
   this.setStatus(this.volume()?'Sintonizando…':'Audio silenciado en el menú');
   const audioUrl=item.url+(item.id==='noticia-071'?'?v=amber-completa-2':'');
   const context=this.getAudioContext?.();
   if(context&&window.location?.protocol!=='file:'){
    // Un BufferSource independiente por noticia permite superposición también en Safari móvil.
    const resumed=context.resume();
    if(!this.newsBus){const gain=context.createGain(),limiter=context.createDynamicsCompressor();limiter.threshold.value=-3;limiter.knee.value=5;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.12;gain.connect(limiter).connect(this.getAudioDestination?.()||context.destination);this.newsBus={context,gain,limiter}}
    const voiceGain=context.createGain();voiceGain.gain.value=0;voiceGain.connect(this.newsBus.gain);
    const record={item,button,playing:false,source:null,voiceGain};this.playbacks.add(record);this.updateMix();
    if(!this.buffers.has(item.url)){
     const loaded=fetch(audioUrl).then(response=>{if(!response.ok)throw Error('Audio no disponible');return response.arrayBuffer()}).then(bytes=>context.decodeAudioData(bytes)).catch(error=>{this.buffers.delete(item.url);throw error});
     this.buffers.set(item.url,loaded);
     if(this.buffers.size>12)this.buffers.delete(this.buffers.keys().next().value);
    }
    Promise.all([resumed,this.buffers.get(item.url)]).then(([,buffer])=>{
     if(!this.playbacks.has(record))return;
     const source=context.createBufferSource();record.source=source;source.playbackRate.value=.98+.08*this.intensity;source.buffer=buffer;source.connect(record.voiceGain);source.onended=()=>this.ended(record);source.start();record.playing=true;this.showHeadline(record);this.updateMix();
    }).catch(error=>this.failed(record,error));
    return;
   }
   const audio=document.createElement('audio');audio.className='news-player';audio.id='news-player-'+(++this.nextPlayback);audio.hidden=true;audio.preload='none';audio.setAttribute('playsinline','');audio.setAttribute('webkit-playsinline','');document.body.append(audio);
   const record={audio,item,button,playing:false};this.playbacks.add(record);this.updateMix();
   audio.addEventListener('playing',()=>{if(!this.playbacks.has(record))return;record.playing=true;this.showHeadline(record);this.updateMix()});
   audio.addEventListener('ended',()=>this.ended(record));
   audio.addEventListener('pause',()=>{record.playing=false;this.updateMix()});
   audio.addEventListener('error',()=>this.failed(record,audio.error));
   audio.src=audioUrl;audio.load();
   // Cada toque crea una reproducción independiente. No se pausa ninguna noticia anterior.
   const attempt=audio.play();
   if(attempt?.catch)attempt.catch(error=>{if(error.name!=='AbortError')this.failed(record,error)});
  }
  updateIntensity(progress,clock=0){
   if(this.finalCut)return;this.intensity=Math.max(this.intensity,clamp(progress));
   if(this.intensity-this.mixIntensity>=.008){this.mixIntensity=this.intensity;this.updateMix()}
  }
  cutForFinale(){this.finalCut=true;this.close();this.hide()}
  reset(){this.close();this.finalCut=false;this.intensity=0;this.mixIntensity=0;this.hide()}
  // Cada noticia termina completa; el corte de la reja y el reinicio cancelan todas las voces.
  close(){clearTimeout(this.dismissTimer);this.clearHeadlines();for(const record of [...this.playbacks]){if(record.audio)record.audio.pause();if(record.source){record.source.onended=null;try{record.source.stop()}catch{}}this.release(record)}this.current=null;this.activeButton=null;this.notice.hidden=true;this.onActivity?.(false)}
  hide(){this.layer.hidden=true;this.headlineLayer.hidden=true;this.near=0}
  update(cam,active,sound,enabled){this.visualEnabled=!!enabled&&!(cam.voidAmount>.01);if(!enabled||cam.voidAmount>.01){this.headlineLayer.hidden=true;this.hide();return}this.headlineLayer.hidden=false;this.layer.hidden=false;this.near=0;for(const b of this.buttons.values())b.hidden=true;
   let pulse=0;if(sound.analyser&&sound.context?.state==='running'){sound.analyser.getByteTimeDomainData(this.wave);let sum=0;for(const x of this.wave)sum+=((x-128)/128)**2;const rms=Math.sqrt(sum/this.wave.length);this.envelope=Math.max(rms,this.envelope*.80);pulse=clamp(this.envelope*5,0,1)}
   const w=innerWidth,h=innerHeight;let count=0;for(const s of active||[]){const b=this.buttons.get(s.light);if(!b||s.amount<.1||s.d>14)continue;const near=1-clamp((s.d-2)/10,0,1);this.near=Math.max(this.near,near);const p=[s.center[0],1.65,s.center[2]],q=project(p,cam,w,h);if(!q||q.x< -100||q.x>w+100||q.y< -100||q.y>h+100||!clearSight(cam,p,this.cfg))continue;b.hidden=false;b.style.left=q.x+'px';b.style.top=(q.y+Math.sin((cam.time||0)*1.7)*2)+'px';b.style.width=q.size+'px';b.style.opacity=String(clamp(s.amount*(.65+.35*near),0,1));b.style.zIndex=String(Math.max(1,Math.round(100-q.depth)));b.style.setProperty('--beat',String(1+pulse*(.12+.20*near)));b.style.setProperty('--glow',(7+near*10+pulse*15)+'px');count++}this.layer.dataset.visible=String(count)
  }
 }
 window.EnojoNewsPoints=NewsPoints;window.EnojoNewsMath={project,distribute,clearSight};
})();
