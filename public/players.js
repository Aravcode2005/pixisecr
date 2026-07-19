/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const AK = {
    bg: 0x020b04,
    floor: 0x051209,
    floorEm: 0x0a2410,
    grid1: 0x22c55e,
    grid2: 0x071410,
    fog: 0x020b04,
    hemi_sky: 0x4ade80,
    hemi_gnd: 0x14532d,
    light1: 0xa8ff3e,
    light2: 0x2dd4bf,
    light3: 0xffd700,
    label_bg: 'rgba(2,11,4,0.92)',
    label_border: 'rgba(168,255,62,0.40)',
    label_color: '#a8ff3e',
    label_shadow: '0 0 8px rgba(168,255,62,0.90)',
    label_font: "'Quicksand', sans-serif",
    hp_color: '#ffd700',
    hp_shadow: '0 0 7px rgba(255,215,0,0.80)',
    hp_border: 'rgba(255,215,0,0.30)',
};
const Scene = new THREE.Scene();
Scene.background = new THREE.Color(AK.bg);
Scene.fog = new THREE.FogExp2(AK.fog, 0.014);

Scene.add(new THREE.AmbientLight(0xffffff, 0.12));

const hemiLight = new THREE.HemisphereLight(AK.hemi_sky, AK.hemi_gnd, 0.60);
Scene.add(hemiLight);

const pLightLime = new THREE.PointLight(AK.light1, 4.0, 140);
pLightLime.position.set(-40, 30, -40);
Scene.add(pLightLime);

const pLightTeal = new THREE.PointLight(AK.light2, 3.5, 140);
pLightTeal.position.set(90, 25, 90);
Scene.add(pLightTeal);

const pLightGold = new THREE.PointLight(AK.light3, 2.5, 120);
pLightGold.position.set(0, 50, 0);
Scene.add(pLightGold);


const PerspectiveCamera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
);


const labelRenderer = new THREE.CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
Object.assign(labelRenderer.domElement.style, {
    position: 'fixed', top: '0px', left: '0px',
    zIndex: '10', pointerEvents: 'none',
});
document.body.appendChild(labelRenderer.domElement);

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200, 32, 32),
    new THREE.MeshStandardMaterial({
        color: AK.floor, roughness: 0.55, metalness: 0.30,
        emissive: new THREE.Color(AK.floorEm), emissiveIntensity: 0.22,
    })
);
floor.rotation.x = -Math.PI / 2;
Scene.add(floor);


const grid = new THREE.GridHelper(200, 50, AK.grid1, AK.grid2);
grid.material.opacity = 0.12;
grid.material.transparent = true;
grid.position.y = 0.01;
Scene.add(grid);


const arenaRing = new THREE.Mesh(
    new THREE.TorusGeometry(101, 0.25, 8, 120),
    new THREE.MeshStandardMaterial({
        color: 0x4ade80, emissive: new THREE.Color(0x4ade80),
        emissiveIntensity: 1.4, transparent: true, opacity: 0.55,
    })
);
arenaRing.rotation.x = -Math.PI / 2;
arenaRing.position.y = 0.15;
Scene.add(arenaRing);


const disc = new THREE.Mesh(
    new THREE.CircleGeometry(2, 32),
    new THREE.MeshStandardMaterial({
        color: 0xa8ff3e, emissive: new THREE.Color(0xa8ff3e),
        emissiveIntensity: 1.0, transparent: true, opacity: 0.30,
    })
);
disc.rotation.x = -Math.PI / 2;
disc.position.y = 0.02;
Scene.add(disc);

const mistGeo = new THREE.BufferGeometry();
const mistCount = 400;
const mistPos = new Float32Array(mistCount * 3);
for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = (Math.random() - 0.5) * 190;
    mistPos[i * 3 + 1] = Math.random() * 1.8;
    mistPos[i * 3 + 2] = (Math.random() - 0.5) * 190;
}
mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
const groundMist = new THREE.Points(mistGeo, new THREE.PointsMaterial({
    color: 0x4ade80, size: 1.4, transparent: true,
    opacity: 0.10, sizeAttenuation: true,
}));
Scene.add(groundMist);


const ffGeo = new THREE.BufferGeometry();
const ffCount = 120;
const ffPos = new Float32Array(ffCount * 3);
for (let i = 0; i < ffCount; i++) {
    ffPos[i * 3] = (Math.random() - 0.5) * 160;
    ffPos[i * 3 + 1] = Math.random() * 8 + 0.5;
    ffPos[i * 3 + 2] = (Math.random() - 0.5) * 160;
}
ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({
    color: 0xffd700, size: 0.55, transparent: true,
    opacity: 0.85, sizeAttenuation: true,
}));
Scene.add(fireflies);


