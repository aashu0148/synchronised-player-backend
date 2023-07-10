const express = require("express");

const {
  getAllSongs,
  addNewSong,
  updateSong,
  deleteSong,
} = require("./songServices");

const router = express.Router();

router.get("/song/all", getAllSongs);
router.post("/song", addNewSong);
router.put("/song/:sid", updateSong);
router.delete("/song/:sid", deleteSong);

module.exports = router;
