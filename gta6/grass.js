// Stream deterministic crossed grass cards near the camera, never into non-grass footprints.
export function createGrass(T,scene,{roads,groundSurfaces,obstacles,worldMeshes,bounds}){
 const tileSize=48,spacing=2.1,range=105,bucketSize=32,tiles=new Map(),buckets=new Map(),greens=new Set(['#768c67','#648559','#668953','#668953','#648559']);
 const time={value:0},loader=new T.TextureLoader();
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0,0,0,-.5,0,0,.5,0,1,.5,0,1,-.5],3));
 geometry.setAttribute('normal',new T.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1,1,0,0,1,0,0,1,0,0,1,0,0],3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],2));
 geometry.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);
 const materials=['clump','wild','meadow'].map((name,i)=>{
  const texture=loader.load('./textures/grass/'+name+'.png')||new T.Texture();texture.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshStandardMaterial({map:texture,color:i===2?'#78935c':'#8bab65',side:T.DoubleSide,alphaTest:.48,roughness:1});
  material.onBeforeCompile=shader=>{
   shader.uniforms.grassTime=time;
   shader.vertexShader='uniform float grassTime; varying float grassDistance;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 grassRoot=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
    transformed.x+=sin(grassTime*1.4+grassRoot.x*.17+grassRoot.z*.11)*.055*uv.y*uv.y;
    transformed.z+=cos(grassTime*.9+grassRoot.z*.19)*.028*uv.y*uv.y;
    grassDistance=length(cameraPosition.xz-grassRoot.xz);`);
   shader.fragmentShader='varying float grassDistance;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`diffuseColor.a*=1.-smoothstep(80.,105.,grassDistance);
    #include <alphatest_fragment>`);
  };
  material.customProgramCacheKey=()=> 'grass-wind-distance-v1';return material;
 });
 const key=(x,z)=>Math.floor(x/bucketSize)+','+Math.floor(z/bucketSize);
 function insert(item,minX,maxX,minZ,maxZ){for(let x=Math.floor(minX/bucketSize);x<=Math.floor(maxX/bucketSize);x++)for(let z=Math.floor(minZ/bucketSize);z<=Math.floor(maxZ/bucketSize);z++){const k=x+','+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(item);}}
 function rect(x,z,w,d,angle=0,top=null){const c=Math.cos(angle),s=Math.sin(angle),hx=(Math.abs(c)*w+Math.abs(s)*d)/2+.8,hz=(Math.abs(s)*w+Math.abs(c)*d)/2+.8;insert({x,z,w,d,c,s,top},x-hx,x+hx,z-hz,z+hz);}
 function rebuild(){
  buckets.clear();
  for(const r of roads){const angle=r.a?Math.atan2(r.b[1]-r.a[1],r.b[0]-r.a[0]):r.angle||0;rect(r.x,r.z,r.w,r.d,angle);}
  for(const g of groundSurfaces)rect(g.x,g.z,g.w,g.d,-(g.angle||0),greens.has(g.color)?g.top:null);
  for(const o of obstacles)rect(o.x,o.z,o.w,o.d);
  scene.updateMatrixWorld(true);
  const skip=new Set(worldMeshes),instance=new T.Matrix4(),box=new T.Box3();
  scene.traverse(mesh=>{
   if(!mesh.isMesh||skip.has(mesh)||mesh.userData.grass)return;
   for(let p=mesh;p;p=p.parent)if(p.userData.character||p.userData.vehicle)return;
   if(mesh.material?.userData?.surface==='grass'||mesh.material?.color?.getHexString()==='768c67')return;
   const shape=mesh.geometry?.type,horizontalPlane=shape==='PlaneGeometry'&&Math.abs(Math.cos(mesh.rotation.x))<.01;
   if(shape!=='BoxGeometry'&&shape!=='CircleGeometry'&&!horizontalPlane)return;
   mesh.geometry.computeBoundingBox();
   if(mesh.isInstancedMesh){for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,instance);instance.premultiply(mesh.matrixWorld);box.copy(mesh.geometry.boundingBox).applyMatrix4(instance);rect((box.min.x+box.max.x)/2,(box.min.z+box.max.z)/2,box.max.x-box.min.x,box.max.z-box.min.z);}return;}
   box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);rect((box.min.x+box.max.x)/2,(box.min.z+box.max.z)/2,box.max.x-box.min.x,box.max.z-box.min.z);
  });
  // The pond's round footprint is wider than its water mesh at the stone rim.
  insert({circle:true,x:25,z:48,r:15.3},9,41,32,64);
 }
 function groundAt(x,z){
  if(Math.abs(x)>bounds||Math.abs(z)>bounds)return null;let height=0;
  for(const o of buckets.get(key(x,z))||[]){
   if(o.circle){if(Math.hypot(x-o.x,z-o.z)<o.r+.7)return null;continue;}
   const dx=x-o.x,dz=z-o.z;
   if(Math.abs(dx*o.c+dz*o.s)<=o.w/2+.7&&Math.abs(-dx*o.s+dz*o.c)<=o.d/2+.7){if(o.top===null)return null;height=Math.max(height,o.top);}
  }
  return height;
 }
 function remove(tile){for(const mesh of tile.meshes){scene.remove(mesh);mesh.dispose();}}
 function build(tx,tz){
  let seed=((tx*73856093)^(tz*19349663)^912673)>>>0;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const groups=[[],[],[]],steps=Math.ceil(tileSize/spacing),cell=tileSize/steps;
  for(let ix=0;ix<steps;ix++)for(let iz=0;iz<steps;iz++){
   const x=tx*tileSize+(ix+.2+rand()*.6)*cell,z=tz*tileSize+(iz+.2+rand()*.6)*cell,y=groundAt(x,z);if(y===null)continue;
   const variant=rand(),type=variant<.72?0:variant<.96?1:2,height=((type===0?.28:type===1?.4:.55)+rand()*.32)*1.55;
   groups[type].push({x,y,z,height,width:height*[1.09,.73,1.47][type],yaw:rand()*Math.PI});
  }
  const matrix=new T.Matrix4(),q=new T.Quaternion(),axis=new T.Vector3(0,1,0),position=new T.Vector3(),scale=new T.Vector3(),meshes=[];
  groups.forEach((items,i)=>{if(!items.length)return;const mesh=new T.InstancedMesh(geometry,materials[i],items.length);mesh.userData.grass=true;
   items.forEach((p,n)=>mesh.setMatrixAt(n,matrix.compose(position.set(p.x,p.y-.015,p.z),q.setFromAxisAngle(axis,p.yaw),scale.set(p.width,p.height,p.width))));mesh.computeBoundingSphere();scene.add(mesh);meshes.push(mesh);
  });return{meshes,count:groups.reduce((n,g)=>n+g.length,0),tx,tz};
 }
 let dirty=true;
 function update(dt,position){
  time.value+=dt;
  if(dirty){rebuild();for(const tile of tiles.values())remove(tile);tiles.clear();dirty=false;}
  const wanted=[],r=range+tileSize*.71;
  for(let tx=Math.floor((position.x-r)/tileSize);tx<=Math.floor((position.x+r)/tileSize);tx++)for(let tz=Math.floor((position.z-r)/tileSize);tz<=Math.floor((position.z+r)/tileSize);tz++){
   const distance=Math.hypot((tx+.5)*tileSize-position.x,(tz+.5)*tileSize-position.z);if(distance<r)wanted.push({tx,tz,distance});
  }
  const keys=new Set(wanted.map(t=>t.tx+','+t.tz));for(const [k,tile]of tiles)if(!keys.has(k)){remove(tile);tiles.delete(k);}
  let budget=2;wanted.sort((a,b)=>a.distance-b.distance);for(const t of wanted){const k=t.tx+','+t.tz;if(!tiles.has(k)&&budget-->0)tiles.set(k,build(t.tx,t.tz));}
 }
 return{update,invalidate(){dirty=true;},groundAt,tiles,get count(){return [...tiles.values()].reduce((n,t)=>n+t.count,0);}};
}
