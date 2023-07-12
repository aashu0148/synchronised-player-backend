const express = require("express");

const {
  createRoom,
  deleteRoom,
  updateRoomToDb,
  getAllRooms,
} = require("./roomServices");
const { authenticateUserMiddleware } = require("../user/userMiddleware");

const router = express.Router();

router.get("/room/all", authenticateUserMiddleware, getAllRooms);
router.post("/room", authenticateUserMiddleware, createRoom);
router.put("/room/:rid", authenticateUserMiddleware, updateRoomToDb);
router.delete("/room/:rid", authenticateUserMiddleware, deleteRoom);

module.exports = router;
