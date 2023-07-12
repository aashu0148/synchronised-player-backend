const { roomUserTypeEnum } = require("../../util/constant");

const sendNotificationInRoom = (io, roomId, message) => {
  io.to(roomId).emit("notification", message);
};

const SocketEvents = (io, rooms) => {
  io.on("connection", (socket) => {
    socket.on("join-room", (obj) => {
      if (!obj.roomId) return;

      const { roomId, userId, name, email } = obj;

      const room = rooms[roomId];
      if (room) {
        rooms[roomId].users.push({
          name,
          email,
          _id: userId,
          role: roomUserTypeEnum.member,
        });
      }

      socket.join(roomId);
      sendNotificationInRoom(io, roomId, `${name} joined the room`);
    });

    socket.on("leave-room", (obj) => {
      if (!obj.roomId || !obj.userId) return;

      const { roomId, userId } = obj;

      const room = rooms[roomId];
      if (!room) return;

      let users = [...room.users];
      const userIndex = users.findIndex((item) => item._id == userId);
      const user = userIndex > -1 ? users[userIndex] : {};

      if (userIndex > -1) users = users.splice(userIndex, 1);
      rooms[roomId].users = users;

      sendNotificationInRoom(
        io,
        roomId,
        `${user?.name || "undefined"} left the room`
      );
      socket.leave(roomId);
    });
  });
};

module.exports = SocketEvents;
