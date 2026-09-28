export function createSurfaces(T,renderer){
 const loader=new T.TextureLoader(),textures={},materials=new Map();
 const files={skin:'Characters/skin.png',hair:'Characters/hair.png',fabric:'Characters/fabric.png',rubber:'Characters/fabric.png',glass:'Metal/Photoreal_Metal_06-512x512.png',grass:'Grass/Photoreal_Grass_06-512x512.png',foliage:'Grass/Photoreal_Grass_07-512x512.png',asphalt:'Concrete/Photoreal_Concrete_08-512x512.png',concrete:'Concrete/Photoreal_Concrete_03-512x512.png',dirt:'Concrete/Photoreal_Concrete_04-512x512.png',gravel:'Stone/Photoreal_Stone_05-512x512.png',stone:'Stone/Photoreal_Stone_08-512x512.png',tile:'Tile/Photoreal_Tile_01-512x512.png',wood:'Wood/Photoreal_Wood_04-512x512.png',timber:'Wood/Photoreal_Wood_06-512x512.png',bark:'Trees/Photoreal_Trees_07-512x512.png',metal:'Metal/Photoreal_Metal_06-512x512.png'};
 for(const [key,file]of Object.entries(files)){const texture=loader.load('./textures/'+file)||new T.Texture();texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures[key]=texture;}
 const groups={grass:['768c67','648559','668953'],foliage:['557650','6d8c58','547451','64825a','567a50','739458'],asphalt:['4d575b','4c555c','505961','56616a','5c6061'],dirt:['7b7560','756d59','635f54'],gravel:['c2b895','b9ac87','b9ad89'],wood:['77604a','564c40','8b7c61','9d7b55','946f4d','937553','846d55','776b5c'],timber:['986b54','946b56','8f8064','756b56'],bark:['796951','7c6853'],tile:['343c40','3b454c','b5aca0'],metal:['89999b','929c9e','65747d','596973','697580','5d6d77','626e76','303940','727b83','636d72','343d36'],stone:['acaa94','a7aaa1','b5b2a5']};
 function kind(color){const hex=new T.Color(color).getHexString();for(const [key,list]of Object.entries(groups))if(list.includes(hex))return key;return ['353d44','59616a','505b64','c5b397','c6b69c','687987','bcae94','adb6bf','98aab2','b8b6ab','8098a5','a6a5a4','889f9f','c3ae93','a8b6af','b8aaa0','d2c19f','b8b995','c7b4a7','bebcaf','a2b0a9','b2a89c','c2b394','20282e'].includes(hex)?'concrete':'concrete';}
 function material(color,role=null,local=false){const key=role||kind(color);if(!key)return null;const id=key+new T.Color(color).getHexString()+(local?'-local':'-world');if(materials.has(id))return materials.get(id);const map=textures[key],mat=new T.MeshStandardMaterial({color:new T.Color(color).lerp(new T.Color('#ffffff'),key==='skin'?.75:local?0:.6),map,bumpMap:map,bumpScale:key==='skin'?.012:key==='fabric'||key==='hair'?.018:key==='glass'?.003:key==='bark'?.09:.035,roughness:key==='metal'?.62:.88,metalness:key==='metal'?.35:0});
 const density=key==='grass'?.65:key==='wood'||key==='bark'?.45:key==='tile'?.5:.3;
 if(key==='asphalt'||key==='dirt'){mat.polygonOffset=true;mat.polygonOffsetFactor=key==='asphalt'?-2:-1;mat.polygonOffsetUnits=key==='asphalt'?-2:-1;}mat.userData.surface=key;
 if(local){mat.customProgramCacheKey=()=>key+'-local-uv';if(key==='hair')mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 diffuseColor.rgb=diffuse* (.6+.4*pow(max(dot(texture2D(map,vMapUv).rgb,vec3(.299,.587,.114)),.001),.3));`);};materials.set(id,mat);return mat;}
 mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 surfaceWorld=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 surfaceWorld=instanceMatrix*surfaceWorld;
 #endif
 surfaceWorld=modelMatrix*surfaceWorld;vec3 axisNormal=abs(normal);vec2 projectedUv=axisNormal.y>0.5?surfaceWorld.xz:axisNormal.x>0.5?surfaceWorld.zy:surfaceWorld.xy;
 #ifdef USE_MAP
 vMapUv=projectedUv*${density.toFixed(2)};
 #endif
 #ifdef USE_BUMPMAP
 vBumpMapUv=projectedUv*${density.toFixed(2)};
 #endif`);};mat.customProgramCacheKey=()=>key+'-world-uv';materials.set(id,mat);return mat;}
 function apply(scene){scene.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.facePhoto||Array.isArray(mesh.material)||mesh.material.map||!mesh.material.isMeshStandardMaterial)return;
  const old=mesh.material;let vehicle=false;for(let p=mesh;p;p=p.parent)if(p.userData.vehicle)vehicle=true;
  const mat=material(old.color,vehicle?'metal':null,vehicle).clone();
  mat.onBeforeCompile=material(old.color,vehicle?'metal':null,vehicle).onBeforeCompile;
  mat.customProgramCacheKey=material(old.color,vehicle?'metal':null,vehicle).customProgramCacheKey;
  mat.emissive.copy(old.emissive);mat.emissiveIntensity=old.emissiveIntensity;mat.transparent=old.transparent;mat.opacity=old.opacity;mat.depthWrite=old.depthWrite;mesh.material=mat;
 });}
 return{material,apply,textures};
}
