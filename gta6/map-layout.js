// Layout follows the reference image, with north at negative Z. Distances are game units.
export const MAP={bounds:1900,locations:{gunshop:{x:-425,z:-875,name:'Sklep z bronią',color:'#f2bb59'},zseh:{x:-200,z:-1120,name:'ZSEH',color:'#17191c'},piastowska:{x:380,z:-1040,name:'Piastowska',color:'#b2de39'},police:{x:-570,z:-700,name:'Komenda Policji',color:'#294db7'},kopernik:{x:300,z:-520,name:'Kopernik',color:'#58dce5'},barn:{x:-900,z:1350,name:'Wieś / stodoła',color:'#a4a39a'}},
 escape:[[-200,-1058],[-200,-950],[-200,-350],[-300,-350],[-300,950],[-900,950],[-900,1180],[-900,1335]],
 ride:[[-900,950],[-300,950],[-300,-350],[620,-350],[620,-920],[380,-920],[380,-1004]],
 back:[[380,-920],[620,-920],[620,-350],[-300,-350],[-300,950],[-900,950],[-900,1335]]};
export function roadContains(r,x,z,padding=0){if(!r.a)return Math.abs(x-r.x)<=r.w/2+padding&&Math.abs(z-r.z)<=r.d/2+padding;const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],t=Math.max(0,Math.min(1,((x-r.a[0])*dx+(z-r.a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-r.a[0]-dx*t,z-r.a[1]-dz*t)<=r.d/2+padding;}
