// test/socketConnectionTest.js
const { io } = require("socket.io-client");

const socket = io("http://localhost:5001", {
  transports: ["polling", "websocket"],
  reconnectionAttempts: 3,
  timeout: 5000,
});

socket.on("connect", () => {
  console.log("✅ Connected to Socket.IO server with ID:", socket.id);
  socket.emit("joinDelivery", { riderId: "testRider" });
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection Error:", err.message);
});

socket.on("disconnect", () => {
  console.log("🔌 Disconnected from Socket.IO server");
});