import {createTraffic} from './traffic.js?v=roof-seat-2';
import {buildRoadNetwork} from './road-network.js?v=roof-seat-2';
import {createGrass} from './grass.js?v=roof-seat-2';
import {MAP,roadContains} from './map-layout.js?v=roof-seat-2';
// Instanced scenery: six connected districts based on the supplied north/south layout.
export function buildWorld(T,scene,obstacles,surfaces){
 let seed=73419;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const batches=new Map(),mapBuildings=[],roads=[],groundSurfaces=[],initialObstacles=obstacles.length;
 const cube=(x,y,z,w,h,d,color,solid=false,angle=0)=>{if(!batches.has(color))batches.set(color,[]);batches.get(color).push({x,y,z,w,h,d,angle});if(h<=.1&&y+h/2<=.2&&color!=='#d8d1ae')groundSurfaces.push({x,z,w,d,top:y+h/2,angle,color});if(solid){obstacles.push({x,z,w,d,h,y});mapBuildings.push({x,z,w,d});}};
 const footprints=[];for(const key of ['police','piastowska','kopernik']){const p=MAP.locations[key],school=key!=='police',span=school?42:36,depth=school?40:70;footprints.push({x:p.x-span,z:p.z,w:22,d:depth},{x:p.x+(school?60:span),z:p.z,w:22,d:depth},{x:p.x,z:p.z-depth/2-12,w:110,d:16});}footprints.push({x:MAP.locations.zseh.x,z:MAP.locations.zseh.z-49,w:100,d:22},{...MAP.locations.kopernik,w:68,d:40},{...MAP.locations.zseh,w:29,d:35},{...MAP.locations.police,w:39,d:71},{...MAP.locations.piastowska,w:53,d:41});
 const road=(ax,az,bx,bz,width=18,color='#4d575b',clipped=false)=>{if(!clipped){let intervals=[[0,1]];for(const p of footprints){let lo=0,hi=1;for(const [start,delta,center,half]of [[ax,bx-ax,p.x,p.w/2+width/2+2],[az,bz-az,p.z,p.d/2+width/2+2]]){if(Math.abs(delta)<1e-6){if(Math.abs(start-center)>half){lo=2;break;}}else{const a=(center-half-start)/delta,b=(center+half-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}}if(lo<hi)intervals=intervals.flatMap(([a,b])=>hi<=a||lo>=b?[[a,b]]:[...(a<lo?[[a,lo]]:[]),...(b>hi?[[hi,b]]:[])]);}for(const [a,b]of intervals)if((b-a)*Math.hypot(bx-ax,bz-az)>1)road(ax+(bx-ax)*a,az+(bz-az)*a,ax+(bx-ax)*b,az+(bz-az)*b,width,color,true);return;}
const length=Math.hypot(bx-ax,bz-az);if(!length)return;const angle=Math.atan2(bz-az,bx-ax),x=(ax+bx)/2,z=(az+bz)/2;const dirt=color==='#7b7560';cube(x,dirt?.02:.04,z,length,.07,width,color,false,-angle);const r={x,z,w:length,d:width,angle,height:dirt?.055:.075,a:[ax,az],b:[bx,bz]};roads.push(r);if(width>10&&!dirt)for(let t=12;t<length;t+=24)cube(ax+(bx-ax)*t/length,.105,az+(bz-az)*t/length,8,.015,.18,'#d8d1ae',false,-angle);};
 const path=(points,width=18,color)=>{for(let i=1;i<points.length;i++)road(...points[i-1],...points[i],width,color);};
 const parks=[{x:840,z:-350,w:270,d:320},{x:-50,z:-430,w:160,d:120},{x:-610,z:500,w:170,d:180},{x:-140,z:770,w:150,d:120},{x:0,z:15,w:210,d:270}];
 const reserved=[...Object.values(MAP.locations).map(p=>({...p,w:p===MAP.locations.barn?160:150,d:p===MAP.locations.barn?130:155})),...parks];
 const nearRoad=(x,z,w=0,d=0)=>roads.some(r=>roadContains(r,x,z,Math.hypot(w,d)/2+8));
 const free=(x,z,w,d)=>!nearRoad(x,z,w,d)&&!reserved.some(p=>Math.abs(x-p.x)<(w+p.w)/2+6&&Math.abs(z-p.z)<(d+p.d)/2+6)&&!mapBuildings.some(p=>Math.abs(x-p.x)<(w+p.w)/2+5&&Math.abs(z-p.z)<(d+p.d)/2+5);
 // Central arterial spine and western/eastern connections stay permanent after missions.
 path([[-200,-1450],[-200,-950],[-200,-350],[-300,-350],[-300,950],[-900,950],[-900,1335]],24);
 path([[-1050,-350],[-300,-350],[620,-350],[1250,-350]],24);
 path([[620,-1250],[620,-350],[400,150],[400,1450]],26);
 path([[-1050,350],[-300,350],[400,350],[1130,350]],22);
 path([[-1050,950],[-300,950],[400,950],[1130,950]],22);
 // Northern city grid, with tall towers concentrated in the southeast of downtown.
 road(-425,-858,-425,-800,8);
 for(const x of [-800,-650,-500,-350,0,200,380,620])road(x,-1450,x,-350,20);
 for(const z of [-1400,-1250,-1120,-950,-800,-650,-500])road(-850,z,620,z,20);
 // Mission forecourts and entrances join the street grid.
 road(-570,-650,-570,-660,14);road(380,-1004,380,-920,16);road(380,-920,620,-920,16);
 // Western trade town: low shops, a boulevard and smaller side streets.
 path([[-850,-350],[-920,0],[-880,350],[-820,650],[-900,950]],19);
 for(const z of [-150,80,350,600,800])road(-1030,z,-300,z,15);
 for(const x of [-650,-450])road(x,-350,x,950,15);
 // Eastern suburbs: curving rings, cul-de-sacs, park and family homes.
 for(const radius of [190,360]){const pts=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;pts.push([870+Math.cos(a)*radius,-420+Math.sin(a)*radius*.95]);}path(pts,13);}
 path([[620,-920],[870,-1040],[1180,-850],[1230,-400],[1160,-40],[950,120],[620,0]],16);
 path([[620,-350],[700,-200],[980,-180],[1230,-400]],14);road(870,-1040,870,-680,13);road(1060,-700,1060,-100,13);
 // Residential south centre and industrial east: broad streets for vans.
 for(const x of [-100,150])road(x,350,x,1160,17);
 for(const z of [520,740,950,1160])road(-450,z,400,z,17);
 for(const x of [650,900,1130])road(x,150,x,1450,22);
 for(const z of [200,450,700,950,1200,1450])road(400,z,1130,z,22);
 // Remote village road and smaller lanes; the final 15m enter the barn courtyard.
 path([[-900,950],[-1120,1080],[-1200,1280],[-1050,1490],[-720,1490],[-570,1290],[-700,1100],[-900,950]],12,'#7b7560');
 road(-1120,1180,-700,1180,11,'#7b7560');road(-900,1180,-900,1335,12,'#7b7560');road(-1050,1490,-1050,1680,10,'#7b7560');
 const cityColors=['#98aab2','#b8b6ab','#8098a5','#a6a5a4','#889f9f'];
 function building(x,z,w,d,h,color,style='city',force=false){if(!force&&!free(x,z,w,d))return false;cube(x,h/2,z,w,h,d,color,true);cube(x,h+.2,z,w+.8,.4,d+.8,style==='house'?'#946b56':'#596973');
  const floors=style==='city'?Math.floor(h/4):Math.min(4,Math.floor(h/3));for(let row=0;row<floors;row++){const y=2+row*(style==='city'?4:3);for(let a=-w/2+3;a<w/2-1;a+=6){cube(x+a,y,z+d/2+.04,1.8,1.5,.08,'#3c6076');cube(x+a,y,z-d/2-.04,1.8,1.5,.08,'#3c6076');}}
  if(style==='city'){cube(x,h+1,z,w*.35,1.5,d*.35,'#65747d');}else if(style==='house'){for(let i=0;i<5;i++)cube(x,h+.45+i*.33,z,w+1-i*w/6,.4,d+1-i*d/6,'#986b54');cube(x+w*.3,h+1.7,z,.7,2,.8,'#b9a28b');}else{cube(x,1.1,z+d/2+.08,Math.min(w*.65,10),2,.1,'#405664');}
  return true;
 }
 for(let x=-795;x<600;x+=55)for(let z=-1370;z<-360;z+=56){const h=x>0&&z>-850?40+rand()*90:14+rand()*32;building(x+(rand()-.5)*8,z+(rand()-.5)*8,22+rand()*10,23+rand()*10,h,cityColors[Math.floor(rand()*5)]);}
 for(let x=-1010;x<-320;x+=62)for(let z=-270;z<930;z+=67)building(x,z,25+rand()*7,24+rand()*7,5+rand()*9,['#c3ae93','#a8b6af','#b8aaa0'][Math.floor(rand()*3)],'shop');
 for(let x=630;x<1210;x+=48)for(let z=-970;z<120;z+=51)building(x,z,16+rand()*4,19+rand()*4,4+rand()*3,['#d2c19f','#b8b995','#c7b4a7'][Math.floor(rand()*3)],'house');
 for(let x=-425;x<340;x+=70)for(let z=395;z<1120;z+=72)building(x,z,22,36,12+rand()*9,['#bebcaf','#a2b0a9','#b2a89c'][Math.floor(rand()*3)],'residential');
 for(let x=480;x<1100;x+=115)for(let z=260;z<1430;z+=110){if(building(x,z,65,66,8+rand()*8,'#89999b','warehouse')){for(let i=0;i<3;i++)cube(x-20+i*19,.3,z+12,8,.6,24,'#637a81');cube(x+24,22,z-20,3,44,3,'#aa8c79',true);}}
 for(let x=-1160;x<-540;x+=65)for(let z=1060;z<1660;z+=65)building(x,z,17,21,4+rand()*2,'#c2b394','house');
 // Permanent mission campus exteriors flank clear spaces for playable interiors.
 const labels=[];function campus(p,type){const school=type!=='police',color=school?'#c6b69c':'#687987',span=school?42:36,depth=school?40:70;
  building(p.x-span,p.z,22,depth,10,color,'residential',true);building(p.x+(school?60:span),p.z,22,depth,10,color,'residential',true);building(p.x,p.z-depth/2-12,110,16,14,color,'residential',true);cube(p.x,7.2,p.z+depth/2,110,1.2,1,color);labels.push({...p,y:7.2,z:p.z+depth/2+.55});cube(p.x,.08,p.z+depth/2+22,110,.1,25,'#a7aaa1');}
 campus(MAP.locations.police,'police');campus(MAP.locations.piastowska,'school');
 building(MAP.locations.zseh.x,MAP.locations.zseh.z-49,100,22,16,'#bcae94','residential',true);labels.push({...MAP.locations.zseh,y:13,z:MAP.locations.zseh.z-37});
 campus(MAP.locations.kopernik,'school');labels.push({...MAP.locations.kopernik,y:10,z:MAP.locations.kopernik.z+20.1});
 // Green district cores: paths, playgrounds and street furniture.
 for(const p of parks){if(p.x===0&&p.z===15)continue;cube(p.x,.012,p.z,p.w,.02,p.d,'#648559');road(p.x-p.w*.45,p.z,p.x+p.w*.45,p.z,3,'#b9ac87');for(let i=0;i<5;i++){const x=p.x-30+i*15;cube(x,.6,p.z+12,3,.18,1,'#9d7b55');cube(x,1,p.z+12.5,3,.7,.15,'#9d7b55');}cube(p.x+20,1.3,p.z-30,5,2.6,5,'#bb9672');cube(p.x+20,2.8,p.z-30,6,.4,6,'#ad6e68');}
 // Replacement for the original development courtyard: a fully landscaped public park.
 const park={x:0,z:15,w:210,d:270,paths:[]};cube(0,.015,15,210,.03,270,'#668953');
 function parkPath(a,b,width=4){const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);cube((a[0]+b[0])/2,.045,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1]),.04,width,'#c2b895',false,-angle);park.paths.push([a,b]);}
 const loop=[[-85,-100],[75,-100],[88,-65],[88,110],[65,135],[-65,135],[-88,110],[-88,-65],[-85,-100]];for(let i=1;i<loop.length;i++)parkPath(loop[i-1],loop[i]);parkPath([-85,0],[88,0],5);parkPath([-15,-100],[-15,135],5);
 // Pond, low stone rim, benches, planted beds and a shaded seating pavilion.
 const pond=new T.Mesh(new T.CircleGeometry(14,48),new T.MeshStandardMaterial({color:'#49818b',roughness:.3,metalness:.15}));pond.rotation.x=-Math.PI/2;pond.position.set(25,.085,48);scene.add(pond);const rim=new T.Mesh(new T.TorusGeometry(14.4,.35,6,48),new T.MeshStandardMaterial({color:'#acaa94'}));rim.rotation.x=Math.PI/2;rim.position.set(25,.22,48);scene.add(rim);
 for(const [x,z]of [[-35,-24],[-35,52],[45,-24],[55,80],[-60,112],[55,-80]]){cube(x,.6,z,4,.2,1.2,'#9d7b55',true);cube(x,1,z+.5,4,.75,.15,'#9d7b55');for(const dx of [-1.4,1.4])cube(x+dx,.3,z,.15,.6,.8,'#3b5351');}
 for(const [x,z]of [[-57,-57],[45,-55],[-55,55],[-58,90],[65,25]]){cube(x,.17,z,14,.3,6,'#8e8264',true);for(let i=0;i<12;i++)cube(x-5+(i%6)*2,.46,z-1.5+Math.floor(i/6)*3,.8,.3,.8,i%2?'#d3a47c':'#c482a1');}
 for(const [x,z]of [[-75,-80],[-50,-82],[30,-85],[63,-75],[-65,18],[65,110],[-50,123],[35,116],[-74,77],[76,60]]){cube(x,2,z,.7,4,.7,'#796951',true);cube(x,5,z,6,4,6,'#567a50');cube(x,7.5,z,4.5,3,4.5,'#739458');}
 cube(-50,3.1,-40,16,.35,12,'#756b56');for(const x of [-57,-43])for(const z of [-45,-35])cube(x,1.5,z,.25,3,.25,'#8f8064',true);
 for(const [x,z]of [[-18,-75],[-18,88],[70,-5],[-75,115]]){cube(x,2.5,z,.13,5,.13,'#43545b',true);cube(x,5,z,1.1,.16,.6,'#ddd3a1');cube(x+2,.45,z,.65,.9,.65,'#3a5750');}
 // Dense woodland seams between districts; trunks stay clear of all roads and campuses.
 for(let i=0;i<2600;i++){const x=-1370+rand()*2770,z=-1520+rand()*3300;if(!free(x,z,5,5))continue;const green=i%2?'#557650':'#6d8c58';cube(x,2,z,.7,4,.7,'#796951',true);cube(x,5.7,z,4.7,4,4.7,green);cube(x+.3,8,z,3.4,2.6,3.4,green);}
 for(let i=0;i<36;i++){const x=470+(i%6)*95,z=1250+Math.floor(i/6)*35;if(free(x,z,14,14)){cube(x,2,z,12,4,12,'#b7c2c3',true);cube(x,4.2,z,12,.5,12,'#d1d7d3');}}
 // Pavement strips and walking routes stop at junctions and solid scenery.
 const sidewalkRoutes=[];
 for(const r of [...roads]){if(!r.a||r.d<13||(r.height??.075)<.06)continue;const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
  for(const side of [-1,1]){let points=[];
   const flush=()=>{if(points.length>=6){sidewalkRoutes.push({points,length:(points.length-1)*3});const a=points[0],b=points.at(-1),span=Math.hypot(b.x-a.x,b.z-a.z);cube((a.x+b.x)/2,.095,(a.z+b.z)/2,span+3,.08,2.2,'#a7aaa1',false,-Math.atan2(b.z-a.z,b.x-a.x));}points=[];};
   for(let t=3;t<length-3;t+=3){const x=r.a[0]+ux*t+uz*side*(r.d/2+1.5),z=r.a[1]+uz*t-ux*side*(r.d/2+1.5);
    const clear=!roads.some(other=>other!==r&&roadContains(other,x,z,.65))&&!obstacles.some(o=>o.y-o.h/2<3&&Math.abs(x-o.x)<o.w/2+1.2&&Math.abs(z-o.z)<o.d/2+1.2)&&!reserved.slice(0,6).some(p=>Math.abs(x-p.x)<p.w/2&&Math.abs(z-p.z)<p.d/2);
    if(clear)points.push({x,z});else flush();
   }flush();
  }
 }
 const streetNetwork=buildRoadNetwork(roads);
 const matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3(),axis=new T.Vector3(0,1,0),meshes=[];
 for(const [color,items]of batches){const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),surfaces?.material(color)||new T.MeshStandardMaterial({color,roughness:.92}),items.length);items.forEach((b,i)=>{rotation.setFromAxisAngle(axis,b.angle);matrix.compose(position.set(b.x,b.y,b.z),rotation,scale.set(b.w,b.h,b.d));mesh.setMatrixAt(i,matrix);});// Paint must win against the asphalt's own depth offset at shallow viewing angles.
 if(color==='#d8d1ae'){mesh.material.polygonOffset=true;mesh.material.polygonOffsetFactor=-4;mesh.material.polygonOffsetUnits=-4;mesh.renderOrder=1;}
 mesh.castShadow=color!=='#d8d1ae';mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);meshes.push(mesh);}
 const collisionMeshes=obstacles.slice(initialObstacles).map(o=>{const m=new T.Mesh(new T.BoxGeometry(o.w,o.h,o.d));m.position.set(o.x,o.y,o.z);m.updateMatrixWorld(true);return m;});
 return{park,roads,groundSurfaces,sidewalkRoutes,streetNetwork,addTraffic:options=>createTraffic(T,{network:streetNetwork,...options}),buildings:mapBuildings,meshes,collisionMeshes,addGrass:()=>createGrass(T,scene,{roads,groundSurfaces,obstacles,worldMeshes:meshes,bounds:MAP.bounds}),bounds:MAP.bounds,locations:MAP.locations,labels,
 districtAt(x,z){if(z>1000&&x<-480)return{number:'06',name:'WIEŚ / BRZEZINY',subtitle:'Stodoła · leśne drogi · baza ekipy'};if(z>150&&x>390)return{number:'05',name:'STREFA PRZEMYSŁOWA',subtitle:'Fabryki · magazyny · składy'};if(z>300&&x>-480)return{number:'04',name:'OSIEDLE POŁUDNIOWE',subtitle:'Bloki mieszkalne · skwery'};if(x>620)return{number:'03',name:'PRZEDMIEŚCIA',subtitle:'Domy rodzinne · park · boczne uliczki'};if(z>-350&&x<-300)return{number:'02',name:'ZACHODNIE MIASTECZKA',subtitle:'Niska zabudowa · sklepy · warsztaty'};return{number:'01',name:'CENTRUM',subtitle:'ZSEH · Piastowska · Komenda · Kopernik'};}};
}
