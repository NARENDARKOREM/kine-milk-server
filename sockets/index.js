

// sockets/index.js
const { Server } = require("socket.io");
const { storeRiderLocation } = require("../utils/redisUtils");

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Comment out JWT middleware for testing
  /*
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });
  */

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("joinDelivery", ({ riderId }) => {
      const room = `delivery:${riderId}`;
      socket.join(room);
      console.log(`${socket.id} joined room: ${room}`);
    });

    socket.on("sendLocation", async ({ riderId, latitude, longitude }) => {
      try {
        const redisClient = socket.request.app.locals.redisClient;
        await storeRiderLocation(redisClient, riderId, latitude, longitude);
        const locationData = { riderId, latitude, longitude, timestamp: Date.now() };
        io.to(`delivery:${riderId}`).emit("locationUpdate", locationData);
        console.log(`Location updated for rider ${riderId}: ${latitude}, ${longitude}`);
      } catch (error) {
        console.error("Error storing location:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};