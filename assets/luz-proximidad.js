/* Encendido y apertura del foco por proximidad. No cambia la geometría del farol. */
(function(){
 'use strict';
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
 function targetAt(distance){return 1-smooth(4.5,14,distance)}
 class Proximity{
  constructor(){this.amounts=new Map();this.flashes=new Map()}
  reset(){this.amounts.clear();this.flashes.clear()}
  update(lights,cam,dt){const states=[];dt=Math.max(0,Math.min(.1,dt));
   for(const light of lights){const d=Math.hypot(light.position[0]-cam.x,light.position[2]-cam.z),previous=this.amounts.get(light)||0,target=d<11?1:d>14?0:previous,amount=dt===0?previous:target>previous?target:previous+(target-previous)*(1-Math.exp(-1.3*dt));this.amounts.set(light,amount);const flash=dt>0&&target>previous&&previous<.1?1:(this.flashes.get(light)||0)*Math.exp(-5*dt);this.flashes.set(light,flash);if(amount<.002)continue;
    const degrees=30+25*amount,outerCos=Math.cos(degrees*Math.PI/180),innerCos=Math.cos((17+15*amount)*Math.PI/180),range=12+7*amount;
    const drop=(light.position[1]-.025)/-light.direction[1];
    states.push({light,d,amount,flash,outerCos,innerCos,range,radius:drop*Math.tan(degrees*Math.PI/180),center:[light.position[0]+light.direction[0]*drop,.025,light.position[2]+light.direction[2]*drop]});
   }return states.sort((a,b)=>b.amount/(1+b.d)-a.amount/(1+a.d)).slice(0,8);
  }
 }
 window.EnojoLight={Proximity,targetAt};
})();
