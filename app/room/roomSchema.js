import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    owner: {
      type: String,
      ref: "User",
    },
    admins: [
      {
        type: String,
        ref: "User",
      },
    ],
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

const roomSchema = mongoose.model("Room", schema);

export default roomSchema;
