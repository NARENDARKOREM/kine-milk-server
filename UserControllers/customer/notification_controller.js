const Notification = require("../../Models/Notification");




const notification_fn = async (req, res) => {
    try {
        const  uid  = req.user.userId;

        if (!uid) {
            return res.status(400).json({
                ResponseCode: "401",
                Result: "false",
                ResponseMsg: "Something Went Wrong!"
            });
        }

        const notifications = await Notification.findAll({ uid });

        if (notifications.length === 0) {
            return res.json({
                NotificationData: [],
                ResponseCode: "200",
                Result: "false",
                ResponseMsg: "Notification Not Found!!"
            });
        }

        return res.json({
            ResponseCode: "200",
            Result: "true",
            ResponseMsg: "Notification List Get Successfully!!",
            NotificationData: notifications,

        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        return res.status(500).json({
            ResponseCode: "500",
            Result: "false",
            ResponseMsg: "Internal Server Error"
        });
    }
}

module.exports = {notification_fn}