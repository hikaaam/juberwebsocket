import * as moment from 'moment'

class sloger {

    static slog = (data) => {
        data = data ?? {};
        let sender = 'anonim';
        let receiver = 'unknown';
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
        console.log(`Socket connection Success : ${timestamp} | from : ${sender} to : ${receiver}`);
    }

    static slogf = (data) => {
        data = data ?? {};
        let sender = 'anonim';
        let receiver = 'unknown';
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
        console.log(`Socket connection Failed : ${timestamp} | from : ${sender} to : ${receiver}`);
    }
}



export default sloger;