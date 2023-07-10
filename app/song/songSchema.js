const mongoose = require("mongoose");

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
      type: String,
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

module.exports = userSchema;
