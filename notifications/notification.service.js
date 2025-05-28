//db notification

const Notification = require("../Models/Notification")

const sendInAppNotification = async ({ uid, title, description }) => {
    try {
        console.log("tbl notify")
        return await Notification.create({
            uid,
            title,
            description,
            datetime: new Date()
        })
    } catch (error) {
        console.log(error)
    }
}

module.exports={sendInAppNotification}