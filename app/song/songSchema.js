import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
    },
    timesPlayed: {
      type: Number,
      default: 0,
    },
    length: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
    },
    cover: {
      type: String,
    },
    artist: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const userSchema = mongoose.model("Song", schema);

export default userSchema;
