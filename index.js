const app = require("express")();
const router = require("express").Router();
const https = require("https");
const fs = require("fs");
var ssl_op = {
  key: fs.readFileSync("./ssl_config/server.key"),
  cert: fs.readFileSync("./ssl_config/server.crt"),
  ca: fs.readFileSync("./ssl_config/ca.crt"),
};
const http = https.createServer(ssl_op, app);
// const http = require("http").createServer(app);
const Logger = require("./middleware/Logger");
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();
var admin = require("firebase-admin");
var { google } = require("googleapis");
var MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
var SCOPES = [MESSAGING_SCOPE];
var serviceAccount = require("./firebase.json");
const moment = require("moment");
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

async function sendFcmMessage(fcmMessage) {
  let accessToken = await getAccessToken();
  return new Promise((resolve) => {
    let obj = {};
    var options = {
      hostname: HOST,
      path: PATH,
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
      },
      // … plus the body of your notification or data message
    };

    callback = function (resp) {
      var respon_ = {};
      resp.setEncoding("utf8");
      resp.on("data", function (data_) {
        console.log("Message sent to Firebase for delivery, response:");
        let data = JSON.parse(data_);
        if (data.error == undefined) {
          respon_ = {
            success: true,
          };
        } else {
          respon_ = {
            success: false,
            code: data.error.code,
            errMsg: data.error.message,
            status: data.error.status,
            details: data.error.details,
          };
        }
        // console.log(respon_);
      });
      resp.on("end", function () {
        obj = respon_;
        resolve(obj);
      });
    };
    var request = https.request(options, callback);
    request.on("error", function (err) {
      console.log("Unable to send message to Firebase");
      console.log(err);
      respon_ = {
        success: false,
        msg: err.message,
      };
      resolve(respon_);
      return err;
    });
    request.write(JSON.stringify(fcmMessage));
    request.end();
  });
}
const sendMultipe = (tokens, data) => {
  return new Promise((resolve) => {
    tokens.map(async (item) => {
      let dataPesan = buatData(
        item,
        data.title,
        data.message,
        data.picture,
        data.data,
        ""
      );
      const resp = await sendFcmMessage(dataPesan);
      console.log(resp);
      resolve(resp);
    });
  });
};
const sendTopic = async (data) => {
  let dataPesan = buatData(
    null,
    data.judul,
    data.msg,
    data.picture,
    data.data,
    data.topic
  );
  const resp = await sendFcmMessage(dataPesan);
  console.log(resp);
  return resp;
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
app.use(Logger);
app.use(bodyParser.json());
app.all("/", router);
app.all("/sendto/driver", router);
app.all("/notif", router);
app.all("/notif/topic", router);
app.all("/dummyToken", router);
router.get("/", (req, res) => {
  res.send("hello world");
});

router.post("/sendto/driver", (req, res) => {
  data = req.body;
  console.log(data);
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

router.post("/notif/topic", async (req, res) => {
  try {
    let data = req.body;
    if (!data.judul) {
      throw new Error("judul is required!");
    }
    if (!data.msg) {
      throw new Error("msg is required!");
    }
    if (!data.data) {
      throw new Error("data is required!");
    }
    if (!data.topic) {
      throw new Error("topic is required!");
    }
    if (!data.picture) {
      data.picture = "";
    }
    let resp = await sendTopic(data);
    res.send(resp);
  } catch (error) {
    res.status(400).send({
      success: false,
      errMsg: error.message,
    });
  }
});
router.post("/notif", async (req, res) => {
  data = req.body;
  console.log(data);
  // console.log(data.data.type)
  if (data.judul == undefined) {
    res.status(401).send({
      success: false,
      errMsg: "judul harus di isi",
    });
    return;
  } else if (data.msg == undefined) {
    res.status(401).send({
      success: false,
      errMsg: "msg harus di isi",
    });
    return;
  } else if (data.data == undefined) {
    res.status(401).send({
      success: false,
      errMsg: "data harus di isi",
    });
    return;
  } else if (data.data.type == undefined) {
    res.status(401).send({
      success: false,
      errMsg: "data.type harus di isi",
    });
    return;
  } else if (data.data.service == undefined) {
    res.status(401).send({
      success: false,
      errMsg: "data.service harus di isi",
    });
    return;
  }
  if (data.data.service == "FOOD") {
    data.data.service = "foodish";
  }
  try {
    let resp = await sendMultipe(data.tokens, {
      title: data.judul,
      message: data.msg,
      picture: "",
      data: data.data,
    });
    if (!resp.success) {
      res.status(500).json(resp);
      return;
    }
    res.send(resp);
  } catch (error) {
    res.status(500).send({
      success: false,
      errMsg: error,
    });
  }
});
router.get("/dummyToken", (req, res) => {
  data = req.body;
  console.log(data);
  try {
    let data = {
      data: {
        code: "200",
        msg: "succes",
        lobj: data_dummy,
      },
    };
    res.send(data);
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
            io.to(clients[datas.senderIdrs]["id"]).emit("chat", datas);
            console.log("emited");
          });
          unread[data][key] = [];
        }
      }
    } else {
      // console.log(unread);
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
      // console.log("u are here bro");
    } else {
      // console.log(unread);
      socket.nickname = data;
      clients[socket.nickname] = socket;
    }
    offlineHandling(data);
    console.log("new user : " + socket.nickname);
  });
  // socket.on("chat", function (data) {
  //   socket.broadcast.emit("chat", data)
  //   console.log(data);
  // })
  socket.on("chat", function (data) {
    const chatNotif = (data) => {
      if (data.token !== undefined) {
        let msg_ = buatData(
          data.token,
          data.name !== undefined ? data.name : "pesan baru",
          data.message,
          "",
          { data: JSON.stringify(data) },
          ""
        );
        console.log(msg_);
        sendFcmMessage(msg_);
      }
    };
    var id = data.idrs;
    var senderIdrs = data.senderIdrs;
    data = { ...data, time: moment(), type: "chat" };
    console.log(senderIdrs);
    console.log(id);
    if (clients.hasOwnProperty(senderIdrs)) {
      io.to(clients[senderIdrs]["id"]).emit("chat", data);
      // io.to(clients[senderIdrs]["id"]).emit("read", {
      //   status: "read",
      //   message: data.message,
      // });
      console.log("message send succesfully");
    } else {
      console.log("\nTarget Device Is Offline or Doesn't exist\n ");
      if (unread.hasOwnProperty(senderIdrs)) {
        if (unread[senderIdrs].hasOwnProperty(id)) {
          if (!unread[senderIdrs][id].length > 0) {
            chatNotif(data);
            console.log("pesan masuk ke cache dan mengirim notifikasi");
          } else {
            console.log("pesan masuk ke cache");
          }
          unread[senderIdrs][id].push(data);
        } else {
          unread[senderIdrs] = { ...unread[senderIdrs], [id]: [data] };
          chatNotif(data);
          console.log("membuat cache baru ");
        }
      } else {
        unread[senderIdrs] = { [id]: [data] };
        chatNotif(data);
        console.log("membuat db dan cache baru ");
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
      slog(data);
      io.to(clients[id]["id"]).emit("driverLocation", data);
    } else {
      slogf(data);
      console.log("target offline");
    }
  });
  socket.on("broadcastdriver", function (data) {
    // console.log(data);
    slog(data);
    // socket.emit("broadcastdriver", data);
    socket.broadcast.emit("broadcastdriver", data);
    // io.emit("broadcastdriver", data)
  });
  socket.on("getDriver", function (data) {
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
    // console.log(socket)
    // console.log(socket.nickname);
    console.log("user disconnected");
    delete clients[socket.nickname];
    // console.log(clients);
  });
  socket.on("unsubcribe", (data) => {
    // console.log(socket)
    // console.log(socket.nickname);
    console.log("user unscribe");
    delete clients[data];
    // console.log(clients);
  });
});

