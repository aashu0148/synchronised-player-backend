const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const dotenv = require("dotenv");
dotenv.config();

const SocketEvents = require("./app/socket/events");
const userRoutes = require("./app/user/userRoutes");
const songRoutes = require("./app/song/songRoutes");
const roomRoutes = require("./app/room/roomRoutes");

const app = express();
const server = require("http").createServer(app);
const io = new socketIo.Server();
io.attach(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

const rooms = {
  dummyRoomId: {
    name: "room name",
    owner: "userID",
    playlist: ["songId1", "songId2"],
    users: [
      { name: "name1", email: "email1", _id: "_id1", role: "" },
      { name: "name2", email: "email2", _id: "_id2", role: "" },
      { name: "name3", email: "email3", _id: "_id3", role: "" },
    ],
  },
};
const updateRoom = (roomId, room) => {
  if (
    !rooms[roomId] ||
    !room.owner ||
    !Array.isArray(room.users) ||
    !Array.isArray(room.playlist)
  )
    return;

  rooms[roomId] = { ...rooms[roomId], ...room };
};
const deleteRoom = (roomId) => {
  if (!rooms[roomId]) return;

  delete rooms[roomId];
};

app.use(userRoutes);
app.use(songRoutes);
app.use((req, _res, next) => {
  req.rooms = rooms;
  req.updateRoom = updateRoom;
  req.deleteRoom = deleteRoom;

  next();
}, roomRoutes);

server.listen(5000, () => {
  console.log("Backend is up at port 5000");

  SocketEvents(io, rooms);
  mongoose.set("strictQuery", true);
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Established a connection with the database"))
    .catch((err) => console.log("Error connecting to database", err));
});
