import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
    },
    token: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const userSchema = mongoose.model("User", schema);

export default userSchema;
