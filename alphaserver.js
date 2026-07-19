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
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const cors = require('cors');
app.use(cors());
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
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
app.get('/', (req, res, next) => {
    console.log('Cookies:', JSON.stringify(req.cookies));
    res.render('Eco', {
        pageTitle: "Echoes of Oblivion",
        junglelink: '/mainScene',
        sealink: '/sea'
    })
})
app.get('/EchoesOfOblivion', (req, res, next) => {
    res.render('Eco', {
        pageTitle: "Echoes of Oblivion",
        junglelink: '/mainScene',
        sealink: '/sea'
    })
})

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.get('/sea', (req, res, next) => {
    res.render("Sea", {
        pageTitle: "seaScene"
    })
})
app.get('/heartBeat', (req, res, next) => {
    res.render('dil', {
        pageTitle: "HeartBeat"
    })
})
app.use(authRoutes);
app.use(userRoutes);
try {
    io.use((socket, next) => {
        sessionMiddleware(socket.request, {}, next);
    })
}
catch (error) {
    console.log(error);
}

const rooms = {};
const maxCapacity = 2;
const playerlist = {};
const activeUsers = new Map();

const infoBox = {};
const deadplayers = {};
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
    console.log('the list of the activplayers', activeUsers);
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
        infoBox[socket.request.session.username] =
        {
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

        console.log("Updated world state", infoBox);

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
        }

        console.log("Final assigned room id", assignedroomId);
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
                    io.to(socket.roomId).emit('start match', {
                        msg: "Go!!!",
                        roomId: socket.roomId,
                    })
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
                io.to(socket.roomId).emit('lobby-update', {
                    squad: playerlist,
                    box: infoBox
                })
            }
            catch (error) {
                console.log(error);
            }
        });
        socket.on('disconnect', () => {
            const leftuser = socket.request.session.username;
            for (const i in playerlist) {
                playerlist[i] = playerlist[i].filter(obj => obj.socketId !== socket.id);
            }
            for (const roomid in rooms) {
                rooms[roomid] = rooms[roomid].filter(obj => obj.socketId !== socket.id);
            }
            activeUsers.delete(leftuser);
            delete infoBox[leftuser];
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
        socket.on('moveDown', (data) => { infoBox[username].moveDown = true; })
        socket.on('moveUp', (data) => { infoBox[username].moveUp = true; })
        socket.on('moveForward', (data) => { infoBox[username].moveForward = true; })
        socket.on('moveBackward', (data) => { infoBox[username].moveBackward = true; })
        socket.on('moveLeft', (data) => { infoBox[username].moveLeft = true; })
        socket.on('moveRight', (data) => { infoBox[username].moveRight = true; });
        socket.on('moveDownstop', () => { infoBox[username].moveDown = false });
        socket.on('moveUpstop', () => { infoBox[username].moveUp = false });
        socket.on('moveLeftstop', () => { infoBox[username].moveLeft = false });
        socket.on('moveRightstop', () => { infoBox[username].moveRight = false });
        socket.on('moveForwardstop', () => { infoBox[username].moveForward = false });
        socket.on('moveBackwardstop', () => { infoBox[username].moveBackward = false });
    }
}
);

