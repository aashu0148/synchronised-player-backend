const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    owner: {
      type: String,
      ref: "User",
    },
    playlist: [
      {
        type: String,
        default: [],
        ref: "Song",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const userSchema = mongoose.model("Room", schema);

module.exports = userSchema;
