const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Inertial planar chassis with independent damped spring contacts at each wheel.
export function stepCar(car,input,dt,blocked,height=()=>0){
 // Saved chapters and scripted parking may set linear velocity before the first tick.
 // Initialize angular velocity independently; undefined += steering poisons every coordinate.
 if(![car.x,car.z,car.yaw,car.speed].every(Number.isFinite)){
  const pose=car.safePose||{};car.x=Number.isFinite(pose.x)?pose.x:0;car.z=Number.isFinite(pose.z)?pose.z:0;car.yaw=Number.isFinite(pose.yaw)?pose.yaw:0;car.speed=0;car.vx=car.vz=car.yawRate=0;car.verticalSpeed=0;car.chassisY=height(car.x,car.z);car.pitch=car.roll=0;delete car.contacts;
 }
 if(!Number.isFinite(car.yawRate))car.yawRate=0;
 if(!Number.isFinite(car.vz))car.vx=undefined;
 dt=Number.isFinite(dt)?Math.max(0,dt):0;
 car.safePose={x:car.x,z:car.z,yaw:car.yaw};
 const scooter=car.kind==='scooter',halfW=car.halfWidth||1.08,halfL=car.wheelHalfLength||car.halfLength||1.65;
 if(!Number.isFinite(car.vx)||Math.abs((car.lastSpeed??car.speed)-car.speed)>1||car.lastX!==undefined&&Math.hypot(car.x-car.lastX,car.z-car.lastZ)>6){car.vx=Math.sin(car.yaw)*car.speed;car.vz=Math.cos(car.yaw)*car.speed;car.yawRate=0;}
 car.contacts??=Array.from({length:scooter?2:4},()=>({compression:0,velocity:0}));car.chassisY??=height(car.x,car.z);car.verticalSpeed??=0;car.pitch??=0;car.roll??=0;car.impact=0;
 let remaining=Math.min(dt,.1),clear=true;
 while(remaining>1e-6){const h=Math.min(remaining,1/120);remaining-=h;const throttle=(input.forward?1:0)-(input.reverse?1:0),steer=clamp(input.steer??((input.left?1:0)-(input.right?1:0)),-1,1);
  car.steer=(car.steer||0)+(steer-(car.steer||0))*(1-Math.exp(-h*9));
  const sin=Math.sin(car.yaw),cos=Math.cos(car.yaw);let forward=car.vx*sin+car.vz*cos,lateral=car.vx*cos-car.vz*sin;
  const drift=input.brake&&Math.abs(forward)>3&&!!throttle;
  forward+=throttle*h*(forward*throttle<0?18:9)*(car.engineMultiplier||1)*(.3+.7*(car.condition??100)/100);forward*=Math.exp(-h*(input.brake?(drift?.65:7):throttle?.02:1.1));forward=clamp(forward,-8,(car.maxSpeed||115/3.6)*(.35+.65*(car.condition??100)/100));
  lateral*=Math.exp(-h*(drift?(scooter?2.1:.8):(scooter?10:7)));
  const desiredYawRate=car.steer*forward*(scooter?.22:.14)/(1+Math.abs(forward)*.018);
  car.yawRate+=(desiredYawRate-car.yawRate)*(1-Math.exp(-h*(drift?5:10)));const yaw=car.yaw+car.yawRate*h;
  car.vx=sin*forward+cos*lateral;car.vz=cos*forward-sin*lateral;
  const x=car.x+car.vx*h,z=car.z+car.vz*h;
  if(blocked(x,z,yaw)){car.impact=Math.max(car.impact,Math.hypot(car.vx,car.vz));car.condition=Math.max(0,(car.condition??100)-Math.max(0,car.impact-7)*2.2);car.vx=car.vz=0;car.speed=0;car.yawRate=0;clear=false;break;}
  car.x=x;car.z=z;car.yaw=yaw;car.speed=forward;car.slip=Math.abs(lateral);car.drifting=drift&&car.slip>.8;
  const samples=[];for(let i=0;i<car.contacts.length;i++){const sx=scooter?0:(i<2?-halfW:halfW),sz=i%2?halfL:-halfL;const ground=height(x+sx*Math.cos(yaw)+sz*Math.sin(yaw),z-sx*Math.sin(yaw)+sz*Math.cos(yaw));samples.push(ground);const spring=car.contacts[i],desired=clamp(ground-car.chassisY,-.18,.25);spring.velocity+=((desired-spring.compression)*100-spring.velocity*14)*h;spring.compression+=spring.velocity*h;}
  const floor=samples.reduce((a,b)=>a+b,0)/samples.length;const support=samples.reduce((sum,ground)=>sum+(ground+.18>car.chassisY?Math.max(0,(ground+.18-car.chassisY)*100-car.verticalSpeed*10):0),0)/samples.length;car.verticalSpeed+=(support-18)*h;car.chassisY+=car.verticalSpeed*h;car.airborne=support===0;if(car.chassisY<floor-.16){car.chassisY=floor-.16;car.verticalSpeed=Math.max(0,car.verticalSpeed)*.1;}
  const front=scooter?samples[1]:(samples[1]+samples[3])/2,rear=scooter?samples[0]:(samples[0]+samples[2])/2;const pitchTarget=clamp((rear-front)/(halfL*2)-throttle*.025,-.2,.2);
  const groundRoll=scooter?0:((samples[0]+samples[1])-(samples[2]+samples[3]))/(halfW*4);
  car.pitch+=(pitchTarget-car.pitch)*(1-Math.exp(-h*7));const rollTarget=clamp(groundRoll+(scooter?-1:1)*car.yawRate*forward*(scooter?.018:.007),-.32,.32);car.roll+=(rollTarget-car.roll)*(1-Math.exp(-h*6));
 }
 if(Math.hypot(car.vx,car.vz)<.04){car.speed=0;car.vx=car.vz=0;}car.lastSpeed=car.speed;car.lastX=car.x;car.lastZ=car.z;car.safePose={x:car.x,z:car.z,yaw:car.yaw};return clear;
}
export function driveAI(car,target,dt,blocked,height=()=>0){
 const dx=target.x-car.x,dz=target.z-car.z,distance=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),error=Math.atan2(Math.sin(angle-car.yaw),Math.cos(angle-car.yaw));
 let steer=clamp(error*2.2,-1,1),wanted=Math.min(target.speed??19,Math.max(0,(distance-(target.gap??3))*1.5),(Math.abs(error)<.2?(target.speed??19):18/(1+Math.abs(error)*3)));
 const ahead=2+Math.abs(car.speed)*.5,obstruction=blocked(car.x+Math.sin(car.yaw)*ahead,car.z+Math.cos(car.yaw)*ahead,car.yaw);
 if(obstruction){wanted=Math.min(wanted,3);const options=[-.9,-.5,.5,.9].filter(a=>!blocked(car.x+Math.sin(car.yaw+a)*4,car.z+Math.cos(car.yaw+a)*4,car.yaw+a));if(options.length)steer=clamp(options.sort((a,b)=>Math.abs(error-a)-Math.abs(error-b))[0]*2,-1,1);}
 const previous=car.aiProgress??{x:car.x,z:car.z,time:0};previous.time+=dt;if(previous.time>=.75){const moved=Math.hypot(car.x-previous.x,car.z-previous.z);car.stuck=distance>4&&wanted>0&&moved<.35?(car.stuck||0)+previous.time:0;previous.x=car.x;previous.z=car.z;previous.time=0;}car.aiProgress=previous;
 if(car.stuck>1.4&&!car.aiReverse){car.aiReverse=1.1;car.aiRecoverySide=-(car.aiRecoverySide||1);car.stuck=0;}
 const reverse=car.aiReverse>0&&!blocked(car.x-Math.sin(car.yaw)*2,car.z-Math.cos(car.yaw)*2,car.yaw);if(car.aiReverse>0)car.aiReverse=Math.max(0,car.aiReverse-dt);
 stepCar(car,{steer:reverse?car.aiRecoverySide:steer,forward:!reverse&&car.speed<wanted-.25,reverse:reverse&&car.speed>-3,brake:!reverse&&(car.speed>wanted+.5||wanted===0)},dt,blocked,height);
}

