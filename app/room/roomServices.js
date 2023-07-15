const roomSchema = require("./roomSchema");
const userSchema = require("../user/userSchema");
const { createError, createResponse } = require("../../util/util");
const { roomUserTypeEnum } = require("../../util/constant");

const getAllRooms = async (req, res) => {
  const rooms = await roomSchema
    .find({})
    .populate("playlist")
    .populate({
      path: "owner",
      select: "-token -createdAt",
    })
    .sort({ updatedAt: -1 })
    .lean();

  const socketRooms = req.rooms;

  createResponse(
    res,
    rooms.map((item) => ({
      ...item,
      users: socketRooms[item._id]?.users || [],
    }))
  );
};

const createRoom = async (req, res) => {
  const userId = req.user?._id;
  const { name, playlist } = req.body;

  if (!name) {
    createError(res, "Room name required");
    return;
  }

  const newRoom = new roomSchema({
    name,
    owner: userId,
    playlist: Array.isArray(playlist)
      ? playlist.filter((item) => typeof item == "string")
      : [],
  });

  newRoom
    .save()
    .then((room) => createResponse(res, room, 201))
    .catch((err) => createError(res, "Error creating room", 500, err));
};

const updateRoomToDb = async (req, res) => {
  const roomId = req.params.rid;
  const { name, playlist } = req.body;

  const updateObj = {};
  if (name) updateObj.name = name;
  if (Array.isArray(playlist))
    updateObj.name = playlist.filter((item) => typeof item == "string");

  const room = await roomSchema.findOne({ _id: roomId });

  if (!room) {
    createError(res, "Room not found", 404);
    return;
  }

  roomSchema
    .updateOne({ _id: roomId }, updateObj)
    .exec()
    .then((room) => {
      if (req.updateRoom) req.updateRoom(roomId, room);

      createResponse(res, room);
    })
    .catch((err) => createError(res, "Error updating room", 500, err));
};

const deleteRoom = async (req, res) => {
  const userId = req.user?._id;
  const roomId = req.params.rid;

  const room = await roomSchema.findOne({ _id: roomId });
  if (!room) {
    createError(res, "room not found to delete", 404);
    return;
  }
  if (room.owner !== userId) {
    createError(res, "Only owner can delete the room", 401);
    return;
  }

  roomSchema
    .deleteOne({ _id: roomId })
    .exec()
    .then(() => {
      if (req.deleteRoom) req.deleteRoom(roomId);

      createResponse(res, { message: "room deleted" });
    })
    .catch((err) => createError(res, "Error deleting room", 500, err));
};

const promoteToAdmin = async (req, res) => {
  const userId = req.user?._id;

  const roomId = req.params.rid;
  const adminUserId = req.params.uid;

  const room = await roomSchema.findOne({ _id: roomId });
  const adminUser = await userSchema.findOne({ _id: adminUserId });
  if (!room) {
    createError(res, "room not found", 404);
    return;
  }
  if (!adminUser) {
    createError(res, "provided user does not exist in the DB to promote", 404);
    return;
  }
  if (room.owner !== userId) {
    createError(res, "Only owner have permission to promote", 401);
    return;
  }

  const admins = Array.isArray(room.admins) ? [...room.admins] : [];
  admins.push(adminUserId);

  const socketRooms = req.rooms;
  if (!socketRooms || !socketRooms[roomId] || !req.updateRoom) {
    createError(res, "Error finding the room, please re-join", 500);
    return;
  }

  const socketRm = socketRooms[roomId];

  roomSchema
    .updateOne({ _id: roomId }, { $set: { admins } })
    .exec()
    .then((rm) => {
      if (req.updateRoom)
        req.updateRoom(roomId, {
          admins: rm.admins,
          users: Array.isArray(socketRm.users)
            ? socketRm.users.map((item) =>
                item._id == adminUserId
                  ? { ...item, role: roomUserTypeEnum.admin }
                  : item
              )
            : [],
        });

      createResponse(res, { message: `${adminUser.name} promoted to admin` });
    })
    .catch((err) => createError(res, "Error prompting user", 500, err));
};