function willcollide(playerA, playerB, v, d, direction) {

    if (direction === 'd') {

        let newX = infoBox[playerA].x;
        let newY = infoBox[playerA].y - (v * d);
        let newZ = infoBox[playerA].z;
        let bx = infoBox[playerB].x;
        let by = infoBox[playerB].y;
        let bz = infoBox[playerB].z;

        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (infoBox[playerA].r + infoBox[playerB].r) ** 2) {
            return true;
        }
    }


    else if (direction === 'u') {
        let newX = infoBox[playerA].x;
        let newY = infoBox[playerA].y + (v * d);
        let newZ = infoBox[playerA].z;
        let bx = infoBox[playerB].x;
        let by = infoBox[playerB].y;
        let bz = infoBox[playerB].z;

        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (infoBox[playerA].r + infoBox[playerB].r) ** 2) {
            return true;
        }
    }
    else if (direction === 'f') {
        let newX = infoBox[playerA].x;
        let newY = infoBox[playerA].y;
        let newZ = infoBox[playerA].z - (v * d);
        let bx = infoBox[playerB].x;
        let by = infoBox[playerB].y;
        let bz = infoBox[playerB].z;

        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (infoBox[playerA].r + infoBox[playerB].r) ** 2) {
            return true;
        }

    }
    else if (direction === 'b') {
        let newX = infoBox[playerA].x;
        let newY = infoBox[playerA].y;
        let newZ = infoBox[playerA].z + (v * d);
        let bx = infoBox[playerB].x;
        let by = infoBox[playerB].y;
        let bz = infoBox[playerB].z;
        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (infoBox[playerA].r + infoBox[playerB].r) ** 2) {
            return true;
        }
    }
    else if (direction === 'l') {
        let newX = infoBox[playerA].x - (v * d);
        let newY = infoBox[playerA].y;
        let newZ = infoBox[playerA].z;
        let bx = infoBox[playerB].x;
        let by = infoBox[playerB].y;
        let bz = infoBox[playerB].z;
        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (infoBox[playerA].r + infoBox[playerB].r) ** 2) {
            return true;
        }
    }

    else if (direction === 'r') {

        let newX = infoBox[playerA].x + (v * d);
        let newY = infoBox[playerA].y;
        let newZ = infoBox[playerA].z;
        let bx = infoBox[playerB].x;
        let by = infoBox[playerB].y;
        let bz = infoBox[playerB].z;
        if ((newX - bx) ** 2 + (newY - by) ** 2 + (newZ - bz) ** 2 < (infoBox[playerA].r + infoBox[playerB].r) ** 2) {
            return true;
        }
    }

}

