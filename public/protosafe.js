const AK = {
    bg: 0x050e08,
    floor: 0x071410,
    floorEm: 0x0d2e18,
    grid1: 0x2dd4bf,
    grid2: 0x0a1f10,
    fog: 0x050e08,
    hemi_sky: 0x4ade80,
    hemi_gnd: 0x14532d,
    light1: 0xa8ff3e,
    light2: 0x2dd4bf,
    light3: 0xe8d97a,
    label_bg: 'rgba(5,14,8,0.90)',
    label_border: 'rgba(168,255,62,0.38)',
    label_color: '#a8ff3e',
    label_shadow: '0 0 8px rgba(168,255,62,0.85)',
    label_font: "'Quicksand', sans-serif",
    hp_color: '#e8d97a',
    hp_shadow: '0 0 7px rgba(232,217,122,0.75)',
    hp_border: 'rgba(232,217,122,0.28)',
};

const Scene = new THREE.Scene();
Scene.background = new THREE.Color(AK.bg);
Scene.fog = new THREE.FogExp2(AK.fog, 0.011);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.18);
Scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(AK.hemi_sky, AK.hemi_gnd, 0.55);
Scene.add(hemiLight);

const pLightLime = new THREE.PointLight(AK.light1, 3.5, 120);
pLightLime.position.set(-40, 30, -40);
Scene.add(pLightLime);

const pLightTeal = new THREE.PointLight(AK.light2, 3.0, 120);
pLightTeal.position.set(90, 25, 90);
Scene.add(pLightTeal);

const pLightGold = new THREE.PointLight(AK.light3, 2.0, 100);
pLightGold.position.set(0, 50, 0);
Scene.add(pLightGold);

const PerspectiveCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const labelRenderer = new THREE.CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
labelRenderer.domElement.style.zIndex = '10';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200, 32, 32),
    new THREE.MeshStandardMaterial({
        color: AK.floor,
        roughness: 0.38,
        metalness: 0.52,
        emissive: new THREE.Color(AK.floorEm),
        emissiveIntensity: 0.28,
    })
);
floor.rotation.x = -Math.PI / 2;
Scene.add(floor);

const grid = new THREE.GridHelper(200, 50, AK.grid1, AK.grid2);
grid.material.opacity = 0.18;
grid.material.transparent = true;
grid.position.y = 0.01;
Scene.add(grid);

const ringGeom = new THREE.TorusGeometry(101, 0.25, 8, 120);
const ringMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: new THREE.Color(0x4ade80),
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.5,
});
const arenaRing = new THREE.Mesh(ringGeom, ringMat);
arenaRing.rotation.x = -Math.PI / 2;
arenaRing.position.y = 0.15;
Scene.add(arenaRing);

const discGeom = new THREE.CircleGeometry(2, 32);
const discMat = new THREE.MeshStandardMaterial({
    color: 0xa8ff3e,
    emissive: new THREE.Color(0xa8ff3e),
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.35,
});
const disc = new THREE.Mesh(discGeom, discMat);
disc.rotation.x = -Math.PI / 2;
disc.position.y = 0.02;
Scene.add(disc);


class Player {
    name;
    constructor(name, era, position) {
        this.name = name;
    }
};

