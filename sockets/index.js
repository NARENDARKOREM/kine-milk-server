const { Server } = require("socket.io")

module.exports = (server) => {
    const io = new Server(server, { cors: { origin: "*" } })

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("joinOrderRoom", (orderId) => {
            socket.join(orderId)
            console.log(`${socket.id} joined room: ${orderId}`);
        })

        socket.on("locationUpdate", ({ orderId, lat, lng }) => {
            io.to(orderId).emit("orderLocationUpdate", { lat, lng });
            // Optionally save to DB here
        })

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);

        })
    })
}