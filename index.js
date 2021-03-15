const app = require("express")();
const router = require("express").Router();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
var https = require("https");
var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();
var admin = require("firebase-admin");
var { google } = require("googleapis");
var MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
var SCOPES = [MESSAGING_SCOPE];
var serviceAccount = require("./firebase.json");
// var host = "https://fcm.googleapis.com/v1/juberdelivery-01/messages:send";
var HOST = "fcm.googleapis.com";
var PATH = "/v1/projects/juberdelivery-01/messages:send";

function getAccessToken() {
  return new Promise(function (resolve, reject) {
    var key = require("./firebase.json");
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
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
      },
      // … plus the body of your notification or data message
    };
    var request = https.request(options, function (resp) {
      resp.setEncoding("utf8");
      resp.on("data", function (data) {
        console.log("Message sent to Firebase for delivery, response:");
        console.log(data);
      });
    });
    request.on("error", function (err) {
      console.log("Unable to send message to Firebase");
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
        message: {
          topic: topic,
          notification: {
            title: title,
            body: body,
            image: image,
          },
          data: data,
        },
      };
    } else {
      var data = {
        message: {
          topic: topic,
          notification: {
            title: title,
            body: body,
          },
          data: data_,
        },
      };
    }
  } else {
    if (image.length > 1) {
      var data = {
        message: {
          token: token,
          notification: {
            title: title,
            body: body,
            image: image,
          },
          data: data,
        },
      };
    } else {
      var data = {
        message: {
          token: token,
          notification: {
            title: title,
            body: body,
          },
          data: data_,
        },
      };
    }
  }
  return data;
}
const sendMultipe = (tokens, data) => {
  tokens.map((item) => {
    let dataPesan = buatData(
      item,
      data.title,
      data.message,
      data.picture,
      data.data,
      ""
    );
    sendFcmMessage(dataPesan);
  });
};
// contoh ngirim notifikasi =>>

// var dataParameter = {
//   halo: "asdsad",
//   param1: "asdsada",
// };

// let token = 'dTL8kuwbTQOChvmMbJbO5Z:APA91bGXk-4T2sfoN5IDmwducJtAHYQU2J2T2UcOnpVnSIKl2SjB0P4bBDzCpu-M2DtfyjE6jeYJs9Ef2xCSpLf4YtPRflNkTZg0C-d-Cn5zkETsTTCCUxy8AHQLqd8gVWPqwkYOTViH';
// let dataPesan = buatData('', "Order baru", "Anda memiliki satu order baru", 'https://variety.com/wp-content/uploads/2020/08/patrick-star-image.jpg', dataParameter, "driver");
// console.log(dataPesan);
// sendFcmMessage(dataPesan);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.all("/", router);
app.all("/sendto/driver", router);
router.get("/", (req, res) => {
  res.send("hello world");
});
router.post("/sendto/driver", (req, res) => {
  data = req.body;
  try {
    sendMultipe(data.tokens, {
      title: "order baru",
      message:
        "Anda memiliki orderan baru\nsilahkan klik notifikasi dan accept order jika ingin menerima order ini",
      picture: "",
      data: data.data,
    });
    res.send(true);
  } catch (error) {
    res.send(false);
  }
});

process.on("uncaughtException", function (ex) {
  console.log("" + ex);
});
var clients = [];
var unread = [];

