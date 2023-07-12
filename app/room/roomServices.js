const roomSchema = require("./roomSchema");
const { createError, createResponse } = require("../../util/util");

const getAllRooms = async (req, res) => {
  const rooms = await roomSchema
    .find({})
    .populate("playlist")
    .populate({
      path: "owner",
      select: "-token -createdAt",
    })
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
    .lean()
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

module.exports = { createRoom, deleteRoom, updateRoomToDb, getAllRooms };