function makeTree(x, z) {
    const group = new THREE.Group();


    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x3b1f0a, roughness: 0.9, metalness: 0.0,
    });
    const trunkH = 5 + Math.random() * 4;
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.38, trunkH, 7),
        trunkMat
    );
    trunk.position.y = trunkH / 2;
    group.add(trunk);


    const canopyMat = new THREE.MeshStandardMaterial({
        color: 0x166534, roughness: 0.8, metalness: 0.0,
        emissive: new THREE.Color(0x14532d), emissiveIntensity: 0.18,
    });
    const layers = 2 + Math.floor(Math.random() * 2);
    for (let l = 0; l < layers; l++) {
        const r = 2.2 - l * 0.5 + Math.random() * 0.4;
        const h = 2.5 - l * 0.3;
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(r, h, 8),
            canopyMat
        );
        cone.position.y = trunkH + l * 1.4;
        cone.rotation.y = Math.random() * Math.PI;
        group.add(cone);
    }


    if (Math.random() > 0.5) {
        const vineLen = 3 + Math.random() * 3;
        const vine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, vineLen, 4),
            new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 1.0 })
        );
        vine.position.set(
            (Math.random() - 0.5) * 1.5,
            trunkH - vineLen / 2 + 1.0,
            (Math.random() - 0.5) * 1.5
        );
        group.add(vine);
    }

    group.position.set(x, 0, z);

    group.rotation.z = (Math.random() - 0.5) * 0.08;
    Scene.add(group);
}


const TREE_COUNT = 38;
for (let i = 0; i < TREE_COUNT; i++) {
    const angle = (i / TREE_COUNT) * Math.PI * 2;
    const radius = 88 + (Math.random() - 0.5) * 12;
    makeTree(Math.cos(angle) * radius, Math.sin(angle) * radius);
}


for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 55 + Math.random() * 20;
    makeTree(Math.cos(angle) * r, Math.sin(angle) * r);
}

function makeFern(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: 0x16a34a, roughness: 1.0, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), mat);
        leaf.position.set(
            (Math.random() - 0.5) * 0.8, Math.random() * 0.6,
            (Math.random() - 0.5) * 0.8
        );
        leaf.rotation.set(
            -Math.PI / 4 + Math.random() * 0.5,
            Math.random() * Math.PI * 2, 0
        );
        group.add(leaf);
    }
    group.position.set(x, 0, z);
    Scene.add(group);
}

for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 76;
    makeFern(Math.cos(angle) * r, Math.sin(angle) * r);
}

class Player {
    constructor(name) { this.name = name; }
}

class Playeractions extends Player {
    x = 0; y = 0; z = 0;
    localX = 0;
    localY = 0;
    localZ = 0;
    prevX = 0; prevZ = 0;
    movePhase = 0;
    isMoving = false;
    moveUp = false;
    moveDown = false;
    moveLeft = false;
    moveRight = false;
    moveForward = false;
    moveBackward = false;
    health = 50;
    lives;

