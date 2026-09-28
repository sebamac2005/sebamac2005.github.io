// Blocky cameo costume inspired by the supplied reference.
export function createKingVon(T,api){
 const skin='#93694c',ch=api.character({shirt:'#eeeae1',pants:'#25303a',skin,hair:'#27251f',hairStyle:'short'});
 function part(w,h,d,x,y,z,color,role='fabric',parent=ch.body){if(!parent)return;const m=new T.Mesh(new T.BoxGeometry(w,h,d),api.surfaceMaterial(color,role));m.position.set(x,y,z);parent.add(m);return m;}
 for(const limb of ch.limbs||[])if(limb.arm){const sleeve=limb.upper.children.find(m=>m.isMesh);if(sleeve)sleeve.material=api.surfaceMaterial(skin,'skin');for(let i=0;i<3;i++)part(.025,.1,.22,limb.side*.14,-.12-i*.1,0,'#493c31','fabric',limb.upper);}
 part(.6,.17,.54,0,2.49,0,'#173c2c');part(.38,.04,.28,0,2.44,-.32,'#173c2c');part(.12,.065,.015,0,2.51,.28,'#eeeae1');
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,x=Math.sin(a)*.3,z=Math.cos(a)*.25;part(.065,.55,.065,x,2.14,z,'#25251f','hair');part(.06,.21,.065,x,1.77,z,i%3===0?'#9c7955':'#383129','hair');}
 for(let i=0;i<9;i++){const x=(i-4)*.035,y=1.65+Math.abs(i-4)*.045;part(.045,.055,.025,x,y,.25,'#d5c293','metal');}part(.11,.14,.035,0,1.53,.255,'#e1c373','metal');
 ch.root.userData.storyName='King Von';return ch;
}
export function mountStoryPassenger(T,ch,car){
 car.root.updateWorldMatrix(true,false);
 // Sit on the right edge of the cabin, facing outwards. Character size stays unscaled.
 const local=new T.Vector3(.82,(car.roofHeight??1.7)+.3,-.15);
 ch.root.position.copy(car.root.localToWorld(local));car.root.getWorldQuaternion(ch.root.quaternion);
 ch.root.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2));
 ch.body?.position.set(0,-.805,0);ch.body?.rotation.set(0,0,0);
 for(const limb of ch.limbs||[]){limb.upper.rotation.set(limb.arm?-.25:-Math.PI/2,0,0);limb.joint.rotation.set(limb.arm?-.75:Math.PI/2,0,0);}
 ch.root.userData.roofSeated=true;
}
export function releaseStoryPassenger(ch){
 if(!ch.root.userData.roofSeated)return;
 ch.body?.position.set(0,0,0);ch.body?.rotation.set(0,0,0);
 for(const limb of ch.limbs||[]){limb.upper.rotation.set(0,0,0);limb.joint.rotation.set(0,0,0);}
 ch.root.userData.roofSeated=false;
}
