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
    chats: [
      {
        user: { name: "name1", _id: "id1", profileImage: "" },
        message: "",
        timestamp: "",
      },
    ],
    currentSong: "songId",
    lastPlayedAt: "timestamp",
    paused: true,
    playedSeconds: 0,
  },
};
const updateRoom = (roomId, room) => {
  if (typeof room !== "object") return null;

  let updatedRoom;
  if (rooms[roomId]) updatedRoom = { ...rooms[roomId], ...room };
  else {
    if (!room.owner || !Array.isArray(room.playlist)) return null;

    updatedRoom = { ...room };
  }

  rooms[roomId] = updatedRoom;

  return { ...updatedRoom };
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
app.get("/hi", (_req, res) => res.send("Hello there buddy!"));

server.listen(5000, () => {
  console.log("Backend is up at port 5000");

  SocketEvents(io, rooms, updateRoom, deleteRoom);
  mongoose.set("strictQuery", true);
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Established a connection with the database"))
    .catch((err) => console.log("Error connecting to database", err));
});