class Playeractions extends Player {
    x = 0;
    y = 0;
    z = 0;
    theta;
    color;
    moveUp = false;
    moveDown = false;
    moveLeft = false;
    moveRight = false;
    moveForward = false;
    moveBackward = false;
    rotate = false;
    movementdynamics = [];
    health = [];
    constructor(name, X, Y, Z, Color, arr = [], health = []) {
        super(name);
        this.x = X;
        this.y = Y;
        this.z = Z;
        this.color = Color;
        this.health[0] = 50;
        this.movementdynamics = [[X, Y, Z]];
        this.player = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 3),
            new THREE.MeshStandardMaterial({
                color: this.color,
                emissive: 0x886600,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2
            })
        );
        this.player.position.set(X, Y, Z);
        const div = document.createElement('div');
        div.textContent = this.name;
        div.style.fontFamily = AK.label_font;
        div.style.fontSize = '11px';
        div.style.fontWeight = '500';
        div.style.letterSpacing = '1px';
        div.style.color = AK.label_color;
        div.style.textShadow = AK.label_shadow;
        div.style.background = AK.label_bg;
        div.style.border = '1px solid ' + AK.label_border;
        div.style.padding = '4px 10px';
        div.style.whiteSpace = 'nowrap';
        div.style.pointerEvents = 'none';
        div.style.borderRadius = '2px';
        div.style.clipPath = 'polygon(0 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%)';
        const div2 = document.createElement('div');
        div2.textContent = this.health[0];
        div2.style.fontFamily = AK.label_font;
        div2.style.fontSize = '10px';
        div2.style.fontWeight = '400';
        div2.style.color = AK.hp_color;
        div2.style.textShadow = AK.hp_shadow;
        div2.style.background = AK.label_bg;
        div2.style.border = '1px solid ' + AK.hp_border;
        div2.style.padding = '3px 10px';
        div2.style.borderRadius = '2px';
        div2.style.pointerEvents = 'none';
        this.hpDiv = div2;
        const label2 = new THREE.CSS2DObject(div2);
        const label = new THREE.CSS2DObject(div);
        label.position.set(0, 2, 0);
        label2.position.set(0, 4, 0);
        this.player.add(label);
        this.player.add(label2);
        Scene.add(this.player);
    }
    gravity(delta) {

        if (this.y > 0) {
            this.y -= 9.8 * delta;
        }
        if (this.y < 0) {
            this.y = 0;
        }
    }

};

let cnt = 0;
const playerrecord = [];
const players = {};
const colors = [0x00FF00, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082]
socket.on('connect', () => {
    console.log("Hello  i am the players file");
    console.log('Connected', socket.id);
});

function find(id, obj = {}) {
    for (const i in obj) {
        if (obj[i] === id) {
            return true;
        }
    }
    return false;
}
socket.on('lobby-update', (data) => {
    console.log("This is the object", data.squad);
    for (const obj in data.squad) {
        let array = data.squad[obj];
        for (let i = 0; i < array.length; i++) {
            if (!players[array[i].socketId]) {
                cnt += 10;
                players[array[i].socketId] = new Playeractions(array[i].Name, cnt, 0, 0, colors[(cnt / 10 - 1) % colors.length], [], []);
            }
        }
    }
});
const keyMap = {
    u: 'moveUp',
    d: 'moveDown',
    r: 'moveRight',
    l: 'moveLeft',
    f: 'moveForward',
    b: 'moveBackward',
    s: 'rotate',
};
const playerpositions = [];
document.addEventListener('keydown', (event) => {
    if (!players[socket.id]) {

        return;
    }
    const key = event.key.toLowerCase();

    if (keyMap[key] === 'moveUp') {
        console.log("Upward movement");
        players[socket.id].moveUp = true;
    }

    if (keyMap[key] === 'moveDown') {
        console.log("downward movement");
        if (players[socket.id].y >= 2) {
            players[socket.id].moveDown = true;
        }

    }

    if (keyMap[key] === 'moveRight') {
        console.log("rightward movement");
        if (players[socket.id].x <= 99) {
            players[socket.id].moveRight = true;
        }
    }

    if (keyMap[key] === 'moveLeft') {
        console.log("leftward movement")
        if (players[socket.id].x >= -99) {
            players[socket.id].moveLeft = true;
        }

    }
    if (keyMap[key] === 'moveForward') {
        console.log("foward movement");
        if (players[socket.id].z <= 99) {
            players[socket.id].moveForward = true;
        }

    }
    if (keyMap[key] === 'moveBackward') {
        console.log("downward movement");
        if (players[socket.id].z >= -99) {
            players[socket.id].moveBackward = true;
        }
    }

});

document.addEventListener('keyup', (event) => {
    if (!players[socket.id]) {
        return;
    }
    const key = event.key.toLowerCase();

    if (key !== undefined) {
        players[socket.id][keyMap[key]] = false;
    }

})

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