function buatData(token, title, body, image, data_, topic, badge) {
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

  data = {
    ...data,
    message: {
      ...data.message,
      android: {
        notification: {
          sound: "default",
        },
      },
    },
  };
  return data;
}

http.listen(8002, () => {
  console.log("listening on *:8002");
});

const data_dummy = [
  {
    idTrx: "TRXJF0300080",
    stsTrx: "PROSES",
    timestamp: "2021-03-23T10:36:22.000+0000",
    kodepesanan: "JBF0300080",
    merchant: "fena toko",
    alamat: "jl. tegalsari tea",
    tgl: "23",
    bulan: "Mar",
    totalPembelian: 16000,
    totalItem: 1,
    sts: 1,
    trx: {
      id: "TRXJF0300080",
      alamatAntar: "Kudaile, 52413, Slawi, Tegal, Central Java, Indonesia",
      comment: null,
      detailAntar: "",
      job: "DRIVER OTW MERCHANT",
      ketPesanan: "",
      kodepesanan: "JBF0300080",
      latAntar: "-6.975225",
      lonAntar: "109.1291609",
      notif: 0,
      star: 0,
      status: "PROSES",
      ongkir: 5000,
      pajak: 0,
      total: 11000,
      grandtotal: 16000,
      id_driver: "sim-123871238123123",
      pembeli: "1614337831601",
      promo: null,
      merchant: "mc0002",
      pin: null,
      timestamp: "2021-03-23T10:36:22.000+0000",
      latAsal: "-6.8572739",
      lonAsal: null,
      alamatAsal: null,
      keterangan: null,
      type: "FOOD",
      idlayanan: null,
    },
    detil: [
      {
        idtrxdetil: "161649578170731601",
        harga: 11000,
        idxtra: null,
        hargaxtra: 0,
        jumlah: 1,
        star: null,
        total: 0,
        totalsetelahpajak: 0,
        idbarang: "10045",
        nmBarang: "10045",
        idtrx: "TRXJF0300080",
      },
    ],
    stsJob: [
      {
        iconName: "done-all",
        jobName: "order_placed",
      },
      {
        iconName: "restaurant",
        jobName: "preparing",
      },
    ],
  },
];

const slog = (data) => {
  data = data ?? {};
  let sender = "anonim";
  let receiver = "unknown";
  let timestamp = moment().format("Y:MM:DD HH:mm:ss");
  if (data?._id != null) {
    receiver = data?._id;
  }
  if (data?.idrs != null) {
    sender = data?.idrs;
  }
  if (data?.senderIdrs != null) {
    receiver = data?.senderIdrs;
  }
  console.log(
    `Socket connection Success : ${timestamp} | from : ${sender} to : ${receiver}`
  );
};

const slogf = (data) => {
  data = data ?? {};
  let sender = "anonim";
  let receiver = "unknown";
  let timestamp = moment().format("Y:MM:DD HH:mm:ss");
  if (data?._id != null) {
    receiver = data?._id;
  }
  if (data?.idrs != null) {
    sender = data?.idrs;
  }
  if (data?.senderIdrs != null) {
    receiver = data?.senderIdrs;
  }
  console.log(
    `Socket connection Failed : ${timestamp} | from : ${sender} to : ${receiver}`
  );
};
