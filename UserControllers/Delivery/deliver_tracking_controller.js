const { storeRiderLocation } = require("../../utils/redisUtils");

const deliveryLocationUpdate = async (req, res) => {
    const { riderId, latitude, longitude } = req.body;

    if (!riderId || !latitude || !longitude) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const redisClient = req.app.locals.redisClient;
        await storeRiderLocation(redisClient, riderId, latitude, longitude);

        // Broadcast location to clients in the rider's room
        const locationData = { riderId, latitude, longitude, timestamp: Date.now() };
        req.app.get("io").to(`delivery:${riderId}`).emit("locationUpdate", locationData);

        res.status(200).json({ message: "Location updated successfully" });
    } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { deliveryLocationUpdate }