window.addEventListener('resize', () => {
    PerspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    PerspectiveCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
const velocity = 15;
const targetPosition = new THREE.Vector3();
const lookAtTarget = new THREE.Vector3();
const clock = new THREE.Clock();



function willcollide(currc = [], othercoordinates = []) {
    if (Math.abs(currc[0] - othercoordinates[0]) < 1 &&
        Math.abs(currc[1] - othercoordinates[1]) < 2 &&
        Math.abs(currc[2] - othercoordinates[2]) < 3) {
        return true;
    }
    return false;
}
function animate() {
    const delta = clock.getDelta();
    requestAnimationFrame(animate);
    if (!players[socket.id]) {
        renderer.render(Scene, PerspectiveCamera);
        return;
    }
    players[socket.id].hpDiv.textContent = players[socket.id].health[0];
    if (players[socket.id].moveDown) {
        let canmove = true;
        let newpos = [players[socket.id].x, players[socket.id].y - velocity * delta, players[socket.id].z];
        for (const it in players) {
            let newarr = [
                players[it].x,
                players[it].y,
                players[it].z
            ];
            if (it === socket.id) continue;
            if (willcollide(newpos, newarr)) {
                canmove = false;
                // players[socket.id].health[0]--;
                players[it].health[0]--;
                if (players[socket.id].health[0] === 0) {
                    players[socket.id].health[0] = 50;
                }
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                players[socket.id].hpDiv.textContent = players[socket.id].health[0];
                break;
            }
        }


        if (canmove) {
            players[socket.id].y -= velocity * delta;
        }
    }
    if (players[socket.id].moveUp) {
        let canmove = true;
        let newpos = [players[socket.id].x, players[socket.id].y + velocity * delta, players[socket.id].z];
        for (const it in players) {
            let newarr = [
                players[it].x,
                players[it].y,
                players[it].z
            ];
            if (it === socket.id) continue;
            if (willcollide(newpos, newarr)) {
                canmove = false;
                // players[socket.id].health[0]--;
                players[it].health[0]--;
                if (players[socket.id].health[0] === 0) {
                    players[socket.id].health[0] = 50;
                }
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }

                players[socket.id].hpDiv.textContent = players[socket.id].health[0];

                break;
            }
        }
        if (canmove) {
            players[socket.id].y += velocity * delta;
        }
    }
    if (players[socket.id].moveForward) {
        let canmove = true;
        let newpos = [players[socket.id].x, players[socket.id].y, players[socket.id].z + velocity * delta];
        for (const it in players) {
            let newarr = [
                players[it].x,
                players[it].y,
                players[it].z
            ];
            if (it === socket.id) continue;
            if (willcollide(newpos, newarr)) {

                //players[socket.id].health[0]--;
                players[it].health[0]--;
                if (players[socket.id].health[0] === 0) {
                    players[socket.id].health[0] = 50;
                }
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                canmove = false;
                players[socket.id].hpDiv.textContent = players[socket.id].health[0];

                break;
            }
        }
        if (canmove) {
            players[socket.id].z += velocity * delta;
        }
    }
    if (players[socket.id].moveBackward) {
        let canmove = true;
        let newpos = [players[socket.id].x, players[socket.id].y, players[socket.id].z - velocity * delta];

        for (const it in players) {
            let newarr = [
                players[it].x,
                players[it].y,
                players[it].z
            ];
            if (it === socket.id) continue;
            if (willcollide(newpos, newarr)) {
                // players[socket.id].health[0]--;
                players[it].health[0]--;
                if (players[socket.id].health[0] === 0) {
                    players[socket.id].health[0] = 50;
                }
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                canmove = false;
                players[socket.id].hpDiv.textContent = players[socket.id].health[0];
                break;
            }
        }

        if (canmove) {
            players[socket.id].z -= velocity * delta;
        }
    }
    if (players[socket.id].moveLeft) {
        let newpos = [players[socket.id].x - velocity * delta, players[socket.id].y, players[socket.id].z];
        let canmove = true;
        for (const it in players) {
            let newarr = [
                players[it].x,
                players[it].y,
                players[it].z
            ];
            if (it === socket.id) continue;
            if (willcollide(newpos, newarr)) {
                // players[socket.id].health[0]--;
                players[it].health[0]--;
                if (players[socket.id].health[0] === 0) {
                    players[socket.id].health[0] = 50;
                }
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                canmove = false;
                players[socket.id].hpDiv.textContent = players[socket.id].health[0];
                break;
            }
        }
        if (canmove) {
            players[socket.id].x -= velocity * delta;
        }
    }
    if (players[socket.id].moveRight) {

        let newpos = [players[socket.id].x + velocity * delta, players[socket.id].y, players[socket.id].z];
        let canmove = true;
        for (const it in players) {
            let newarr = [
                players[it].x,
                players[it].y,
                players[it].z
            ];
            if (it === socket.id) continue;
            if (willcollide(newpos, newarr)) {
                // players[socket.id].health[0]--;
                players[it].health[0]--;
                if (players[socket.id].health[0] === 0) {
                    players[socket.id].health[0] = 50;
                }
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                canmove = false;
                players[socket.id].hpDiv.textContent = players[socket.id].health[0];
                break;
            }
        }
        if (canmove) {
            players[socket.id].x += velocity * delta;
        }
    }
    players[socket.id].gravity(delta);
    players[socket.id].player.position.set(players[socket.id].x, players[socket.id].y, players[socket.id].z);

    if (playerpositions.length > 10) {
        playerpositions.shift();
    }
    playerpositions.push([players[socket.id].x, players[socket.id].y, players[socket.id].z]);
    const offset = new THREE.Vector3(0, 5, -15);
    targetPosition.set(players[socket.id].x, players[socket.id].y, players[socket.id].z).add(offset);
    PerspectiveCamera.position.lerp(targetPosition, 0.05);
    lookAtTarget.set(players[socket.id].x, players[socket.id].y, players[socket.id].z);
    PerspectiveCamera.lookAt(lookAtTarget);
    renderer.render(Scene, PerspectiveCamera);
    labelRenderer.render(Scene, PerspectiveCamera);
}
function network() {
    if (!players[socket.id]) {
        return;
    }
    socket.emit("update-movement", {
        x: players[socket.id].x,
        y: players[socket.id].y,
        z: players[socket.id].z,
    }, {
    });

    socket.emit("update health", {
        health: players[socket.id].health[0]
    })
}
socket.on('leave-room', (data) => {
    const leftplayer = data.left
    const id = data.id;
    console.log("Left player is", leftplayer);
    console.log("Id of the player is ", id);
    if (players[id]) {

        players[id].player.traverse((obj => {
            if (obj.element) {
                obj.element.remove();
            }
        }))
        Scene.remove(players[id].player);
        players[id].player.geometry.dispose();
        players[id].player.material.dispose();
        delete players[id];
    }
})
socket.on('start match', (data) => {
    const finalcoordinates = data.reliccoordinates;
    console.log(`Ok Mr.Server recieved the randomly generated coordinates,thanxs for the help ,now i will render the  objects according to the coordinates ${finalcoordinates}`);
    for (let i = 0; i < finalcoordinates.length; i++) {
        const Set = finalcoordinates[i];
        let p = Set[0];
        let q = Set[1];
        let r = Set[2];
        const geo = new THREE.SphereGeometry(0.5, 128, 32);
        const mat = new THREE.MeshPhysicalMaterial({
            color: colors[i % colors.length],
            emissive: 0x886600,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        })
        const relic = new THREE.Mesh(geo, mat);
        relic.position.x = p;
        relic.position.y = 1.5 + Math.sin(2) * 0.2 + 0.01;
        relic.position.z = r;
        Scene.add(relic);
    }

})

socket.on('movement', (data) => {
    const id = data.id;
    const pos = data.pos;
    if (!players[id]) {
        return;
    }
    players[id].x = pos.x;
    players[id].y = pos.y;
    players[id].z = pos.z;
    players[id].player.position.set(players[id].x, players[id].y, players[id].z);
})

socket.on('health info', (data) => {
    const id = data.id;
    const heal = data.health;
    if (!players[id]) {
        return;
    }
    players[id].health[0] = heal.health
    players[id].hpDiv.textContent = players[id].health[0];
})

socket.on('duplicate', (data) => {
    console.log("HELLO" + data.message);
    socket.disconnect(true);
    window.location.href = '/user';
})

setInterval(() => network(), 100);
animate();
