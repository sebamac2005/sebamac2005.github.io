// Gunfire broadcasts only on shots. Civilians do no per-frame threat searches.
export function createCivilianEvents(pedestrians){
 let clock=0,lastShot=-Infinity,buckets=new Map(),rebuildAt=0;
 function tick(dt){clock+=dt;if(clock<rebuildAt)return;rebuildAt=clock+.25;buckets=new Map();for(const ped of pedestrians){if(ped.prologue||ped.health<=0||!ped.route)continue;const p=ped.ch.root.position,key=Math.floor(p.x/32)+','+Math.floor(p.z/32);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(ped);}}
 function gunshot(origin,radius=70){
  // Automatic fire refreshes fear at most four times a second.
  if(clock-lastShot<.25)return;lastShot=clock;
  for(let x=Math.floor((origin.x-radius)/32);x<=Math.floor((origin.x+radius)/32);x++)for(let z=Math.floor((origin.z-radius)/32);z<=Math.floor((origin.z+radius)/32);z++)for(const ped of buckets.get(x+','+z)||[]){
   const p=ped.ch.root.position,dx=p.x-origin.x,dz=p.z-origin.z;if(dx*dx+dz*dz>radius*radius)continue;
   const a=ped.route.points[0],b=ped.route.points.at(-1),projection=dx*(b.x-a.x)+dz*(b.z-a.z);
   ped.walkDirection=projection>=0?1:-1;ped.panic=7+Math.random()*3;ped.wait=0;ped.reaction=.08+Math.random()*.25;ped.fleeSpeed=4.2+Math.random()*.8;
  }
 }
 return{tick,gunshot};
}
