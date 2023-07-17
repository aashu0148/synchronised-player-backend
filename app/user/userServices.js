const userSchema = require("./userSchema");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");

const {
  createError,
  createResponse,
  validateEmail,
} = require("../../util/util");

const verifyGoogleToken = async ({ token }) => {
  const clientId = process.env.CLIENT_ID;
  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });
    if (!ticket) {
      return { success: false, msg: "Invalid token!" };
    }
    const payload = ticket.getPayload();
    payload["profileImage"] = payload.picture;

    return { success: true, payload };
  } catch (error) {
    const err = error.message || error;
    return { success: false, msg: err };
  }
};

const handleGoogleLogin = async (req, res) => {
  let { credential: token, clientId } = req.body;

  let { origin } = req.query;

  if (!token || !clientId) {
    return createError(400, "Token and clientId are required", res);
  }

  let data = { token, clientId };
  let verifyRes = await verifyGoogleToken(data);
  if (!verifyRes.success) {
    return createError(res, verifyRes.msg, 400);
  }

  const { name, email, profileImage } = verifyRes.payload;

  const tokenHash = bcrypt.hashSync(token, 5);

  let user = await userSchema.findOne({ email });

  if (!user)
    user = new userSchema({
      name,
      email,
      token: tokenHash,
      profileImage,
    });

  user
    .save()
    .then((user) => {
      const url = new URL(`${origin}/auth`);
      for (const key in req.query) url.searchParams.append(key, req.query[key]);

      url.searchParams.append("accessToken", user.token);

      res.redirect(url.toString());
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