    constructor(name, X, Y, Z, health, lives) {
        super(name);
        this.x = X; this.y = Y; this.z = Z;
        this.localX = X; this.localY = Y; this.localZ = Z;
        this.prevX = X; this.prevZ = Z;
        this.health = health ?? 50;
        this.lives = lives;
        this.player = new THREE.Group();

        const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
        this.color = new THREE.Color(`hsl(${hue}, 80%, 55%)`);

        const mat = new THREE.MeshLambertMaterial({
            color: this.color,
            emissive: this.color.clone().multiplyScalar(0.15),
        });


        const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
        head.position.y = 2.9;
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.7), mat);
        body.position.y = 1.4;
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.35), mat);
        leftArm.position.set(-0.8, 1.2, 0);
        const rightArm = leftArm.clone();
        rightArm.position.x = 0.8;
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), mat);
        leftLeg.position.set(-0.3, 0, 0);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.3;
        this.leftArm = leftArm;
        this.rightArm = rightArm;
        this.leftLeg = leftLeg;
        this.rightLeg = rightLeg;
        this.player.add(head, body, leftArm, rightArm, leftLeg, rightLeg);
        const mkDiv = (text, sz, col, shd, bdr) => {
            const d = document.createElement('div');
            d.textContent = text;
            d.style.cssText = `
                font-family:${AK.label_font};font-size:${sz};font-weight:500;
                letter-spacing:1px;color:${col};text-shadow:${shd};
                background:${AK.label_bg};border:1px solid ${bdr};
                padding:4px 10px;white-space:nowrap;pointer-events:none;
                border-radius:2px;clip-path:polygon(0 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%);
            `;
            return d;
        };

        const nameDiv = mkDiv(name, '11px', AK.label_color, AK.label_shadow, AK.label_border);
        const hpDiv = mkDiv(this.health, '10px', AK.hp_color, AK.hp_shadow, AK.hp_border);
        this.hpDiv = hpDiv;

        const nameLabel = new THREE.CSS2DObject(nameDiv);
        nameLabel.position.set(0, 2, 0);
        const hpLabel = new THREE.CSS2DObject(hpDiv);
        hpLabel.position.set(0, 4, 0);
        this.player.add(nameLabel, hpLabel);
        this.player.position.set(X, Y, Z);
        Scene.add(this.player);
    }

    tickAnimation(dt) {

        const dx = this.x - this.prevX;
        const dz = this.z - this.prevZ;
        const speed = Math.sqrt(dx * dx + dz * dz);
        this.isMoving = speed > 0.005;

        if (this.isMoving) {
            this.movePhase += dt * 7.5;
            const swing = Math.sin(this.movePhase) * 0.6;
            this.leftArm.rotation.x = swing;
            this.rightArm.rotation.x = -swing;
            this.leftLeg.rotation.x = -swing;
            this.rightLeg.rotation.x = swing;

            if (speed > 0.01) {
                const targetAngle = Math.atan2(dx, dz);
                this.player.rotation.y += (targetAngle - this.player.rotation.y) * 0.2;
            }
        } else {

            const ease = 0.12;
            this.leftArm.rotation.x *= (1 - ease);
            this.rightArm.rotation.x *= (1 - ease);
            this.leftLeg.rotation.x *= (1 - ease);
            this.rightLeg.rotation.x *= (1 - ease);
        }

        this.prevX = this.x;
        this.prevZ = this.z;
    }
}


function destroyPlayer(playerObj) {
    if (!playerObj?.player) return;
    playerObj.player.traverse((obj) => {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
            if (!m) return;
            for (const k in m) {
                if (m[k]?.isTexture) m[k].dispose();
            }
            m.dispose();
        });
        obj.element?.remove();
    });
    Scene.remove(playerObj.player);
    playerObj.player.clear();
}


let myusername;
const players = {};

socket.on('identity', (data) => { myusername = data.me; });

socket.on('connect', () => {
    console.log('Connected', socket.id);
});

socket.on('lobby-update', (data) => {
    const playerList = data.squad;
    const worldroom = data.worldss;
    for (const k in playerList) {
        const p = playerList[k];
        if (!players[p.Name]) {
            const w = worldroom[p.Name];
            players[p.Name] = new Playeractions(p.Name, w.x, w.y, w.z, w.health, w.lives);
        }
    }
});
socket.on('start match', (data) => {
    const universe = data.ws;
    const loader = new THREE.GLTFLoader();
    try {
        loader.load('/hero_sword.glb', function (gltf) {
            const sword = gltf.scene;
            sword.position.set(0.8, 1.2, 0);
            for (const name in universe) {
                const noob = players[name];
                noob.player.add(sword.clone());
            }
        }, undefined, function (error) {
            console.log(error);
        });
    } catch (error) {
        console.log(`Error found ${error}`);
    }
})
socket.on('update-movement', (data) => {
    const { worldstate, deadstate } = data;
    for (const name in worldstate) {
        const p = players[name];
        if (!p) continue;
        p.x = worldstate[name].x;
        p.y = worldstate[name].y;
        p.z = worldstate[name].z;
        p.health = worldstate[name].health;
        p.lives = worldstate[name].lives;
        p.hpDiv.textContent = p.health;


        if (name !== myusername) {
            p.player.position.set(p.x, p.y, p.z);
        }
    }
    for (const name in deadstate) {
        if (!players[name]) continue;
        destroyPlayer(players[name]);
        delete players[name];
    }
});

socket.on('leave-room', ({ left }) => {
    if (!players[left]) return;
    destroyPlayer(players[left]);
    delete players[left];
});

socket.on('duplicate', () => {
    socket.disconnect(true);
    window.location.href = '/user';
});

