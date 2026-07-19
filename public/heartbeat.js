//LETS START WITH CHANGING A SPECIFIC ACTION IN REAL TIME 
class World {
    pulse;
    playerList=[];
    constructor(heartPulse,Players=[]) {
        this.pulse = heartPulse;
        this.playerList=Players;
    }
    tick() {
        
      
    }

}
//ab is world ke saare function ek time pe work karne
const world1 = new heartBeat(72);
setInterval(() => {
    world1.tick();
}, world1.pulse);