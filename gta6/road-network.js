// Split roads at actual junctions; directed edges carry right-side driving lanes.
export function buildRoadNetwork(roads){
 const usable=roads.filter(r=>r.a&&r.d>=13&&(r.height??.075)>.06),cuts=usable.map(()=>[0,1]);
 const cross=(x,z,a,b)=>x*b-z*a;
 for(let i=0;i<usable.length;i++)for(let j=i+1;j<usable.length;j++){
  const a=usable[i],b=usable[j],dx=a.b[0]-a.a[0],dz=a.b[1]-a.a[1],ex=b.b[0]-b.a[0],ez=b.b[1]-b.a[1],qx=b.a[0]-a.a[0],qz=b.a[1]-a.a[1],den=cross(dx,dz,ex,ez);
  if(Math.abs(den)>1e-6){const t=cross(qx,qz,ex,ez)/den,u=cross(qx,qz,dx,dz)/den;if(t>=-.0001&&t<=1.0001&&u>=-.0001&&u<=1.0001){cuts[i].push(Math.max(0,Math.min(1,t)));cuts[j].push(Math.max(0,Math.min(1,u)));}}
  else if(Math.abs(cross(qx,qz,dx,dz))<.01){for(const p of [b.a,b.b]){const t=((p[0]-a.a[0])*dx+(p[1]-a.a[1])*dz)/(dx*dx+dz*dz);if(t>0&&t<1)cuts[i].push(t);}for(const p of [a.a,a.b]){const t=((p[0]-b.a[0])*ex+(p[1]-b.a[1])*ez)/(ex*ex+ez*ez);if(t>0&&t<1)cuts[j].push(t);}}
 }
 const nodes=[],byKey=new Map(),pairs=new Map(),edges=[];
 function node(x,z){const k=Math.round(x*10)+','+Math.round(z*10);if(!byKey.has(k)){const n={id:nodes.length,x,z,edges:[]};byKey.set(k,n);nodes.push(n);}return byKey.get(k);}
 usable.forEach((r,i)=>{const ts=[...new Set(cuts[i].map(t=>Math.round(t*1e7)/1e7))].sort((a,b)=>a-b);for(let j=1;j<ts.length;j++){
  const at=t=>node(r.a[0]+(r.b[0]-r.a[0])*t,r.a[1]+(r.b[1]-r.a[1])*t),a=at(ts[j-1]),b=at(ts[j]);if(Math.hypot(a.x-b.x,a.z-b.z)<9)continue;
  const key=[a.id,b.id].sort((a,b)=>a-b).join(':');if(pairs.has(key)){for(const e of pairs.get(key))e.width=Math.max(e.width,r.d);continue;}
  const pair=[];for(const [from,to]of [[a,b],[b,a]]){const length=Math.hypot(to.x-from.x,to.z-from.z),dx=(to.x-from.x)/length,dz=(to.z-from.z)/length,e={id:edges.length,from,to,length,dx,dz,width:r.d};from.edges.push(e);edges.push(e);pair.push(e);}pairs.set(key,pair);
 }});
 function lane(edge,t){const offset=Math.min(5,edge.width*.23);return{x:edge.from.x+edge.dx*edge.length*t+edge.dz*offset,z:edge.from.z+edge.dz*edge.length*t-edge.dx*offset};}
 function trimmed(edge,end){const trim=Math.min(9,edge.length*.22);return lane(edge,end?1-trim/edge.length:trim/edge.length);}
 function next(edge,random=Math.random){const choices=edge.to.edges.filter(e=>e.to!==edge.from);return(choices.length?choices:edge.to.edges)[Math.floor(random()*(choices.length||edge.to.edges.length))];}
 function turn(edge,outgoing){const a=trimmed(edge,true),b=trimmed(outgoing,false),distance=Math.hypot(b.x-a.x,b.z-a.z),pull=Math.max(3,distance*.55),p={x:a.x+edge.dx*pull,z:a.z+edge.dz*pull},q={x:b.x-outgoing.dx*pull,z:b.z-outgoing.dz*pull},points=[];
  for(let i=1;i<=12;i++){const t=i/12,u=1-t;points.push({x:u*u*u*a.x+3*u*u*t*p.x+3*u*t*t*q.x+t*t*t*b.x,z:u*u*u*a.z+3*u*u*t*p.z+3*u*t*t*q.z+t*t*t*b.z,junction:edge.to});}return points;
 }
 return{nodes,edges,lane,trimmed,next,turn};
}
