// Fixed bone lengths prevent stretching; pose braces control joint stiffness.
const bonePairs=new Set(['0:1','1:2','1:3','3:4','4:5','0:6','6:7','1:8','8:9','9:10','0:11','11:12','3:8','0:3','0:8']);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
export function createRagdoll(points,links,impulse,stiffness=.36){
 const rigidity=Math.max(0,Math.min(1,stiffness)),connected=new Set(links.map(([a,b])=>[Math.min(a,b),Math.max(a,b)].join(':'))),braces=[];
 // Cross-body distances hold the death pose together, with only a little give.
 for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++)if(!connected.has(a+':'+b))braces.push({a,b,length:distance(points[a],points[b])});
 return{rigidity,accumulator:0,age:0,sleepTime:0,sleeping:false,particles:points.map((p,i)=>({p:[...p],v:impulse.map(v=>Math.max(-18,Math.min(18,v*(i===2?1.12:1)))),radius:i===0?.25:i===1?.3:i===2?.24:.14})),braces,links:links.map(([a,b])=>({a,b,length:distance(points[a],points[b]),pose:!bonePairs.has([Math.min(a,b),Math.max(a,b)].join(':'))}))};
}
function solveDistance(body,link,stiffness){
 const a=body.particles[link.a].p,b=body.particles[link.b].p,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);if(len<1e-7)return;
 const correction=(len-link.length)/len*.5*stiffness;a[0]+=dx*correction;b[0]-=dx*correction;a[1]+=dy*correction;b[1]-=dy*correction;a[2]+=dz*correction;b[2]-=dz*correction;
}
export function stepRagdoll(body,dt,height,obstacles){
 if(body.sleeping)return;
 const poseStrength=Math.pow(body.rigidity,8)*.15;
 body.accumulator+=Math.min(dt,.2);const h=1/90;
 while(body.accumulator>=h){body.accumulator-=h;body.age=(body.age||0)+h;const before=body.particles.map(o=>[...o.p]);let energyBudget=0;
  for(const o of body.particles){o.v[1]-=18*h;energyBudget+=o.v.reduce((sum,v)=>sum+v*v,0);for(let k=0;k<3;k++)o.p[k]+=o.v[k]*h;}
  for(let iteration=0;iteration<16;iteration++){
   // A progressive response compensates for repeated solver iterations.

   for(const l of body.links)solveDistance(body,l,l.pose?poseStrength*(l.a===2||l.b===2?.02:1):1);
   for(const l of body.braces)solveDistance(body,l,poseStrength*(l.a===2||l.b===2?.02:1));
   // Body parts that do not share a joint must not occupy the same space.
   for(let a=0;a<body.particles.length;a++)for(let b=a+1;b<body.particles.length;b++){
    if(bonePairs.has(a+':'+b))continue;
    const pa=body.particles[a],pb=body.particles[b],dx=pb.p[0]-pa.p[0],dy=pb.p[1]-pa.p[1],dz=pb.p[2]-pa.p[2],len=Math.hypot(dx,dy,dz),minimum=(pa.radius+pb.radius)*.95;
    if(len<minimum&&len>1e-6){const push=(minimum-len)/len*.5;pa.p[0]-=dx*push;pb.p[0]+=dx*push;pa.p[1]-=dy*push;pb.p[1]+=dy*push;pa.p[2]-=dz*push;pb.p[2]+=dz*push;}
   }
   for(const o of body.particles){const p=o.p;p[1]=Math.max(p[1],height(p[0],p[2])+o.radius);
    for(const wall of obstacles){if(p[1]-o.radius>wall.y+wall.h/2||p[1]+o.radius<wall.y-wall.h/2)continue;const dx=p[0]-wall.x,dy=p[1]-wall.y,dz=p[2]-wall.z,px=wall.w/2+o.radius-Math.abs(dx),py=wall.h/2+o.radius-Math.abs(dy),pz=wall.d/2+o.radius-Math.abs(dz);if(px>0&&py>0&&pz>0){if(py<px&&py<pz)p[1]+=Math.sign(dy||1)*py;else if(px<pz)p[0]+=Math.sign(dx||1)*px;else p[2]+=Math.sign(dz||1)*pz;}}
   }
  }
  let solvedEnergy=0,contacts=0;
  body.particles.forEach((o,i)=>{for(let k=0;k<3;k++)o.v[k]=(o.p[k]-before[i][k])/h;const ground=o.p[1]<=height(o.p[0],o.p[2])+o.radius+.015;if(ground){contacts++;o.v[1]=Math.min(0,o.v[1]);o.v[0]*=.65;o.v[2]*=.65;}solvedEnergy+=o.v.reduce((s,v)=>s+v*v,0);});
  // Constraint and collision corrections must never create kinetic energy.
  const energyScale=solvedEnergy>energyBudget?Math.sqrt(energyBudget/solvedEnergy):1;
  const mean=[0,0,0];for(const o of body.particles)for(let k=0;k<3;k++){o.v[k]*=energyScale;mean[k]+=o.v[k]/body.particles.length;}
  let remaining=0;
  body.particles.forEach((o,i)=>{for(let k=0;k<3;k++){o.v[k]=(mean[k]+(o.v[k]-mean[k])*Math.exp(-body.rigidity*(i===2?3:10)*h))*Math.exp(-(contacts?2.5:.18)*h);remaining+=o.v[k]*o.v[k];}});
  body.sleepTime=contacts&&remaining/body.particles.length<.12?body.sleepTime+h:0;
  if(body.age>3&&body.sleepTime>1.8){body.sleeping=true;for(const o of body.particles)o.v.fill(0);body.accumulator=0;break;}
 }
}
