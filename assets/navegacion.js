/* Navegación libre con colisiones y gesto de dirección enclavado. Sin ruta automática. */
(function(){
 'use strict';
 function directionGesture(delta,current,armed){
  if(Math.abs(delta)<4)return {direction:current,armed:true};
  const requested=delta>=10?1:delta<=-10?-1:0;
  if(requested&&(armed||requested!==current))return {direction:requested,armed:false};
  return {direction:current,armed};
 }
 class Walker{
  constructor(options){this.options=options;this.reset()}
  reset(){this.x=this.options.start[0];this.z=this.options.start[1];this.travelled=0;this.exited=false}
  canWalk(x,z){const o=this.options,lane=o.road-o.sidewalk-o.radius;if(x<o.bounds.left||x>o.bounds.right||z<o.bounds.back||z>o.bounds.front)return false;if((o.obstacles||[]).some(b=>x>b.minX-o.radius&&x<b.maxX+o.radius&&z>b.minZ-o.radius&&z<b.maxZ+o.radius))return false;return o.xs.some(v=>Math.abs(x-v)<=lane)||o.zs.some(v=>Math.abs(z-v)<=lane)}
  move(metres,yaw){const count=Math.max(1,Math.ceil(Math.abs(metres)/.09)),step=metres/count,dx=Math.sin(yaw)*step,dz=-Math.cos(yaw)*step;let moved=0;
   for(let i=0;i<count;i++){const oldX=this.x,oldZ=this.z;
    if(this.canWalk(this.x+dx,this.z+dz)){this.x+=dx;this.z+=dz}
    else{if(this.canWalk(this.x+dx,this.z))this.x+=dx;if(this.canWalk(this.x,this.z+dz))this.z+=dz}
    moved+=Math.hypot(this.x-oldX,this.z-oldZ);
    const b=this.options.bounds,margin=6;if(this.x<=b.left+margin||this.x>=b.right-margin||this.z<=b.back+margin||this.z>=b.front-margin){this.exited=true;break}
   }this.travelled+=moved;return moved;
  }
 }
 window.EnojoNavigation={Walker,directionGesture};
})();
