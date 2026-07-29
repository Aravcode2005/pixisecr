/* eslint-disable no-unused-vars */
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const socketIo = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const cors = require('cors');
app.use(cors());
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
const cookieParser = require('cookie-parser');
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use(express.json());
const ConnectDB = require('./util/database');
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
})
app.use(sessionMiddleware);

app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(userRoutes);
app.use(authRoutes);
app.use(adminRoutes);
try {
    io.use((socket, next) => {
        sessionMiddleware(socket.request, {}, next);
    })
}
catch (error) {
    console.log(error);
}
function heapify(i, n, arr = []) {
    let parent = i;
    let left = 2 * i + 1;
    let right = 2 * i + 2;
    if (left < n) {
        if (arr[left][1] > arr[parent][1]) {
            parent = left;
        }
        else if (arr[left][1] === arr[parent][1]) {
            if (arr[left][2] >= arr[parent][2]) {
                parent = left;
            }
        }
    }
    if (right < n) {
        if (arr[right][1] > arr[parent][1]) {
            parent = right;
        }

        else if (arr[right][1] === arr[parent][1]) {
            if (arr[right][2] >= arr[parent][2]) {
                parent = right;
            }
        }
    }
    if (parent !== i) {
        const temp = arr[parent];
        arr[parent] = arr[i];
        arr[i] = temp;
        heapify(parent, arr);
    }
}

