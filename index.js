import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Server as socketServer } from "socket.io";
import http from "http";
import dotenv from "dotenv";
dotenv.config();

import SocketEvents from "./app/socket/events.js";
import userRoutes from "./app/user/userRoutes.js";
import songRoutes from "./app/song/songRoutes.js";
import roomRoutes from "./app/room/roomRoutes.js";

const app = express();
const server = http.createServer(app);
const io = new socketServer(server, { cors: { origin: "*" } });

// io.attach(server, {
//   cors: {
//     origin: "*",
//   },
// });

app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true }));

const rooms = {
  dummyRoomId: {
    name: "dummy room",
    owner: "userID",
    playlist: ["songId1", "songId2"],
    users: [
      { name: "name1", email: "email1", _id: "_id1", role: "", heartbeat: "" },
      { name: "name2", email: "email2", _id: "_id2", role: "", heartbeat: "" },
      { name: "name3", email: "email3", _id: "_id3", role: "", heartbeat: "" },
    ],
    admins: ["uid"],
    controllers: ["uid"],
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

  const origUsersLength = rooms[roomId]?.users?.length || 0;
  let updatedRoom;
  if (rooms[roomId]) updatedRoom = { ...rooms[roomId], ...room };
  else {
    if (!room.owner || !Array.isArray(room.playlist)) return null;

    updatedRoom = { ...room };
  }

  rooms[roomId] = updatedRoom;

  if (origUsersLength !== updatedRoom?.users?.length || room?.users?.length) {
    io.to(roomId).emit("users-change", {
      users: updatedRoom.users,
      _id: roomId,
    });
  }

  return { ...updatedRoom };
};
const deleteRoom = (roomId) => {
  if (!rooms[roomId]) return;

  delete rooms[roomId];
};

const cleanUpRooms = () => {
  console.log("🔵 Cleaning up the rooms 🧹🧹");
  const maxHeartbeatBuffer = 90;

  const roomKeys = Object.keys(rooms);
  roomKeys.forEach((key) => {
    const currentTime = Date.now();
    const room = rooms[key];
    const users = Array.isArray(room.users)
      ? room.users.filter((item) =>
          currentTime - item.heartbeat < maxHeartbeatBuffer * 1000
            ? true
            : false
        )
      : [];
    const removedUsers = Array.isArray(room.users)
      ? room.users.filter((item) =>
          currentTime - item.heartbeat < maxHeartbeatBuffer * 1000
            ? false
            : true
        )
      : [];

    if (!users.length) {
      deleteRoom(key);
      console.log(`🟢 Cleared empty room - ${room.name}`);
      return;
    }

    if (users.length !== room.users.length) {
      updateRoom(key, { users });

      io.to(key).emit("users-change", {
        users,
        _id: key,
      });
      io.to(key).emit("notification", {
        title: "Inactive users removed" || "",
        description:
          `Removed [${removedUsers
            .map((item) => item.name)
            .join(", ")}] from the room as they were not found active` || "",
      });

      console.log(
        `🟢 Cleared ${removedUsers.length} [${removedUsers
          .map((item) => item.name)
          .join(", ")}] inactive users`
      );
    }
  });
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

// interval for cleaning rooms
setInterval(cleanUpRooms, 120 * 1000);

server.listen(5000, () => {
  console.log("Backend is up at port 5000");

  SocketEvents(io, rooms, updateRoom, deleteRoom);
  mongoose.set("strictQuery", true);
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Established a connection with the database"))
    .catch((err) => console.log("Error connecting to database", err));
});
