const moment = require('moment');

const logger = (req, res, next) => {
    let date = moment().format("Y-MM-DD HH:mm:ss");
    let arr = req.ip.split(":");
    let ip = arr.pop();
    console.log(
        `[request]: ${date} :: IP ${ip} :: Accepted :: ${req.method} ${req.url}`
    );
    res.on("finish", () => {
        let date = moment().format("Y-MM-DD HH:mm:ss");
        console.log(
            `[response]: ${date} :: IP ${ip} :: ${res.statusCode} ${res.statusMessage} :: ${req.method} ${req.url}`
        );
    });
    next();
};

module.exports = logger;