function arrange(arr = []) {
    for (let i = arr.length / 2 - 1; i >= 0; i--) {
        heapify(arr, arr.length, i);
    }
}
const rooms = {};
const maxCapacity = 3;
const playerlist = {};
const activeUsers = new Map();
const World = {};
const deadPlayers = {};
const keyMap = {
    u: 'moveUp',
    d: 'moveDown',
    r: 'moveRight',
    l: 'moveLeft',
    f: 'moveForward',
    b: 'moveBackward',
    s: 'rotate',
}
io.on('connection', (socket) => {
    let assignedroomId = null;
    if (!socket.request.session.username) {
        socket.disconnect(true);
        return;
    }
    const username = socket.request.session.username;
    console.log(`player ${username} joined!`)
    console.log('the list of the activPlayer', activeUsers);
    if (activeUsers.has(username)) {
        console.log(`Sorry mr.${socket.request.session.username} u cant enter again`);
        io.to(socket.id).emit('duplicate', {
            message: "You are already connected mf"
        })
    }
    else if (!activeUsers.has(username)) {
        activeUsers.set(socket.request.session.username, socket.id);
        socket.emit("identity", {
            me: socket.request.session.username
        })
        console.log(`Hello mr${socket.request.session.username}`);
        console.log("Updated map", activeUsers);
        for (const i in rooms) {
            if (rooms[i].length < maxCapacity) {
                assignedroomId = i;
                break;
            }
        }
        if (assignedroomId) {
            console.log(`We have the assignedroomId room id ${assignedroomId}`);
            console.log("Checkpoint 2.a crossed");
        }
        else if (!assignedroomId) {
            assignedroomId = Math.random().toString(36).slice(2);
            rooms[assignedroomId] = [];
            World[assignedroomId] = {};
        }
        console.log("Final assigned room id", assignedroomId);
        World[assignedroomId][socket.request.session.username] = {
            playerName: socket.request.session.username,
            id: socket.id,
            health: 50,
            relicscore: 0,
            x: Math.floor(Math.random() * 10),
            y: 0,
            z: Math.floor(Math.random() * 10),
            r: 1,
            lives: 5,
            'moveUp': false,
            'moveDown': false,
            'moveRight': false,
            'moveLeft': false,
            'moveForward': false,
            'moveBackward': false,
        }
        console.log(`Displaying the updated world state ${World}`)
        rooms[assignedroomId].push({
            socketId: socket.id,
            user: username
        })
        console.log("Updated room state", rooms);
        if (!playerlist[assignedroomId]) {
            playerlist[assignedroomId] = [];
        }
        const OBJ = {
            socketId: socket.id,
            Name: username
        }
        playerlist[assignedroomId].push(OBJ);
        socket.roomId = assignedroomId;
        console.log("Updated playerlist", playerlist);
        socket.on('join-room', () => {
            console.log(`${socket.request.session.username} joined the room with id  ${socket.roomId}`);
            socket.join(socket.roomId);
            try {
                if (rooms[socket.roomId].length === maxCapacity) {
                    console.log(`${socket.roomId} is full`);
                    console.log(`We have generated the randompositions for  the boxes`);
                    console.log(`Now sending the positions to the clients `);
                    const gameInstructions = [["Welcome to PixelMania"], ["Kill and Survive"], ["Best of luck"]]
                    for (const player in World[assignedroomId]) {
                        World[assignedroomId][player].health = 50;
                        World[assignedroomId][player].lives = 5;
                    }
                    io.to(socket.roomId).emit('start match', {
                        msg: gameInstructions,
                        roomId: socket.roomId,
                        ws: World[assignedroomId]
                    })
                    setTimeout(() => {
                        const ranks = [];
                        for (const player in World[assignedroomId]) {
                            let array = [World[assignedroomId][player].playerName, World[assignedroomId][player].health, World[assignedroomId][player].lives];
                            ranks.push(array);
                        }
                        arrange(ranks);
                        console.log(ranks);
                        io.to(socket.roomId).emit('stop match', {
                            ordering: ranks
                        })
                    }, 300000)
                }
            }
            catch (error) {
                console.log(error);
            }
            try {
                io.to(socket.roomId).emit('chat message', {
                    username: 'System',
                    msg: `${socket.request.session.username} has joined!`,
                })
                console.log(`Presenting all the world data per room ${JSON.stringify(World[socket.roomId])}`);
                io.to(socket.roomId).emit('lobby-update', {
                    squad: playerlist[socket.roomId],
                    worldss: World[socket.roomId]
                })
            }
            catch (error) {
                console.log(error);
            }
        });


        console.log(`Checkpoint 1 hit at ${new Date()}`);
        socket.on('disconnect', () => {
            const leftuser = socket.request.session.username;
            for (const i in playerlist) {
                playerlist[i] = playerlist[i].filter(obj => obj.socketId !== socket.id);
            }
            for (const roomid in rooms) {
                rooms[roomid] = rooms[roomid].filter(obj => obj.socketId !== socket.id);
            }
            activeUsers.delete(leftuser);
            if (World[assignedroomId]) {
                delete World[assignedroomId][leftuser];
            }
            console.log(`Checkpoint 2 reached at ${Date.now()}`);
            io.to(socket.roomId).emit('leave-room', {
                left: leftuser,
                id: socket.id,
                msg: `${socket.request.session.username} has left`,
                username: 'System'
            })
        });
        socket.on('start typing', () => {
            try {
                socket.to(socket.roomId).emit('start typing', {
                    username: socket.request.session.username,
                    userId: socket.id
                })
            }
            catch (error) {
                console.log(error);
            }
        });
        socket.on('stop typing', () => {
            try {
                socket.to(socket.roomId).emit('stop typing', {
                    username: socket.request.session.username,
                    userId: socket.id
                })
            }
            catch (error) {
                console.log(error);
            }
        });
        socket.on('chat message', (data) => {
            socket.to(socket.roomId).emit('chat message', {
                msg: data.msg,
                username: data.username
            });
        });
        socket.on('moveDown', (data) => { World[assignedroomId][username].moveDown = true; })
        socket.on('moveUp', (data) => { World[assignedroomId][username].moveUp = true; })
        socket.on('moveForward', (data) => { World[assignedroomId][username].moveForward = true; })
        socket.on('moveBackward', (data) => { World[assignedroomId][username].moveBackward = true; })
        socket.on('moveLeft', (data) => { World[assignedroomId][username].moveLeft = true; })
        socket.on('moveRight', (data) => { World[assignedroomId][username].moveRight = true; });
        socket.on('moveDownstop', () => { World[assignedroomId][username].moveDown = false });
        socket.on('moveUpstop', () => { World[assignedroomId][username].moveUp = false });
        socket.on('moveLeftstop', () => { World[assignedroomId][username].moveLeft = false });
        socket.on('moveRightstop', () => { World[assignedroomId][username].moveRight = false });
        socket.on('moveForwardstop', () => { World[assignedroomId][username].moveForward = false });
        socket.on('moveBackwardstop', () => { World[assignedroomId][username].moveBackward = false });
    }
}
);

