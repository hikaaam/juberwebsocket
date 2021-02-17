const app = require('express')();
const router = require('express').Router();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})
var https = require('https')
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var admin = require("firebase-admin");
var { google } = require('googleapis');
var MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
var SCOPES = [MESSAGING_SCOPE];
var serviceAccount = require("./firebase.json");
// var host = "https://fcm.googleapis.com/v1/juberdelivery-01/messages:send";
var HOST = 'fcm.googleapis.com';
var PATH = "/v1/projects/juberdelivery-01/messages:send";

function getAccessToken() {
    return new Promise(function (resolve, reject) {
        var key = require('./firebase.json');
        var jwtClient = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            SCOPES,
            null
        );
        jwtClient.authorize(function (err, tokens) {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}

function sendFcmMessage(fcmMessage) {
    getAccessToken().then(function (accessToken) {
        var options = {
            hostname: HOST,
            path: PATH,
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
            // … plus the body of your notification or data message
        };
        var request = https.request(options, function (resp) {
            resp.setEncoding('utf8');
            resp.on('data', function (data) {
                console.log('Message sent to Firebase for delivery, response:');
                console.log(data);
            });
        });
        request.on('error', function (err) {
            console.log('Unable to send message to Firebase');
            console.log(err);
        });
        request.write(JSON.stringify(fcmMessage));
        request.end();
    });
}
function buatData(token, title, body, image, data_, topic) {
    if (topic.length > 0) {
        if (image.length > 1) {
            var data = {
                "message": {
                    "topic": topic,
                    "notification": {
                        "title": title,
                        "body": body,
                        "image": image,
                    },
                    "data": data
                }
            };
        }
        else {
            var data = {
                "message": {
                    "topic": topic,
                    "notification": {
                        "title": title,
                        "body": body,
                    },
                    "data": data_
                }
            };
        }
    } else {
        if (image.length > 1) {
            var data = {
                "message": {
                    "token": token,
                    "notification": {
                        "title": title,
                        "body": body,
                        "image": image,
                    },
                    "data": data
                }
            };
        }
        else {
            var data = {
                "message": {
                    "token": token,
                    "notification": {
                        "title": title,
                        "body": body,
                    },
                    "data": data_
                }
            };
        }
    }
    return data;
}
var data = {
    halo: "asdsad",
    asdsadsa: "asdsada"
}
let token = 'dTL8kuwbTQOChvmMbJbO5Z:APA91bGXk-4T2sfoN5IDmwducJtAHYQU2J2T2UcOnpVnSIKl2SjB0P4bBDzCpu-M2DtfyjE6jeYJs9Ef2xCSpLf4YtPRflNkTZg0C-d-Cn5zkETsTTCCUxy8AHQLqd8gVWPqwkYOTViH';
// sendFcmMessage(buatData(token,'judul','isinya','',data))

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.get('/', router);
router.get('/', (req, res) => {
    res.send("hello world")
})

process.on('uncaughtException', function (ex) {
    console.log("" + ex);
});
var clients = [];

io.on('connection', (socket) => {
    console.log('new user connected');
    socket.on('new user', function (data) {

        // console.log(clients[data])
        if (data in clients) {
            let index = clients.indexOf(data);
            if (index !== -1) {
                clients.splice(index, 1);
            }
            socket.nickname = data;
            clients[socket.nickname] = socket;
        } else {
            socket.nickname = data;
            clients[socket.nickname] = socket;
        }
        console.log('new user : ' + socket.nickname);
    })

    socket.on('chat', function (data) {
        var id = data._id;
        console.log(data)
        if (clients.hasOwnProperty(id)) {
            io.to(clients[id]['id']).emit('chat', data);
            console.log(clients[id]['id']);
        } else {
            console.log("\nTarget Device Is Offline or Doesn't exist ");
        }
    });

    socket.on('broadcastdriver', function (data) {
        // console.log(data);
        let dataPesan = buatData('',"Order baru","Anda memiliki satu order baru",'',data,"driver");
        console.log(dataPesan);
        sendFcmMessage(dataPesan);
    });
    socket.on('acceptorder', function (data) {
        // console.log(data);
        let dataPesan = buatData(data.token,"Driver baru","Anda sudah dapat driver silahkan tunggu",'',data,"");
        console.log(dataPesan);
        sendFcmMessage(dataPesan);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        let index = clients.indexOf(socket.nickname);
        clients.splice(index, 1);
    });
    socket.on("test",(data)=>{
        socket.emit("test",data);
        // console.log(data);
    })
});


http.listen(4000, () => {
    console.log('listening on *:4000');
});

