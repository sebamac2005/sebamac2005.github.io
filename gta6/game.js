import {createCivilianEvents} from './civilian-events.js?v=roof-seat-2';
import {createSurfaces} from './surfaces.js?v=roof-seat-2';
import {createPostFX} from './postfx.js?v=roof-seat-2';
import {MAP,roadContains} from './map-layout.js?v=roof-seat-2';
import * as T from './vendor/three.module.js?v=roof-seat-2';
import {WeaponState,WEAPONS} from './weapons.js?v=roof-seat-2';
import {stepCar,driveAI,createVehicleNavigator} from './vehicles.js?v=roof-seat-2';
import {PlayerState} from './player-state.js?v=roof-seat-2';
import {GameAudio,SCORES} from './audio.js?v=roof-seat-2';
import {createAtmosphere} from './atmosphere.js?v=roof-seat-2';
import {createEffects} from './effects.js?v=roof-seat-2';
import {buildWorld} from './world.js?v=roof-seat-2';
import {CarRadio} from './radio.js?v=roof-seat-2';
import {createRagdoll,stepRagdoll} from './ragdoll.js?v=roof-seat-2';
import {createPrologue} from './prologue.js?v=roof-seat-2';
const $=id=>document.getElementById(id), clamp=T.MathUtils.clamp;
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true});}catch(e){$('error').hidden=false;$('error').textContent='Nie można uruchomić grafiki 3D. Włącz akcelerację sprzętową w przeglądarce i odśwież grę.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new T.Scene();scene.background=new T.Color('#aec2cf');scene.fog=new T.Fog('#aec2cf',320,1400);const camera=new T.PerspectiveCamera(55,innerWidth/innerHeight,.1,2200);scene.add(new T.HemisphereLight('#d6efff','#807352',2.4));const sun=new T.DirectionalLight('#ffe1b0',3);sun.position.set(-35,65,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:1,far:280});sun.shadow.bias=-.0004;scene.add(sun);
const surfaces=createSurfaces(T,renderer),postFX=createPostFX(T,renderer);
const obstacles=[],walkSurfaces=[], mats=new Map();function material(c){if(!mats.has(c)){const glow=['#e6eddf','#fb754e','#9ba9ae','#7dd29a'].includes(c);const mat=surfaces.material(c);if(glow){mat.emissive.set(c);mat.emissiveIntensity=2.2;}mats.set(c,mat);}return mats.get(c)}
function box(w,h,d,x,y,z,c,collide=false){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(collide){const obstacle={x,z,w,d,h,y};m.userData.obstacle=obstacle;obstacles.push(obstacle);}return m;}
box(MAP.bounds*2+200,.3,MAP.bounds*2+200,0,-.15,0,'#768c67');
function sign(text,w,h){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#233341';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#dfff7a';ctx.font='900 95px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex}));}
// All scenery, including the replacement central park, belongs to the shared world.
const world=buildWorld(T,scene,obstacles,surfaces);let grass=null;
for(const location of world.labels){const label=sign(location.name,location.name==='Komenda Policji'?18:14,1.6);label.position.set(location.x,location.y,location.z);scene.add(label);}
const playerState=new PlayerState(),audio=new GameAudio(),atmosphere=createAtmosphere(T,scene,sun,world),gameEffects=createEffects(T,scene,surfaces);let sensitivity=1,aiming=false,lastMissionLabel='';
let endingMode=null,destroyedBarn=[],barnRubble=[];
let progress=readProgress(),cheatProgress=false,lastProgressJSON='';
function readProgress(){
 try{const stored=JSON.parse(localStorage.getItem('gta6.progress'));if(stored?.version===1){const completed=[];if(stored.completed?.includes(0))completed.push(0);if(completed.includes(0)&&stored.completed?.includes(2))completed.push(2);if(completed.includes(2)&&stored.completed?.includes(3))completed.push(3);for(const id of [5,6,7,8])if(completed.includes(id===5?3:id-1)&&stored.completed?.includes(id))completed.push(id);let activeMission=[0,2,3,5,6,7,8].includes(stored.activeMission)?stored.activeMission:null;if(activeMission===2&&!completed.includes(0))activeMission=0;if(activeMission===3&&!completed.includes(2))activeMission=completed.includes(0)?2:0;if(completed.includes(activeMission))activeMission=null;if(activeMission>=5&&!completed.includes(activeMission===5?3:activeMission-1))activeMission=null;return{version:1,completed,activeMission,ending:stored.ending==='solo'?'solo':stored.ending==='family'?'family':null};}
  // A legacy unlock alone cannot prove that Mission 2 was actually completed.
  const legacy=Number(localStorage.getItem('gta6.chapter'));if(legacy>=2)return{version:1,completed:[0],activeMission:2};
 }catch{}return{version:1,completed:[],activeMission:null};
}
function writeProgress(){if(cheatProgress)return;const value=JSON.stringify(progress);if(value===lastProgressJSON)return;try{localStorage.setItem('gta6.progress',value);lastProgressJSON=value;$('savestatus').textContent='✓ Zapisano postęp misji';}catch{$('savestatus').textContent='Zapis niedostępny';}}
function missionCompleted(id){audio.effect('mission_complete');if(cheatProgress)return;if(!progress.completed.includes(id))progress.completed.push(id);progress.activeMission=null;writeProgress();}
function saveMissionProgress(state){if(!playing||cheatProgress)return;progress.activeMission=state.stage!=='free'?0:state.memory?.active?2:state.denial?.active?3:state.empire?.active?state.empire.id:null;writeProgress();}
function resetProgress(){weaponState.reset();for(const drop of cashDrops)scene.remove(drop.mesh);cashDrops.length=0;cashNoticeTime=0;$('cashnotice').hidden=true;$('cashbalance').textContent='$0';$('cheatammo').checked=false;triggerHeld=false;shotQueued=false;cheatProgress=false;progress={version:1,completed:[],activeMission:0};lastProgressJSON='';writeProgress();$('continuegame').hidden=true;}
function continueProgress(){cheatProgress=false;playerState.reset();prologue.restart();const chapter=progress.completed.includes(3)?4:progress.completed.includes(2)?3:progress.completed.includes(0)?2:1;if(chapter>=2)prologue.loadChapter(chapter);if(progress.completed.includes(3))prologue.empire.restore(progress.completed,progress.ending);if(progress.activeMission!=null&&progress.activeMission!==0)prologue.resumeMission(progress.activeMission);start();}

const cars=[];const vehicleNavigation=createVehicleNavigator({obstacles,bounds:world.bounds});let driving=null;
const carRadio=new CarRadio($('radiostatus'));
function missionRadioBlocked(){const state=prologue.getState();return state.stage!=='free'||state.missionActive;}
$('radiotoggle').onclick=()=>{if(!missionRadioBlocked())carRadio.toggle();};$('radionext').onclick=()=>{if(!missionRadioBlocked())carRadio.next();};
addEventListener('keydown',e=>{if(!playing||paused||!driving||e.repeat||missionRadioBlocked())return;if(e.code==='KeyJ')carRadio.toggle();if(e.code==='KeyN')carRadio.next();});
function makeCar(x,z,color){
 const root=new T.Group(),wheels=[];root.userData.vehicle=true;
 function panel(w,h,d,x,y,z,c){const m=new T.Mesh(new T.BoxGeometry(w,h,d),surfaces.material(c,c==='#345362'?'glass':'metal',true));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
 panel(2.1,.65,4.3,0,.75,0,color);panel(1.85,.7,2.1,0,1.35,-.15,color);
 panel(1.66,.52,.035,0,1.4,.92,'#345362');panel(1.66,.48,.035,0,1.4,-1.22,'#345362');
 for(const side of [-1,1]){panel(.035,.49,1.8,side*.94,1.4,-.15,'#345362');panel(.06,.68,.09,side*.96,1.34,-.1,color);panel(.14,.08,.18,side*1.12,1.25,.7,color);}
 panel(2.13,.16,.14,0,.49,2.2,'#c0c3bb');panel(2.13,.16,.14,0,.49,-2.2,'#c0c3bb');
 for(const side of [-1,1]){panel(.45,.18,.045,side*.66,.81,2.18,'#fff0ad');panel(.43,.17,.045,side*.66,.81,-2.18,'#be5443');}
 for(const side of [-1,1])for(const axle of [-1,1]){const pivot=new T.Group();pivot.position.set(side*1.05,.4,axle*1.38);root.add(pivot);const wheel=new T.Mesh(new T.CylinderGeometry(.42,.42,.29,10),surfaces.material('#222a2e','rubber',true));wheel.rotation.z=Math.PI/2;pivot.add(wheel);wheels.push({pivot,wheel,front:axle===1});}
 root.scale.setScalar(1.5);root.position.set(x,0,z);scene.add(root);const car={root,wheels,roofHeight:1.7,x,z,yaw:0,speed:0,yawRate:0,safePose:{x,z,yaw:0},condition:100,color,maxSpeed:115/3.6,halfWidth:1.8,halfLength:3.4,wheelHalfLength:2.07};root.userData.storyCar=car;cars.push(car);return car;
}
function makeScooter(x,z){
 const root=new T.Group(),wheels=[];root.userData.vehicle=true;const part=(w,h,d,x,y,z,c)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),surfaces.material(c,'metal',true));m.position.set(x,y,z);m.castShadow=true;root.add(m);return m;};
 part(.48,.12,1.5,0,.28,0,'#283136');part(.18,1.25,.16,0,.88,.6,'#da8b28');part(.9,.08,.1,0,1.5,.6,'#222a2e');part(.23,.08,.2,0,1.5,.56,'#688b92');
 for(const z of [-.7,.7]){const pivot=new T.Group();pivot.position.set(0,.22,z);root.add(pivot);const wheel=new T.Mesh(new T.CylinderGeometry(.22,.22,.14,12),surfaces.material('#192025','rubber',true));wheel.rotation.z=Math.PI/2;pivot.add(wheel);wheels.push({pivot,wheel,front:z>0});}
 root.scale.setScalar(1.2);const scooter={root,wheels,x,z,yaw:0,speed:0,yawRate:0,safePose:{x,z,yaw:0},condition:100,color:'#da8b28',kind:'scooter',maxSpeed:85/3.6,engineMultiplier:.85,halfWidth:.34,halfLength:1.08,rideHeight:.38};root.userData.storyCar=scooter;root.position.set(x,0,z);scene.add(root);cars.push(scooter);return scooter;
}
const defs=[
 {name:'BYSTREK',faceUrl:'./faces/bystrek.png',shirt:'#254b7d',pants:'#28466b',inner:'#b6cde9',skin:'#cea17f',hair:'#49423b',hairStyle:'short',suit:true,tie:false},
 {name:'BEJNAR',faceUrl:'./faces/bejnar.png',shirt:'#1c2228',pants:'#181d23',inner:'#292d32',skin:'#c4a38a',hair:'#8b8a81',hairStyle:'full',suit:true,tie:true,stern:true},
 {name:'MACIOSZEK',faceUrl:'./faces/macioszek.png',shirt:'#202329',pants:'#17191e',inner:'#282b2f',skin:'#d1a785',hairStyle:'bald',suit:true,tie:true,glasses:true}
];
function character(def){const root=new T.Group(),body=new T.Group();root.userData.character=true;root.add(body);const part=(w,h,d,c,parent,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),surfaces.material(c,c===def.skin?'skin':c===def.hair?'hair':['#11151a','#12161c','#101317','#171a1e'].includes(c)?'rubber':'fabric',true));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};part(.76,.85,.4,def.shirt,body,0,1.48,0);part(.66,.24,.38,def.pants,body,0,.95,0);const head=part(.52,.55,.48,def.skin,body,0,2.16,0);if(def.hairStyle!=='bald'){
 const short=def.hairStyle==='short';
 part(short?.48:.55,short?.035:.13,.48,def.hair,body,0,short?2.447:2.45,short?-.035:0);
 part(.54,short?.16:.28,.06,def.hair,body,0,short?2.31:2.32,-.24);
 if(!short)for(const x of [-.25,.25])part(.045,.15,.33,def.hair,body,x,2.32,-.045);
}
if(def.suit){
 part(.24,.64,.025,def.inner,body,0,1.55,.214);
 for(const side of [-1,1]){const lapel=part(.105,.48,.035,def.shirt,body,side*.15,1.66,.231);lapel.rotation.z=side*.16;}
 if(def.tie){part(.075,.44,.027,'#101317',body,0,1.56,.237);part(.1,.095,.03,'#171a1e',body,0,1.82,.243);}
 else{for(const side of [-1,1]){const collar=part(.09,.15,.025,def.inner,body,side*.085,1.83,.244);collar.rotation.z=side*.35;}}
 part(.67,.075,.41,'#12161c',body,0,1.04,0);part(.095,.065,.025,'#85857e',body,0,1.04,.22);
 for(const y of [1.26,1.41])part(.028,.028,.02,'#464a50',body,.09,y,.224);
}
if(def.stern&&!def.faceUrl)for(const side of [-1,1]){const brow=part(.13,.035,.02,'#615d55',body,side*.12,2.25,.25);brow.rotation.z=side*.18;}
if(def.glasses&&!def.faceUrl){
 for(const side of [-1,1]){const x=side*.13;for(const y of [2.145,2.24])part(.2,.018,.02,'#383c3c',body,x,y,.26);for(const dx of [-.1,.1])part(.018,.095,.02,'#383c3c',body,x+dx,2.193,.26);part(.018,.018,.29,'#383c3c',body,side*.248,2.205,.115);}
 part(.07,.018,.02,'#383c3c',body,0,2.205,.26);
}
if(!def.faceUrl){for(const x of [-.12,.12])part(.06,.055,.01,'#292d32',body,x,2.19,.245);part(.14,.025,.012,'#8b5647',body,0,2.04,.246);}
const face=new T.Mesh(new T.PlaneGeometry(.52,.55),new T.MeshStandardMaterial({transparent:true,opacity:0,roughness:1}));face.userData.facePhoto=!!def.faceUrl;face.position.set(0,0,.242);head.add(face);
if(def.faceUrl)new T.TextureLoader().load(def.faceUrl,texture=>{texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());face.material.map=texture;face.material.opacity=1;face.material.needsUpdate=true;},undefined,()=>{$('load').textContent='Nie udało się wczytać twarzy '+def.name+'. Odśwież grę.';});
const limbs=[];for(const side of [-1,1]){for(const arm of [false,true]){const upper=new T.Group();upper.position.set(side*(arm?.52:.22),arm?1.85:.94,0);body.add(upper);const len=arm?.43:.45,w=arm?.23:.27;part(w,len,.26,arm?def.shirt:def.pants,upper,0,-len/2,0);const joint=new T.Group();joint.position.y=-len;upper.add(joint);part(w,len,.26,arm?(def.suit?def.shirt:def.skin):def.pants,joint,0,-len/2,0);if(arm&&def.suit){part(w,.1,.27,def.inner,joint,0,-len+.035,0);part(w*.92,.12,.245,def.skin,joint,0,-len-.025,0);}const hand=arm?new T.Object3D():null;if(hand){hand.position.y=-len;joint.add(hand);}const foot=!arm?part(.29,.17,.42,def.suit?'#11151a':'#edf0dd',joint,0,-len,.06):null;limbs.push({upper,joint,arm,side,foot,hand});}}
scene.add(root);return{root,body,limbs,face};}
const chars=defs.map(character);chars[1].root.position.set(-5,0,-8);chars[2].root.position.set(5,0,-10);chars[0].root.position.set(0,0,6);let selected=0,player=chars[0],playing=false,paused=false,yaw=.35,pitch=.28,velY=0,grounded=true,crouch=false,moving=false,phase=0;const keys=new Set(),velocity=new T.Vector3();let jumpQueued=false, jumpWindup=0, landingImpact=0;const ragdollStiffness=36;
function select(n){if(n>=3&&endingMode!=='family')return;if(endingMode==='solo'&&n!==2)return;if((playing&&(prologue.getState().stage!=='free'||prologue.getState().missionActive))||driving||n===selected)return;const pos=player.root.position.clone(),rot=player.root.rotation.y;const next=chars[n]||prologue.empire.crew[n-3];if(!next)return;player.root.position.copy(next.root.position);player.root.position.y=0;next.root.position.copy(pos);next.root.rotation.y=rot;player=next;selected=n;velY=0;jumpWindup=0;landingImpact=0;grounded=pos.y<=0;velocity.set(0,0,0);$('name').textContent=defs[n]?.name||(n===3?'ODDZIAŁ 1P':'ODDZIAŁ 2P');$('avatar').textContent='';$('avatar').style.backgroundImage=defs[n]?'url('+defs[n].faceUrl+')':'none';document.querySelectorAll('[data-character]').forEach(b=>b.classList.toggle('selected',+b.dataset.character===n));}
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>select(+b.dataset.character));
function lock(){if(!matchMedia('(pointer:coarse)').matches){const p=$('world').requestPointerLock?.();p?.catch?.(()=>{});}}
function start(){if(playerState.failed)return;audio.start();prologue.start();playing=true;paused=false;hideCheats();$('start').hidden=true;$('paused').hidden=true;keys.clear();carRadio.setActive(!!driving&&!missionRadioBlocked());lock();}
function pause(){if(wheelOpen)closeWeaponWheel(false);if(shopOpen||!playing)return;paused=true;hideCheats();carRadio.setActive(false);aiming=false;triggerHeld=false;shotQueued=false;keys.clear();jumpQueued=false;$('paused').hidden=false;document.exitPointerLock?.();}
$('play').onclick=()=>{resetProgress();playerState.reset();prologue.restart();start();};$('resume').onclick=start;$('pause').onclick=pause;$('reset').onclick=()=>{resetProgress();playerState.reset();failedShown=false;$('failure').hidden=true;prologue.restart();restoreVehicles();start();};$('world').onclick=()=>{if(playing&&!paused)lock();};
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyC'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(wheelOpen){closeWeaponWheel(false);return;}if(shopOpen)closeShop();else pause();return;}if(!playing||paused)return;keys.add(e.code);if(e.code==='Space'&&!e.repeat)jumpQueued=true;if(['Digit1','Digit2','Digit3'].includes(e.code))select(+e.code.slice(-1)-1);if(e.code==='F2')select(3);if(e.code==='F3')select(4);});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&playing&&!paused&&!matchMedia('(pointer:coarse)').matches)pause();});
addEventListener('mousemove',e=>{if(wheelOpen){moveWeaponWheel(e);return;}if(document.pointerLockElement=== $('world')&&!paused){yaw-=e.movementX*.0026*sensitivity;pitch=clamp(pitch+e.movementY*.002*sensitivity,-1.3,1.35);}});
let lastTouch=null;$('world').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')lastTouch={x:e.clientX,y:e.clientY,id:e.pointerId};});$('world').addEventListener('pointermove',e=>{if(lastTouch&&e.pointerId===lastTouch.id&&!paused){yaw-=(e.clientX-lastTouch.x)*.006;pitch=clamp(pitch+(e.clientY-lastTouch.y)*.004,-1.3,1.35);lastTouch={x:e.clientX,y:e.clientY,id:e.pointerId};}});addEventListener('pointerup',()=>lastTouch=null);$('world').style.touchAction='none';
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(!playing||paused)return;b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);if(b.dataset.key==='Space')jumpQueued=true;});const release=()=>keys.delete(b.dataset.key);b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);});
function insideCar(x,z,car,margin=.38){const dx=x-car.x,dz=z-car.z,localX=dx*Math.cos(car.yaw)-dz*Math.sin(car.yaw),localZ=dx*Math.sin(car.yaw)+dz*Math.cos(car.yaw);return Math.abs(localX)<(car.halfWidth||1.1)+margin&&Math.abs(localZ)<(car.halfLength||2.25)+margin;}
function blocked(x,z){if(Math.abs(x)>world.bounds||Math.abs(z)>world.bounds)return true;if(cars.some(car=>car!==driving&&car.root.visible&&car.root.parent&&insideCar(x,z,car)))return true;const feet=player.root.position.y,head=feet+(crouch?1.3:2.35);
 const overlaps=(o)=>{const top=o.y+o.h/2,bottom=o.y-o.h/2;return top>feet+.2&&bottom<head&&Math.abs(x-o.x)<o.w/2+.38&&Math.abs(z-o.z)<o.d/2+.38;};
 return obstacles.some(overlaps)||walkSurfaces.some(m=>m.visible&&m.parent&&overlaps({x:m.position.x,z:m.position.z,y:m.position.y,w:m.geometry.parameters.width,d:m.geometry.parameters.depth,h:m.geometry.parameters.height}));}