const keyMap = { u: 'moveUp', d: 'moveDown', r: 'moveRight', l: 'moveLeft', f: 'moveForward', b: 'moveBackward' };
const localKeyMap = { u: 'moveUp', d: 'moveDown', r: 'moveRight', l: 'moveLeft', f: 'moveForward', b: 'moveBackward' };
document.addEventListener('keydown', (e) => {
    const action = keyMap[e.key.toLowerCase()];
    const localAction = localKeyMap[e.key.toLowerCase()];
    if (localAction === 'moveUp') {
        console.log("Upward movement");
        players[myusername].moveUp = true;
    }
    if (localAction === 'moveDown') {
        console.log("downward movement");
        players[myusername].moveDown = true;
    }
    if (localAction === 'moveRight') {
        console.log("rightward movement");
        players[myusername].moveRight = true;
    }
    if (localAction === 'moveLeft') {
        console.log("leftward movement")
        players[myusername].moveLeft = true;
    }
    if (localAction === 'moveForward') {
        console.log("foward movement");
        players[myusername].moveForward = true;
    }
    if (localAction === 'moveBackward') {
        console.log("downward movement");
        players[myusername].moveBackward = true;
    }
    if (action) {
        socket.emit(action, {
            msg: `player wants to ${action}`
        });
    };
});

document.addEventListener('keyup', (event) => {
    if (!players[myusername]) {
        return;
    }
    const key = event.key.toLowerCase();
    if (key !== undefined) {
        players[myusername][localKeyMap[key]] = false;
    }

    ['moveUp', 'moveDown', 'moveRight', 'moveLeft', 'moveForward', 'moveBackward']
        .forEach(a => socket.emit(a + 'stop'));
});

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(0.55);

window.addEventListener('resize', () => {
    PerspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    PerspectiveCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

function tickEnv(t) {
    groundMist.rotation.y = t * 0.008;
    groundMist.position.y = Math.sin(t * 0.25) * 0.18;
    fireflies.rotation.y = t * 0.015;
    fireflies.material.opacity = 0.55 + 0.3 * Math.sin(t * 1.8);
    const ffArr = ffGeo.attributes.position.array;
    for (let i = 0; i < ffCount; i++) {
        ffArr[i * 3 + 1] += Math.sin(t * 1.2 + i) * 0.003;
    }
    ffGeo.attributes.position.needsUpdate = true;
    pLightGold.intensity = 2.2 + Math.sin(t * 3.7) * 0.6;
}
let lastTime = 0;
const v = 15;

const CORRECTION_SPEED = 90;
const SNAP_THRESHOLD = 5;    
const CORRECT_THRESHOLD = 0.1; 


const serverVec = new THREE.Vector3();
const targetPosition = new THREE.Vector3();
const lookAtTarget = new THREE.Vector3();

function animate(timestamp) {
    requestAnimationFrame(animate);
    const t = (timestamp || 0) / 1000;
    const dt = Math.min(t - lastTime, 0.1);
    lastTime = t;
    tickEnv(t);
    for (const name in players) {
        players[name].tickAnimation(dt);
    }
    if (!players[myusername]) {
        renderer.render(Scene, PerspectiveCamera);
        labelRenderer.render(Scene, PerspectiveCamera);
        return;
    }

    const me = players[myusername];
    if (me.moveDown) me.localY -= v * dt;
    if (me.moveUp) me.localY += v * dt;
    if (me.moveForward) me.localZ += v * dt;
    if (me.moveBackward) me.localZ -= v * dt;
    if (me.moveLeft) me.localX -= v * dt;
    if (me.moveRight) me.localX += v * dt;

    me.player.position.set(me.localX, me.localY, me.localZ);
    const drift = Math.sqrt(
        (me.localX - me.x) ** 2 +
        (me.localY - me.y) ** 2 +
        (me.localZ - me.z) ** 2
    );

    if (drift >= SNAP_THRESHOLD) {
    
        me.localX = me.x; me.localY = me.y; me.localZ = me.z;
        me.player.position.set(me.x, me.y, me.z);
    } else if (drift >= CORRECT_THRESHOLD) {
        const factor = 1 - Math.exp(-CORRECTION_SPEED * dt);
        serverVec.set(me.x, me.y, me.z);
        me.player.position.lerp(serverVec, factor);
        me.localX = me.player.position.x;
        me.localY = me.player.position.y;
        me.localZ = me.player.position.z;
    }
    
    const renderedPos = me.player.position;
    const offset = new THREE.Vector3(0, 5, -15);
    targetPosition.copy(renderedPos).add(offset);
    PerspectiveCamera.position.lerp(targetPosition, 0.05);
    lookAtTarget.copy(renderedPos);
    PerspectiveCamera.lookAt(lookAtTarget);

    renderer.render(Scene, PerspectiveCamera);
    labelRenderer.render(Scene, PerspectiveCamera);
}
animate();