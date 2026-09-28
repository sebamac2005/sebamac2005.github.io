export function createTraffic(T,{network,cars,makeCar,blocked,height,locations,register}){
 const pool=[],claims=new Map(),palette=['#527984','#b8b1a1','#76494a','#47576d','#cfb67a','#526857','#e0ddd2','#45474d'];let clock=0,spawnCursor=0;
 for(let i=0;i<8;i++){const car=makeCar(0,0,palette[i%palette.length]);car.root.visible=false;car.traffic={path:[],index:0,edge:null,stolen:false,stalled:0};register(car);pool.push(car);}
 const nearMission=(p)=>Object.entries(locations).some(([key,l])=>key!=='kopernik'&&Math.hypot(p.x-l.x,p.z-l.z)<48);
 function spawn(car,observer){
  const choices=network.edges.filter(e=>e.length>30&&Math.hypot((e.from.x+e.to.x)/2-observer.x,(e.from.z+e.to.z)/2-observer.z)<280);
  for(let i=0;i<80&&choices.length;i++){
   const edge=choices[(spawnCursor++*17+i)%choices.length],p=network.lane(edge,.18+Math.random()*.64),yaw=Math.atan2(edge.dx,edge.dz),distance=Math.hypot(p.x-observer.x,p.z-observer.z);
   if(distance<65||distance>260||nearMission(p)||cars.some(c=>c!==car&&c.root.visible&&Math.hypot(c.x-p.x,c.z-p.z)<18)||blocked(p.x,p.z,yaw,car))continue;
   car.x=p.x;car.z=p.z;car.yaw=yaw;car.speed=0;car.vx=car.vz=car.yawRate=0;car.condition=100;car.root.visible=true;car.root.position.set(p.x,height(p.x,p.z),p.z);car.root.rotation.set(0,yaw,0);
   car.traffic={path:[{...network.trimmed(edge,true),junction:edge.to}],index:0,edge,stolen:false,stalled:0};return true;
  }return false;
 }
 function extend(car){const state=car.traffic,incoming=state.edge,outgoing=network.next(incoming);if(!outgoing)return false;state.incoming=incoming;state.path=[...network.turn(incoming,outgoing),{...network.trimmed(outgoing,true),junction:outgoing.to}];state.index=0;state.edge=outgoing;return true;}
 function update(dt,observer,active,driving){
  if(!active)return;clock+=dt;let spawnBudget=2;
  for(const [id,car]of claims)if(!car.root.visible||car.traffic.stolen||Math.hypot(car.x-network.nodes[id].x,car.z-network.nodes[id].z)>24)claims.delete(id);
  for(const car of pool){
   if(!cars.includes(car)){car.root.visible=false;continue;}
   const state=car.traffic;if(car===driving){state.stolen=true;continue;}if(state.stolen)continue;
   const distance=Math.hypot(car.x-observer.x,car.z-observer.z);if(car.root.visible&&distance>320)car.root.visible=false;
   if(!car.root.visible){if(spawnBudget-->0)spawn(car,observer);continue;}
   if(car.condition<=0){car.speed=0;continue;}
   while(state.index<state.path.length&&Math.hypot(state.path[state.index].x-car.x,state.path[state.index].z-car.z)<.4)state.index++;
   if(state.index>=state.path.length&&!extend(car))continue;
   const goal=state.path[state.index],dx=goal.x-car.x,dz=goal.z-car.z,length=Math.hypot(dx,dz),ux=dx/Math.max(.001,length),uz=dz/Math.max(.001,length),turning=state.index<state.path.length-1;
   let wanted=turning?4.5:Math.min(14,8+state.edge.width*.17);
   const node=goal.junction;
   if(node&&node.edges.length>=3&&Math.hypot(car.x-node.x,car.z-node.z)<20){
    const approaching=node===state.edge.to?state.edge:state.incoming||state.edge,horizontal=Math.abs(approaching.dx)>Math.abs(approaching.dz),green=Math.floor(clock/8)%2===(horizontal?0:1),owner=claims.get(node.id);
    if(owner&&owner!==car||!green&&!owner)wanted=0;else claims.set(node.id,car);
   }
   for(const other of cars){if(other===car||!other.root.visible||!other.root.parent)continue;const ox=other.x-car.x,oz=other.z-car.z,front=ox*ux+oz*uz,side=Math.abs(ox*uz-oz*ux);if(front>0&&front<10+car.speed*.8&&side<3.7)wanted=Math.min(wanted,Math.max(0,(front-9)*.8));}
   car.speed=T.MathUtils.damp(car.speed,wanted,wanted<car.speed?7:1.2,dt);if(car.speed<.08)car.speed=0;
   const move=Math.min(length,car.speed*dt),x=car.x+ux*move,z=car.z+uz*move,yaw=Math.atan2(ux,uz);
   if(move>0&&!blocked(x,z,yaw,car)){car.x=x;car.z=z;car.yaw+=Math.atan2(Math.sin(yaw-car.yaw),Math.cos(yaw-car.yaw))*(1-Math.exp(-dt*12));state.stalled=0;}else{if(wanted>1)state.stalled+=dt;car.speed=0;}
   // Recover only after leaving the player's close view; never warp a car beside them.
   if(state.stalled>12&&distance>180){car.root.visible=false;continue;}
   car.vx=Math.sin(car.yaw)*car.speed;car.vz=Math.cos(car.yaw)*car.speed;car.yawRate=0;
   const shadow=distance<50;if(state.shadow!==shadow){state.shadow=shadow;car.root.traverse(m=>{if(m.isMesh)m.castShadow=shadow;});}
   car.root.position.set(car.x,height(car.x,car.z),car.z);car.root.rotation.set(0,car.yaw,0);
   for(const w of car.wheels){w.wheel.rotation.x+=car.speed*dt/.63;if(w.front)w.pivot.rotation.y=T.MathUtils.damp(w.pivot.rotation.y,Math.atan2(Math.sin(yaw-car.yaw),Math.cos(yaw-car.yaw)),9,dt);}
  }
 }
 return{update,pool,claims};
}