const demoteAdmin = async (req, res) => {
  const userId = req.user?._id;

  const roomId = req.params.rid;
  const adminUserId = req.params.uid;

  const room = await roomSchema.findOne({ _id: roomId });
  const adminUser = await userSchema.findOne({ _id: adminUserId });
  if (!room) {
    createError(res, "room not found", 404);
    return;
  }
  if (!adminUser) {
    createError(res, "provided user does not exist in the DB to demote", 404);
    return;
  }
  if (room.owner !== userId) {
    createError(res, "Only owner have permission to demote", 401);
    return;
  }

  const admins = Array.isArray(room.admins)
    ? room.admins.filter((item) => item !== adminUserId)
    : [];

  const socketRooms = req.rooms;
  if (!socketRooms || !socketRooms[roomId] || !req.updateRoom) {
    createError(res, "Error finding the room, please re-join", 500);
    return;
  }

  const socketRm = socketRooms[roomId];

  roomSchema
    .updateOne({ _id: roomId }, { $set: { admins } })
    .exec()
    .then((rm) => {
      if (req.updateRoom)
        req.updateRoom(roomId, {
          admins: rm.admins,
          users: Array.isArray(socketRm.users)
            ? socketRm.users.map((item) =>
                item._id == adminUserId
                  ? { ...item, role: roomUserTypeEnum.controller }
                  : item
              )
            : [],
        });

      createResponse(res, {
        message: `${adminUser.name} demoted from admin to user`,
      });
    })
    .catch((err) => createError(res, "Error demoting admin", 500, err));
};

const promoteToController = async (req, res) => {
  const userId = req.user?._id;

  const roomId = req.params.rid;
  const controllerUserId = req.params.uid;

  const room = await roomSchema.findOne({ _id: roomId });
  const controllerUser = await userSchema.findOne({ _id: controllerUserId });
  if (!room) {
    createError(res, "room not found", 404);
    return;
  }
  if (!controllerUser) {
    createError(res, "provided user does not exist in the DB to promote", 404);
    return;
  }

  const admins = room.admins;
  const doesUserHaveAccess = admins.includes(userId) || room.owner == userId;

  if (!doesUserHaveAccess) {
    createError(
      res,
      "You do not have permission to promote to controller",
      401
    );
    return;
  }

  const socketRooms = req.rooms;
  if (!socketRooms || !socketRooms[roomId] || !req.updateRoom) {
    createError(res, "Error finding the room, please re-join", 500);
    return;
  }

  const socketRm = socketRooms[roomId];
  req.updateRoom(roomId, {
    controllers: Array.isArray(socketRm.controllers)
      ? [...socketRm.controllers, controllerUserId]
      : [controllerUserId],
    users: Array.isArray(socketRm.users)
      ? socketRm.users.map((item) =>
          item._id == controllerUserId
            ? { ...item, role: roomUserTypeEnum.controller }
            : item
        )
      : [],
  });

  createResponse(res, {
    message: `${controllerUser.name} promoted to controller`,
  });
};

const demoteController = async (req, res) => {
  const userId = req.user?._id;

  const roomId = req.params.rid;
  const controllerUserId = req.params.uid;

  const room = await roomSchema.findOne({ _id: roomId });
  const controllerUser = await userSchema.findOne({ _id: controllerUserId });
  if (!room) {
    createError(res, "room not found", 404);
    return;
  }
  if (!controllerUser) {
    createError(res, "provided user does not exist in the DB to demote", 404);
    return;
  }

  const admins = room.admins;
  const doesUserHaveAccess = admins.includes(userId) || room.owner == userId;

  if (!doesUserHaveAccess) {
    createError(
      res,
      "You do not have permission to demote any controller",
      401
    );
    return;
  }

  const socketRooms = req.rooms;
  if (!socketRooms || !socketRooms[roomId] || !req.updateRoom) {
    createError(res, "Error finding the room, please re-join", 500);
    return;
  }

  const socketRm = socketRooms[roomId];
  req.updateRoom(roomId, {
    controllers: Array.isArray(socketRm.controllers)
      ? socketRm.controllers.filter((item) => item !== controllerUserId)
      : [],
    users: Array.isArray(socketRm.users)
      ? socketRm.users.map((item) =>
          item._id == controllerUserId
            ? { ...item, role: roomUserTypeEnum.member }
            : item
        )
      : [],
  });

  createResponse(res, { message: `${controllerUser.name} demoted to user` });
};

module.exports = {
  createRoom,
  deleteRoom,
  updateRoomToDb,
  getAllRooms,
  promoteToAdmin,
  demoteAdmin,
  promoteToController,
  demoteController,
};
