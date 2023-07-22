import songSchema from "./songSchema.js";

import {
  createError,
  createResponse,
  uploadAudioSync,
  downloadFile,
  getFileHashSha256,
  getBlobDuration,
} from "../../util/util.js";

const getAllSongs = async (req, res) => {
  const songs = await songSchema.find({}).sort({ createdAt: -1 });

  createResponse(res, songs);
};

const searchSong = async (req, res) => {
  const search = req.query.search;
  if (!search) {
    createError(res, "search query required", 400);
    return;
  }

  const regex = new RegExp(search, "ig");
  const songs = await songSchema.find({
    $or: [{ title: { $regex: regex } }, { artist: { $regex: regex } }],
  });

  createResponse(res, songs);
};

const checkSongAvailability = async (req, res) => {
  const { title, hash } = req.body;

  const song = await songSchema.findOne({
    $or: [
      {
        title,
      },
      {
        hash,
      },
    ],
  });
  if (song) {
    createError(res, `Similar song already exist: ${song.title}`, 400);
    return;
  }

  createResponse(res, "No similar song found! Song can be added");
};

const addNewSong = async (req, res) => {
  const { title, url, hash, artist, fileType, length } = req.body;

  if (!title || !url || !artist || !fileType || !length || !hash) {
    createError(
      res,
      `${title ? "" : "title, "}${artist ? "" : "artist, "}${
        length ? "" : "length, "
      }${fileType ? "" : "fileType, "}${url ? "" : "url, "}${
        hash ? "" : "hash, "
      } are required`,
      400
    );
    return;
  }

  const song = await songSchema.findOne({
    $or: [
      {
        title,
      },
      {
        hash,
      },
    ],
  });
  if (song) {
    createError(res, `Similar song already exist: ${song.title}`, 400);
    return;
  }

  const newSong = new songSchema({
    title,
    hash,
    artist,
    fileType,
    length: parseInt(length),
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

const uploadSongsToFirebaseAndDb = async (req, res) => {
  const { tracks } = req.body;

  if (!Array.isArray(tracks)) return createError(res, "tracks required");
  if (!tracks[0]?.title || !tracks[0]?.artists || !tracks[0]?.link)
    return createError(res, "title,artists,link required");

  for (let i = 0; i < tracks.length; ++i) {
    console.log(`🔵File :${i + 1}/${tracks.length} `);
    const file = tracks[i];
    const filename = file.title + "_-_" + file.artists + ".mp3";
    const blob = await downloadFile(file.link, filename);

    if (!blob || !blob?.size || blob?.size < 1 * 1024 * 1024) {
      console.log("🔴Discarded, file is smaller than 1MB");
      continue;
    }

    const blobHash = await getFileHashSha256(blob);

    const song = await songSchema.findOne({
      $or: [
        {
          title: file.title,
        },
        {
          hash: blobHash,
        },
      ],
    });
    if (song) {
      console.log("🔴song already exist:", song.title);
      continue;
    }
    const duration = await getBlobDuration(blob);
    if (!duration) {
      console.log("🔴can not calculate duration");
      continue;
    }

    console.log(`🟡uploading file:${filename} to firebase storage`);
    const url = await uploadAudioSync(blob, filename);
    if (!url) {
      console.log("🔴failed to get URL");
      continue;
    }

    const meta = {
      title: file.title,
      url,
      hash: blobHash,
      artist: file.artists,
      fileType: "audio/mp3",
      length: parseInt(duration),
    };

    const newSong = new songSchema(meta);

    await newSong.save();

    console.log("🟢Song saved in DB");
  }

  res.status(200).json({
    message: "Hello",
  });
};

export {
  getAllSongs,
  addNewSong,
  updateSong,
  deleteSong,
  searchSong,
  checkSongAvailability,
  uploadSongsToFirebaseAndDb,
};
