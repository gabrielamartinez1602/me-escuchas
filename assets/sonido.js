/* Fondo original de tensión ascendente. Reja: corte seco de la mezcla y tono sostenido. */
(function(){
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x));
 class Soundtrack{
  constructor(){this.context=null;this.state='intro';this.volume=true;this.sources={};this.progress=0;this.intensity=0;this.boost=0;this.buffers=null;this.loading=null;this.error=null;this.beatRate=1;this.duck=1;this.alarm=null;this.ring=null;this.finalTone=false}
  async unlock(){
   try{
    if(!this.context){
     try{if(window.navigator?.audioSession)window.navigator.audioSession.type='playback'}catch{}
     const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Audio no disponible');const ac=this.context=new AC({latencyHint:'interactive'});
     this.master=ac.createGain();this.master.gain.value=0;
     const limiter=ac.createDynamicsCompressor();limiter.threshold.value=-5;limiter.knee.value=5;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.10;this.master.connect(limiter).connect(ac.destination);
     this.sceneGain=ac.createGain();this.sceneGain.connect(this.master);
     this.newsInput=ac.createGain();this.newsInput.connect(this.master);
     this.heartGain=ac.createGain();this.heartGain.gain.value=0;this.heartGain.connect(this.sceneGain);
     this.analyser=ac.createAnalyser();this.analyser.fftSize=256;this.heartGain.connect(this.analyser);
    }
    const resumed=this.context.resume();
    if(!this.loading)this.loading=(async()=>{let bytes;if(window.ENOJO_AUDIO?.corazon){const raw=atob(window.ENOJO_AUDIO.corazon);bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i)}else{const response=await fetch('assets/audio/corazon.mp3');if(!response.ok)throw Error('No se pudo cargar el corazón');bytes=new Uint8Array(await response.arrayBuffer())}this.buffers={corazon:await this.context.decodeAudioData(bytes.buffer.slice(0))}})();
    await Promise.all([resumed,this.loading]);this.error=null;this.apply(this.state,this.volume);return true;
   }catch(error){this.error=error;this.loading=null;return false}
  }
  ramp(param,value,t,seconds=.05){param.cancelScheduledValues(t);param.setTargetAtTime(value,t,seconds)}
  zero(param,t){param.cancelScheduledValues(t);param.setValueAtTime(0,t)}
  start(name,bus){if(this.sources[name]||!this.buffers)return;const source=this.context.createBufferSource();source.buffer=this.buffers[name];source.loop=true;source.connect(bus);this.sources[name]=source;source.onended=()=>{source.disconnect();if(this.sources[name]===source)delete this.sources[name]};source.start()}
  stop(name){const source=this.sources[name];if(!source)return;delete this.sources[name];try{source.stop()}catch{}source.disconnect()}
  startAlarm(){
   if(this.alarm||!this.context||this.finalTone)return;const ac=this.context;
   const gain=ac.createGain(),filter=ac.createBiquadFilter(),tremolo=ac.createGain();gain.gain.value=0;filter.type='lowpass';filter.Q.value=.8;tremolo.gain.value=.64;tremolo.connect(filter).connect(gain).connect(this.sceneGain);
   const voices=[];for(let i=0;i<6;i++){const osc=ac.createOscillator(),level=ac.createGain();osc.type=i%2?'triangle':'sawtooth';level.gain.value=0;osc.connect(level).connect(tremolo);osc.start();voices.push({osc,level})}
   const lfo=ac.createOscillator(),lfoDepth=ac.createGain();lfoDepth.gain.value=.10;lfo.connect(lfoDepth).connect(tremolo.gain);lfo.start();
   const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*2),ac.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.35;
   const noise=ac.createBufferSource(),noiseFilter=ac.createBiquadFilter(),noiseLevel=ac.createGain();noise.buffer=buffer;noise.loop=true;noiseFilter.type='bandpass';noiseFilter.Q.value=.7;noiseLevel.gain.value=0;noise.connect(noiseFilter).connect(noiseLevel).connect(tremolo);noise.start();
   this.alarm={gain,filter,tremolo,voices,lfo,lfoDepth,noise,noiseFilter,noiseLevel};
  }
  stopAlarm(){if(!this.alarm)return;const a=this.alarm;this.zero(a.gain.gain,this.context.currentTime);for(const node of [a.lfo,a.noise,...a.voices.map(v=>v.osc)]){try{node.stop()}catch{}node.disconnect()}a.gain.disconnect();this.alarm=null}
  finalize(){
   this.finalTone=true;if(!this.context)return;const ac=this.context,t=ac.currentTime;
   // Cero inmediato, sin fundido ni cola: ninguna noticia pendiente puede atravesar el corte.
   this.zero(this.sceneGain.gain,t);this.zero(this.newsInput.gain,t);this.zero(this.heartGain.gain,t);this.stop('corazon');this.stopAlarm();
   if(!this.ring){const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.value=1250;gain.gain.value=0;osc.connect(gain).connect(this.master);osc.start(t);gain.gain.setTargetAtTime(.16,t,.004);this.ring={osc,gain}}
   this.ramp(this.master.gain,this.volume ? .85 : 0,t,.008);
  }
  resetFinal(){if(this.ring){try{this.ring.osc.stop()}catch{}this.ring.osc.disconnect();this.ring.gain.disconnect();this.ring=null}this.finalTone=false;this.progress=0;this.intensity=0;this.boost=0;this.duck=1;if(this.context){const t=this.context.currentTime;this.sceneGain.gain.setValueAtTime(1,t);this.newsInput.gain.setValueAtTime(1,t)}}
  apply(state,volume=true){
   this.state=state;this.volume=volume;if(!this.context){if(state==='intro')this.finalTone=false;return}const t=this.context.currentTime;
   if(state==='intro')this.resetFinal();
   this.ramp(this.master.gain,volume ? .85 : 0,t,.025);
   if(this.finalTone||state==='finished'){this.finalize();return}
   if(state==='running'){this.ramp(this.sceneGain.gain,this.duck,t,.08);this.start('corazon',this.heartGain);this.startAlarm();this.update(this.progress,this.boost)}
   else{this.zero(this.sceneGain.gain,t);this.stop('corazon');this.stopAlarm()}
  }
  setDucking(level=1){this.duck=Math.max(.1,Math.min(1,level));if(this.context&&this.state==='running'&&!this.finalTone)this.ramp(this.sceneGain.gain,this.duck,this.context.currentTime,.08)}
  update(progress,boost=0){
   this.progress=Math.max(this.progress,clamp(progress));this.boost=clamp(boost);this.intensity=Math.max(this.intensity,clamp(this.progress+.10*this.boost));if(!this.context||this.state!=='running'||this.finalTone)return;
   const p=this.intensity,t=this.context.currentTime;this.beatRate=.8+2.4*p;
   if(this.sources.corazon)this.ramp(this.sources.corazon.playbackRate,this.beatRate,t,.12);
   this.ramp(this.heartGain.gain,.26+.94*p**1.4,t,.10);
   if(this.alarm){const a=this.alarm,base=85+115*p+230*p**3,ratios=[1,1.017,2.021,3.057,4.1,1],thresholds=[0,0,.18,.40,.60,.72],levels=[.13,.12,.07,.045,.03,.025];
    a.voices.forEach((v,i)=>{this.ramp(v.osc.frequency,i===5?350+1900*p:base*ratios[i],t,.20);const fade=i<2?1:clamp((p-thresholds[i])/(1-thresholds[i]));this.ramp(v.level.gain,levels[i]*fade,t,.15)});
    this.ramp(a.gain.gain,.08+.70*p**1.5,t,.12);this.ramp(a.filter.frequency,900+3100*p,t,.20);this.ramp(a.lfo.frequency,.6+9*p*p,t,.15);this.ramp(a.lfoDepth.gain,.10+.26*p,t,.12);this.ramp(a.noiseFilter.frequency,300+1800*p,t,.15);this.ramp(a.noiseLevel.gain,.001+.10*p**3,t,.12);
   }
  }
 }
 window.EnojoSoundtrack=Soundtrack;
})();
