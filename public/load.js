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
    constructor(name) {
        this.name = name;
    }
};
class Playeractions extends Player {
    x = 0;
    y = 0;
    z = 0;
    moveUp = false;
    moveDown = false;
    moveLeft = false;
    moveRight = false;
    moveForward = false;
    moveBackward = false;
    rotate = false;
    health = [];
    constructor(scene, name, X, Y, Z, path, health = []) {
        super(name);
        this.x = X;
        this.y = Y;
        this.z = Z;
        this.health[0] = 50;
        const loader = new THREE.GLTFLoader();
        loader.load(path, (gltf) => {
            this.player = gltf.scene;
            this.player.position.set(X, Y, Z);
            const labelEl = document.createElement('div');
            labelEl.textContent = this.name;
            const label = new THREE.CSS2DObject(labelEl);
            this.label = label;
            const hpEl = document.createElement('div');
            hpEl.textContent = this.health[0];
            const hpDiv = new THREE.CSS2DObject(hpEl);
            this.hpDiv = hpDiv;
            label.position.set(0, 2, 0);
            hpDiv.position.set(0, 3, 0);
            this.player.add(label);
            this.player.add(hpDiv);
            scene.add(this.player);
        });

    }

    gravity(delta) {

        if (this.y > 0) {
            this.y -= delta * 9.8;
        }

        if (this.y <= 0) {
            this.y = 0;
        }

    }
}

let cnt = 0;
const playerrecord = [];
const players = {};
const characters = ['/shiba.glb', '/doggy_meme_dog_ps1.glb', '/cat_box_meme.glb', '/bananacat(1).glb', '/doggy_meme_wars.glb', '/noodle_cat_meme_low_poly.glb'];
socket.on('connect', () => {
    console.log("Hello  i am the players file");
    console.log('Connected', socket.id);
});

socket.on('lobby-update', (data) => {
    for (const obj in data.squad) {
        let array = data.squad[obj];
        for (let i = 0; i < array.length; i++) {
            if (!players[array[i].socketId]) {
                cnt += 10;
                players[array[i].socketId] = new Playeractions(Scene, array[i].Name, cnt, 2, 0, characters[(cnt / 10 - 1) % characters.length], []);
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

        players[socket.id].moveUp = true;
    }

    if (keyMap[key] === 'moveDown') {

        if (players[socket.id].y >= 4) {
            players[socket.id].moveDown = true;
        }

    }

    if (keyMap[key] === 'moveRight') {

        if (players[socket.id].x <= 99) {
            players[socket.id].moveRight = true;
        }
    }

    if (keyMap[key] === 'moveLeft') {

        if (players[socket.id].x >= -99) {
            players[socket.id].moveLeft = true;
        }

    }
    if (keyMap[key] === 'moveForward') {

        if (players[socket.id].z <= 99) {
            players[socket.id].moveForward = true;
        }

    }
    if (keyMap[key] === 'moveBackward') {

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

    if (!players[socket.id] || !players[socket.id].player || !players[socket.id].hpDiv) {
        renderer.render(Scene, PerspectiveCamera);
        labelRenderer.render(Scene, PerspectiveCamera);
        return;
    }

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
                players[it].health[0]--;
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                players[it].hpDiv.element.textContent=players[it].health[0];
                players[socket.id].hpDiv.element.textContent = players[socket.id].health[0];
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
                players[it].health[0]--;
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }

                players[it].hpDiv.element.textContent=players[it].health[0];
                players[socket.id].hpDiv.element.textContent = players[socket.id].health[0];

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
                canmove = false;
                players[it].health[0]--;
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                players[it].hpDiv.element.textContent=players[it].health[0];
                players[socket.id].hpDiv.element.textContent = players[socket.id].health[0];
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
                canmove = false;
                players[it].health[0]--;
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }

                players[it].hpDiv.element.textContent=players[it].health[0];
                players[socket.id].hpDiv.element.textContent = players[socket.id].health[0];

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
                canmove = false;
                players[it].health[0]--;
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                players[it].hpDiv.element.textContent=players[it].health[0];
                players[socket.id].hpDiv.element.textContent = players[socket.id].health[0];

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
                canmove = false;
                players[it].health[0]--;
                if (players[it].health[0] === 0) {
                    players[it].health[0] = 50;
                }
                players[it].hpDiv.element.textContent=players[it].health[0];
                players[socket.id].hpDiv.element.textContent = players[socket.id].health[0];

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
    if (players[id] && players[id].player) {
        players[id].player.traverse((obj) => {
            if (obj.isMesh) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        })
        Scene.remove(players[id].player);

    }

    delete players[id];
})


socket.on('movement', (data) => {
    const id = data.id;
    const pos = data.pos;
    if (players[id] === undefined || players[id].player === undefined) {
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
    if (players[id] === undefined || players[id].health === undefined || players[id].hpDiv === undefined) {
        return;
    }
    players[id].health[0] = heal.health
    players[id].hpDiv.element.textContent = players[id].health[0];
})

socket.on('duplicate', (data) => {
    socket.disconnect(true);
    window.location.href = '/user';
})

setInterval(() => network(), 100);
animate();
