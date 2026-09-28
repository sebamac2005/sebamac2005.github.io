export function shuffledTracks(tracks,last=null,random=Math.random){
 const order=[...tracks];for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 if(order.length>1&&order[order.length-1]===last)[order[0],order[order.length-1]]=[order[order.length-1],order[0]];
 return order;
}
export class CarRadio{
 constructor(status){this.status=status;this.audio=new Audio();this.audio.volume=0;this.volume=.35;this.fade=0;this.nextPending=false;this.enabled=true;this.blocked=false;this.active=false;this.tracks=[];this.queue=[];this.current=null;this.failed=new Set();this.scanning=false;this.playRequest=0;
  this.audio.addEventListener('ended',()=>this.next());
  this.audio.addEventListener('error',()=>{if(this.current)this.failed.add(this.current);if(this.tracks.some(t=>!this.failed.has(t)))this.next();else this.status.textContent='No playable tracks found';});
  this.scan();this.timer=setInterval(()=>this.scan(),10000);
 }
 setBlocked(blocked){if(this.blocked===blocked)return;this.blocked=blocked;if(blocked){this.nextPending=false;this.audio.pause();this.audio.volume=0;this.status.textContent='Radio disabled during missions';}else if(this.active&&this.enabled){if(this.current)this.play();else this.next();}else this.status.textContent=this.enabled?'Radio ready · J: radio':'Radio off · J: turn on';}
 get isPlaying(){return !this.blocked&&!this.audio.paused&&this.audio.volume>.001&&this.audio.readyState>=2;}
 async scan(){
  if(this.scanning)return;this.scanning=true;
  try{
   if(globalThis.location?.protocol==='file:'&&Array.isArray(globalThis.GTA6_RADIO_TRACKS)){
    const files=globalThis.GTA6_RADIO_TRACKS.map(name=>new URL('./radio/'+encodeURIComponent(name),document.baseURI).href);
    const changed=JSON.stringify(files)!==JSON.stringify(this.tracks);if(changed){this.tracks=files;this.queue=[];this.failed.clear();}
    if(!files.length)this.status.textContent='Add songs to the radio folder, then rebuild the game bundle';
    else if(!this.current&&this.active&&this.enabled)this.next();
    else if(!this.current)this.status.textContent=files.length+' tracks ready · J: radio';
    return;
   }
   const folder=new URL('./radio/',location.href);const response=await fetch(folder,{cache:'no-store'});if(!response.ok)throw Error('Folder unavailable');
   const doc=new DOMParser().parseFromString(await response.text(),'text/html');
   const files=[...doc.querySelectorAll('a[href]')].map(a=>new URL(a.getAttribute('href'),folder)).filter(u=>u.origin===folder.origin&&u.pathname.startsWith(folder.pathname)&&/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(u.pathname)).map(u=>u.href);
   const changed=JSON.stringify(files)!==JSON.stringify(this.tracks);if(changed){this.tracks=files;this.queue=[];this.failed.clear();}
   if(!files.length)this.status.textContent='Add songs to the radio folder';
   else if(!this.current&&this.active&&this.enabled)this.next();
   else if(!this.current)this.status.textContent=files.length+' tracks ready · J: radio';
  }catch{if(!this.current)this.status.textContent='Radio folder unavailable';}
  finally{this.scanning=false;}
 }
 setActive(active){if(active===this.active)return;this.active=active;if(active&&this.enabled){if(this.current)this.play();else this.next();}}
 toggle(){if(this.blocked)return;this.enabled=!this.enabled;if(!this.enabled){this.status.textContent='Radio off · J: turn on';}else if(this.active){if(this.current)this.play();else this.next();}}
 next(){if(this.blocked)return;if(this.current&&!this.audio.paused&&this.audio.volume>.01){this.nextPending=true;return;}this.nextPending=false;this.advance();}
 advance(){
  if(this.blocked||!this.active||!this.enabled)return;const available=this.tracks.filter(t=>!this.failed.has(t));
  if(!available.length){this.status.textContent='Add songs to the radio folder';return;}
  if(!this.queue.length)this.queue=shuffledTracks(available,this.current);
  this.current=this.queue.pop();this.audio.src=this.current;this.play();
 }
 tick(dt){const target=!this.blocked&&this.active&&this.enabled&&!this.nextPending?this.volume:0;const step=dt*.45;this.audio.volume=Math.max(0,Math.min(1,this.audio.volume+Math.sign(target-this.audio.volume)*Math.min(step,Math.abs(target-this.audio.volume))));if(this.audio.volume<.001){if(this.nextPending){this.nextPending=false;this.advance();}else if(this.blocked||!this.active||!this.enabled)this.audio.pause();}}
 async play(){if(this.blocked||!this.active||!this.enabled)return;const request=++this.playRequest;
  try{await this.audio.play();if(request!==this.playRequest)return;if(this.blocked||!this.active||!this.enabled)this.audio.pause();else this.status.textContent='♫ '+decodeURIComponent(new URL(this.current).pathname.split('/').pop()).replace(/\.[^.]+$/,'');}
  catch(e){if(request!==this.playRequest)return;if(e.name==='NotAllowedError')this.status.textContent='Press J twice to start the radio';else if(e.name!=='AbortError')this.status.textContent='Could not play this track · N: next';}
 }
}
