const express = require("express");

const {
  getAllSongs,
  addNewSong,
  updateSong,
  deleteSong,
  searchSong,
  checkSongAvailability,
} = require("./songServices");
const { authenticateUserMiddleware } = require("../user/userMiddleware");

const router = express.Router();

router.post("/song/available", checkSongAvailability);
router.get("/song", searchSong);
router.get("/song/all", getAllSongs);
router.post("/song", authenticateUserMiddleware, addNewSong);
router.put("/song/:sid", authenticateUserMiddleware, updateSong);
router.delete("/song/:sid", authenticateUserMiddleware, deleteSong);

module.exports = router;
