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

const mistGeo = new THREE.BufferGeometry();
const mistCount = 220;
const mistPos = new Float32Array(mistCount * 3);
for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = (Math.random() - 0.5) * 180;
    mistPos[i * 3 + 1] = Math.random() * 1.6;
    mistPos[i * 3 + 2] = (Math.random() - 0.5) * 180;
}
mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
const mistMat = new THREE.PointsMaterial({
    color: 0x4ade80,
    size: 1.2,
    transparent: true,
    opacity: 0.12,
    sizeAttenuation: true,
});
const groundMist = new THREE.Points(mistGeo, mistMat);
Scene.add(groundMist);

class Player {
    name;
    constructor(name) {
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
    health;
    lives;
    constructor(name, X, Y, Z, Color, health, lives) {
        super(name);
        this.x = X;
        this.y = Y;
        this.z = Z;
        this.color = Color;
        this.health = 50;
        this.lives = lives;
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
        div2.textContent = this.health;
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
};

socket.on("identity", (data) => {
    myusername = data.me;
})

let myusername;
let cnt = 0;
const playerrecord = [];
const players = {};
const colors = [0x00FF00, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082]

socket.on('connect', () => {
    console.log("Hello  i am the players file");
    console.log('Connected', socket.id);
});

socket.on('lobby-update', (data) => {
    console.log("This is the object", data.squad);
    const worldState = data.box;
    console.log(typeof (worldState));
    console.log("The current world state:", worldState);
    for (const roomId in data.squad) {
        const roomArray = data.squad[roomId];
        for (const obj in roomArray) {
            if (!players[roomArray[obj].Name]) {
                players[roomArray[obj].Name] = new Playeractions(roomArray[obj].Name, worldState[roomArray[obj].Name].x, worldState[roomArray[obj].Name].y, worldState[roomArray[obj].Name].z, 0x00FF00, worldState[roomArray[obj].Name].health, worldState[roomArray[obj].Name].lives);
                console.log(players);
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

document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (keyMap[key] === 'moveUp') {
        console.log("Upward movement");
        socket.emit('moveUp', {
            msg: `player wants to move up please`
        })
    }
    if (keyMap[key] === 'moveDown') {
        console.log("downward movement");
        socket.emit('moveDown', {
            msg: `player wants to moveDown please`
        })
    }
    if (keyMap[key] === 'moveRight') {
        console.log("rightward movement");
        socket.emit('moveRight', {
            msg: `player wants to moveRight please`
        })

    }
    if (keyMap[key] === 'moveLeft') {
        console.log("leftward movement");
        socket.emit('moveLeft', {
            msg: `player  wants to moveLeft please`
        })
    }
    if (keyMap[key] === 'moveForward') {
        console.log("foward movement");
        socket.emit('moveForward', {
            msg: `player wants to moveForward please`
        })
    }
    if (keyMap[key] === 'moveBackward') {
        console.log("downward movement");
        socket.emit('moveBackward', {
            msg: `player  wants to move down please `
        })
    }
});

document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    socket.emit('moveUpstop', {

    });
    socket.emit('moveDownstop', {


    });
    socket.emit('moveRightstop', {



    });
    socket.emit('moveLeftstop', {


    });
    socket.emit('moveForwardstop', {

    });
    socket.emit('moveBackwardstop');

})

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(0.45);

window.addEventListener('resize', () => {
    PerspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    PerspectiveCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

const targetPosition = new THREE.Vector3();
const lookAtTarget = new THREE.Vector3();

socket.on('update-movement', (data) => {
    const finalstate = data.worldstate;
    const deadstate = data.deadstate;
    for (const name in finalstate) {
        console.log(name);
        players[name].x = finalstate[name].x;
        players[name].y = finalstate[name].y;
        players[name].z = finalstate[name].z;
        players[name].health = finalstate[name].health;
        players[name].player.position.set(players[name].x, players[name].y, players[name].z);
        players[name].hpDiv.textContent = finalstate[name].health;
    }

    for (const name in deadstate) {
        if (players[name].lives === 0) {
            if (players[name]) {
                players[name].player.traverse((obj => {
                    if (obj.element) {
                        obj.element.remove();
                    }
                }))
                Scene.remove(players[name].player);
                players[name].player.geometry.dispose();
                players[name].player.material.dispose();
                delete players[name];
            }
            delete data.deadstate[name];
        }
    }
});

function tickGroundMist(t) {
    groundMist.rotation.y = t * 0.01;
    groundMist.position.y = Math.sin(t * 0.3) * 0.15;
}

function animate(timestamp) {
    requestAnimationFrame(animate);
    const t = (timestamp || 0) / 1000;
    tickGroundMist(t);
    const offset = new THREE.Vector3(0, 5, -15);
    if (!players[myusername]) {
        renderer.render(Scene, PerspectiveCamera);
        labelRenderer.render(Scene, PerspectiveCamera);
        return;
    }

    players[myusername].hpDiv.textContent = players[myusername].health;
    players[myusername].player.position.set(players[myusername].x, players[myusername].y, players[myusername].z);
    targetPosition.set(players[myusername].x, players[myusername].y, players[myusername].z).add(offset);
    PerspectiveCamera.position.lerp(targetPosition, 0.05);
    lookAtTarget.set(players[myusername].x, players[myusername].y, players[myusername].z);
    PerspectiveCamera.lookAt(lookAtTarget);
    renderer.render(Scene, PerspectiveCamera);
    labelRenderer.render(Scene, PerspectiveCamera);
}

socket.on('leave-room', (data) => {
    const leftplayer = data.left
    const id = data.id;
    console.log("Left player is", leftplayer);
    console.log("Id of the player is ", id);
    if (players[leftplayer]) {
        players[leftplayer].player.traverse((obj => {
            if (obj.element) {
                obj.element.remove();
            }
        }))
        Scene.remove(players[leftplayer].player);
        players[leftplayer].player.geometry.dispose();
        players[leftplayer].player.material.dispose();
        delete players[leftplayer];
    }
})
socket.on('duplicate', (data) => {
    socket.disconnect(true);
    window.location.href = '/user';
})

animate();