const armedAnchor=new T.Vector3();let armedCameraActive=false,shoulderAimBlend=0;
const target=new T.Vector3(),desired=new T.Vector3(),ray=new T.Raycaster(),direction=new T.Vector3();const camSolids=scene.children.filter(x=>x.isMesh&&x.geometry.type==='BoxGeometry'&&x.geometry.parameters.height>1);camSolids.push(...world.collisionMeshes);for(const car of cars)car.root.traverse(m=>{if(m.isMesh)camSolids.push(m);});
let shopOpen=false,wheelOpen=false,wheelSelection=0,wheelX=0,wheelY=0;
const weaponState=new WeaponState();let triggerHeld=false,shotQueued=false,recoil=0,flashTime=0;
let vehicleNoticeUntil=0;function vehicleNotice(text){vehicleNoticeUntil=performance.now()+2200;vehicleHint.textContent=text;vehicleHint.hidden=false;}
const vehicleHint=document.createElement('div');vehicleHint.id='vehiclehint';$('game').append(vehicleHint);
function closestCar(){let nearest=null,best=5;for(const car of cars){if(car.enterable===false||!car.root.visible||!car.root.parent)continue;const distance=Math.hypot(car.x-player.root.position.x,car.z-player.root.position.z);if(distance<best){best=distance;nearest=car;}}return nearest;}
function useCar(){
 if(!playing||paused)return;
 if(driving){
  if(Math.abs(driving.speed)>1){vehicleNotice('Zatrzymaj pojazd przed wysiadaniem.');return;}
  const car=driving;let exit=null;
  for(const [sx,sz]of [[-((car.halfWidth||1.8)+ .9),0],[(car.halfWidth||1.8)+.9,0],[0,-((car.halfLength||3.4)+.9)],[0,(car.halfLength||3.4)+.9]]){const x=car.x+sx*Math.cos(car.yaw)+sz*Math.sin(car.yaw),z=car.z-sx*Math.sin(car.yaw)+sz*Math.cos(car.yaw);if(!blocked(x,z)&&!insideCar(x,z,car)){exit={x,z};break;}}
  if(!exit){vehicleNotice('Wyjście zablokowane — odjedź od przeszkody.');return;}driving=null;car.speed=0;player.root.visible=true;player.root.position.set(exit.x,surfaceHeight(exit.x,exit.z),exit.z);player.root.rotation.y=car.yaw;yaw=car.yaw+Math.PI;velocity.set(0,0,0);grounded=true;velY=0;keys.clear();
 }else{
  const car=closestCar();if(!car||!grounded)return;driving=car;car.maxSpeed=car.kind==='forklift'?8:car.kind==='scooter'?85/3.6:Math.max(car.maxSpeed||0,115/3.6);weaponState.holster();player.root.visible=car.kind==='scooter';triggerHeld=false;shotQueued=false;keys.clear();yaw=car.yaw+Math.PI;pitch=.24;
 }
 carRadio.setActive(!!driving&&playing&&!paused&&!missionRadioBlocked());
}
addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat)useCar();});
$('touchcar').onclick=useCar;
function carBlocked(x,z,yaw,car){
 let localObstacles=obstacles;
 if(car.traffic){const cache=car.traffic.obstacleCache;if(!cache||cache.count!==obstacles.length||Math.hypot(x-cache.x,z-cache.z)>12){car.traffic.obstacleCache={x,z,count:obstacles.length,items:obstacles.filter(o=>Math.abs(x-o.x)<o.w/2+20&&Math.abs(z-o.z)<o.d/2+20)};}localObstacles=car.traffic.obstacleCache.items;}

 for(const lx of [-(car.halfWidth||1.08),0,car.halfWidth||1.08])for(const lz of [-(car.halfLength||2.24),0,car.halfLength||2.24]){
  const wx=x+lx*Math.cos(yaw)+lz*Math.sin(yaw),wz=z-lx*Math.sin(yaw)+lz*Math.cos(yaw);
  if(Math.abs(wx)>world.bounds-2||Math.abs(wz)>world.bounds-2||localObstacles.some(o=>o.h>.2&&o.y-o.h/2<(car.kind==='scooter'?2.9:3.3)&&o.y+o.h/2>.25&&Math.abs(wx-o.x)<o.w/2+.12&&Math.abs(wz-o.z)<o.d/2+.12)||cars.some(other=>other!==car&&other.root.visible&&other.root.parent&&insideCar(wx,wz,other,.12)))return true;
 }
 return false;
}
function updateDriving(dt){
 const car=driving;
 stepCar(car,{forward:keys.has('KeyW'),reverse:keys.has('KeyS'),left:keys.has('KeyA'),right:keys.has('KeyD'),brake:keys.has('Space')},dt,(x,z,yaw)=>carBlocked(x,z,yaw,car),surfaceHeight);
 car.root.position.set(car.x,car.chassisY??surfaceHeight(car.x,car.z),car.z);car.root.rotation.set(car.pitch||0,car.yaw,car.roll||0,'YXZ');if(car.condition<=0){const mission=prologue.getState();if(mission.stage!=='free'||mission.missionActive)playerState.fail('Pojazd misji został zniszczony.');}if(car.impact>3){audio.effect('crash',car.impact/10);playerState.damage(Math.max(0,car.impact-7)*(car.armor?1.25:2.5),'Rozbiłeś pojazd.');}if(car.drifting){gameEffects.mark(new T.Vector3(car.x,surfaceHeight(car.x,car.z),car.z));gameEffects.spawn('dust',car.root.position,1);}
 for(const [i,w] of car.wheels.entries()){w.pivot.position.y=(car.kind==='scooter'?.22:.4)+(car.contacts?.[i]?.compression||0)/car.root.scale.y;w.wheel.rotation.x+=car.speed*dt/((car.kind==='scooter'?.22:.42)*car.root.scale.y);if(w.front)w.pivot.rotation.y=T.MathUtils.damp(w.pivot.rotation.y,(keys.has('KeyA')?.48:keys.has('KeyD')?-.48:0),14,dt);}
 player.root.position.set(car.x,car.kind==='scooter'?(car.chassisY??surfaceHeight(car.x,car.z))+(car.rideHeight||.3):0,car.z);if(car.kind==='scooter'){player.root.rotation.set(car.pitch||0,car.yaw,car.roll||0,'YXZ');player.body.position.y=0;player.body.rotation.set(.05,0,0);for(const limb of player.limbs){limb.upper.rotation.set(limb.arm?-1.1:0,0,limb.arm?-limb.side*.06:0);limb.joint.rotation.set(limb.arm?-.15:.1,0,0);}}jumpQueued=false;
 $('state').textContent=Math.round(Math.abs(car.speed)*3.6)+' KM/H';
}
function updateVehicleHint(){carRadio.setActive(!!driving&&playing&&!paused&&!missionRadioBlocked());$('carradio').hidden=!driving||!playing||paused||missionRadioBlocked();$('weaponhud').hidden=!!driving;vehicleHint.hidden=!playing||paused||performance.now()>vehicleNoticeUntil;if(vehicleHint.hidden)vehicleHint.textContent='';}
function gunModel(index){
 const rifle=index>0;
 const group=new T.Group();
 const block=(w,h,d,x,y,z,c)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),surfaces.material(c,['#655847','#875e3d'].includes(c)?'wood':'metal',true));m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
 block(rifle?.17:.14,rifle?.17:.13,rifle?.65:.32,0,0,0,'#303940');
 block(.11,.24,.13,0,-.14,rifle?-.19:-.07,'#22272b');
 block(.075,.075,rifle?.5:.14,0,.015,rifle?.54:.23,'#56636b');
 const magazine=block(.1,rifle?.28:.13,.15,0,rifle?-.22:-.24,rifle?.05:-.07,'#636d72');
 if(rifle){block(.16,.19,.3,0,-.035,-.46,'#655847');block(.2,.12,.32,0,-.03,.32,'#655847');block(.04,.09,.045,0,.12,.65,'#22272b');}
 else block(.045,.04,.035,0,.09,.16,'#c2c7cb');
 if(index===2){block(.14,.14,.6,0,-.07,.54,'#252b30');block(.23,.15,.28,0,-.06,.4,'#875e3d');}if(index===3){block(.07,.07,.65,0,.015,.85,'#222a30');block(.14,.14,.42,0,.23,0,'#172129');block(.16,.035,.18,0,.14,0,'#29343b');}if(index===4)group.scale.setScalar(.8);
 const muzzle=new T.Object3D();muzzle.position.set(0,.015,index===3?1.2:rifle?.82:.31);group.add(muzzle);
 const flash=new T.Mesh(new T.OctahedronGeometry(rifle?.12:.085),new T.MeshBasicMaterial({color:'#ffe48a'}));flash.position.copy(muzzle.position);flash.visible=false;group.add(flash);
 const slide=block(rifle?.19:.16,.07,rifle?.47:.34,0,.095,rifle?.03:0,'#727b83');for(const x of [-.09,.09])block(.025,.1,.2,x,-.16,-.01,'#1d242c');block(.2,.035,.035,0,.145,-.1,'#a0a7a8');block(.035,.07,.035,0,.12,rifle?.68:.28,'#bbc9aa');if(rifle){for(let i=0;i<5;i++)block(.23,.025,.035,0,.065,.2+i*.06,'#303b43');block(.06,.18,.1,0,-.17,.29,'#303b43');}return{group,slide,magazine,magazineY:magazine.position.y,muzzle,flash,grip:new T.Vector3(0,-.14,rifle?-.19:-.07)};
}
const guns=WEAPONS.map((_,i)=>gunModel(i));for(const gun of guns){gun.group.visible=false;player.limbs.find(l=>l.arm&&l.side===-1).hand.add(gun.group);}
const shotRay=new T.Raycaster(),shotDirection=new T.Vector3(),aimPoint=new T.Vector3(),muzzlePoint=new T.Vector3(),effects=[];
const shootable=scene.children.filter(m=>m.isMesh);for(const car of cars)car.root.traverse(m=>{if(m.isMesh)shootable.push(m);});
const pedestrians=[];
// Civilians spawn on pavement routes, replacing the original scattered wanderers.
function spawnPed(ped,observer=null){
 const nearby=observer?world.sidewalkRoutes.filter(r=>r.points.some(p=>Math.hypot(p.x-observer.x,p.z-observer.z)<220)):null;
 const routes=nearby?.length?nearby:world.sidewalkRoutes;let route=null,position=null;
 for(let i=0;i<80;i++){const candidate=routes[Math.floor(Math.random()*routes.length)];if(!candidate)break;const distance=Math.random()*candidate.length,segment=Math.min(candidate.points.length-2,Math.floor(distance/3)),t=distance/3-segment,a=candidate.points[segment],b=candidate.points[segment+1],x=T.MathUtils.lerp(a.x,b.x,t),z=T.MathUtils.lerp(a.z,b.z,t);
  if((!observer||Math.hypot(x-observer.x,z-observer.z)>65)&&!blocked(x,z)){route=candidate;position={x,z,distance};break;}}
 if(!route){ped.ch.root.visible=false;ped.deadTime=1;return;}
 ped.route=route;ped.routeDistance=position.distance;ped.walkDirection=Math.random()<.5?-1:1;ped.walkSpeed=.8+Math.random()*.45;ped.wait=0;ped.panic=0;ped.reaction=0;ped.brainTime=0;ped.animTime=0;
 ped.ch.root.position.set(position.x,0,position.z);const a=route.points[0],b=route.points.at(-1);ped.heading=Math.atan2((b.x-a.x)*ped.walkDirection,(b.z-a.z)*ped.walkDirection);
 ped.ch.root.rotation.set(0,ped.heading,0);ped.ch.body.rotation.set(0,0,0);ped.health=100;ped.deadTime=0;ped.ch.root.visible=true;
 if(ped.rag){scene.remove(ped.rag.group);ped.rag=null;}
}
for(let i=0;i<28;i++){
 const color='#'+new T.Color().setHSL((i*.61803398875)%1,.38,.48).getHexString(),ch=character({shirt:color,pants:'#424854',skin:'#c99e7b',hair:'#3b302a'});
 const ped={ch,health:100,meshes:[],rag:null,walkPhase:Math.random()*6,color};ch.root.traverse(m=>{if(m.isMesh){m.userData.pedestrian=ped;ped.meshes.push(m);}});pedestrians.push(ped);spawnPed(ped);
}
const civilianEvents=createCivilianEvents(pedestrians);
function killPed(ped,impulse){
 if(ped.health<=0)return;ped.health=0;ped.deadTime=12;dropCash(ped.ch.root.position);const ch=ped.ch;ch.root.updateMatrixWorld(true);
 const point=(x,y,z)=>new T.Vector3(x,y,z).applyMatrix4(ch.body.matrixWorld).toArray();
 const points=[point(0,.95,0),point(0,1.65,0),point(0,2.16,0)];
 for(const side of [-1,1]){const arm=ch.limbs.find(l=>l.arm&&l.side===side),leg=ch.limbs.find(l=>!l.arm&&l.side===side);
  points.push(arm.upper.getWorldPosition(new T.Vector3()).toArray(),arm.joint.getWorldPosition(new T.Vector3()).toArray(),arm.hand.getWorldPosition(new T.Vector3()).toArray(),leg.joint.getWorldPosition(new T.Vector3()).toArray(),leg.foot.getWorldPosition(new T.Vector3()).toArray());
 }
 const links=[[0,1],[1,2],[1,3],[3,4],[4,5],[0,6],[6,7],[1,8],[8,9],[9,10],[0,11],[11,12],[3,8],[0,3],[0,8],[3,2],[8,2],[6,11],[0,2],[3,6],[8,11]];
 const physics=createRagdoll(points,links,impulse,ragdollStiffness/100),group=new T.Group(),segments=[];
 const rig={physics};
 const torsoFrame=ragFrame(rig,{type:'torso',a:0,b:1});
 // Anchor the skull at the top of the actual torso, not at a free particle.
 rig.neckLocal=ch.body.localToWorld(new T.Vector3(0,1.895,0)).applyMatrix4(torsoFrame.clone().invert());
 rig.joints=new Map();
 for(const l of ch.limbs){
  const base=l.side===-1?3:8;
  const upper=l.arm?{type:'limb',a:base,b:base+1}:{type:'limb',a:0,b:base+3};
  const lower=l.arm?{type:'limb',a:base+1,b:base+2}:{type:'limb',a:base+3,b:base+4};
  const key=b=>b.a+':'+b.b;
  rig.joints.set(key(upper),{parent:{type:'torso',a:0,b:1},anchor:l.upper.getWorldPosition(new T.Vector3()).applyMatrix4(torsoFrame.clone().invert())});
  const upperFrame=ragFrame(rig,upper);
  rig.joints.get(key(upper)).restRotation=new T.Quaternion().setFromRotationMatrix(torsoFrame).invert().multiply(new T.Quaternion().setFromRotationMatrix(upperFrame));
  rig.joints.get(key(upper)).arm=l.arm;rig.joints.get(key(upper)).side=l.side;
  rig.joints.set(key(lower),{parent:upper,anchor:l.joint.getWorldPosition(new T.Vector3()).applyMatrix4(upperFrame.clone().invert()),arm:l.arm,side:l.side,lower:true});
  const lowerFrame=ragFrame(rig,lower);
  rig.joints.get(key(lower)).restRotation=new T.Quaternion().setFromRotationMatrix(upperFrame).invert().multiply(new T.Quaternion().setFromRotationMatrix(lowerFrame));
 }
 // Rebind every original mesh, including facial features, hair and shoes.
 // The geometry, textures and colours are shared rather than replaced by generic boxes.
 ch.root.traverse(original=>{
  if(!original.isMesh)return;
  let binding={type:'torso',a:0,b:1};
  for(const l of ch.limbs){
   let ancestor=original.parent,lower=false,belongs=false;
   while(ancestor&&ancestor!==ch.body){if(ancestor===l.joint)lower=true;if(ancestor===l.upper){belongs=true;break;}ancestor=ancestor.parent;}
   if(belongs){const base=l.side===-1?3:8;binding=l.arm?{type:'limb',a:lower?base+1:base,b:lower?base+2:base+1}:{type:'limb',a:lower?base+3:0,b:lower?base+4:base+3};break;}
  }
  if(binding.type==='torso'&&ch.body.worldToLocal(original.getWorldPosition(new T.Vector3())).y>1.9)binding={type:'head',a:2,b:1};
  const mesh=new T.Mesh(original.geometry,original.material);mesh.castShadow=original.castShadow;mesh.receiveShadow=original.receiveShadow;mesh.visible=original.visible;mesh.matrixAutoUpdate=false;
  const frame=ragFrame(rig,binding);const offset=frame.clone().invert().multiply(original.matrixWorld);
  group.add(mesh);segments.push({mesh,binding,offset});
 });
 scene.add(group);ch.root.visible=false;ped.rag={physics,group,segments,neckLocal:rig.neckLocal,joints:rig.joints};for(const bone of segments){bone.mesh.matrix.copy(ragFrame(ped.rag,bone.binding)).multiply(bone.offset);bone.mesh.matrixWorldNeedsUpdate=true;}
}
function hitPed(ped){if(ped.health<=0)return;const damage=weaponState.definition.damage;if(ped.health<=damage)killPed(ped,shotDirection.clone().multiplyScalar(4).add(new T.Vector3(0,2,0)).toArray());else ped.health-=damage;}
function ragFrame(rag,binding){
 const key=binding.type+':'+binding.a+':'+binding.b;
 if(rag.frameCache?.has(key))return rag.frameCache.get(key);
 const frame=computeRagFrame(rag,binding);rag.frameCache?.set(key,frame);return frame;
}
function computeRagFrame(rag,binding){
 const points=rag.physics.particles;
 const right=new T.Vector3().fromArray(points[8].p).sub(new T.Vector3().fromArray(points[3].p)).normalize();
 const torsoUp=new T.Vector3().fromArray(points[1].p).sub(new T.Vector3().fromArray(points[0].p)).normalize();
 let up=binding.type==='limb'||binding.type==='head'?new T.Vector3().fromArray(points[binding.a].p).sub(new T.Vector3().fromArray(points[binding.b].p)).normalize():torsoUp;
 let origin=new T.Vector3().fromArray(points[binding.a].p);
 if(binding.type==='limb'&&rag.joints){
  const joint=rag.joints.get(binding.a+':'+binding.b);
  if(joint)origin.copy(joint.anchor).applyMatrix4(ragFrame(rag,joint.parent));
 }
 if(binding.type==='head'&&rag.neckLocal){
  const torso=ragFrame(rag,{type:'torso',a:0,b:1});
  origin.copy(rag.neckLocal).applyMatrix4(torso);
  const desired=new T.Vector3().fromArray(points[2].p).sub(origin).normalize();
  const angle=torsoUp.angleTo(desired),limit=.65-.4*rag.physics.rigidity;
  const rotation=new T.Quaternion().setFromUnitVectors(torsoUp,desired);
  rotation.slerp(new T.Quaternion(),angle>limit?1-limit/angle:0);
  up=torsoUp.clone().applyQuaternion(rotation);
 }
 // A shared torso-relative swing frame avoids independent mesh twists and axis flips.
 right.addScaledVector(torsoUp,-right.dot(torsoUp));
 if(right.lengthSq()<.0001)right.set(1,0,0).addScaledVector(torsoUp,-torsoUp.x);
 if(right.lengthSq()<.0001)right.set(0,0,1).addScaledVector(torsoUp,-torsoUp.z);
 right.normalize().applyQuaternion(new T.Quaternion().setFromUnitVectors(torsoUp,up));
 const forward=new T.Vector3().crossVectors(right,up).normalize();
 const result=new T.Matrix4().makeBasis(right,up,forward).setPosition(origin);
 if(binding.type==='limb'&&rag.joints){
  const joint=rag.joints.get(binding.a+':'+binding.b);
  if(joint?.restRotation){
   const parentRotation=new T.Quaternion().setFromRotationMatrix(ragFrame(rag,joint.parent));
   const restWorld=parentRotation.clone().multiply(joint.restRotation);
   const relative=restWorld.clone().invert().multiply(new T.Quaternion().setFromRotationMatrix(result));
   const angle=new T.Euler().setFromQuaternion(relative,'XYZ');
   const freedom=1-.65*rag.physics.rigidity;
   if(joint.lower){angle.x=T.MathUtils.clamp(angle.x,joint.arm?-1.65*freedom:-.12,joint.arm?.12:1.65*freedom);angle.y=0;angle.z=0;}
   else{angle.x=T.MathUtils.clamp(angle.x,-(joint.arm?1.25:.85)*freedom,(joint.arm?1.25:.85)*freedom);angle.y=T.MathUtils.clamp(angle.y,-.12*freedom,.12*freedom);angle.z=T.MathUtils.clamp(angle.z,joint.arm?(joint.side<0?-.65*freedom:-.05):-.15*freedom,joint.arm?(joint.side>0?.65*freedom:.05):.15*freedom);}
   result.makeRotationFromQuaternion(restWorld.multiply(new T.Quaternion().setFromEuler(angle))).setPosition(origin);
  }
 }
 return result;
}
function groundRagdoll(rag,height){
 // Joint limits can put visible corners beyond their physics particles.
 // Lift the connected body together so no mesh is pushed away from its joint.
 rag.frameCache??=new Map();rag.frameCache.clear();
 let lift=0;
 const corner=new T.Vector3();
 for(const bone of rag.segments){
  bone.mesh.matrix.copy(ragFrame(rag,bone.binding)).multiply(bone.offset);
  bone.mesh.matrixWorldNeedsUpdate=true;
  const geometry=bone.mesh.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();
  const bounds=geometry.boundingBox;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   corner.set(x,y,z).applyMatrix4(bone.mesh.matrix);
   lift=Math.max(lift,height(corner.x,corner.z)+.006-corner.y);
  }
 }
 rag.group.position.y=lift;
 rag.group.updateMatrixWorld(true);
}
function ragTerrain(rag,dt){
 const origin=rag.physics.particles[0].p,cached=rag.terrain;
 if(cached){cached.ttl-=dt;if(cached.ttl>0&&Math.hypot(origin[0]-cached.x,origin[2]-cached.z)<8)return cached;}
 const x=origin[0],z=origin[2],range=20;
 const roads=world.roads.filter(r=>r.a?x>=Math.min(r.a[0],r.b[0])-r.d/2-range&&x<=Math.max(r.a[0],r.b[0])+r.d/2+range&&z>=Math.min(r.a[1],r.b[1])-r.d/2-range&&z<=Math.max(r.a[1],r.b[1])+r.d/2+range:Math.abs(r.x-x)<r.w/2+range&&Math.abs(r.z-z)<r.d/2+range);
 const grounds=(world.groundSurfaces||[]).filter(g=>Math.abs(g.x-x)<(Math.abs(Math.cos(g.angle))*g.w+Math.abs(Math.sin(g.angle))*g.d)/2+range&&Math.abs(g.z-z)<(Math.abs(Math.sin(g.angle))*g.w+Math.abs(Math.cos(g.angle))*g.d)/2+range).map(g=>({...g,c:Math.cos(g.angle),s:Math.sin(g.angle)}));
 const floors=walkSurfaces.filter(m=>m.visible&&m.parent&&Math.abs(m.position.x-x)<m.geometry.parameters.width/2+range&&Math.abs(m.position.z-z)<m.geometry.parameters.depth/2+range);
 const walls=obstacles.filter(o=>Math.abs(o.x-x)<o.w/2+range&&Math.abs(o.z-z)<o.d/2+range);
 const height=(px,pz)=>{let h=0;for(const r of roads)if(roadContains(r,px,pz))h=Math.max(h,r.height??.065);for(const g of grounds){const dx=px-g.x,dz=pz-g.z;if(Math.abs(dx*g.c-dz*g.s)<=g.w/2&&Math.abs(dx*g.s+dz*g.c)<=g.d/2)h=Math.max(h,g.top);}for(const m of floors){const g=m.geometry.parameters;if(m.visible&&m.parent&&Math.abs(px-m.position.x)<=g.width/2&&Math.abs(pz-m.position.z)<=g.depth/2)h=Math.max(h,m.position.y+g.height/2);}return h;};
 return rag.terrain={x,z,ttl:.5,height,walls};
}
function updatePedestrians(dt){
 const active=playing&&!paused;let relocationBudget=2;if(active)civilianEvents.tick(dt);
 for(const ped of pedestrians){
  if(ped.rag){if(active){ped.deadTime-=dt;const rag=ped.rag;
   if(!rag.physics.sleeping){const terrain=ragTerrain(rag,dt);stepRagdoll(rag.physics,dt,terrain.height,terrain.walls);groundRagdoll(rag,terrain.height);}
   if(ped.deadTime<=0&&!ped.prologue)spawnPed(ped);
  }continue;}
  if(ped.prologue){ped.ch.root.visible=ped.health>0;continue;}
  if(!ped.route){if(active)spawnPed(ped,player.root.position);continue;}
  if(active&&ped.ch.root.position.distanceToSquared(player.root.position)>350*350&&relocationBudget>0){relocationBudget--;spawnPed(ped,player.root.position);}
  const pos=ped.ch.root.position,distanceSq=pos.distanceToSquared(player.root.position),near=distanceSq<150*150;
  const shadows=distanceSq<45*45;if(ped.shadowEnabled!==shadows){ped.shadowEnabled=shadows;for(const mesh of ped.meshes)mesh.castShadow=shadows;}ped.ch.root.visible=near;if(!active||!near)continue;
  const impactCar=cars.find(car=>car.root.visible&&Math.abs(car.speed)>2.5&&insideCar(pos.x,pos.z,car,.45));
  if(impactCar){
   killPed(ped,[Math.sin(impactCar.yaw)*impactCar.speed*.7,3+Math.abs(impactCar.speed)*.13,Math.cos(impactCar.yaw)*impactCar.speed*.7]);continue;
  }
  ped.brainTime=(ped.brainTime||0)+dt;if(ped.brainTime<.05)continue;const step=ped.brainTime;ped.brainTime=0;
  ped.reaction=Math.max(0,(ped.reaction||0)-step);ped.panic=Math.max(0,(ped.panic||0)-step);ped.wait=Math.max(0,(ped.wait||0)-step);
  const pace=ped.wait>0||ped.reaction>0?0:ped.panic>0?ped.fleeSpeed:ped.walkSpeed;
  let next=ped.routeDistance+ped.walkDirection*pace*step;
  if(next<0||next>ped.route.length){if(ped.panic<=0)ped.walkDirection*=-1;ped.wait=ped.panic>0?ped.panic:.5+Math.random()*2;next=clamp(next,0,ped.route.length);}
  const index=Math.min(ped.route.points.length-2,Math.floor(next/3)),t=next/3-index,a=ped.route.points[index],b=ped.route.points[index+1],nx=T.MathUtils.lerp(a.x,b.x,t),nz=T.MathUtils.lerp(a.z,b.z,t);
  ped.heading=Math.atan2((b.x-a.x)*ped.walkDirection,(b.z-a.z)*ped.walkDirection);
  const occupied=pedestrians.some(other=>other!==ped&&!other.prologue&&other.health>0&&Math.hypot(other.ch.root.position.x-nx,other.ch.root.position.z-nz)<.65);
  if(!blocked(nx,nz)&&!occupied){pos.x=nx;pos.z=nz;ped.routeDistance=next;}else{ped.wait=.6;ped.walkDirection*=-1;}
  ped.ch.root.rotation.y+=Math.atan2(Math.sin(ped.heading-ped.ch.root.rotation.y),Math.cos(ped.heading-ped.ch.root.rotation.y))*(1-Math.exp(-step*7));
  ped.animTime=(ped.animTime||0)+step;if(distanceSq<55*55||ped.animTime>=.1){const animStep=ped.animTime;ped.animTime=0;const saved=phase;phase=ped.walkPhase+=animStep*pace*2.7;animateChar(ped.ch,animStep,pace,false,false);phase=saved;}
 }
}
function targetMeshes(){return[...shootable.filter(m=>m.visible&&m.parent&&(!m.userData.trafficCar||m.userData.trafficCar.root.visible)&&m.getWorldPosition(new T.Vector3()).distanceToSquared(player.root.position)<500*500),...pedestrians.filter(p=>p.health>0&&p.ch.root.visible).flatMap(p=>p.meshes)];}
const weaponAim=new T.Vector3(),weaponRotation=new T.Quaternion(),handRotation=new T.Quaternion(),barrelAxis=new T.Vector3(0,0,1),cameraForward=new T.Vector3();
function equipWeapon(n){if(driving)return;audio.effect('weapon_draw');weaponState.equip(n);triggerHeld=false;shotQueued=false;}
document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>equipWeapon(+b.dataset.weapon));$('holster').onclick=()=>weaponState.holster();
addEventListener('keydown',e=>{if(!playing||paused||e.repeat)return;if(e.code==='Digit4')equipWeapon(0);if(e.code==='Digit5')equipWeapon(1);if($('networkgame').hidden&&['Digit6','Digit7','Digit8'].includes(e.code))equipWeapon(+e.code.slice(-1)-4);if(e.code==='KeyH')weaponState.holster();if(e.code==='KeyR')weaponState.reload();});
const weaponIcons=[
 'M-35-12h55v15H3L-5 30h-17l6-30h-19z M-29-17h43 M20-8h12',
 'M-53-7h70v15h-33l-5 27h-13l3-27h-22l-7 12h-15V-7z M17-3h37 M-5 8v18h10V8 M-20-13h22',
 'M-53-5h72v12h-51l-18 17h-17V-5z M19-2h36 M-5 7h25v9H-5',
 'M-55-3h77v11H-29l-18 18h-17V-3z M22 0h37 M-14-19h31v10h-31z M-5-9v6 M5 8l12 20',
 'M-33-9h43v20H-2v25h-14V11h-17z M10-4h23 M-33-2h-17v17h17 M-18-15h25',
 'M-26 6l17-23 18 23 17-23 M-25 21h50'
];
function renderWeaponWheel(){
 const owned=wheelSelection===5||weaponState.owned[wheelSelection],w=WEAPONS[wheelSelection];
 $('wheelname').textContent=wheelSelection===5?'BEZ BRONI':w.name;
 $('wheeldetail').textContent=wheelSelection===5?'Schowaj broń':owned?weaponState.ammo[wheelSelection]+' / '+w.capacity+' · ZAPAS ∞':'ZABLOKOWANA · $'+w.price;
 $('wheelhint').textContent=owned?'Puść TAB, aby wybrać':'Kup w sklepie z bronią w centrum';
 let svg='';const point=(r,a)=>[250+r*Math.sin(a),250-r*Math.cos(a)];
 for(let i=0;i<6;i++){
  const angle=i*Math.PI/3,start=angle-Math.PI/6+.025,end=angle+Math.PI/6-.025,a=point(216,start),b=point(216,end),c=point(116,end),d=point(116,start),v=point(164,angle),active=i===wheelSelection,available=i===5||weaponState.owned[i];
  svg+='<g class="wheel-sector '+(active?'chosen ':'')+(!available?'locked':'')+'"><path class="slice" d="M'+a+' A216 216 0 0 1 '+b+' L'+c+' A116 116 0 0 0 '+d+' Z"/><g transform="translate('+v[0]+' '+(v[1]-8)+') scale(.62)"><path class="gun-icon" d="'+weaponIcons[i]+'"/></g><text x="'+v[0]+'" y="'+(v[1]+25)+'">'+(i===5?'SCHOWAJ':available?weaponState.ammo[i]+' / '+WEAPONS[i].capacity:'🔒 $'+WEAPONS[i].price)+'</text></g>';
 }
 $('wheelgraphic').innerHTML=svg;
 $('wheelcursor').style.left=(50+wheelX/5)+'%';$('wheelcursor').style.top=(50+wheelY/5)+'%';
}
function openWeaponWheel(){if(!playing||paused||driving||playerState.failed||!$('networkgame').hidden||!$('ramsequence').hidden||!$('loottiming').hidden)return false;wheelOpen=true;paused=true;wheelSelection=weaponState.equipped?weaponState.selected:5;const a=wheelSelection*Math.PI/3;wheelX=Math.sin(a)*160;wheelY=-Math.cos(a)*160;keys.clear();triggerHeld=false;shotQueued=false;jumpQueued=false;$('weaponwheel').hidden=false;renderWeaponWheel();return true;}
function closeWeaponWheel(confirm=true){if(!wheelOpen)return;wheelOpen=false;$('weaponwheel').hidden=true;paused=false;keys.clear();if(confirm){if(wheelSelection===5)weaponState.holster();else if(weaponState.owned[wheelSelection])equipWeapon(wheelSelection);}}
function moveWeaponWheel(e){if(document.pointerLockElement=== $('world')){wheelX+=(e.movementX||0)*.85;wheelY+=(e.movementY||0)*.85;}else{const r=$('wheelgraphic').getBoundingClientRect();wheelX=(e.clientX-r.left-r.width/2)*500/r.width;wheelY=(e.clientY-r.top-r.height/2)*500/r.height;}const radius=Math.hypot(wheelX,wheelY);if(radius>210){wheelX*=210/radius;wheelY*=210/radius;}if(radius>65)wheelSelection=Math.round((Math.atan2(wheelX,-wheelY)+Math.PI*2)/(Math.PI/3))%6;renderWeaponWheel();}
addEventListener('keydown',e=>{if(e.code==='Tab'&&playing&&!shopOpen){e.preventDefault();if(!e.repeat)openWeaponWheel();}});
addEventListener('keyup',e=>{if(e.code==='Tab')closeWeaponWheel(true);});
$('wheelbutton').onclick=()=>{if(wheelOpen)closeWeaponWheel(true);else openWeaponWheel();};
$('weaponwheel').addEventListener('mousemove',e=>{if(wheelOpen&&document.pointerLockElement!==$('world'))moveWeaponWheel(e);});
$('wheelgraphic').addEventListener('pointerdown',e=>{if(wheelOpen){moveWeaponWheel(e);closeWeaponWheel(true);}});
$('wheelcancel').onclick=()=>closeWeaponWheel(false);
// Mouse events report each button press, including left-click while right-click is held.
addEventListener('mousedown',e=>{if(!playing||paused||document.pointerLockElement!==$('world'))return;if(e.button===2)aiming=true;if(e.button===0&&weaponState.equipped){triggerHeld=true;shotQueued=true;}});
addEventListener('mouseup',e=>{if(e.button===0)triggerHeld=false;if(e.button===2)aiming=false;});
$('world').addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.button!==0||!playing||paused||!weaponState.equipped)return;triggerHeld=true;shotQueued=true;});
addEventListener('pointerup',e=>{if(e.pointerType==='touch')triggerHeld=false;});addEventListener('pointercancel',()=>{triggerHeld=false;aiming=false;});
$('touchfire').addEventListener('pointerdown',e=>{e.preventDefault();if(!playing||paused)return;triggerHeld=true;shotQueued=true;e.currentTarget.setPointerCapture(e.pointerId);});$('touchfire').addEventListener('pointerup',()=>triggerHeld=false);$('touchfire').addEventListener('pointercancel',()=>triggerHeld=false);$('touchreload').onclick=()=>weaponState.reload();
function shoot(){
 if(!weaponState.fire())return;const w=weaponState.definition;civilianEvents.gunshot(player.root.position);audio.effect(['shot_pistol','shot_rifle','shot_shotgun','shot_sniper','shot_smg'][weaponState.selected],weaponState.selected>0?1:.7);
 const gun=guns[weaponState.selected];player.root.updateMatrixWorld(true);gun.muzzle.getWorldPosition(muzzlePoint);
 // The crosshair ray is authoritative; the muzzle only supplies visual effects.
 camera.updateMatrixWorld(true);
 const meshes=targetMeshes();shotRay.setFromCamera(new T.Vector2(0,0),camera);
 const shotOrigin=shotRay.ray.origin.clone(),cameraDirection=shotRay.ray.direction.clone();
 for(let pellet=0;pellet<w.pellets;pellet++){
 shotDirection.copy(cameraDirection);if(w.spread)shotDirection.add(new T.Vector3((Math.random()-.5)*w.spread,(Math.random()-.5)*w.spread,(Math.random()-.5)*w.spread)).normalize();shotRay.set(shotOrigin,shotDirection);shotRay.far=w.range;
 const hit=shotRay.intersectObjects(meshes,false)[0];aimPoint.copy(hit?hit.point:shotRay.ray.at(shotRay.far,new T.Vector3()));if(hit?.object.userData.pedestrian){hitPed(hit.object.userData.pedestrian);gameEffects.spawn('blood',hit.point,3);audio.effect('hit');$('hitmarker').style.opacity=1;}
 const trace=new T.Line(new T.BufferGeometry().setFromPoints([muzzlePoint.clone(),aimPoint.clone()]),new T.LineBasicMaterial({color:'#ffe4a0',transparent:true,opacity:.75}));scene.add(trace);effects.push({mesh:trace,time:.065});
 }
 gameEffects.spawn('brass',muzzlePoint,1);recoil=1;flashTime=.055;
}
// Solve a bent elbow without stretching either rectangular arm segment.
function poseWeaponArm(ch,side,worldTarget){
 const limb=ch.limbs.find(l=>l.arm&&l.side===side),down=new T.Vector3(0,-1,0);
 ch.body.updateWorldMatrix(true,false);
 const shoulder=limb.upper.position.clone(),end=ch.body.worldToLocal(worldTarget.clone()),direction=end.clone().sub(shoulder);
 const length=.43,distance=clamp(direction.length(),.06,length*2-.015);direction.normalize();
 end.copy(shoulder).addScaledVector(direction,distance);
 const bend=new T.Vector3(side*.45,-1,-.12);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
 const elbow=shoulder.clone().addScaledVector(direction,distance/2).addScaledVector(bend,Math.sqrt(length*length-distance*distance/4));
 limb.upper.quaternion.setFromUnitVectors(down,elbow.clone().sub(shoulder).normalize());
 const lowerDirection=end.sub(elbow).normalize().applyQuaternion(limb.upper.quaternion.clone().invert());
 limb.joint.quaternion.setFromUnitVectors(down,lowerDirection);
 limb.upper.updateWorldMatrix(false,true);
}
function updateWeapons(dt){
 if(playing&&!paused&&weaponState.equipped)player.root.rotation.y=yaw+Math.PI;
 const heldPose=weaponState.equipped&&!driving&&weaponState.reloadLeft<=0;
 if(heldPose){
  player.root.updateMatrixWorld(true);
  const gripTarget=new T.Vector3(-.12,-.17,.34).applyAxisAngle(new T.Vector3(1,0,0),pitch).add(new T.Vector3(0,1.85,0));
  poseWeaponArm(player,-1,player.body.localToWorld(gripTarget));
 }
 const hand=player.limbs.find(l=>l.arm&&l.side===-1).hand;
 player.root.updateMatrixWorld(true);hand.getWorldQuaternion(handRotation);camera.getWorldDirection(weaponAim);
 weaponRotation.setFromUnitVectors(barrelAxis,weaponAim);
 if(!paused&&playing){weaponState.tick(dt);recoil=Math.max(0,recoil-dt*9);flashTime=Math.max(0,flashTime-dt);
  if(weaponState.equipped){if(shotQueued||(triggerHeld&&weaponState.definition.automatic))shoot();}
  shotQueued=false;
 }
 for(let i=0;i<guns.length;i++){
  const gun=guns[i];if(gun.group.parent!==hand)hand.add(gun.group);
  gun.group.visible=weaponState.equipped&&weaponState.selected===i;
  gun.group.quaternion.copy(handRotation).invert().multiply(weaponRotation);
  gun.group.rotateX(-recoil*.095);if(gun.slide)gun.slide.position.z=-recoil*.075;
  gun.group.position.copy(gun.grip).negate().applyQuaternion(gun.group.quaternion);
  const progress=weaponState.reloadLeft>0?1-weaponState.reloadLeft/weaponState.definition.reloadTime:0;
  gun.magazine.position.y=gun.magazineY-Math.sin(progress*Math.PI)*.48;gun.magazine.rotation.x=Math.sin(progress*Math.PI)*.3;gun.group.rotateZ(Math.sin(progress*Math.PI)*-.35);gun.group.rotateX(Math.sin(progress*Math.PI)*.4);if(progress>0&&!audio.reloadSeen)audio.effect('reload');audio.reloadSeen=progress>0;
  gun.flash.visible=gun.group.visible&&flashTime>0;
 }
 if(heldPose){
  const gun=guns[weaponState.selected];gun.group.updateWorldMatrix(true,false);
  const support=gun.grip.clone().add(new T.Vector3(.065,-.025,weaponState.selected>0?.22:.015));
  poseWeaponArm(player,1,gun.group.localToWorld(support));
 }
 for(let i=effects.length-1;i>=0;i--){const fx=effects[i];if(!paused)fx.time-=dt;if(fx.time<=0){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();effects.splice(i,1);}}
 $('crosshair').hidden=!weaponState.equipped||!playing||paused;
 $('ammo').textContent=weaponState.equipped?weaponState.definition.name+'  '+weaponState.ammo[weaponState.selected]+' / '+weaponState.definition.capacity+'  ∞':'BROŃ SCHOWANA';
 $('weaponstatus').textContent=weaponState.reloadLeft>0?'PRZEŁADOWANIE…':weaponState.equipped&&weaponState.ammo[weaponState.selected]===0?'PUSTY MAGAZYNEK · R: przeładuj':'LPM: strzał · R: przeładuj · zapas ∞';
 document.querySelectorAll('[data-weapon]').forEach(b=>{b.disabled=!weaponState.owned[+b.dataset.weapon];b.classList.toggle('active',weaponState.equipped&&+b.dataset.weapon===weaponState.selected);});
}
// The visible pavement and court sit above the world origin.
walkSurfaces.push(...scene.children.filter(m=>m.isMesh&&m.geometry.type==='BoxGeometry'&&m.geometry.parameters.height<=.6&&m.position.y+m.geometry.parameters.height/2<=.65));
const soleCorner=new T.Vector3();
let groundIndex=null,groundIndexSize='';
function nearbyGround(x,z){
 const size=world.roads.length+':'+world.groundSurfaces.length;
 if(size!==groundIndexSize){groundIndexSize=size;groundIndex=new Map();
  const add=(item,type,minX,maxX,minZ,maxZ)=>{for(let ix=Math.floor(minX/64);ix<=Math.floor(maxX/64);ix++)for(let iz=Math.floor(minZ/64);iz<=Math.floor(maxZ/64);iz++){const key=ix+','+iz;if(!groundIndex.has(key))groundIndex.set(key,[]);groundIndex.get(key).push({item,type});}};
  for(const r of world.roads){const pad=r.d/2+1;add(r,0,Math.min(r.a[0],r.b[0])-pad,Math.max(r.a[0],r.b[0])+pad,Math.min(r.a[1],r.b[1])-pad,Math.max(r.a[1],r.b[1])+pad);}
  for(const g of world.groundSurfaces){const c=Math.abs(Math.cos(g.angle)),s=Math.abs(Math.sin(g.angle)),w=(g.w*c+g.d*s)/2,d=(g.w*s+g.d*c)/2;add(g,1,g.x-w,g.x+w,g.z-d,g.z+d);}
 }
 return groundIndex.get(Math.floor(x/64)+','+Math.floor(z/64))||[];
}
function surfaceHeight(x,z){
  const nearby=nearbyGround(x,z);let height=0;for(const {item:r,type} of nearby)if(type===0)if(roadContains(r,x,z))height=Math.max(height,r.height??.065);for(const {item:g,type} of nearby){if(type!==1)continue;const dx=x-g.x,dz=z-g.z,c=Math.cos(g.angle),s=Math.sin(g.angle);if(Math.abs(dx*c-dz*s)<=g.w/2&&Math.abs(dx*s+dz*c)<=g.d/2)height=Math.max(height,g.top);}
  for(const m of walkSurfaces){const g=m.geometry.parameters;
    if(Math.abs(x-m.position.x)<=g.width/2&&Math.abs(z-m.position.z)<=g.depth/2)
      height=Math.max(height,m.position.y+g.height/2);
  }
  return height;
}
function keepSolesAboveGround(ch){
  ch.root.updateMatrixWorld(true);
  let lift=0;
  for(const l of ch.limbs){if(!l.foot)continue;
    // Check all corners, including the tilted toe and heel during a stride.
    for(const x of [-.145,.145])for(const y of [-.085,.085])for(const z of [-.21,.21]){
      soleCorner.set(x,y,z).applyMatrix4(l.foot.matrixWorld);
      const floor=surfaceHeight(soleCorner.x,soleCorner.z);
      // Animation clearance must never lift the entire character onto a prop.
      if(floor<=ch.root.position.y+.2)lift=Math.max(lift,floor+.008-soleCorner.y);
    }
  }
  ch.body.position.y+=lift;
}
// A weighted gait: slow planted stride, quick recovery, and a compressed landing.
function animateChar(ch,dt,speed,crouching,air){
  const b=ch.body, active=ch===player;
  const weight=clamp(speed/3,0,1), run=clamp((speed-4)/2.8,0,1);
  const impact=active?landingImpact:0, windup=active?jumpWindup:0;
  const cycle=phase, contact=Math.abs(Math.cos(cycle));
  const bounce=weight*(Math.pow(contact,1.8)-.58)*(.035+run*.055);
  const compression=impact*.19+(windup>0?.14*(1-windup/.11):0);
  const braced=active&&weaponState.equipped&&!driving&&!air?1:0;
  const planted=braced*(1-weight);
  const bob=(crouching?-.39:0)+(air?0:bounce)-compression-planted*.045;
  b.position.y=T.MathUtils.damp(b.position.y,bob,air?12:28,dt);
  b.rotation.x=T.MathUtils.damp(b.rotation.x,(crouching?.3:weight*(.06+run*.19)+braced*.1)+impact*.16+(windup>0?.16:0),18,dt);
  b.rotation.z=T.MathUtils.damp(b.rotation.z,air?0:Math.sin(cycle)*weight*(crouching?.008:.009+run*.007),20,dt);
  b.rotation.y=T.MathUtils.damp(b.rotation.y,air?0:Math.sin(cycle)*weight*(.018+run*.025)-braced*.16,18,dt);
  const gaitRotation=new T.Quaternion(),gaitEuler=new T.Euler();
  for(const l of ch.limbs){
    const t=cycle+(l.side===1?Math.PI:0), wave=Math.sin(t);
    // The planted leg travels smoothly; the returning knee snaps upward.
    const swing=Math.sign(wave)*Math.pow(Math.abs(wave),.72);
    const recovery=Math.pow(Math.max(0,Math.sin(t-.45)),2);
    let a=0,k=0;
    if(air){
      const rise=clamp((active?velY:0)/7.4,0,1), fall=clamp(-(active?velY:0)/8,0,1);
      a=l.arm?-.65-rise*.65:l.side*(.24+rise*.3)-fall*.18;
      k=l.arm?-.65: .35+rise*.8+fall*.25;
    }else if(crouching){
      a=l.arm?-.4:-.88; k=l.arm?-.65:1.5;
      a+=swing*weight*(l.arm?-.22:.28);
      if(!l.arm)k+=recovery*weight*.35;
    }else if(weight>.01){
      if(l.arm){
        a=-swing*weight*(.34+run*.24);
      }else{
        // The forward swing is thrown farther and faster than the rear push-off.
        const forwardThrow=Math.pow(Math.max(0,-wave),.55);
        const rearPush=Math.pow(Math.max(0,wave),.72);
        a=weight*(rearPush*(.42+run*.3)-forwardThrow*(.42+run*.62));
      }
      k=l.arm?-(.15+run*.82)*weight-wave*.06*weight:recovery*weight*(.6+run*1.15)+.035*weight;
    }
    if(active&&weaponState.equipped&&l.arm){
      const supporting=weaponState.selected>0&&l.side===1;
      if(l.side===-1||supporting){a=-1.08+pitch*.7+recoil*.1;k=supporting?-.62:-.48;if(weaponState.reloadLeft>0){const reload=1-weaponState.reloadLeft/weaponState.definition.reloadTime;a+=.3+Math.sin(reload*Math.PI)*(l.side===1?.35:0);k-=.3+Math.sin(reload*Math.PI)*(l.side===1?.45:0);}}
    }
    if(!l.arm&&!crouching){a+=planted*(l.side===-1?.12:-.18);k+=planted*.23;}
    if(!air){
      if(l.arm){a-=impact*.38;k-=impact*.35;}
      else{a-=compression*2.2;k+=compression*4.1;}
    }
    // Blend complete rotations so weapon IK cannot leave a forearm twist behind.
    const spread=l.arm?l.side*.025:-l.side*planted*.065;
    gaitRotation.setFromEuler(gaitEuler.set(a,0,spread));
    l.upper.quaternion.slerp(gaitRotation,1-Math.exp(-dt*24));
    gaitRotation.setFromEuler(gaitEuler.set(k,l.arm?-l.side*.1*run:0,0));
    l.joint.quaternion.slerp(gaitRotation,1-Math.exp(-dt*(!l.arm&&wave<0?28+run*18:28)));
  }
  if(!air)keepSolesAboveGround(ch);
}
const missionAPI={
 groundHeight:surfaceHeight,loopSound:(name,volume)=>audio.ctx&&audio.customLoop(name,volume),soundDuration:name=>audio.customBuffers.get(name)?.duration||0,income:amount=>weaponState.addMoney(amount),controlIndex:()=>selected,sound:name=>audio.effect(name),heal:amount=>playerState.health=Math.min(100,playerState.health+amount),
 hitEnemy:(ped,damage)=>{ped.health-=damage;if(ped.health<=0){ped.health=1;killPed(ped,[0,1,0]);}},
 saveEnding:value=>{progress.ending=value;writeProgress();},
 explode:p=>{gameEffects.spawn('dust',new T.Vector3(p.x,2,p.z),40);gameEffects.spawn('blood',new T.Vector3(p.x,1,p.z),8);audio.effect('crash',2);const fire=new T.Mesh(new T.SphereGeometry(10,12,8),new T.MeshBasicMaterial({color:'#ff8b35',transparent:true,opacity:.75,depthWrite:false}));fire.position.set(p.x,3,p.z);scene.add(fire);effects.push({mesh:fire,time:.8});},
 destroyBarn:()=>{if(destroyedBarn.length)return;destroyedBarn=scene.children.filter(m=>m.isMesh&&m.geometry.type==='BoxGeometry'&&Math.abs(m.position.x-MAP.locations.barn.x)<24&&Math.abs(m.position.z-MAP.locations.barn.z)<25);missionAPI.toggleContent(destroyedBarn,[],false);for(let i=0;i<10;i++){const rubble=box(3+i%3,.7,2,MAP.locations.barn.x-10+i%5*5,.35,MAP.locations.barn.z-8+Math.floor(i/5)*12,'#77604a');rubble.rotation.y=i*.7;barnRubble.push(rubble);}},
 setEnding:(value,crew)=>{endingMode=value;if(!value){for(const ch of chars)ch.root.visible=true;for(const ch of crew)ch.root.visible=false;}if(!value&&destroyedBarn.length){missionAPI.toggleContent(destroyedBarn,[],true);destroyedBarn=[];for(const rubble of barnRubble)scene.remove(rubble);barnRubble=[];}if(value==='solo'){missionAPI.switchControl(chars[2],'MACIOSZEK',2);for(const ch of [...chars,...crew])ch.root.visible=ch===chars[2];}else if(value==='family'){for(const [i,ch]of [...chars,...crew].entries()){ch.root.visible=true;if(ch!==player&&ch.root.position.distanceToSquared(player.root.position)>150*150)ch.root.position.set(player.root.position.x+3+i,0,player.root.position.z+3);}}},
missionComplete:missionCompleted,scene,box,sign,character,surfaceMaterial:(color,role)=>surfaces.material(color,role,true),makeCar,makeScooter,pedestrians,chars,nearestVehicle:()=>{let best=null,distance=Infinity;for(const car of cars){if(!car.root.visible||!car.root.parent||car.enterable===false)continue;const d=Math.hypot(car.x-player.root.position.x,car.z-player.root.position.z);if(d<distance){best=car;distance=d;}}return best;},animate:animateChar,addRoad:r=>world.roads.push(r),
 poseRider:(ch,car)=>{ch.root.position.set(car.x,(car.chassisY||0)+(car.rideHeight||.3),car.z);ch.root.rotation.set(car.pitch||0,car.yaw,car.roll||0,'YXZ');for(const l of ch.limbs){l.upper.rotation.x=l.arm?-1.1:0;l.joint.rotation.x=l.arm?-.15:.1;}},
 fail:reason=>playerState.fail(reason),
 enemyAttack:(ch,dt)=>{const distance=ch.root.position.distanceTo(player.root.position);if(distance>45)return;ch.root.userData.fireWait=(ch.root.userData.fireWait||0)-dt;if(ch.root.userData.fireWait>0)return;ch.root.userData.fireWait=.8+Math.random()*.6;const from=ch.root.position.clone().add(new T.Vector3(0,1.5,0)),to=player.root.position.clone().add(new T.Vector3(0,crouch?.75:1.2,0)),r=new T.Raycaster(from,to.clone().sub(from).normalize(),0,distance);if(r.intersectObjects(shootable.filter(m=>m.visible&&m.parent),false).some(hit=>hit.distance<distance-.7))return;const trace=new T.Line(new T.BufferGeometry().setFromPoints([from,to]),new T.LineBasicMaterial({color:'#ff9b72'}));scene.add(trace);effects.push({mesh:trace,time:.09});audio.effect('shot',.22);if(Math.random()<(crouch?.3:.65)){playerState.damage(distance<15?12:7,'Zostałeś postrzelony.');audio.effect('hurt');}},
 driveAI:(car,target,dt)=>{const goal=vehicleNavigation.follow(car,target,dt);driveAI(car,goal,dt,(x,z,yaw)=>carBlocked(x,z,yaw,car),surfaceHeight);car.root.position.set(car.x,car.chassisY||0,car.z);car.root.rotation.set(car.pitch||0,car.yaw,car.roll||0,'YXZ');for(const [i,w] of car.wheels.entries()){w.wheel.rotation.x+=car.speed*dt/((car.kind==='scooter'?.22:.42)*car.root.scale.y);w.pivot.position.y=(car.kind==='scooter'?.22:.4)+(car.contacts?.[i]?.compression||0)/car.root.scale.y;}},
 toggleContent:(objects,roads,enabled)=>{
 grass?.invalidate();surfaces.apply(scene);vehicleNavigation.invalidate();
 for(const mesh of objects){if(enabled){scene.add(mesh);if(mesh.userData.obstacle&&!obstacles.includes(mesh.userData.obstacle))obstacles.push(mesh.userData.obstacle);}else{scene.remove(mesh);const i=obstacles.indexOf(mesh.userData.obstacle);if(i>=0)obstacles.splice(i,1);}}
 for(const list of [shootable,camSolids,walkSurfaces])for(const mesh of objects){const i=list.indexOf(mesh);if(!enabled&&i>=0)list.splice(i,1);else if(enabled&&mesh.isMesh&&!list.includes(mesh)){if(list===shootable||list===camSolids&&mesh.geometry.type==='BoxGeometry'&&(mesh.geometry.parameters.height>1||mesh.position.y>2&&mesh.geometry.parameters.width>5&&mesh.geometry.parameters.depth>5)||list===walkSurfaces&&mesh.geometry.type==='BoxGeometry'&&mesh.geometry.parameters.height<=.6&&mesh.position.y+mesh.geometry.parameters.height/2<=.65)list.push(mesh);}}
 for(const car of [...cars])if(objects.includes(car.root)){const i=cars.indexOf(car);if(!enabled&&i>=0)cars.splice(i,1);}if(enabled)for(const mesh of objects)if(mesh.userData.storyCar&&!cars.includes(mesh.userData.storyCar))cars.push(mesh.userData.storyCar);
 for(const road of roads){const i=world.roads.indexOf(road);if(!enabled&&i>=0)world.roads.splice(i,1);else if(enabled&&i<0)world.roads.push(road);}
 },
 upgrade:key=>{if(key==='reset'){WEAPONS[0].reloadTime=1.25;WEAPONS[1].reloadTime=1.85;for(const car of cars){if(car.kind==='scooter'){car.maxSpeed=85/3.6;car.engineMultiplier=.85;}else{car.maxSpeed=(car.police?135:115)/3.6;delete car.engineMultiplier;}}}if(key==='reload')for(const weapon of WEAPONS)weapon.reloadTime*=.8;if(key==='van')for(const car of cars.filter(c=>c.kind!=='scooter'&&!c.police)){car.maxSpeed=120/3.6;car.engineMultiplier=1.25;}if(key==='advanced'){$('missiondialog').textContent='Zaawansowane opcje: tryb cichy, dłuższe okno infiltracji, plan Kopernika.';}if(key==='plan')$('missiondialog').textContent='Plan Piastowskiej przygotowany. Kolejny napad czeka na następny rozdział.';},
 switchControl:(ch,label,index=-1)=>{const current=player.root.position.clone(),heading=player.root.rotation.y;if(ch!==player){player.root.position.copy(ch.root.position);ch.root.position.copy(current);ch.root.rotation.y=heading;}weaponState.holster();if(driving){driving.speed=0;driving=null;}player=ch;selected=index;ch.root.visible=true;$('name').textContent=label;$('avatar').style.backgroundImage=index>=0?'url('+defs[index].faceUrl+')':'none';velocity.set(0,0,0);},
 active:()=>playing&&!paused,state:()=>({position:player.root.position,driving}),
 forceBystrek:()=>{if(driving){driving.speed=0;driving=null;}player=chars[0];selected=0;player.root.visible=true;$('name').textContent='BYSTREK';$('avatar').style.backgroundImage='url('+defs[0].faceUrl+')';},
 teleport:(x,z)=>{player.root.position.set(x,0,z);velocity.set(0,0,0);velY=0;grounded=true;keys.clear();yaw=Math.PI;pitch=.22;},
 hasWeapon:i=>weaponState.owned[i],grantMissionMoney:(key,amount)=>weaponState.grant(key,amount),gunShopLocation:MAP.locations.gunshop,
 holster:()=>weaponState.holster(),equipGlock:()=>equipWeapon(0),equipRifle:()=>equipWeapon(1),
 leaveVan:()=>{if(driving){driving.speed=0;driving=null;}player.root.visible=true;carRadio.setActive(false);}
};
const cashDrops=[],cashGeometry=new T.BoxGeometry(.35,.12,.22),cashMaterial=surfaces.material('#56c66c','fabric',true);
function dropCash(position){const mesh=new T.Mesh(cashGeometry,cashMaterial);mesh.position.copy(position);mesh.position.y+=.35;scene.add(mesh);cashDrops.push({mesh,amount:35+Math.floor(Math.random()*66),life:90});if(cashDrops.length>64)scene.remove(cashDrops.shift().mesh);}
const shopSite=MAP.locations.gunshop,shopObjects=[];
const shopBox=(w,h,d,x,y,z,c)=>{const m=box(w,h,d,x,y,z,c);shopObjects.push(m);return m;};
shopBox(30,.3,26,shopSite.x,.02,shopSite.z,'#737776');
for(const side of [-1,1])shopBox(.5,5,26,shopSite.x+side*15,2.5,shopSite.z,'#414d58');
shopBox(30,5,.5,shopSite.x,2.5,shopSite.z-13,'#414d58');shopBox(30,.4,26,shopSite.x,5.2,shopSite.z,'#343e48');
for(const side of [-1,1])shopBox(12,5,.5,shopSite.x+side*9,2.5,shopSite.z+13,'#414d58');
shopBox(6,1,.5,shopSite.x,4.5,shopSite.z+13,'#414d58');shopBox(18,1.2,1.2,shopSite.x,.75,shopSite.z-5,'#705b43');
const shopSign=sign('SKLEP Z BRONIĄ / ARSENAL',24,1.2);shopSign.position.set(shopSite.x,3.5,shopSite.z+13.3);scene.add(shopSign);shopObjects.push(shopSign);
for(let i=0;i<WEAPONS.length;i++){const display=gunModel(i).group;display.position.set(shopSite.x-7+i*3.5,1.8,shopSite.z-6);display.rotation.y=Math.PI/2;scene.add(display);}
missionAPI.toggleContent(shopObjects,[],true);
function renderShop(){ $('shopbalance').textContent='Gotówka: $'+weaponState.money;for(let i=0;i<WEAPONS.length;i++){const button=$('buyweapon'+i);button.disabled=weaponState.owned[i]||weaponState.money<WEAPONS[i].price;button.textContent=weaponState.owned[i]?'POSIADANA':'KUP · $'+WEAPONS[i].price;}}
function openShop(){if(driving||shopOpen)return;shopOpen=true;paused=true;keys.clear();triggerHeld=false;shotQueued=false;carRadio.setActive(false);document.exitPointerLock?.();$('paused').hidden=true;$('gunshop').hidden=false;$('shopfeedback').textContent='Magazynki wymagają przeładowania. Zapas amunicji jest nieograniczony.';renderShop();}
function closeShop(){shopOpen=false;$('gunshop').hidden=true;start();}
$('shopclose').onclick=closeShop;
for(let i=0;i<WEAPONS.length;i++)$('buyweapon'+i).onclick=()=>{if(!shopOpen)return;if(weaponState.buy(i)){audio.effect('shop_buy');$('shopfeedback').textContent='Kupiono: '+WEAPONS[i].name;equipWeapon(i);}else $('shopfeedback').textContent='Broń posiadana lub za mało gotówki.';renderShop();};
addEventListener('keydown',e=>{if(e.code==='KeyF'&&!e.repeat&&playing&&!paused&&!driving&&Math.hypot(player.root.position.x-shopSite.x,player.root.position.z-(shopSite.z+9))<6){openShop();}});
function updateEconomy(dt){$('cashbalance').textContent='$'+weaponState.money;const active=playing&&!paused;$('shopprompt').hidden=!active||!!driving||Math.hypot(player.root.position.x-shopSite.x,player.root.position.z-(shopSite.z+9))>=6;if(!active)return;for(let i=cashDrops.length-1;i>=0;i--){const d=cashDrops[i];d.life-=dt;d.mesh.rotation.y+=dt*2;if(!driving&&d.mesh.position.distanceTo(player.root.position)<2){weaponState.addMoney(d.amount);audio.effect('cash_pickup');$('cashnotice').textContent='+ $'+d.amount;cashNoticeTime=2;scene.remove(d.mesh);cashDrops.splice(i,1);}else if(d.life<=0){scene.remove(d.mesh);cashDrops.splice(i,1);}}cashNoticeTime=Math.max(0,cashNoticeTime-dt);$('cashnotice').hidden=cashNoticeTime<=0;}
let cashNoticeTime=0;
const prologue=createPrologue(T,missionAPI);surfaces.apply(scene);
// Painted service bay, clear of the barn doorway and connected to its driveway.
const serviceBay={x:MAP.locations.barn.x,z:MAP.locations.barn.z-30};
for(const side of [-1,1]){box(.12,.025,28,serviceBay.x+side*16,.085,serviceBay.z,'#e0c38a');box(32,.025,.12,serviceBay.x,.085,serviceBay.z+side*14,'#e0c38a');}
const workshopSign=sign('WARSZTAT / POSTÓJ = NAPRAWA',10,.8);workshopSign.position.set(serviceBay.x-18,2.8,serviceBay.z);scene.add(workshopSign);
function restoreVehicles(){for(const car of cars){car.condition=100;car.serviceTime=0;}}
function updateVehicleCare(dt,active){
 $('game').classList.toggle('driving',!!driving);const hud=$('vehiclemeters');hud.hidden=!driving||!playing||paused;
 if(active)for(const car of cars){if(!car.root.visible||!car.root.parent)continue;const parked=Math.abs(car.speed)<.3&&Math.abs(car.x-serviceBay.x)<16&&Math.abs(car.z-serviceBay.z)<18;car.serviceTime=parked?(car.serviceTime||0)+dt:0;if(car.serviceTime>2&&car.condition<100)car.condition=Math.min(100,car.condition+dt*20);}
 if(driving){const car=driving;$('vehiclespeed').textContent=Math.round(Math.abs(car.speed)*3.6);$('vehiclegear').textContent=car.kind==='scooter'?'E':car.speed<-.5?'R':Math.abs(car.speed)<.5?'N':String(Math.min(5,1+Math.floor(Math.abs(car.speed)/7)));$('vehiclecondition').value=car.condition??100;$('vehicleconditiontext').textContent='Stan '+Math.ceil(car.condition??100)+'%';$('vehicleservicestatus').textContent=car.serviceTime>2&&car.condition<100?'NAPRAWA…':car.serviceTime>0&&car.condition<100?'Przygotowanie naprawy…':car.drifting?'DRIFT':car.condition<30?'USZKODZONY NAPĘD':'';}
}