// Clearance-aware navigation grid over solid scenery. Vehicles remain dynamic obstacles.
export function createVehicleNavigator({obstacles,bounds=1900,cell=8}){
 let buckets=null;const cache=new Map(),bucketSize=48;let searches=0;
 function invalidate(){buckets=null;cache.clear();}
 function index(){if(buckets)return;buckets=new Map();for(const o of obstacles){if(o.h<=.2||o.y+o.h/2<=.25||o.y-o.h/2>=3.3)continue;for(let x=Math.floor((o.x-o.w/2)/bucketSize);x<=Math.floor((o.x+o.w/2)/bucketSize);x++)for(let z=Math.floor((o.z-o.d/2)/bucketSize);z<=Math.floor((o.z+o.d/2)/bucketSize);z++){const k=x+','+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(o);}}}
 const radius=car=>car.kind==='scooter'?1.5:4.3;
 function free(x,z,car){index();const r=radius(car);if(Math.abs(x)>bounds-r||Math.abs(z)>bounds-r)return false;for(let bx=Math.floor((x-r)/bucketSize);bx<=Math.floor((x+r)/bucketSize);bx++)for(let bz=Math.floor((z-r)/bucketSize);bz<=Math.floor((z+r)/bucketSize);bz++)for(const o of buckets.get(bx+','+bz)||[]){if(o.y-o.h/2>=(car.kind==='scooter'?2.9:3.3))continue;if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return false;}return true;}
 function clear(a,b,car){const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(distance/3));for(let i=0;i<=steps;i++)if(!free(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,car))return false;return true;}
 function open(x,z,car){const key=radius(car)+':'+x+','+z;if(!cache.has(key))cache.set(key,free(x*cell,z*cell,car));return cache.get(key);}
 function nearest(p,car){const x=Math.round(p.x/cell),z=Math.round(p.z/cell);for(let ring=0;ring<=6;ring++){let best=null,distance=Infinity;for(let dx=-ring;dx<=ring;dx++)for(let dz=-ring;dz<=ring;dz++){if(Math.max(Math.abs(dx),Math.abs(dz))!==ring||!open(x+dx,z+dz,car))continue;const candidate={x:(x+dx)*cell,z:(z+dz)*cell};const d=Math.hypot(candidate.x-p.x,candidate.z-p.z);if(d<distance&&(!free(p.x,p.z,car)||clear(p,candidate,car))){best={x:x+dx,z:z+dz};distance=d;}}if(best)return best;}return null;}
 function plan(car,target){if(clear(car,target,car))return[{x:target.x,z:target.z}];const start=nearest(car,car),end=nearest(target,car);if(!start||!end)return[];searches++;
  const heap=[],records=new Map(),closed=new Set(),key=(x,z)=>x+','+z,estimate=(x,z)=>Math.hypot(x-end.x,z-end.z);
  const push=n=>{heap.push(n);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
  const initial={...start,g:0,f:estimate(start.x,start.z)*1.35,parent:null};push(initial);records.set(key(start.x,start.z),initial);let found=null;
  for(let visits=0;heap.length&&visits<12000;visits++){const n=pop(),k=key(n.x,n.z);if(closed.has(k))continue;closed.add(k);if(n.x===end.x&&n.z===end.z){found=n;break;}
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,k=key(x,z);if(closed.has(k)||!open(x,z,car)||dx&&dz&&(!open(n.x+dx,n.z,car)||!open(n.x,n.z+dz,car)))continue;if(!clear({x:n.x*cell,z:n.z*cell},{x:x*cell,z:z*cell},car))continue;const g=n.g+Math.hypot(dx,dz);if(records.has(k)&&records.get(k).g<=g)continue;const next={x,z,g,f:g+estimate(x,z)*1.35,parent:n};records.set(k,next);push(next);}
  }
  if(!found)return[];const raw=[];for(let n=found;n;n=n.parent)raw.push({x:n.x*cell,z:n.z*cell});raw.reverse();const result=[];let anchor={x:car.x,z:car.z},i=0;while(i<raw.length){let furthest=i;for(let j=i+1;j<Math.min(raw.length,i+24);j++){if(!clear(anchor,raw[j],car))break;furthest=j;}result.push(raw[furthest]);anchor=raw[furthest];i=furthest+1;}if(clear(anchor,target,car))result.push({x:target.x,z:target.z});return result;
 }
 function follow(car,target,dt){const nav=car.aiNavigation??={path:[],index:0,timer:0,goal:null};nav.timer=Math.max(0,nav.timer-dt);const moved=!nav.goal||Math.hypot(nav.goal.x-target.x,nav.goal.z-target.z)>16;
  if(nav.timer===0&&(moved||!nav.path.length||nav.index>=nav.path.length||car.stuck>1)){nav.path=plan(car,target);nav.index=0;nav.goal={x:target.x,z:target.z};nav.timer=1.25;}
  while(nav.index<nav.path.length-1&&Math.hypot(car.x-nav.path[nav.index].x,car.z-nav.path[nav.index].z)<5)nav.index++;
  if(clear(car,target,car)){nav.path=[{x:target.x,z:target.z}];nav.index=0;nav.goal={x:target.x,z:target.z};return{...target};}
  const point=nav.path[nav.index];return point?{...point,speed:target.speed,gap:nav.index<nav.path.length-1?0:target.gap}:{x:car.x,z:car.z,speed:0,gap:1};
 }
 return{plan,follow,clear,free,invalidate,get searches(){return searches;}};
}
