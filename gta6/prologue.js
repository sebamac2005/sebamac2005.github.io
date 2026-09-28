import {createEmpireMissions} from './empire-missions.js?v=roof-seat-2';
import {MAP} from './map-layout.js?v=roof-seat-2';
import {createDenialMission} from './denial-mission.js?v=roof-seat-2';
import {createMemoryMission} from './memory-mission.js?v=roof-seat-2';
// Scripted fictional prologue. Interactions are game objectives, not process simulations.
export function createPrologue(T,api){
 const {scene,box,sign,character,makeCar,pedestrians,chars}=api;
 const ui=document.getElementById('mission'),title=document.getElementById('missiontitle'),objective=document.getElementById('missionobjective'),dialog=document.getElementById('missiondialog'),prompt=document.getElementById('missionprompt');
 const lab=MAP.locations.zseh,barn=MAP.locations.barn;const before=new Set(scene.children),persistent=new Set(),temporaryRoads=[];let keep=false,cleaned=false;const originalOutfits=[];
 let stage='intro',task=0,timer=0,started=false,hold=0,health=100,routeIndex=0,finished=false,interactHeld=false,lastFire=0,pursuitStarted=false,arrivalVehicle=null;const traces=[];
 const tasks=[],evacProps=[],police=[],raidVehicles=[],crew=[],smoke=[],lights=[],route=MAP.escape;
 const build=(w,h,d,x,y,z,color,solid=false)=>{const mesh=box(w,h,d,x,y,z,color,solid);if(keep)persistent.add(mesh);return mesh;};
 const road=r=>{api.addRoad?.(r);if(!keep)temporaryRoads.push(r);};
 const label=(text,x,y,z,w=4)=>{const m=sign(text,w,.8);m.position.set(x,y,z);scene.add(m);if(keep)persistent.add(m);return m;};
 // Secluded basement set, with a clear central passage and a rear evacuation exit.
 build(28,.1,34,lab.x,.03,lab.z,'#343c40');
 build(.5,5,34,lab.x-14,2.5,lab.z,'#353d44',true);build(.5,5,34,lab.x+14,2.5,lab.z,'#353d44',true);
 build(28,5,.5,lab.x,2.5,lab.z-17,'#353d44',true);
 for(const side of [-1,1])build(10,5,.5,lab.x+side*9,2.5,lab.z+17,'#353d44',true);
 const roof=build(29,.3,35,lab.x,5.15,lab.z,'#20282e',true);build(8,2,.5,lab.x,4,lab.z+17,'#353d44',true);label('EKONOM / PODZIEMIA',lab.x,3.5,lab.z-16.7,12);
 for(const z of [lab.z-10,lab.z,lab.z+10]){build(8,.08,.3,lab.x,4.65,z,'#e6eddf');const light=new T.PointLight('#a2e5e7',35,20,2);light.position.set(lab.x,3.8,z);scene.add(light);lights.push(light);}
 for(let i=0;i<3;i++){
  const x=lab.x-10,z=lab.z-10+i*6;build(2.1,2.8,1.8,x,1.4,z,'#17252c',true);
  for(let y=.4;y<2.7;y+=.35){build(1.8,.12,.03,x,y,z+.92,'#63767b');build(.08,.08,.04,x+.7,y,z+.95,'#fb754e');}
  label('SERWER '+(i+1),x,3.2,z+1,3);tasks.push({x:x+2.5,z,text:'Przytrzymaj F · schłodź serwer wódką',duration:1.4});
 }
 for(let i=0;i<2;i++){build(3,1.6,3,lab.x+9,.8,lab.z-10+i*6,'#626e76',true);build(2.5,.12,2.5,lab.x+9,1.66,lab.z-10+i*6,'#3697de');}
 label('NIEBIESKI KRYSZTAŁ',lab.x+9,3,lab.z-12,6);
 build(3,.15,1.5,lab.x+9,1,lab.z+1,'#555c61');const monitor=build(2.2,1.2,.1,lab.x+9,1.7,lab.z+1,'#41627a');label('MONITORING',lab.x+9,2.7,lab.z+1.1,4);
 const disks=[];for(let i=0;i<5;i++)disks.push(build(.45,.08,.6,lab.x-9+i*.5,1,lab.z-9,'#697882'));
 const canister=new T.Mesh(new T.BoxGeometry(.22,.4,.22),new T.MeshStandardMaterial({color:'#839d42'}));canister.position.set(.57,1.1,.2);chars[2].body.add(canister);
 const coveringGun=new T.Mesh(new T.BoxGeometry(.12,.15,.7),new T.MeshStandardMaterial({color:'#26313a'}));coveringGun.position.set(.53,1.3,.3);chars[1].body.add(coveringGun);
 const table=build(5,.16,2.5,lab.x+7,1.05,lab.z+5,'#766451',true);
 for(let i=0;i<12;i++)build(.6,.15,.35,lab.x+5.4+(i%4)*.8,1.2+Math.floor(i/4)*.15,lab.z+5,'#a7b395');
 for(let i=0;i<3;i++){
  const cartStart=scene.children.length;const x=lab.x-8+i*7,z=lab.z+11;build(2,.3,1.3,x,.7,z,'#707f87');build(.8,.6,.6,x,.98,z,'#15191e');
  for(const side of [-1,1])build(.2,.35,.2,x+side*.8,.2,z,'#222b30');
  evacProps.push(...scene.children.slice(cartStart));tasks.push({x,z:z-2,text:'Przytrzymaj F · załaduj torby do wózka',duration:1.2});
  const ch=character({shirt:['#8174aa','#769ca8','#bb866a'][i],pants:'#31353d',skin:'#c89d78',hair:'#322b24'});ch.root.position.set(x+1.6,0,z);crew.push(ch);
 }
 const fogMat=new T.MeshBasicMaterial({color:'#8a9a9e',transparent:true,opacity:.13,depthWrite:false});
 for(let i=0;i<18;i++){const puff=new T.Mesh(new T.IcosahedronGeometry(.6,0),fogMat);puff.position.set(lab.x-10+Math.random()*4,1+Math.random()*3,lab.z-13+Math.random()*20);scene.add(puff);smoke.push(puff);}
 // A black van with a higher cargo compartment.
 const van=makeCar(lab.x,lab.z+28,'#1c2228');const cargo=new T.Mesh(new T.BoxGeometry(1.95,1.1,2.5),new T.MeshStandardMaterial({color:'#1c2228'}));cargo.position.set(0,1.55,-.6);van.root.add(cargo);
 for(const side of [-1,1]){const door=new T.Mesh(new T.BoxGeometry(.93,1.1,.08),cargo.material);door.position.set(side*.5,1.55,-1.9);van.root.add(door);}
 label('TYLNE WYJŚCIE / PARKING',lab.x,3,lab.z+16.6,10);
 // The escape uses the permanent city road network; only pursuit props are temporary.
 label('KOŁOBRZEG',lab.x+8,4,lab.z+80,9);
 function policeLivery(car,armored=false){
  car.enterable=false;car.root.visible=false;car.police=true;car.maxSpeed=135/3.6;
  for(const side of [-1,1]){const panel=new T.Mesh(new T.BoxGeometry(.035,.6,1.65),new T.MeshStandardMaterial({color:'#e8eef1'}));panel.position.set(side*1.04,.9,0);car.root.add(panel);const tag=sign('POLICJA',1.5,.34);tag.position.set(side*1.065,.95,0);tag.rotation.y=side*Math.PI/2;car.root.add(tag);}
  const bar=new T.Mesh(new T.BoxGeometry(1.05,.16,.3),new T.MeshStandardMaterial({color:'#20252d'}));bar.position.set(0,armored?2.16:1.84,0);car.root.add(bar);car.beacons=[];
  for(const side of [-1,1]){const beacon=new T.Mesh(new T.BoxGeometry(.42,.18,.26),new T.MeshBasicMaterial({color:side<0?'#397bff':'#ff3040'}));beacon.position.set(side*.29,.12,0);bar.add(beacon);car.beacons.push(beacon);}car.beacon=car.beacons[0];
 }
 for(const x of [lab.x-10,lab.x+10]){const armored=makeCar(x,lab.z+28,'#263745');const shell=new T.Mesh(new T.BoxGeometry(2.1,1.2,2.8),new T.MeshStandardMaterial({color:'#263745'}));shell.position.set(0,1.5,-.4);armored.root.add(shell);policeLivery(armored,true);raidVehicles.push(armored);}

 const blockade=build(13,1.2,.5,-300,.6,350,'#c67d56');
 const spikes=[];for(let x=-305;x<-295;x+=.8)spikes.push(build(.35,.12,.7,x,.13,570,'#343a40'));
 const gate=build(15,.18,.25,barn.x,1.15,1180,'#e6d5aa');build(1,1.8,1,barn.x-7,.9,1180,'#676e71');
 const ramp=build(10,.4,7,barn.x,.2,1169,'#6c7376');ramp.rotation.x=-.07;
 label('ROGATKI',barn.x-8,3,1170,5);
 keep=true;
 // Village access is permanent world scenery, never removed with the prologue.
 // Barn hub and its three working stations.
 build(26,.08,28,barn.x,.03,barn.z,'#8b7c61');
 for(const side of [-1,1])build(.4,5,26,barn.x+side*13,2.5,barn.z,'#77604a',true);
 build(26,5,.4,barn.x,2.5,barn.z+13,'#77604a',true);for(const side of [-1,1])build(8,5,.4,barn.x+side*9,2.5,barn.z-13,'#77604a',true);build(10,2,.4,barn.x,4,barn.z-13,'#77604a',true);build(28,.4,29,barn.x,5.2,barn.z,'#564c40',true);
 label('STARA STODOŁA',barn.x,3.7,barn.z-12.5,12);
 const hubTasks=[{x:barn.x-9,z:barn.z-3,text:'Przytrzymaj F · uruchom serwerownię w oborze',duration:2},{x:barn.x+8,z:barn.z-3,text:'Przytrzymaj F · napraw elektryczne Kukiriny',duration:2},{x:barn.x,z:barn.z+8,text:'Przytrzymaj F · zabezpiecz łupy i plany',duration:2}];
 build(3,2,1.5,barn.x-9,1,barn.z-1,'#313e47',true);build(5,.2,2,barn.x,1,barn.z+10,'#937553',true);
 for(let i=0;i<2;i++){const x=barn.x+7+i*2;build(.25,1.6,.2,x,.8,barn.z-1,'#444d53');build(.9,.12,2,x,.25,barn.z-1,'#3f484e');for(const z of [barn.z-1.8,barn.z-.2])build(.25,.4,.4,x,.2,z,'#181d22');}
 keep=false;
 const pursuers=[makeCar(lab.x-8,lab.z+42,'#263c56'),makeCar(lab.x+8,lab.z+52,'#263c56')];
 for(const car of pursuers)policeLivery(car);

 const mask=new T.Mesh(new T.BoxGeometry(.4,.2,.12),new T.MeshStandardMaterial({color:'#343d36'}));mask.position.set(0,2.12,.28);chars[2].body.add(mask);
 // Objective position feeds the HUD and minimap without a duplicate world marker.
 const marker=new T.Object3D();marker.visible=false;
 persistent.add(van.root);const temporary=scene.children.filter(m=>!before.has(m)&&!persistent.has(m));
 const memory=createMemoryMission(T,api,barn,van);const denial=createDenialMission(T,api,barn);const empire=createEmpireMissions(T,api,barn);
 function cleanup(){if(cleaned)return;cleaned=true;api.toggleContent?.(temporary,temporaryRoads,false);if(!api.toggleContent)for(const mesh of temporary)scene.remove(mesh);for(const p of police){scene.remove(p.ch.root);if(p.rag)scene.remove(p.rag.group);const i=pedestrians.indexOf(p);if(i>=0)pedestrians.splice(i,1);}police.length=0;for(const m of [mask,coveringGun,canister])m.visible=false;for(const [mesh,material] of originalOutfits)mesh.material=material;}
 const setText=(name,goal,line)=>{title.textContent=name;objective.textContent=goal;dialog.textContent=line;};
 const teleport=(x,z)=>{api.teleport(x,z);};
 function placeCrew(inBarn=false){const x=inBarn?barn.x:lab.x,z=inBarn?barn.z:lab.z;chars[1].root.position.set(x+7,0,z+3);chars[2].root.position.set(x+8,0,z-6);for(const ch of crew)ch.root.visible=!inBarn;}
 function start(){if(started)return;started=true;scene.background.set('#263443');scene.fog.color.set('#263443');for(const light of scene.children)if(light.isHemisphereLight)light.intensity=.85;else if(light.isDirectionalLight)light.intensity=.7;stage='lab';task=0;timer=0;health=100;api.forceBystrek();teleport(lab.x,lab.z+4);placeCrew();api.holster();
  chars[2].root.traverse(m=>{if(m.isMesh&&m.material.color&&m.material.color.getHexString()==='202329'){originalOutfits.push([m,m.material]);m.material=api.surfaceMaterial?.('#d5b82d','fabric')||new T.MeshStandardMaterial({color:'#d5b82d'});}});
  setText('01 / PODZIEMIA EKONOMU','WASD · ruch, Shift · bieg, C · kucanie, Spacja · skok. Schłodź serwery i załaduj wózki.','Macioszek: Serwery się gotują. Bystrek, zajmij się chłodzeniem!');ui.hidden=false;
 }
 function raid(){stage='raid';raidVehicles.forEach(car=>car.root.visible=true);timer=0;hold=0;if(api.equipGlock)api.equipGlock();else api.equipRifle();table.rotation.z=.95;monitor.material=new T.MeshBasicMaterial({color:'#ee3737'});setText('02 / NALOT NA ZSE-H','Osłaniaj Macioszka przez 35 sekund. 4 · Glock, LPM · strzał, R · przeładuj.','Bejnar: Policja na schodach! Zatrzymaj ich, kończymy ewakuację!');
  for(let i=0;i<6;i++){const ch=character({shirt:'#243b58',pants:'#202731',skin:'#c99e7b',hair:'#1e2731'});ch.root.position.set(lab.x-5+(i%3)*5,0,lab.z+15+Math.floor(i/3)*3);
   const ped={ch,health:100,deadTime:999,color:'#243b58',zone:{x:lab.x,z:lab.z+15,w:8,d:8},heading:Math.PI,turn:999,prologue:true};ped.meshes=[];ch.root.traverse(m=>{if(m.isMesh){m.userData.pedestrian=ped;ped.meshes.push(m);}});pedestrians.push(ped);police.push(ped);
  }
 }
 function escape(){stage='escape';api.toggleContent?.(evacProps,[],false);if(!api.toggleContent)evacProps.forEach(m=>m.visible=false);for(const p of police)if(p.health>0){p.health=0;p.ch.root.visible=false;}for(const [i,car] of pursuers.entries()){car.root.visible=true;car.x=lab.x+(i?8:-8);car.z=lab.z+42+i*10;car.speed=0;car.vx=car.vz=car.yawRate=0;car.yaw=0;car.root.position.set(car.x,0,car.z);car.health=100;}pursuitStarted=false;timer=0;routeIndex=0;health=100;api.holster();for(const ch of [...crew,chars[1],chars[2]])ch.root.visible=false;setText('03 / UCIECZKA PRZEZ KOŁOBRZEG','E · wsiądź do dowolnego pojazdu. Jedź za zielonym znacznikiem.','Bejnar: Wszyscy na pakę! Gaz do dechy!');}
 function hub(){stage='hub';mask.visible=false;for(const car of pursuers){car.root.visible=false;car.x=-1400;car.z=-1400;}task=0;timer=0;placeCrew(true);for(const ch of chars)ch.root.visible=true;
  setText('04 / NOWY POCZĄTEK','Przygotuj bazę: serwery, Kukiriny i ocalałe łupy.','Macioszek: Tu zaczynamy od nowa. Bejnar: Kopernika i Piastowska poczekają.');}
 function restart(){raidVehicles.forEach(car=>car.root.visible=false);api.toggleContent?.(evacProps,[],true);evacProps.forEach(m=>m.visible=true);table.rotation.set(0,0,0);empire.reset();denial.reset();memory.reset();if(cleaned){api.toggleContent?.(temporary,temporaryRoads,true);if(!api.toggleContent)for(const mesh of temporary)scene.add(mesh);}cleaned=false;canister.visible=true;coveringGun.visible=true;for(const p of police){if(p.rag)scene.remove(p.rag.group);p.ch.root.visible=false;const i=pedestrians.indexOf(p);if(i>=0)pedestrians.splice(i,1);}police.length=0;started=false;finished=false;mask.visible=true;for(const disk of disks)disk.scale.y=1;for(const car of pursuers){car.root.visible=false;car.x=-1400;car.z=-1400;}van.x=lab.x;van.z=lab.z+28;van.speed=0;van.yaw=0;van.root.position.set(van.x,0,van.z);blockade.visible=true;gate.visible=true;start();}
 function tick(dt){if(!started||!api.active())return;if(stage==='free'){if(memory.getState().stage==='complete'&&denial.getState().stage==='locked')denial.unlock();if(denial.getState().stage==='complete'&&empire.getState().stage==='locked')empire.unlock();const target=empire.getState().stage!=='locked'?empire.tick(dt):denial.getState().stage!=='locked'?denial.tick(dt):memory.tick(dt);marker.visible=!!target;if(target){marker.position.set(target.x,2.8,target.z);marker.rotation.y+=dt;}return;}timer+=dt;
  for(const puff of smoke){if(stage==='hub'||stage==='free'){puff.position.x=van.x+(puff.id%5)*.13-.3;puff.position.z=van.z+1.5;}puff.position.y+=dt*.25;if(puff.position.y>4.7)puff.position.y=1;puff.scale.setScalar(1+Math.sin(timer+puff.position.z)*.2);}
  for(const car of [...raidVehicles,...pursuers])if(car.root.visible)for(const [i,beacon] of car.beacons.entries())beacon.material.color.set(Math.sin(timer*12+i*Math.PI)>0?'#ff3040':'#397bff');
  lights.forEach(l=>{l.color.set(stage==='raid'?'#ff302b':'#a2e5e7');l.intensity=stage==='raid'?20+20*Math.sin(timer*7):35;});
  const state=api.state(),pos=state.position;let target=null;prompt.textContent='';for(const ch of crew)if(ch.root.visible)api.animate?.(ch,dt,0,false,false);for(const p of police)if(p.health>0)api.animate?.(p.ch,dt,.7,false,false);for(let i=traces.length-1;i>=0;i--){traces[i].time-=dt;if(traces[i].time<=0){scene.remove(traces[i].mesh);traces[i].mesh.geometry.dispose();traces[i].mesh.material.dispose();traces.splice(i,1);}}
  if(stage==='lab'||stage==='hub'){
   const list=stage==='lab'?tasks:hubTasks;target=list[task];
   if(target){const distance=Math.hypot(pos.x-target.x,pos.z-target.z);if(distance<2.5&&!state.driving){prompt.textContent=target.text+(hold?' · '+Math.floor(hold/target.duration*100)+'%':'');if(interactHeld)hold+=dt;else hold=0;if(hold>=target.duration){task++;hold=0;dialog.textContent=stage==='lab'?(task<3?'Macioszek: Temperatura spada. Następny serwer!':'Bejnar: Torby do wózków, szybko!'):'Bystrek: Gotowe. Baza nabiera kształtu.';}}else hold=0;
    objective.textContent=(stage==='lab'?'Serwery i wózki':'Przygotowanie bazy')+' · '+task+' / '+list.length;
   }else if(stage==='lab')raid();else{stage='free';finished=true;marker.visible=false;cleanup();memory.unlock();api.missionComplete?.(0);}
  }
  if(stage==='raid'){
   objective.textContent='Osłaniaj ewakuację · '+Math.max(0,Math.ceil(35-timer))+' s · osłona '+Math.ceil(health)+'%';
   for(const p of police)if(p.health>0){api.enemyAttack?.(p.ch,dt);const v=p.ch.root.position,d=Math.hypot(pos.x-v.x,pos.z-v.z);if(d>3){v.x+=(pos.x-v.x)/d*dt*.7;v.z+=(pos.z-v.z)/d*dt*.7;p.ch.root.rotation.y=Math.atan2(pos.x-v.x,pos.z-v.z);}else health-=dt*6;}
   chars[2].root.position.set(lab.x-8,0,lab.z-9);canister.rotation.z=Math.sin(timer*5)*.25;for(const disk of disks)disk.scale.y=Math.max(.05,1-timer/30);if(timer>12&&timer<13)dialog.textContent='Macioszek: Dyski znikają. Jeszcze chwila!';if(timer>23&&timer<24)dialog.textContent='Bejnar: Dym na schody! Wszyscy do tylnego wyjścia!';for(const ch of crew)if(timer>24){ch.root.position.z=Math.min(lab.z+16,ch.root.position.z+dt);api.animate?.(ch,dt,1,false,false);}if(health<=0){if(api.fail){api.fail('Nie udało się osłonić ewakuacji.');return;}health=100;timer=Math.max(0,timer-8);teleport(lab.x,lab.z-5);dialog.textContent='Bejnar: Cofnij się za serwery! Ewakuacja potrzebuje jeszcze chwili.';}
   if(timer>=35||police.every(p=>p.health<=0))escape();
  }
  if(stage==='escape'){
   const escapeCar=state.driving;
   target=escapeCar?{x:route.at(-1)[0],z:route.at(-1)[1]}:{x:(api.nearestVehicle?.()||van).x,z:(api.nearestVehicle?.()||van).z};
   if(escapeCar){
    if(!pursuitStarted){pursuitStarted=true;for(const car of pursuers)car.root.visible=true;}
    for(const car of pursuers){
     if(!car.root.visible)continue;const dx=escapeCar.x-car.x,dz=escapeCar.z-car.z,d=Math.hypot(dx,dz),speed=Math.min(135/3.6,Math.max(3,Math.abs(escapeCar.speed)+6));
     if(api.driveAI){api.driveAI(car,{x:escapeCar.x+(escapeCar.vx||0)*.35,z:escapeCar.z+(escapeCar.vz||0)*.35,speed:135/3.6,gap:4},dt);if(d<8)health-=dt*3;}else if(d>7){car.x+=dx/d*speed*dt;car.z+=dz/d*speed*dt;car.yaw=Math.atan2(dx,dz);}else health-=dt*3;
     if(!api.driveAI){car.root.position.set(car.x,0,car.z);car.root.rotation.y=car.yaw;}car.beacon.material.color.set(Math.sin(timer*12)>0?'#ff3040':'#397bff');
     // Rear-seat covering fire gradually drives pursuing cars off the route.
     if(d<65&&timer-lastFire>.65){lastFire=timer;const tracer=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(escapeCar.x,1.5,escapeCar.z),new T.Vector3(car.x,1.2,car.z)]),new T.LineBasicMaterial({color:'#ffe58e'}));scene.add(tracer);traces.push({mesh:tracer,time:.08});}car.health-=dt*(d<65?4:0);if(car.health<=0){car.root.visible=false;car.x=-1400;car.z=-1400;dialog.textContent='Bejnar: Jeden radiowóz mniej!';}
    }
    objective.textContent='Jedź do stodoły dowolną trasą · osłona '+Math.ceil(health)+'%';
    if(Math.hypot(escapeCar.x-target.x,escapeCar.z-target.z)<12){stage='park';arrivalVehicle=escapeCar;for(const car of pursuers)car.root.visible=false;target={x:escapeCar.x,z:escapeCar.z};setText('04 / PRZYJAZD DO BAZY','Zatrzymaj pojazd i wysiądź: E. Wejdź do stodoły.','Bejnar: Dotarliśmy. Zaparkuj przed stodołą.');}
    if(blockade.visible&&Math.abs(escapeCar.x+300)<8&&Math.abs(escapeCar.z-350)<4){blockade.visible=false;escapeCar.speed*=.7;health-=12;dialog.textContent='Bejnar: Blokada rozbita!';}
    if(Math.abs(escapeCar.x+300)<5&&Math.abs(escapeCar.z-570)<2){escapeCar.speed*=Math.exp(-dt*4);health-=dt*10;}
    if(Math.abs(escapeCar.x-barn.x)<8&&escapeCar.z>1166&&escapeCar.z<1189){gate.visible=false;escapeCar.root.position.y=Math.sin((escapeCar.z-1166)/23*Math.PI)*1.8;}
    if(health<=0){if(api.fail){api.fail('Van został zniszczony podczas ucieczki.');return;}escapeCar.x=route[Math.max(0,routeIndex-1)][0];escapeCar.z=route[Math.max(0,routeIndex-1)][1];escapeCar.speed=0;health=100;dialog.textContent='Powrót do punktu kontrolnego. Omijaj kolczatki.';}
   }
  }
  if(stage==='park'){const end=route.at(-1);target={x:end[0],z:end[1]};if(!state.driving&&Math.hypot(pos.x-end[0],pos.z-end[1])<20)hub();}
  if(target){marker.visible=true;marker.position.set(target.x,2.8+Math.sin(timer*3)*.15,target.z);marker.rotation.y+=dt;objective.textContent=objective.textContent.replace(/(?: · \d+ m)+$/,'')+' · '+Math.round(Math.hypot(pos.x-target.x,pos.z-target.z))+' m';}else marker.visible=false;
 }
 addEventListener('keydown',e=>{if(e.code==='KeyF'&&api.active()){interactHeld=true;e.preventDefault();}});addEventListener('keyup',e=>{if(e.code==='KeyF')interactHeld=false;});addEventListener('blur',()=>interactHeld=false);
 const button=document.getElementById('interact');button.addEventListener('pointerdown',()=>interactHeld=true);for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,()=>interactHeld=false);
 function loadChapter(n){start();memory.reset();denial.reset();van.x=barn.x-6;van.z=barn.z-30;van.yaw=Math.PI;van.speed=0;van.vx=van.vz=van.yawRate=0;van.root.position.set(van.x,0,van.z);van.root.rotation.set(0,van.yaw,0);stage='free';finished=true;cleanup();api.forceBystrek();teleport(barn.x,barn.z-8);placeCrew(true);memory.unlock();if(n>=3){memory.restoreComplete();denial.unlock();if(n>=4)denial.restoreComplete();}}
 function retry(){if(empire.getState().active)empire.retry();else if(denial.getState().active)denial.retry();else if(memory.getState().active)memory.retry();else restart();}
 return{start,restart,retry,loadChapter,empire,resumeMission:id=>{if(id===2)memory.retry();else if(id===3)denial.retry();else if(id>=5)empire.resume(id);},tick,getState:()=>({stage,task,timer,health,routeIndex,finished,cleaned,missionActive:memory.getState().active||denial.getState().active||empire.getState().active,empire:empire.getState(),denial:denial.getState(),memory:memory.getState(),marker:marker.visible?marker.position.toArray():null})};
}
