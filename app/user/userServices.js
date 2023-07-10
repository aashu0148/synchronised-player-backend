const userSchema = require("./userSchema");

const {
  createError,
  createResponse,
  validateEmail,
} = require("../../util/util");

const handleGoogleLogin = async (req, res) => {
  const { name, email, profileImage, token } = req.body;

  if (!email) {
    createError(res, "Email required", 422);
    return;
  }

  const user = await userSchema.findOne({ email });
  if (user) {
    createResponse(res, { user, token: user.token });
    return;
  }

  if (!name) {
    createError(res, "Name required", 422);
    return;
  } else if (!validateEmail(email)) {
    createError(res, "Invalid email", 422);
    return;
  } else if (!token || token?.length < 10) {
    createError(res, "Token required", 422);
    return;
  }

  const newUser = new userSchema({
    name,
    email,
    token,
    profileImage,
  });

  newUser
    .save()
    .then((user) => {
      createResponse(res, {
        user,
        token: user.token,
      });
    })
    .catch((err) => {
      createError(res, err.message || "Something went wrong", 500, err);
    });
};

const getAdminAccess = (req, res) => {
  const { password } = req.body;

  if (!password) {
    createError(res, "Password required", 422);
    return;
  }

  if (password == "sleeping-owl@music")
    createResponse(res, { message: "Password matched" });
  else createError(res, "Incorrect password", 400);
};

const getCurrentUser = (req, res) => {
  createResponse(res, req.user, 200);
};

module.exports = { handleGoogleLogin, getCurrentUser, getAdminAccess };