function willcollide(roomId, playerA, playerB, v, delta, direction) {
    if (direction === 'd') {
        let newX = World[roomId][playerA].x;
        let newY = World[roomId][playerA].y - (v * delta);
        let newZ = World[roomId][playerA].z;
        let bx = World[roomId][playerB].x;
        let by = World[roomId][playerB].y;
        let bz = World[roomId][playerB].z;

        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (World[roomId][playerA].r + World[roomId][playerB].r) ** 2) {
            return true;
        }
    }


    else if (direction === 'u') {
        let newX = World[roomId][playerA].x;
        let newY = World[roomId][playerA].y + (v * delta);
        let newZ = World[roomId][playerA].z;
        let bx = World[roomId][playerB].x;
        let by = World[roomId][playerB].y;
        let bz = World[roomId][playerB].z;

        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (World[roomId][playerA].r + World[roomId][playerB].r) ** 2) {
            return true;
        }
    }
    else if (direction === 'f') {
        let newX = World[roomId][playerA].x;
        let newY = World[roomId][playerA].y;
        let newZ = World[roomId][playerA].z - (v * delta);
        let bx = World[roomId][playerB].x;
        let by = World[roomId][playerB].y;
        let bz = World[roomId][playerB].z;

        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (World[roomId][playerA].r + World[roomId][playerB].r) ** 2) {
            return true;
        }

    }
    else if (direction === 'b') {
        let newX = World[roomId][playerA].x;
        let newY = World[roomId][playerA].y;
        let newZ = World[roomId][playerA].z + (v * delta);
        let bx = World[roomId][playerB].x;
        let by = World[roomId][playerB].y;
        let bz = World[roomId][playerB].z;
        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (World[roomId][playerA].r + World[roomId][playerB].r) ** 2) {
            return true;
        }
    }
    else if (direction === 'l') {
        let newX = World[roomId][playerA].x - (v * delta);
        let newY = World[roomId][playerA].y;
        let newZ = World[roomId][playerA].z;
        let bx = World[roomId][playerB].x;
        let by = World[roomId][playerB].y;
        let bz = World[roomId][playerB].z;
        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (World[roomId][playerA].r + World[roomId][playerB].r) ** 2) {
            return true;
        }
    }

    else if (direction === 'r') {

        let newX = World[roomId][playerA].x + (v * delta);
        let newY = World[roomId][playerA].y;
        let newZ = World[roomId][playerA].z;
        let bx = World[roomId][playerB].x;
        let by = World[roomId][playerB].y;
        let bz = World[roomId][playerB].z;
        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (World[roomId][playerA].r + World[roomId][playerB].r) ** 2) {
            return true;
        }
    }
}
function gravity(roomId, id, delta) {
    if (World[roomId][id].y > 0.8) {
        World[roomId][id].y -= 9.8 * delta;
    }
    if (World[roomId][id].y <= 0.8) {
        World[roomId][id].y = 0.8;
    }
}

