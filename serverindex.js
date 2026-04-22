const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Queue & rooms
let queue = [];
let rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join queue
  socket.on("joinQueue", () => {
    queue.push(socket.id);

    if (queue.length >= 2) {
      const user1 = queue.shift();
      const user2 = queue.shift();

      const roomId = uuidv4();

      rooms[user1] = roomId;
      rooms[user2] = roomId;

      io.to(user1).emit("matched", { roomId });
      io.to(user2).emit("matched", { roomId });
    }
  });

  // Join room
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  // Send message
  socket.on("message", ({ roomId, text }) => {
    socket.to(roomId).emit("message", text);
  });

  // Next user
  socket.on("next", () => {
    const roomId = rooms[socket.id];

    if (roomId) {
      socket.leave(roomId);
      delete rooms[socket.id];
    }

    socket.emit("requeue");
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    queue = queue.filter((id) => id !== socket.id);
    delete rooms[socket.id];
  });
});

// Important for Railway deployment
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});