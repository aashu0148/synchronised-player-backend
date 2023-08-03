import express from "express";

import {
  createRoom,
  deleteRoom,
  updateRoomToDb,
  getAllRooms,
  demoteAdmin,
  demoteController,
  promoteToAdmin,
  promoteToController,
  getCurrentRoomOfUser,
  removeDuplicateSongsFromRoom,
  createRoomWithRandomSongs,
  addSongToRoom,
  getUserRooms,
} from "./roomServices.js";
import { authenticateUserMiddleware } from "../user/userMiddleware.js";

const router = express.Router();

router.get("/room/current", authenticateUserMiddleware, getCurrentRoomOfUser);
router.get("/room/user", authenticateUserMiddleware, getUserRooms);
router.get("/room/all", authenticateUserMiddleware, getAllRooms);
router.post("/room", authenticateUserMiddleware, createRoom);
router.post(
  "/room/random",
  authenticateUserMiddleware,
  createRoomWithRandomSongs
);
router.put("/room/:rid", authenticateUserMiddleware, updateRoomToDb);
router.get("/room/remove-duplicates/:rid", removeDuplicateSongsFromRoom);
router.post("/room/song/:rid/:sid", authenticateUserMiddleware, addSongToRoom);
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

export default router;