let lasttime = Date.now();
const v = 15;
function tick() {
    const currenttime = Date.now();
    const delta = (currenttime - lasttime) / 1000;
    lasttime = currenttime;
    for (const roomId in World) {
        for (const Player in World[roomId]) {
            if (World[roomId][Player].moveDown) {
                let canMove = true;
                for (const enemy in World[roomId]) {
                    if (enemy === Player) {
                        continue;
                    }
                    if (willcollide(roomId, Player, enemy, v, delta, 'd')) {

                        World[roomId][enemy].health--;
                        if (World[roomId][enemy].health <= 0) {

                            World[roomId][enemy].lives--;
                            if (World[roomId][enemy].lives <= 0) {

                                World[roomId][enemy].lives = 0;
                                World[roomId][enemy].health = 0;
                                if (!deadPlayers[roomId]) {
                                    deadPlayers[roomId] = {};
                                }

                                deadPlayers[roomId][enemy] = World[roomId][enemy];
                                activeUsers.delete(enemy);
                                delete World[roomId][enemy];

                            }
                            else {
                                World[roomId][enemy].health = World[roomId][enemy].lives * 10;
                            }
                        }

                        canMove = false;
                    }

                }

                if (canMove) {
                    const next = World[roomId][Player].y - (v * delta);
                    World[roomId][Player].y = next < 0 ? 0 : next;
                }
            }

            if (World[roomId][Player] && World[roomId][Player].moveUp) {
                let canMove = true;
                for (const enemy in World[roomId]) {

                    if (enemy === Player) {

                        continue;
                    }
                    if (willcollide(roomId, Player, enemy, v, delta, 'u')) {

                        World[roomId][enemy].health--;
                        if (World[roomId][enemy].health <= 0) {

                            World[roomId][enemy].lives--;
                            if (World[roomId][enemy].lives <= 0) {

                                World[roomId][enemy].lives = 0;
                                World[roomId][enemy].health = 0;
                                if (!deadPlayers[roomId]) {
                                    deadPlayers[roomId] = {};
                                }

                                deadPlayers[roomId][enemy] = World[roomId][enemy];
                                activeUsers.delete(enemy);
                                delete World[roomId][enemy];

                            }
                            else {
                                World[roomId][enemy].health = World[roomId][enemy].lives * 10;
                            }
                        }

                        canMove = false;
                    }

                }

                if (canMove) {
                    World[roomId][Player].y += v * delta;
                }

            }

            if (World[roomId][Player] && World[roomId][Player].moveBackward) {
                let canMove = true;
                for (const enemy in World[roomId]) {

                    if (enemy === Player) {

                        continue;
                    }
                    if (willcollide(roomId, Player, enemy, v, delta, 'b')) {

                        World[roomId][enemy].health--;
                        if (World[roomId][enemy].health <= 0) {

                            World[roomId][enemy].lives--;
                            if (World[roomId][enemy].lives <= 0) {

                                World[roomId][enemy].lives = 0;
                                World[roomId][enemy].health = 0;
                                if (!deadPlayers[roomId]) {
                                    deadPlayers[roomId] = {};
                                }

                                deadPlayers[roomId][enemy] = World[roomId][enemy];
                                activeUsers.delete(enemy);
                                delete World[roomId][enemy];

                            }
                            else {
                                World[roomId][enemy].health = World[roomId][enemy].lives * 10;
                            }
                        }

                        canMove = false;
                    }

                }

                if (canMove) {
                    World[roomId][Player].z += v * delta;
                }

            }

            if (World[roomId][Player] && World[roomId][Player].moveForward) {
                let canMove = true;
                for (const enemy in World[roomId]) {

                    if (enemy === Player) {

                        continue;
                    }
                    if (willcollide(roomId, Player, enemy, v, delta, 'f')) {

                        World[roomId][enemy].health--;
                        if (World[roomId][enemy].health <= 0) {

                            World[roomId][enemy].lives--;
                            if (World[roomId][enemy].lives <= 0) {

                                World[roomId][enemy].lives = 0;
                                World[roomId][enemy].health = 0;
                                if (!deadPlayers[roomId]) {
                                    deadPlayers[roomId] = {};
                                }

                                deadPlayers[roomId][enemy] = World[roomId][enemy];
                                activeUsers.delete(enemy);
                                delete World[roomId][enemy];

                            }
                            else {
                                World[roomId][enemy].health = World[roomId][enemy].lives * 10;
                            }
                        }

                        canMove = false;
                    }

                }

                if (canMove) {
                    World[roomId][Player].z -= v * delta;
                }


            }

            if (World[roomId][Player] && World[roomId][Player].moveLeft) {
                let canMove = true;
                for (const enemy in World[roomId]) {

                    if (enemy === Player) {

                        continue;
                    }
                    if (willcollide(roomId, Player, enemy, v, delta, 'l')) {

                        World[roomId][enemy].health--;
                        if (World[roomId][enemy].health <= 0) {

                            World[roomId][enemy].lives--;
                            if (World[roomId][enemy].lives <= 0) {

                                World[roomId][enemy].lives = 0;
                                World[roomId][enemy].health = 0;
                                if (!deadPlayers[roomId]) {
                                    deadPlayers[roomId] = {};
                                }

                                deadPlayers[roomId][enemy] = World[roomId][enemy];
                                activeUsers.delete(enemy);
                                delete World[roomId][enemy];

                            }
                            else {
                                World[roomId][enemy].health = World[roomId][enemy].lives * 10;
                            }
                        }
                        canMove = false;
                    }

                }

                if (canMove) {
                    World[roomId][Player].x -= v * delta;
                }


            }

            if (World[roomId][Player] && World[roomId][Player].moveRight) {
                let canMove = true;
                for (const enemy in World[roomId]) {

                    if (enemy === Player) {

                        continue;
                    }
                    if (willcollide(roomId, Player, enemy, v, delta, 'r')) {

                        World[roomId][enemy].health--;
                        if (World[roomId][enemy].health <= 0) {

                            World[roomId][enemy].lives--;
                            if (World[roomId][enemy].lives <= 0) {

                                World[roomId][enemy].lives = 0;
                                World[roomId][enemy].health = 0;
                                if (!deadPlayers[roomId]) {
                                    deadPlayers[roomId] = {};
                                }

                                deadPlayers[roomId][enemy] = World[roomId][enemy];
                                activeUsers.delete(enemy);
                                delete World[roomId][enemy];

                            }
                            else {
                                World[roomId][enemy].health = World[roomId][enemy].lives * 10;
                            }
                        }
                        canMove = false;
                    }

                }

                if (canMove) {
                    World[roomId][Player].x += v * delta;
                }
            }

            if (World[roomId][Player]) {
                gravity(roomId, Player, delta);
            }
        }
        io.to(roomId).emit('update-movement', {
            worldstate: World[roomId],
            deadstate: deadPlayers[roomId] || {}
        })
    }

    for (const rid in deadPlayers) {
        for (const dead in deadPlayers[rid]) {
            delete deadPlayers[rid][dead];
        }
    }
}

setInterval(() => { tick() }, 33);
const PORT = process.env.PORT||8081;
ConnectDB.then(() => {
    console.log("Connected to the db!");
    server.listen(PORT,()=>{
        console.log(`Pixelmania live at ${PORT}`);
    })
}).catch((error) => {
    console.error(error);
})