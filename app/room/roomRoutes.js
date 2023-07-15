const express = require("express");

const {
  createRoom,
  deleteRoom,
  updateRoomToDb,
  getAllRooms,
  demoteAdmin,
  demoteController,
  promoteToAdmin,
  promoteToController,
} = require("./roomServices");
const { authenticateUserMiddleware } = require("../user/userMiddleware");

const router = express.Router();

router.get("/room/all", authenticateUserMiddleware, getAllRooms);
router.post("/room", authenticateUserMiddleware, createRoom);
router.put("/room/:rid", authenticateUserMiddleware, updateRoomToDb);
router.delete("/room/:rid", authenticateUserMiddleware, deleteRoom);
router.get(
  "/room/:rid/promote/admin/:uid",
  authenticateUserMiddleware,
  promoteToAdmin
);
router.get(
  "/room/:rid/demote/admin/:uid",
  authenticateUserMiddleware,
  demoteAdmin
);
router.get(
  "/room/:rid/promote/controller/:uid",
  authenticateUserMiddleware,
  promoteToController
);
router.get(
  "/room/:rid/demote/controller/:uid",
  authenticateUserMiddleware,
  demoteController
);

module.exports = router;
