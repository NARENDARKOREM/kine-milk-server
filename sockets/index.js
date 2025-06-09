const { Server } = require("socket.io");
const { storeRiderLocation, getRiderLocation } = require("../utils/redisUtils");

module.exports = (server, redisClient) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("joinDelivery", ({ riderId }) => {
      const room = `delivery:${riderId}`;
      socket.join(room);
      console.log(`${socket.id} joined room: ${room}`);
    });

    socket.on("sendLocation", async ({ riderId, latitude, longitude }) => {
      try {
        await storeRiderLocation(redisClient, riderId, latitude, longitude);
        const locationData = {
          riderId,
          latitude,
          longitude,
          timestamp: Date.now(),
        };
        io.to(`delivery:${riderId}`).emit("locationUpdate", locationData);
        console.log(
          `Location updated for rider ${riderId}: ${latitude}, ${longitude}`
        );
      } catch (error) {
        console.error("Error storing location:", error);
      }
    });




    socket.on("getLocation", async ({ riderId }, callback) => {
      try {
        const location = await getRiderLocation(redisClient, riderId);
        if (callback) {
          callback({ success: true, data: location });
        }
      } catch (error) {
        console.error("Error getting location:", error);
        if (callback) {
          callback({ success: false, error: "Failed to get rider location" });
        }
      }
    });

    // stop listening when order staus completed or delivered
    socket.on("stopListening", ({ riderId }, callback) => {
      const room = `delivery:${riderId}`;
      socket.leave(room);
      console.log(`${socket.id} left room: ${room}`);
      if (callback) {
        callback({
          success: true,
          message: `Stopped listening to rider ${riderId}`,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};