for(const mesh of scene.children)if(mesh.isMesh&&!shootable.includes(mesh)){shootable.push(mesh);if(mesh.geometry.type==='BoxGeometry'&&mesh.geometry.parameters.height<=.6&&mesh.position.y+mesh.geometry.parameters.height/2<=.65)walkSurfaces.push(mesh);if(mesh.geometry.type==='BoxGeometry'&&(mesh.geometry.parameters.height>1||mesh.position.y>2&&mesh.geometry.parameters.width>5&&mesh.geometry.parameters.depth>5))camSolids.push(mesh);}
const traffic=world.addTraffic({cars,makeCar,blocked:carBlocked,height:surfaceHeight,locations:MAP.locations,register:car=>{car.root.traverse(m=>{if(m.isMesh){m.userData.trafficCar=car;shootable.push(m);camSolids.push(m);}});}});
grass=world.addGrass();
let fullMap=false,failedShown=false;
let cheatCode='';
function hideCheats(){cheatCode='';$('cheatmenu').hidden=true;}
addEventListener('keydown',e=>{
 if(!playing||!paused||playerState.failed||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return;
 const key=(e.key||(/^Key[A-Z]$/.test(e.code)?e.code.slice(3):'')).toLowerCase();
 if(key.length!==1||!/^[a-z]$/.test(key)){if(!['ShiftLeft','ShiftRight'].includes(e.code))cheatCode='';return;}
 cheatCode=(cheatCode+key).slice(-4);
 if(cheatCode==='zseh'){$('cheatmenu').hidden=false;cheatCode='';$('cheatstatus').textContent='Menu odblokowane. Wybierz kod.';}
});
const cheatMessage=text=>$('cheatstatus').textContent=text;
const cheatAction=fn=>()=>{if(!paused||$('cheatmenu').hidden||playerState.failed)return;fn();};
$('cheatclose').onclick=hideCheats;
$('cheatgod').onchange=cheatAction(()=>{playerState.invulnerable=$('cheatgod').checked;cheatMessage(playerState.invulnerable?'Nietykalność włączona. Warunki porażki misji nadal obowiązują.':'Nietykalność wyłączona.');});
$('cheatammo').onchange=cheatAction(()=>{weaponState.infiniteAmmo=$('cheatammo').checked;if(weaponState.infiniteAmmo){weaponState.ammo=WEAPONS.map(w=>w.capacity);weaponState.reloadLeft=0;}cheatMessage(weaponState.infiniteAmmo?'Nieskończony magazynek włączony.':'Normalne magazynki przywrócone.');});
$('cheatheal').onclick=cheatAction(()=>{playerState.health=100;playerState.armor=100;playerState.stamina=100;playerState.hurt=0;cheatMessage('Zdrowie, pancerz i kondycja: 100%.');});
$('cheatshop').onclick=cheatAction(()=>{missionAPI.leaveVan();missionAPI.teleport(shopSite.x,shopSite.z+9);cheatMessage('Sklep z bronią. Wróć do gry i naciśnij F.');});
$('cheatfill').onclick=cheatAction(()=>{weaponState.ammo=WEAPONS.map(w=>w.capacity);weaponState.reloadLeft=0;cheatMessage('Magazynki uzupełnione.');});
function cheatVehicle(scooter){
 const probe={halfWidth:scooter?.34:1.8,halfLength:scooter?1.08:3.4};const p=player.root.position;
 for(const radius of [4.5,9,16,26])for(let i=0;i<16;i++){const angle=i*Math.PI/8,x=p.x+Math.sin(angle)*radius,z=p.z+Math.cos(angle)*radius;if(carBlocked(x,z,0,probe))continue;const car=scooter?makeScooter(x,z):makeCar(x,z,'#ab8be1');car.root.position.y=surfaceHeight(x,z);cheatMessage((scooter?'Kukirin':'Samochód')+' czeka '+radius+' m od ciebie.');return car;}
 cheatMessage('Brak wolnego miejsca. Spróbuj na zewnątrz.');
}
$('cheatcar').onclick=cheatAction(()=>cheatVehicle(false));$('cheatscooter').onclick=cheatAction(()=>cheatVehicle(true));
function cheatChapter(n){if(driving){cheatMessage('Najpierw zatrzymaj pojazd i wysiądź.');return;}cheatProgress=true;prologue.restart();prologue.loadChapter(n);cheatMessage(n===2?'Prolog pominięty. Bejnar czeka w stodole z misją 2.':'Misja 3 odblokowana. Porozmawiaj z Bejnarem w stodole.');}
$('cheatempire').onclick=cheatAction(()=>{cheatChapter(4);prologue.empire.restore([],null);cheatMessage('Misje 5–8: porozmawiaj z Bejnarem. Zapis kampanii pozostaje bez zmian.');});$('cheathub').onclick=cheatAction(()=>cheatChapter(2));$('cheatmissions').onclick=cheatAction(()=>cheatChapter(3));


function cheatWarp(point,label){if(!point){cheatMessage('Ten obiekt nie istnieje. Najpierw uruchom odpowiednią misję lub etap.');return;}cheatProgress=true;missionAPI.leaveVan();missionAPI.teleport(point.x,point.z);player.root.position.y=surfaceHeight(point.x,point.z);cheatMessage(label+' · teleport wykonany. Zapis kampanii nie jest zmieniany.');}
function cheatEmpireStage(id,stage){missionAPI.leaveVan();playerState.reset();cheatChapter(4);const point=prologue.empire.debugStage(id,stage);cheatWarp(point,'Misja '+id+' / '+stage);}
for(const id of [5,6,7,8])$('empirestart'+id).onclick=cheatAction(()=>cheatEmpireStage(id,id===7?'overclock':'drive'));
for(const [id,stages]of [[5,['assault','terminal','home']],[6,['spikes','defend','forklift','recover','home']],[7,['overclock','assault','cache','broadcast']],[8,['choice']]])for(const stage of stages)$('stage'+id+stage).onclick=cheatAction(()=>cheatEmpireStage(id,stage));
const warpPoints={barn:()=>({x:MAP.locations.barn.x,z:MAP.locations.barn.z-20}),bejnar:()=>({x:chars[1].root.position.x+2,z:chars[1].root.position.z}),kopernik:()=>({x:MAP.locations.kopernik.x,z:MAP.locations.kopernik.z+25}),director:()=>({x:MAP.locations.kopernik.x+8,z:MAP.locations.kopernik.z-8}),ambush:()=>({x:300,z:961}),factory:()=>{const car=prologue.empire.debugVehicle('forklift');return car?{x:car.x+5,z:car.z}:{x:335,z:966};},convoy:()=>{const car=prologue.empire.debugVehicle('convoy');return car?{x:car.x,z:car.z-5}:null;},zseh:()=>({x:MAP.locations.zseh.x,z:MAP.locations.zseh.z+22}),broadcast:()=>({x:MAP.locations.zseh.x-8,z:MAP.locations.zseh.z-10}),police:()=>({x:MAP.locations.police.x,z:MAP.locations.police.z+42}),piastowska:()=>({x:MAP.locations.piastowska.x,z:MAP.locations.piastowska.z+26}),objective:()=>{const marker=prologue.getState().marker;return marker?{x:marker[0]+2,z:marker[2]}:null;}};
for(const [key,getPoint]of Object.entries(warpPoints))$('warp'+key).onclick=cheatAction(()=>cheatWarp(getPoint(),key));
$('cheatenemies').onclick=cheatAction(()=>{cheatProgress=true;prologue.empire.clearEnemies();cheatMessage('Przeciwnicy bieżącego etapu usunięci. Wróć do gry, aby przejść dalej.');});
$('cheatrepair').onclick=cheatAction(()=>{const car=missionAPI.nearestVehicle();if(!car){cheatMessage('Brak pojazdu.');return;}car.condition=100;car.speed=car.vx=car.vz=car.yawRate=0;cheatMessage('Najbliższy pojazd naprawiony i zatrzymany.');});
$('cheatarmorvan').onclick=cheatAction(()=>{const car=cheatVehicle(false);if(car){car.armor=100;car.root.userData.armored=true;cheatMessage('Opancerzony van przywołany w wolnym miejscu.');}});
let cheatVoicePreview=null;
$('cheatvoice').onclick=cheatAction(()=>{if(typeof Audio!=='function'){cheatMessage('Podgląd audio niedostępny.');return;}cheatVoicePreview?.pause();cheatVoicePreview=new Audio('./sounds/final_choice.mp3');cheatVoicePreview.volume=clamp(audio.masterVolume*audio.sfxVolume,0,1);cheatVoicePreview.play().then(()=>cheatMessage('Odtwarzanie final_choice.mp3.')).catch(()=>cheatMessage('Nie można odtworzyć pliku sounds/final_choice.mp3.'));});
for(const [button,value]of [['cheatfamily','family'],['cheatsolo','solo']])$(button).onclick=cheatAction(()=>{missionAPI.leaveVan();cheatChapter(4);prologue.empire.restore([5,6,7,8],value);cheatMessage('Podgląd zakończenia: '+value+'. Zapis kampanii pozostaje bez zmian.');});

function showFailure(){if(failedShown)return;failedShown=true;audio.effect('fail');pause();$('failure').hidden=false;$('failuretitle').textContent=playerState.health<=0?'WASTED':'MISSION FAILED';$('failurereason').textContent=playerState.reason;$('paused').hidden=true;}
$('retrymission').onclick=()=>{playerState.reset();failedShown=false;$('failure').hidden=true;prologue.retry();restoreVehicles();start();};
$('failuremenu').onclick=()=>{playerState.reset();failedShown=false;$('failure').hidden=true;prologue.restart();restoreVehicles();playing=false;paused=false;$('start').hidden=false;};
$('continuegame').hidden=!progress.completed.length&&progress.activeMission===null;$('continuegame').textContent=progress.activeMission>=5?'KONTYNUUJ · PONÓW MISJĘ '+progress.activeMission:progress.activeMission===2?'KONTYNUUJ · PONÓW MISJĘ 2':progress.activeMission===3?'KONTYNUUJ · PONÓW MISJĘ 3':'KONTYNUUJ ZAPIS';$('continuegame').onclick=continueProgress;
const settings={master:.8,music:.35,sfx:.6,radio:.35,sensitivity:1,quality:1.25};try{const stored=JSON.parse(localStorage.getItem('gta6.settings')||'{}');for(const key of Object.keys(settings))if(Number.isFinite(Number(stored[key]))&&stored[key]!==undefined)settings[key]=Number(stored[key]);}catch{}
function applySettings(){for(const key of ['master','music','sfx','radio'])settings[key]=clamp(settings[key],0,1);settings.quality=clamp(settings.quality,.75,1.75);settings.sensitivity=clamp(settings.sensitivity,.3,2);audio.masterVolume=Number(settings.master);audio.musicVolume=Number(settings.music);audio.sfxVolume=Number(settings.sfx);carRadio.volume=Number(settings.radio)*Number(settings.master);sensitivity=Number(settings.sensitivity);renderer.setPixelRatio(Math.min(devicePixelRatio,Number(settings.quality)));}
for(const key of Object.keys(settings)){const input=$('setting-'+key);input.value=settings[key];input.oninput=()=>{settings[key]=Number(input.value);applySettings();try{localStorage.setItem('gta6.settings',JSON.stringify(settings));}catch{}};}applySettings();
let graphicsPrefs={post:true,cycle:true};try{const saved=JSON.parse(localStorage.getItem('gta6.graphics')||'{}');for(const key of ['post','cycle'])if(typeof saved[key]==='boolean')graphicsPrefs[key]=saved[key];}catch{}
function applyGraphicsPrefs(){postFX.enabled=graphicsPrefs.post;atmosphere.cycle=graphicsPrefs.cycle;$('postprocessing').checked=graphicsPrefs.post;$('daycycle').checked=graphicsPrefs.cycle;}
for(const [id,key] of [['postprocessing','post'],['daycycle','cycle']])$(id).onchange=()=>{graphicsPrefs[key]=$(id).checked;applyGraphicsPrefs();try{localStorage.setItem('gta6.graphics',JSON.stringify(graphicsPrefs));}catch{}};applyGraphicsPrefs();
addEventListener('keydown',e=>{if(playing&&!paused&&e.code==='KeyM'&&!e.repeat){fullMap=!fullMap;document.querySelector('.mapbox').classList.toggle('expanded',fullMap);$('map').width=$('map').height=fullMap?480:180;}if(e.code==='F1'){e.preventDefault();$('controlhelp').hidden=!$('controlhelp').hidden;}});
$('world').addEventListener('contextmenu',e=>e.preventDefault());addEventListener('blur',()=>aiming=false);
const enemyTraffic=[];for(const road of world.roads.filter(r=>Math.max(r.w,r.d)>240&&Math.abs(r.x)<900&&Math.abs(r.z)<900).slice(0,12)){const horizontal=road.w>road.d,length=Math.max(road.w,road.d),car=makeCar(road.a?road.a[0]*.75+road.b[0]*.25-Math.sin(road.angle)*2:road.x+(horizontal?-length*.25:2),road.a?road.a[1]*.75+road.b[1]*.25+Math.cos(road.angle)*2:road.z+(horizontal?2:-length*.25),['#927d68','#657f86','#7e6d7c','#a0a19a'][enemyTraffic.length%4]);car.maxSpeed=12;car.yaw=road.a?Math.atan2(road.b[0]-road.a[0],road.b[1]-road.a[1]):horizontal?Math.PI/2:0;enemyTraffic.push({car,road,horizontal,direction:1});}
function suppressFinaleTraffic(){
 const state=prologue.getState(),disabled=state.empire?.id===8&&state.empire.active;
 for(const car of [...traffic.pool,...enemyTraffic.map(t=>t.car)]){
  if(car===driving||car.traffic?.stolen)continue;
  if(disabled){if(car.root.userData.finaleVisible===undefined)car.root.userData.finaleVisible=car.root.visible;car.root.visible=false;}
  else if(car.root.userData.finaleVisible!==undefined){car.root.visible=car.root.userData.finaleVisible;delete car.root.userData.finaleVisible;}
 }
 return disabled;
}
function updateOverhaul(dt,speed){
 updateEconomy(dt);
 $('missionhud').hidden=!playing||paused||playerState.failed;$('game').classList.toggle('minigame-active',!$('missionhud').hidden&&['networkgame','ramsequence','loottiming'].some(id=>!$(id).hidden));
 const active=playing&&!paused&&!playerState.failed,state=prologue.getState(),memory=state.memory||{},denial=state.denial||{};
 updateVehicleCare(dt,active);
 const score=state.empire?.active?'mission'+state.empire.id:state.stage!=='free'?'prologue':denial.active?'denial':memory.active?'memory':'free';$('chapterlabel').textContent=state.empire?.active?'MISJA '+state.empire.id+' / '+({5:'UPADEK KOPERNIKA',6:'WĄSKIE GARDŁO',7:'ODBICIE EKONOMU',8:'KONIEC ZMIANY'}[state.empire.id]):{prologue:'PROLOG / NOWY POCZĄTEK',memory:'MISJA 2 / OPERACJA PAMIĘĆ OPERACYJNA',denial:'MISJA 3 / ODMOWA DOSTĘPU',free:'OTWARTY ŚWIAT / EKIPA EKONOMU'}[score];$('missionchapter').textContent=state.empire?.active?'MISJA '+state.empire.id+' / EKIPA EKONOMU':score==='free'?'BAZA / ZLECENIA':score==='prologue'?'PROLOG / EKIPA EKONOMU':score==='memory'?'MISJA 2 / EKIPA EKONOMU':'MISJA 3 / EKIPA EKONOMU';const indoors=['lab','raid'].includes(state.stage)||['assault','drill','loot'].includes(memory.stage)||['logic','cooling','loot'].includes(denial.stage);
 const environment=atmosphere.tick(active?dt:0,player.root.position,indoors);if(active){if(player.root.position.x>1300)playerState.damage(dt*22,'Utonąłeś.');playerState.tick(dt,!driving&&speed>5);gameEffects.tick(dt,surfaceHeight);for(const traffic of enemyTraffic){const {car,road,horizontal}=traffic;if(!car.root.visible)continue;if(Math.hypot(car.x-player.root.position.x,car.z-player.root.position.z)>240)continue;const length=Math.max(road.w,road.d)*.4,goal={x:road.a?(traffic.direction>0?road.b[0]:road.a[0]):road.x+(horizontal?length*traffic.direction:2),z:road.a?(traffic.direction>0?road.b[1]:road.a[1]):road.z+(horizontal?2:length*traffic.direction),speed:10,gap:2};driveAI(car,goal,dt,(x,z,yaw)=>carBlocked(x,z,yaw,car),surfaceHeight);car.root.position.set(car.x,car.chassisY||0,car.z);car.root.rotation.set(car.pitch||0,car.yaw,car.roll||0,'YXZ');if(Math.hypot(car.x-goal.x,car.z-goal.z)<6)traffic.direction*=-1;if(!driving&&Math.abs(car.speed)>3&&insideCar(player.root.position.x,player.root.position.z,car,.15)){playerState.damage(Math.abs(car.speed)*3,'Potrącił cię samochód.');car.speed=0;car.vx=car.vz=0;}}}
 carRadio.setBlocked?.(score!=='free');carRadio.tick(dt);audio.tick(dt,{active,mission:score,car:driving,speed,grounded,night:environment.night,indoors,radio:!!carRadio.isPlaying,alert:state.stage==='raid'||state.stage==='escape'||memory.stage==='drill'});
 $('clock').textContent=String(Math.floor(environment.hour)).padStart(2,'0')+':'+String(Math.floor(environment.hour%1*60)).padStart(2,'0');$('scorelabel').textContent='♫ '+SCORES[score].name;
 $('healthvalue').textContent=Math.ceil(playerState.health);$('armorvalue').textContent=Math.ceil(playerState.armor);document.querySelector('.health i').style.width=playerState.health+'%';$('staminabar').style.width=playerState.stamina+'%';$('damageoverlay').style.opacity=playerState.hurt*.55;$('hitmarker').style.opacity=Math.max(0,Number($('hitmarker').style.opacity||0)-dt*5);
 camera.fov=T.MathUtils.damp(camera.fov,aiming&&weaponState.equipped?(weaponState.definition.zoom||42):driving?58+24*T.MathUtils.smoothstep(Math.abs(driving.speed)/Math.max(1,driving.maxSpeed||115/3.6),.12,1):55,9,dt);camera.updateProjectionMatrix();
 const marker=state.marker;$('objectivepin').hidden=!marker||!playing||paused;if(marker){const worldPoint=new T.Vector3(...marker),distance=worldPoint.distanceTo(player.root.position),projected=worldPoint.clone().project(camera);let x=projected.x,y=-projected.y;if(projected.z>1){x=-x;y=-y;}const edge=Math.max(1,Math.abs(x)/.85,Math.abs(y)/.73);x/=edge;y/=edge;$('objectivepin').style.left=((x+1)*50)+'%';$('objectivepin').style.top=((y+1)*50)+'%';$('objectivedistance').textContent=Math.round(distance)+' m';$('objectivearrow').textContent=edge>1||projected.z>1?'➤':'◆';$('objectivearrow').style.transform='rotate('+(edge>1?Math.atan2(y,x):0)+'rad)';}
 const label=$('missiontitle').textContent;if(label&&label!==lastMissionLabel){if(lastMissionLabel)audio.effect('objective');lastMissionLabel=label;}
 saveMissionProgress(state);
 if(playerState.failed)showFailure();
}
let speedCameraIntensity=0,speedCameraPhase=0,speedLinesIntensity=0;
const speedLinesOverlay=$('speedlines');
let last=performance.now();function frame(now){requestAnimationFrame(frame);const elapsed=Math.min((now-last)/1000,.2),dt=Math.min(elapsed,.08);last=now;let speed=0;if(playing&&!paused){if(driving){updateDriving(dt);}else{crouch=keys.has('KeyC')||keys.has('ControlLeft');const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);const max=crouch?2:(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&playerState.stamina>1?7.4:4;const wish=new T.Vector3(-Math.sin(yaw)*forward+Math.cos(yaw)*side,0,-Math.cos(yaw)*forward-Math.sin(yaw)*side);if(wish.lengthSq())wish.normalize().multiplyScalar(max);velocity.lerp(wish,1-Math.exp(-dt*12));speed=velocity.length();const p=player.root.position;const movementSteps=Math.max(1,Math.ceil(velocity.length()*dt/.1));for(let step=0;step<movementSteps;step++){const nx=p.x+velocity.x*dt/movementSteps,nz=p.z+velocity.z*dt/movementSteps;if(!blocked(nx,p.z))p.x=nx;else velocity.x=0;if(!blocked(p.x,nz))p.z=nz;else velocity.z=0;}
let floor=surfaceHeight(p.x,p.z);if(floor>p.y+.2)floor=0;for(const o of obstacles){const top=o.y+o.h/2;if(top<=p.y+.02&&top>floor&&Math.abs(p.x-o.x)<o.w/2&&Math.abs(p.z-o.z)<o.d/2)floor=top;}if(grounded){if(p.y>floor+.2)grounded=false;else p.y=floor;}if(speed>.1){const angle=Math.atan2(velocity.x,velocity.z);player.root.rotation.y+=Math.atan2(Math.sin(angle-player.root.rotation.y),Math.cos(angle-player.root.rotation.y))*(1-Math.exp(-dt*14));}if(jumpQueued&&grounded&&!crouch&&jumpWindup===0){jumpWindup=.11;}jumpQueued=false;if(jumpWindup>0){jumpWindup=Math.max(0,jumpWindup-dt);if(jumpWindup===0){velY=7.4;grounded=false;}}if(!grounded){velY-=20*dt;p.y+=velY*dt;if(p.y<=floor){p.y=floor;landingImpact=clamp(Math.abs(velY)/7.4,.3,1.2);if(velY<-10)playerState.damage((-velY-10)*8,'Śmiertelny upadek.');velY=0;grounded=true;}}landingImpact=Math.max(0,landingImpact-dt*4.8);speed=velocity.length();phase+=dt*speed*(crouch?2.6:1.85);$('state').textContent=!grounded?'SKOK':crouch?'KUCANIE':speed>5?'BIEG':speed>.1?'CHÓD':'STOI';}}
if(!driving)animateChar(player,paused?0:dt,speed,crouch,!grounded);for(const ch of chars)if(ch!==player)animateChar(ch,dt,0,false,false);
target.copy(player.root.position).add(new T.Vector3(0,driving?2.1:crouch?1.1:1.65,0));
if(!playing)yaw+=dt*.025;
if(driving){
  armedCameraActive=false;
  desired.set(Math.sin(yaw)*8.5*Math.cos(pitch),1.4+Math.sin(pitch)*8.5,Math.cos(yaw)*8.5*Math.cos(pitch)).add(target);
}else if(weaponState.equipped){
  // Smooth translation separately: smoothing the orbit while yaw snaps made the
  // off-centre player drift across the reticle during left/right turns.
  target.copy(player.root.position).add(new T.Vector3(0,crouch?1.45:1.95,0));
  shoulderAimBlend=T.MathUtils.damp(shoulderAimBlend,aiming?1:0,12,dt);
  if(!armedCameraActive)armedAnchor.copy(target);
  else armedAnchor.lerp(target,1-Math.exp(-dt*18));
  armedCameraActive=true;
  const distance=T.MathUtils.lerp(2.8,1.75,shoulderAimBlend),shoulder=T.MathUtils.lerp(.9,.73,shoulderAimBlend)*Math.min(1,camera.aspect/(16/9));
  // Right-shoulder framing: local camera up keeps the offset stable when aiming vertically.
  desired.set(Math.sin(yaw)*(distance*Math.cos(pitch)-.12*Math.sin(pitch))+Math.cos(yaw)*shoulder,
    distance*Math.sin(pitch)+.12*Math.cos(pitch),
    Math.cos(yaw)*(distance*Math.cos(pitch)-.12*Math.sin(pitch))-Math.sin(yaw)*shoulder).add(armedAnchor);
}else{
  armedCameraActive=false;
  desired.set(Math.sin(yaw)*7.6*Math.cos(pitch),Math.sin(pitch)*7.6,Math.cos(yaw)*7.6*Math.cos(pitch)).add(target);
}
const speedRatio=driving?Math.abs(driving.speed)/Math.max(1,driving.maxSpeed||115/3.6):0;
if(playing&&!paused){speedCameraPhase+=dt;speedCameraIntensity=T.MathUtils.damp(speedCameraIntensity,driving?T.MathUtils.smoothstep(speedRatio,.78,1):0,4,dt);}
speedLinesIntensity=T.MathUtils.damp(speedLinesIntensity,playing&&!paused&&driving?T.MathUtils.smoothstep(speedRatio,.68,.94):0,5,dt);
// SVG does not reflect the HTML hidden property; control its display explicitly.
speedLinesOverlay.style.display=!playing||paused||!driving||speedLinesIntensity<.005?'none':'block';
speedLinesOverlay.style.opacity=speedLinesIntensity*.55;
if(driving){const t=speedCameraPhase,intensity=speedCameraIntensity,side=(Math.sin(t*2.7)*.11+Math.sin(t*31)*.028)*intensity;desired.x+=Math.cos(yaw)*side;desired.z-=Math.sin(yaw)*side;desired.y+=(Math.sin(t*23)*.035+Math.sin(t*3.5)*.045)*intensity;}
desired.y=Math.max(desired.y,surfaceHeight(desired.x,desired.z)+.35);
direction.subVectors(desired,target);const len=direction.length();ray.set(target,direction.normalize());ray.far=len;
const hit=ray.intersectObjects(camSolids.filter(m=>{if(m.userData.trafficCar&&!m.userData.trafficCar.root.visible)return false;const pos=m.getWorldPosition(new T.Vector3());if(Math.abs(pos.x-target.x)>45||Math.abs(pos.z-target.z)>45)return false;return !driving||(!driving.root.children.includes(m)&&!driving.wheels.some(w=>w.pivot.children.includes(m)));}),false)[0];
if(hit)desired.copy(target).addScaledVector(direction,Math.max(.8,hit.distance-.35));
if(weaponState.equipped){
  // Position and orientation use the same yaw this frame, keeping shoulder offset stable.
  camera.position.copy(desired);
  cameraForward.set(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
  camera.lookAt(camera.position.clone().addScaledVector(cameraForward,50));
}else{
  camera.position.lerp(desired,1-Math.exp(-dt*12));camera.lookAt(target);
}
if(driving)camera.rotateZ(Math.sin(speedCameraPhase*2.7)*.009*speedCameraIntensity);
const finaleTrafficOff=suppressFinaleTraffic();traffic.update(dt,player.root.position,playing&&!paused&&!finaleTrafficOff,driving);updatePedestrians(elapsed);updateWeapons(dt);updateVehicleHint();prologue.tick(elapsed);updateOverhaul(dt,speed);grass.update(playing&&!paused?dt:0,camera.position);postFX.render(scene,camera);drawMap();}
const ctx=$('map').getContext('2d');
function drawMap(){
 const p=fullMap?new T.Vector3(0,0,100):player.root.position,scale=fullMap?.12:driving?.23:.65,center=$('map').width/2;
 const mx=x=>center+(x-p.x)*scale,mz=z=>center+(z-p.z)*scale;
 ctx.fillStyle='#34433b';ctx.fillRect(0,0,center*2,center*2);
 const park=world.park;ctx.fillStyle='#5a7e4f';ctx.fillRect(mx(park.x-park.w/2),mz(park.z-park.d/2),park.w*scale,park.d*scale);ctx.strokeStyle='#bdb69a';ctx.lineWidth=Math.max(1,4*scale);for(const [a,b]of park.paths){ctx.beginPath();ctx.moveTo(mx(a[0]),mz(a[1]));ctx.lineTo(mx(b[0]),mz(b[1]));ctx.stroke();}ctx.fillStyle='#497e87';ctx.beginPath();ctx.arc(mx(25),mz(48),14*scale,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#737c7b';
 for(const r of world.roads){ctx.save();ctx.translate(mx(r.x),mz(r.z));ctx.rotate(r.angle||0);ctx.fillRect(-r.w*scale/2,-r.d*scale/2,r.w*scale,r.d*scale);ctx.restore();}

 ctx.fillStyle='#9b998b';
 for(const o of obstacles){if(Math.abs(o.x-p.x)*scale>center+15||Math.abs(o.z-p.z)*scale>center+15)continue;ctx.fillStyle=o.w===.7&&o.h===4?'#55794e':'#9b998b';ctx.fillRect(mx(o.x-o.w/2),mz(o.z-o.d/2),Math.max(1,o.w*scale),Math.max(1,o.d*scale));}
 if(fullMap){ctx.font='bold 9px Arial';ctx.textAlign='center';for(const [x,z,label]of [[-80,-1450,'CENTRUM'],[1030,-40,'PRZEDMIEŚCIA'],[-700,140,'ZACHODNIE MIASTECZKA'],[-80,810,'OSIEDLE POŁUDNIOWE'],[800,1030,'PRZEMYSŁ'],[-990,1610,'WIEŚ'],[0,15,'PARK']]){const xx=mx(x),zz=mz(z);ctx.fillStyle='#14221de0';ctx.fillRect(xx-ctx.measureText(label).width/2-4,zz-9,ctx.measureText(label).width+8,14);ctx.fillStyle='#d2dbc8';ctx.fillText(label,xx,zz);}ctx.textAlign='left';}
 for(const location of Object.values(world.locations)){const x=mx(location.x),z=mz(location.z);if(x<0||z<0||x>center*2||z>center*2)continue;ctx.fillStyle=location.color;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,z,fullMap?6:4,0,Math.PI*2);ctx.fill();ctx.stroke();if(fullMap){ctx.font='bold 10px Arial';ctx.fillStyle='#fff';ctx.fillText(location.name,x+9,z+3);}}
 const objectiveMarker=prologue.getState().marker;if(objectiveMarker){ctx.fillStyle='#dfff7a';ctx.fillRect(mx(objectiveMarker[0])-3,mz(objectiveMarker[2])-3,6,6);}
 for(const c of cars){if(!c.root.visible)continue;ctx.fillStyle=c===driving?'#dfff7a':c.color;ctx.fillRect(mx(c.x)-2,mz(c.z)-3,4,6);}
 for(let i=0;i<chars.length;i++){const pos=chars[i].root.position;if(i!==selected){ctx.fillStyle=defs[i].shirt;ctx.beginPath();ctx.arc(mx(pos.x),mz(pos.z),3,0,7);ctx.fill();}}
 ctx.fillStyle='#dfff7a';ctx.beginPath();ctx.arc(mx(player.root.position.x),mz(player.root.position.z),5,0,7);ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mx(player.root.position.x),mz(player.root.position.z));ctx.lineTo(mx(player.root.position.x)-Math.sin(yaw)*13,mz(player.root.position.z)-Math.cos(yaw)*13);ctx.stroke();
 const district=world.districtAt(p.x,p.z);
 document.querySelector('.district span').textContent=district.number+' / '+district.name;
 document.querySelector('.district h1').textContent=district.name==='PODWÓRKO'?'Po lekcjach.':district.name;
 document.querySelector('.district p').textContent=district.subtitle;
 document.querySelector('.mapbox span').innerHTML=(prologue.getState().stage==='free'?district.name:'EKIPA / PROLOG')+' <b>N ↑</b>';
}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();camera.position.set(8,6,17);requestAnimationFrame(frame);
// Future headshots: one local image per named character; preserve the segmented rig.
window.gta6={setFace:async(index,url)=>{if(!chars[index])throw Error('Nieznana postać');const texture=await new T.TextureLoader().loadAsync(url);texture.colorSpace=T.SRGBColorSpace;const m=chars[index].face.material;m.map?.dispose();m.map=texture;m.opacity=1;m.needsUpdate=true;},prologue:()=>prologue.getState(),getState:()=>({selected,position:player.root.position.toArray(),grounded,crouch,paused,playing,health:playerState.health,failed:playerState.failed,hour:atmosphere.hour}),select};
