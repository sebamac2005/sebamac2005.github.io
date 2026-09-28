export const WEAPONS=[
 {name:'GLOCK',price:0,capacity:17,reloadTime:1.25,interval:.22,automatic:false,damage:34,range:120,pellets:1},
 {name:'KARABIN',price:900,capacity:30,reloadTime:1.85,interval:.105,automatic:true,damage:25,range:220,pellets:1},
 {name:'STRZELBA',price:1500,capacity:6,reloadTime:2.4,interval:.8,automatic:false,damage:18,range:65,pellets:7,spread:.045},
 {name:'SNAJPERKA',price:2800,capacity:5,reloadTime:2.8,interval:1.2,automatic:false,damage:110,range:500,pellets:1,zoom:28},
 {name:'SMG',price:1200,capacity:30,reloadTime:1.6,interval:.075,automatic:true,damage:17,range:140,pellets:1}
];
export class WeaponState{
 constructor(){this.selected=0;this.ammo=WEAPONS.map(w=>w.capacity);this.equipped=true;this.reloadLeft=0;this.cooldown=0;this.owned=[true,false,false,false,false];this.money=0;this.grants=[];try{const s=JSON.parse(localStorage.getItem('gta6.arsenal'));if(s){this.money=Math.max(0,Math.floor(Number(s.money)||0));this.owned=WEAPONS.map((_,i)=>i===0||s.owned?.[i]===true);this.grants=Array.isArray(s.grants)?s.grants.filter(x=>typeof x==='string'):[];}}catch{}}
 reset(){this.selected=0;this.ammo=WEAPONS.map(w=>w.capacity);this.equipped=true;this.reloadLeft=0;this.cooldown=0;this.owned=WEAPONS.map((_,i)=>i===0);this.money=0;this.grants=[];this.infiniteAmmo=false;this.save();}
 save(){try{localStorage.setItem('gta6.arsenal',JSON.stringify({money:this.money,owned:this.owned,grants:this.grants}));}catch{}}
 addMoney(amount){if(!Number.isFinite(amount)||amount<=0)return;this.money+=Math.floor(amount);this.save();}
 grant(key,amount){if(this.grants.includes(key))return false;this.grants.push(key);this.addMoney(amount);return true;}
 buy(index){const w=WEAPONS[index];if(!w||this.owned[index]||this.money<w.price)return false;this.money-=w.price;this.owned[index]=true;this.ammo[index]=w.capacity;this.save();return true;}
 get definition(){return WEAPONS[this.selected];}
 equip(index){if(!this.owned[index])return false;if(index!==this.selected||!this.equipped){this.reloadLeft=0;this.cooldown=0;}this.selected=index;this.equipped=true;return true;}
 holster(){this.equipped=false;this.reloadLeft=0;}
 reload(){if(!this.equipped||this.reloadLeft>0||this.ammo[this.selected]===this.definition.capacity)return false;this.reloadLeft=this.definition.reloadTime;return true;}
 tick(dt){if(this.infiniteAmmo){this.ammo=WEAPONS.map(w=>w.capacity);this.reloadLeft=0;}this.cooldown=Math.max(0,this.cooldown-dt);if(this.reloadLeft>0){this.reloadLeft=Math.max(0,this.reloadLeft-dt);if(this.reloadLeft===0)this.ammo[this.selected]=this.definition.capacity;}}
 fire(){if(!this.equipped||!this.owned[this.selected]||this.reloadLeft>0||this.cooldown>0||this.ammo[this.selected]<=0)return false;if(!this.infiniteAmmo)this.ammo[this.selected]--;this.cooldown=this.definition.interval;return true;}
}
