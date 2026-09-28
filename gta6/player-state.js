export class PlayerState{
 constructor(){this.health=100;this.armor=35;this.failed=false;this.reason='';this.hurt=0;this.sinceHit=0;this.stamina=100;}
 damage(amount,reason='Zginąłeś.'){if(this.invulnerable||this.failed||amount<=0)return false;const absorbed=Math.min(this.armor,amount*.6);this.armor-=absorbed;this.health=Math.max(0,this.health-amount+absorbed);this.hurt=1;this.sinceHit=0;if(this.health===0)this.fail(reason);return true;}
 fail(reason){if(this.failed)return;this.failed=true;this.reason=reason;}
 reset(){this.health=100;this.armor=35;this.failed=false;this.reason='';this.hurt=0;this.sinceHit=0;this.stamina=100;}
 tick(dt,sprinting){if(this.failed)return;this.hurt=Math.max(0,this.hurt-dt*1.8);this.sinceHit+=dt;if(this.sinceHit>10)this.health=Math.min(100,this.health+dt*3);this.stamina=Math.max(0,Math.min(100,this.stamina+dt*(sprinting?-14:21)));}
}
