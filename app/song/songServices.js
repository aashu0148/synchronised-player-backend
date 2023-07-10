const songSchema = require("./songSchema");

const { createError, createResponse } = require("../../util/util");

const getAllSongs = async (req, res) => {
  const songs = await songSchema.find({});

  createResponse(res, songs);
};

const addNewSong = async (req, res) => {
  const { title, url, hash, artist, fileType, length } = req.body;

  if (!title || !url || !artist || !fileType) {
    createError(
      res,
      `${title ? "" : "title, "}${artist ? "" : "artist, "}${
        fileType ? "" : "fileType, "
      }${url ? "" : "url, "} are required`,
      400
    );
    return;
  }

  const newSong = new songSchema({
    title,
    hash,
    artist,
    fileType,
    length,
    url,
  });

  newSong
    .save()
    .then((song) => createResponse(res, { song }, 201))
    .catch((err) => createError(res, "Error adding song to DB", 500, err));
};

const updateSong = async (req, res) => {
  const sid = req.params.sid;
  const { title, artist } = req.body;

  if (!sid) {
    createError(res, "Song id required", 400);
    return;
  }

  const updatingObject = {};

  if (title) updatingObject.title = title;
  if (artist) updatingObject.artist = artist;

  try {
    const song = await songSchema.updateOne(
      { _id: sid },
      { $set: updatingObject }
    );

    createResponse(res, song);
  } catch (err) {
    createError(res, "Error updating song in DB", 500, err);
  }
};

const deleteSong = async (req, res) => {
  const sid = req.params.sid;

  if (!sid) {
    createError(res, "Song id required", 400);
    return;
  }

  try {
    await songSchema.deleteOne({ _id: sid });

    createResponse(res, true);
  } catch (err) {
    createError(res, "Error deleting song from DB", 500, err);
  }
};

module.exports = { getAllSongs, addNewSong, updateSong, deleteSong };
