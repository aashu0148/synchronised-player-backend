import express from "express";

import {
  getAllSongs,
  addNewSong,
  updateSong,
  deleteSong,
  searchSong,
  checkSongAvailability,
  uploadSongsToFirebaseAndDb,
} from "./songServices.js";
import { authenticateUserMiddleware } from "../user/userMiddleware.js";

const router = express.Router();

router.post("/song/available", checkSongAvailability);
router.get("/song", searchSong);
router.get("/song/all", getAllSongs);
router.post("/song", authenticateUserMiddleware, addNewSong);
router.put("/song/:sid", authenticateUserMiddleware, updateSong);
router.delete("/song/:sid", authenticateUserMiddleware, deleteSong);
router.post("/song/bulk/d-u", uploadSongsToFirebaseAndDb);

export default router;
