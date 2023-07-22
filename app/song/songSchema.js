import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    title: {
      type: String,
      require: true,
    },
    fileType: {
      type: String,
    },
    length: {
      type: Number,
    },
    url: {
      type: String,
      require: true,
    },
    hash: {
      type: String,
    },
    artist: {
      type: String,
      require: true,
    },
  },
  {
    timestamps: true,
  }
);

const userSchema = mongoose.model("Song", schema);

export default userSchema;
