const roomSchema = require("../room/roomSchema");
const { roomUserTypeEnum } = require("../../util/constant");
const { formatSecondsToMinutesSeconds } = require("../../util/util");

const updateRoomPlaylist = async (roomId, songIds) => {
  if (!roomId) return;

  try {
    await roomSchema.updateOne(
      { _id: roomId },
      { $set: { playlist: songIds } }
    );
  } catch (err) {
    console.log("Error updating playlist via sockets", err);
  }
};

const SocketEvents = (io, rooms, updateRoom, deleteRoom) => {
  const sendNotificationInRoom = (roomId, title, desc) => {
    io.to(roomId).emit("notification", {
      title: title || "",
      description: desc || "",
    });
  };

  const sendSocketError = (socket, message) => {
    socket.emit("error", message);
  };

  const removeUserFromRooms = (uid, rid, socket) => {
    let room;
    if (rid) room = rooms[rid];
    else {
      const roomKey = Object.keys(rooms).find((key) =>
        rooms[key]?.users
          ? rooms[key].users.some((item) => item._id == uid)
          : false
      );

      if (roomKey) rid = roomKey;
      room = roomKey ? rooms[roomKey] : undefined;
    }

    if (!room) return null;

    const user = room.users ? room.users.find((item) => item._id == uid) : {};
    let newUsers = room.users
      ? room.users.filter((item) => item._id !== uid)
      : [];

    const updatedRoom = updateRoom(rid, { users: newUsers });

    if (user && socket) {
      sendNotificationInRoom(rid, `${user?.name || "undefined"} left the room`);
      socket.leave(rid);
    }

    return { user, room: updatedRoom };
  };

  io.on("connection", (socket) => {
    const leaveRoomSocketHandler = (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId } = obj;

      const updatedRoom = removeUserFromRooms(userId, roomId, socket);
      socket.emit("left-room", { _id: roomId });

      if (!updatedRoom?.room?.users?.length) deleteRoom(roomId);
    };

    const checkForUserInRoom = (
      socket,
      roomId,
      userId,
      doNotSendError = false
    ) => {
      let room = rooms[roomId] ? rooms[roomId] : undefined;

      if (!room) {
        if (!doNotSendError) sendSocketError(socket, "Room not found");
        return false;
      }

      const user = room.users.find((item) => item._id == userId);
      if (!user) {
        if (!doNotSendError)
          sendSocketError(socket, `user not found in the room: ${room.name}`);
        return false;
      }

      return { room, user };
    };

    const isAnyHigherAuthorityExistInRoom = (room) => {
      if (!Array.isArray(room.users)) return false;

      return room.users.some((item) =>
        [
          roomUserTypeEnum.owner,
          roomUserTypeEnum.admin,
          roomUserTypeEnum.controller,
        ].includes(item.role)
      );
    };

    socket.on("join-room", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, name, email, profileImage } = obj;
      removeUserFromRooms(userId, null, socket);
      let room = rooms[roomId] ? { ...rooms[roomId] } : undefined;

      const user = {
        _id: userId,
        name,
        email,
        profileImage,
        heartbeat: Date.now(),
      };

      if (room) {
        user.role =
          room.owner?._id == userId
            ? roomUserTypeEnum.owner
            : Array.isArray(room.admins) && room.admins.includes(userId)
            ? roomUserTypeEnum.admin
            : roomUserTypeEnum.member;

        room.users = Array.isArray(room.users) ? [...room.users, user] : [user];
      } else {
        room = await roomSchema
          .findOne({ _id: roomId })
          .populate("playlist")
          .populate({
            path: "owner",
            select: "-token -createdAt",
          })
          .lean();

        if (!room) {
          sendSocketError(socket, "Room not found in the database");
          return;
        }

        user.role =
          room.owner?._id == userId
            ? roomUserTypeEnum.owner
            : Array.isArray(room.admins) && room.admins.includes(userId)
            ? roomUserTypeEnum.admin
            : roomUserTypeEnum.member;

        room = {
          ...room,
          users: [user],
          chats: [],
          admins: room.admins?.length ? room.admins : [],
          controllers: [],
          currentSong: room.playlist[0] ? room.playlist[0]._id : "",
          lastPlayedAt: Date.now(),
          paused: false,
          secondsPlayed: 0,
        };
      }

      const updatedRoom = updateRoom(roomId, room);
      socket.join(roomId);
      socket.emit("joined-room", { ...updatedRoom, _id: roomId });
      sendNotificationInRoom(roomId, `${name} joined the room`);

      io.to(roomId).emit("users-change", {
        users: updatedRoom.users || [],
        _id: roomId,
      });
    });

    socket.on("leave-room", leaveRoomSocketHandler);

    socket.on("alive", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId, true);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const newUsers = room.users.map((item) =>
        item._id == userId ? { ...item, heartbeat: Date.now() } : item
      );

      updateRoom(roomId, {
        users: newUsers,
      });
    });

    socket.on("play-pause", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const userRole = user.role || roomUserTypeEnum.member;
      const higherAuthorityExist = isAnyHigherAuthorityExistInRoom(room);

      if (userRole == roomUserTypeEnum.member && higherAuthorityExist) {
        return sendSocketError(
          socket,
          "Member can not play/pause until room has any owner/admin/controller"
        );
      }

      const song =
        room.playlist.find((item) => item._id == room.currentSong) || {};
      const newPausedValue = room.paused ? false : true;
      updateRoom(roomId, {
        paused: newPausedValue,
      });

      io.to(roomId).emit("play-pause", {
        paused: newPausedValue,
      });
      sendNotificationInRoom(
        roomId,
        `${newPausedValue ? "paused" : "played"} by ${user.name}`,
        `${user.name} ${newPausedValue ? "paused" : "played"} the song: ${
          song?.title
        }`
      );
    });

    socket.on("seek", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId } = obj;
      const seekSeconds = parseInt(obj.seekSeconds);

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const userRole = user.role || roomUserTypeEnum.member;
      const higherAuthorityExist = isAnyHigherAuthorityExistInRoom(room);

      if (userRole == roomUserTypeEnum.member && higherAuthorityExist) {
        return sendSocketError(
          socket,
          "Member can not seek a song until room has any owner/admin/controller"
        );
      }

      if (isNaN(seekSeconds)) {
        sendSocketError(socket, `seekSeconds required`);
        return;
      }

      const song =
        room.playlist.find((item) => item._id == room.currentSong) || {};

      if (song.length < seekSeconds) {
        sendSocketError(
          socket,
          `Can not seek to ${seekSeconds}seconds for a ${song.length}second song`
        );
        return;
      }

      updateRoom(roomId, {
        lastPlayedAt: Date.now(),
        paused: false,
        secondsPlayed: seekSeconds,
      });

      io.to(roomId).emit("seek", {
        lastPlayedAt: Date.now(),
        paused: false,
        secondsPlayed: seekSeconds,
      });
      sendNotificationInRoom(
        roomId,
        `Seeked to ${formatSecondsToMinutesSeconds(seekSeconds)}`,
        `${user.name} seeked the song: ${
          song?.title
        } to ${formatSecondsToMinutesSeconds(seekSeconds)}`
      );
    });

    socket.on("next", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, currentSongId, autoPlay = false } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const userRole = user.role || roomUserTypeEnum.member;
      const higherAuthorityExist = isAnyHigherAuthorityExistInRoom(room);

      if (userRole == roomUserTypeEnum.member && higherAuthorityExist) {
        return sendSocketError(
          socket,
          "Member can not play next song until room has any owner/admin/controller"
        );
      }

      if (!currentSongId) {
        sendSocketError(socket, "currentSongId not found");
        return;
      }

      const songIndex = room.playlist.findIndex(
        (item) => item._id == currentSongId
      );
      if (room.playlist[songIndex]?.length < 0) {
        sendSocketError(socket, `Can not find current song in the playlist`);
        return;
      }

      let nextSongIndex =
        songIndex == room.playlist.length - 1 ? 0 : songIndex + 1;
      const nextSong = room.playlist[nextSongIndex];
      if (room.currentSong == nextSong?._id) return;

      updateRoom(roomId, {
        secondsPlayed: 0,
        lastPlayedAt: Date.now(),
        paused: false,
        currentSong: nextSong?._id,
      });

      io.to(roomId).emit("next", {
        secondsPlayed: 0,
        lastPlayedAt: Date.now(),
        paused: false,
        currentSong: nextSong?._id,
      });
      sendNotificationInRoom(
        roomId,
        `Next song`,
        autoPlay
          ? `Auto played next song: ${nextSong?.title}`
          : `${user.name} played "${nextSong?.title}" as a next song`
      );
    });

    socket.on("prev", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, currentSongId } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const userRole = user.role || roomUserTypeEnum.member;
      const higherAuthorityExist = isAnyHigherAuthorityExistInRoom(room);

      if (userRole == roomUserTypeEnum.member && higherAuthorityExist) {
        return sendSocketError(
          socket,
          "Member can not play previous song until room has any owner/admin/controller"
        );
      }

      if (!currentSongId) {
        sendSocketError(socket, "currentSongId not found");
        return;
      }

      const songIndex = room.playlist.findIndex(
        (item) => item._id == currentSongId
      );
      if (room.playlist[songIndex]?.length < 0) {
        sendSocketError(socket, `Can not find current song in the playlist`);
        return;
      }

      let prevSongIndex =
        songIndex == 0 ? room.playlist.length - 1 : songIndex - 1;
      const prevSong = room.playlist[prevSongIndex];

      updateRoom(roomId, {
        secondsPlayed: 0,
        lastPlayedAt: Date.now(),
        paused: false,
        currentSong: prevSong?._id,
      });

      io.to(roomId).emit("prev", {
        secondsPlayed: 0,
        lastPlayedAt: Date.now(),
        paused: false,
        currentSong: prevSong?._id,
      });
      sendNotificationInRoom(
        roomId,
        `Previous song played by ${user.name}`,
        `${user.name} played "${prevSong?.title}" as a previous song`
      );
    });

    socket.on("play-song", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, songId } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const userRole = user.role || roomUserTypeEnum.member;
      const higherAuthorityExist = isAnyHigherAuthorityExistInRoom(room);

      if (userRole == roomUserTypeEnum.member && higherAuthorityExist) {
        return sendSocketError(
          socket,
          "Member can not play another song until room has any owner/admin/controller"
        );
      }

      if (!songId) {
        sendSocketError(socket, "songId not found");
        return;
      }

      const songIndex = room.playlist.findIndex((item) => item._id == songId);
      if (room.playlist[songIndex]?.length < 0) {
        sendSocketError(socket, `Can not find song in the playlist`);
        return;
      }

      const song = room.playlist[songIndex];

      updateRoom(roomId, {
        secondsPlayed: 0,
        lastPlayedAt: Date.now(),
        paused: false,
        currentSong: song?._id,
      });

      io.to(roomId).emit("play-song", {
        secondsPlayed: 0,
        lastPlayedAt: Date.now(),
        paused: false,
        currentSong: song?._id,
      });
      sendNotificationInRoom(
        roomId,
        `${song.title}`,
        `${user.name} played "${song?.title}"`
      );
    });

    socket.on("sync", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, secondsPlayed } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      if (isNaN(secondsPlayed)) {
        sendSocketError(socket, "secondsPlayed not found");
        return;
      }

      updateRoom(roomId, {
        secondsPlayed: secondsPlayed,
      });
    });

    socket.on("update-playlist", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, songIds } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const userRole = user.role || roomUserTypeEnum.member;
      if (
        [roomUserTypeEnum.member, roomUserTypeEnum.controller].includes(
          userRole
        )
      ) {
        return sendSocketError(
          socket,
          `${userRole} can not update the playlist. You need admin access for this action`
        );
      }

      if (!Array.isArray(songIds)) {
        sendSocketError(socket, "songIds not found");
        return;
      }

      const newPlaylist = songIds
        .map((id) => room.playlist.find((item) => item._id == id))
        .filter((item) => item);

      updateRoom(roomId, {
        playlist: newPlaylist,
      });
      updateRoomPlaylist(
        roomId,
        newPlaylist.map((item) => item._id)
      );

      io.to(roomId).emit("update-playlist", {
        playlist: newPlaylist,
      });
      sendNotificationInRoom(
        roomId,
        `Playlist updated`,
        `${user.name} updated the playlist`
      );
    });

    socket.on("add-song", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, song } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const userRole = user.role || roomUserTypeEnum.member;
      if (
        [roomUserTypeEnum.member, roomUserTypeEnum.controller].includes(
          userRole
        )
      ) {
        return sendSocketError(
          socket,
          `${userRole} can not add new song. You need admin access for this action`
        );
      }

      if (!song?._id) {
        sendSocketError(socket, "song not found");
        return;
      }

      const newPlaylist = [...room.playlist, song];

      updateRoom(roomId, {
        playlist: newPlaylist,
      });
      updateRoomPlaylist(
        roomId,
        newPlaylist.map((item) => item._id)
      );

      io.to(roomId).emit("add-song", {
        playlist: newPlaylist,
      });
      sendNotificationInRoom(
        roomId,
        `New song added`,
        `${user.name} added ${song.title}`
      );
    });

    socket.on("chat", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, message, timestamp } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      if (!message || !message.trim()) {
        sendSocketError(socket, `message required`);
        return;
      }

      const newChat = {
        user: { ...user },
        message,
        timestamp: timestamp || Date.now(),
      };
      const newChats = [...room.chats, newChat];

      updateRoom(roomId, {
        chats: newChats,
      });

      io.to(roomId).emit("chat", {
        chats: newChats,
      });
    });

    socket.on("clear-chat", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const userRole = user.role || roomUserTypeEnum.member;
      if (
        [roomUserTypeEnum.member, roomUserTypeEnum.controller].includes(
          userRole
        )
      ) {
        return sendSocketError(
          socket,
          `${userRole} can not clear chats. You need admin access for this action`
        );
      }

      updateRoom(roomId, {
        chats: [],
      });

      io.to(roomId).emit("chat", {
        chats: [],
      });
      sendNotificationInRoom(
        roomId,
        `Chats cleared`,
        `${user.name} cleared the chats`
      );
    });
  });
};

module.exports = SocketEvents;