io.on("connection", (socket) => {
  const offlineHandling = (data) => {
    if (unread.hasOwnProperty(data)) {
      // console.log('its is here?');
      for (const key in unread[data]) {
        if (unread[data].hasOwnProperty.call(unread[data], key)) {
          const item = unread[data][key];
          // console.log(item);
          item.map((datas, i) => {
            io.to(clients[datas.idrs]["id"]).emit("chat", datas);
            console.log("emited");
            io.to(clients[datas.senderIdrs]["id"]).emit("read", {
              status: "read",
              message: data.message,
            });
            unread[data][key].splice(i, 1);
          });
        }
      }
    } else {
      console.log(unread);
    }
  };
  console.log("new user connected");
  socket.on("new user", function (data) {
    // console.log(clients[data])
    if (data in clients) {
      let index = clients.indexOf(data);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      socket.nickname = data;
      clients[socket.nickname] = socket;
      console.log("u are here bro");
    } else {
      console.log(unread);
      socket.nickname = data;
      clients[socket.nickname] = socket;
    }
    offlineHandling(data);
    console.log("new user : " + socket.nickname);
  });

  socket.on("chat", function (data) {
    var id = data.idrs;
    var senderIdrs = data.senderIdrs;
    console.log(data);
    if (clients.hasOwnProperty(id)) {
      io.to(clients[id]["id"]).emit("chat", data);
      io.to(clients[senderIdrs]["id"]).emit("read", {
        status: "read",
        message: data.message,
      });
      console.log(clients[id]["id"]);
    } else {
      console.log("\nTarget Device Is Offline or Doesn't exist\n ");
      if (unread.hasOwnProperty(id)) {
        if (unread[id].hasOwnProperty(senderIdrs)) {
          unread[id][senderIdrs].push(data);
          console.log("sup bro");
        } else {
          unread[id] = { ...unread[id], [senderIdrs]: [data] };
          if (data.token !== undefined) {
            sendFcmMessage(
              data.token,
              "Pesan Baru",
              "Anda punya notifikasi pesan baru",
              "",
              ""
            );
          }
          console.log("data not there yet");
        }
      } else {
        unread[id] = { [senderIdrs]: [data] };
        if (data.token !== undefined) {
          sendFcmMessage(
            data.token,
            "Pesan Baru",
            "Anda punya notifikasi pesan baru",
            "",
            ""
          );
        }
        console.log("not there yet");
      }
    }
  });

  socket.on("read", function (data) {
    var id = data._id;
    console.log(data);
    if (clients.hasOwnProperty(id)) {
      io.to(clients[id]["id"]).emit("read", data);
      console.log(clients[id]["id"]);
    } else {
      console.log("\nTarget Device Is Offline or Doesn't exist ");
    }
  });

  socket.on("driverLocation", function (data) {
    var id = data._id;
    if (clients.hasOwnProperty(id)) {
      io.to(clients[id]["id"]).emit("driverLocation", data);
    } else {
      console.log("target offline");
    }
  });
  socket.on("broadcastdriver", function (data) {
    // console.log(data);
    let dataPesan = buatData(
      "",
      "Order baru",
      "Anda memiliki satu order baru",
      "",
      data,
      "driver"
    );
    console.log(dataPesan);
    sendFcmMessage(dataPesan);
  });
  socket.on("getDriver", function (data) {
    // console.log(data);
    // let dataPesan = buatData(
    //   data.token,
    //   "Order baru",
    //   "Anda memiliki satu order baru",
    //   "",
    //   data.data,
    //   ""
    // );
    // console.log(dataPesan);
    // sendFcmMessage(dataPesan);
    sendMultipe(data.tokens, {
      title: "order baru",
      message:
        "Anda memiliki orderan baru\nsilahkan klik notifikasi dan accept order jika ingin menerima order ini",
      picture: "",
      data: data.data,
    });
  });
  socket.on("acceptorder", function (data) {
    // console.log(data);
    let dataPesan = buatData(
      data.token,
      "Driver baru",
      "Anda sudah dapat driver silahkan tunggu",
      "",
      data,
      ""
    );
    console.log(dataPesan);
    sendFcmMessage(dataPesan);
  });

  socket.on("disconnect", () => {
    console.log(socket.nickname);
    console.log("user disconnected");
    delete clients[socket.nickname];
    console.log(clients);
  });
});

http.listen(8002, () => {
  console.log("listening on *:8002");
});