function gravity(id, delta) {
    if (infoBox[id].y > 0) {
        infoBox[id].y -= 9.8 * delta;
    }
    if (infoBox[id].y <= 0) {
        infoBox[id].y = 0;
    }
}
const v = 15;
let lasttime = Date.now();
function tick() {
    const now = Date.now();
    const d = (now - lasttime) / 1000;
    lasttime = now;
    for (const id in infoBox) {
        if (infoBox[id].moveDown) {
            let canMove = true;
            for (const it in infoBox) {
                if (it === id) {
                    continue;
                }
                if (willcollide(id, it, v, d, 'd')) {
                    infoBox[it].health--;
                    if (infoBox[it].health <= 0) {
                        if (infoBox[it].lives > 0) {
                            infoBox[it].lives -= 1;
                            infoBox[it].health = infoBox[it].lives * 10;
                        }
                        if (infoBox[it].lives === 0) {
                            infoBox[it].health = 0;
                            deadplayers[it] = infoBox[it];
                            activeUsers.delete(it);
                            delete infoBox[it];
                        }
                    }
                    canMove = false;
                    break;
                }
            }
            if (canMove) {

                infoBox[id].y -= v * d;
            }
        }

        if (infoBox[id].moveUp) {
            let canMove = true;
            for (const it in infoBox) {

                if (it === id) {
                    continue;
                }

                if (willcollide(id, it, v, d, 'u')) {
                    infoBox[it].health--;
                    if (infoBox[it].health <= 0) {
                        if (infoBox[it].lives > 0) {
                            infoBox[it].lives -= 1;
                            infoBox[it].health = infoBox[it].lives * 10;
                        }
                        if (infoBox[it].lives === 0) {
                            infoBox[it].health = 0;
                            deadplayers[it] = infoBox[it];
                            activeUsers.delete(it);
                            delete infoBox[it];
                        }
                    }
                    canMove = false;
                    break;
                }
            }
            if (canMove) {

                infoBox[id].y += v * d;
            }
        }

        if (infoBox[id].moveForward) {
            let canMove = true;
            for (const it in infoBox) {

                if (it === id) {
                    continue;
                }
                if (willcollide(id, it, v, d, 'f')) {
                    infoBox[it].health--;
                    if (infoBox[it].health <= 0) {
                        if (infoBox[it].lives > 0) {
                            infoBox[it].lives -= 1;
                            infoBox[it].health = infoBox[it].lives * 10;
                        }
                        if (infoBox[it].lives === 0) {
                            infoBox[it].health = 0;
                            deadplayers[it] = infoBox[it];
                            activeUsers.delete(it);
                            delete infoBox[it];
                        }
                    }
                    canMove = false;
                    break;
                }
            }
            if (canMove) {

                infoBox[id].z -= v * d;
            }

        }

        if (infoBox[id].moveBackward) {
            let canMove = true;
            for (const it in infoBox) {
                if (it === id) {
                    continue;
                }
                if (willcollide(id, it, v, d, 'b')) {
                    infoBox[it].health--;
                    if (infoBox[it].health <= 0) {
                        if (infoBox[it].lives > 0) {
                            infoBox[it].lives -= 1;
                            infoBox[it].health = infoBox[it].lives * 10;
                        }
                        if (infoBox[it].lives === 0) {
                            infoBox[it].health = 0;
                            deadplayers[it] = infoBox[it];
                            activeUsers.delete(it);
                            delete infoBox[it];
                        }
                    }
                    canMove = false;
                    break;
                }
            }
            if (canMove) {

                infoBox[id].z += v * d;
            }
        }
        if (infoBox[id].moveLeft) {
            let canMove = true;
            for (const it in infoBox) {
                if (id === it) {
                    continue;
                }
                if (willcollide(id, it, v, d, 'l')) {
                    infoBox[it].health--;
                    if (infoBox[it].health <= 0) {
                        if (infoBox[it].lives > 0) {
                            infoBox[it].lives -= 1;
                            infoBox[it].health = infoBox[it].lives * 10;

                        }
                        else if (infoBox[it].lives === 0) {
                            infoBox[it].health = 0;
                            deadplayers[it] = infoBox[it];
                            activeUsers.delete(it);
                            delete infoBox[it];
                        }
                    }
                    canMove = false;
                    break;
                }
            }
            if (canMove) {

                infoBox[id].x -= v * d;
            }

        }
        if (infoBox[id].moveRight) {

            let canMove = true;
            for (const it in infoBox) {

                if (id === it) {
                    continue;
                }
                if (willcollide(id, it, v, d, 'r')) {
                    infoBox[it].health--;
                    if (infoBox[it].health <= 0) {
                        if (infoBox[it].lives > 0) {
                            infoBox[it].lives -= 1;
                            infoBox[it].health = infoBox[it].lives * 10;
                        }
                        if (infoBox[it].lives === 0) {
                            infoBox[it].health = 0;
                            deadplayers[it] = infoBox[it];
                            activeUsers.delete(it);
                            delete infoBox[it];
                        }
                    }
                    canMove = false;
                    break;
                }
            }
            if (canMove) {

                infoBox[id].x += v * d;
            }

        }
        gravity(id, d);
    }

    for (const obj in rooms) {
        console.log("This is the updated world screenshot", JSON.stringify(infoBox));
        io.to(obj).emit('update-movement', {
            worldstate: infoBox,
            deadstate: deadplayers
        })
    }

    for (const player in deadplayers) {
        delete deadplayers[player];
    }
}
setInterval(() => { tick() }, 50);
const PORT = process.env.PORT;
try {
    server.listen(PORT, () => {
        console.log(`Application running on ${PORT} at http://localhost:${PORT}`);
    })
}
catch (error) {
    console.log(`There was this error ${error} starting the server`);
}

ConnectDB.then(() => {
    console.log("Connected to the db!");


}).catch((error) => {
    console.log("there was an error" + error);
})
