import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import userSchema from "./userSchema.js";
import { createError, createResponse, validateEmail } from "../../util/util.js";

const JWT_SECRET = process.env.JWT_SECRET || "sleeping-owl";

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

const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return createError(res, "All fields are required", 400);
    }

    if (!validateEmail(email)) {
      return createError(res, "Invalid email format", 400);
    }

    // Check if user already exists
    const existingUser = await userSchema.findOne({ email });
    if (existingUser) {
      return createError(res, "Email already registered", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create token
    const token = jwt.sign({ email: email }, JWT_SECRET);

    // Create new user
    const user = new userSchema({
      name,
      email,
      password: hashedPassword,
      token,
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return createResponse(res, userResponse, 201);
  } catch (error) {
    return createError(res, error.message || "Error creating user", 500);
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return createError(res, "Email and password are required", 400);
    }

    // Find user
    const user = await userSchema.findOne({ email });
    if (!user) {
      return createError(res, "Invalid credentials", 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return createError(res, "Invalid credentials", 401);
    }

    // Generate new token
    const token = jwt.sign({ email: user.email }, JWT_SECRET);

    // Update user's token
    user.token = token;
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return createResponse(res, userResponse, 200);
  } catch (error) {
    return createError(res, error.message || "Error during login", 500);
  }
};

export {
  handleGoogleLogin,
  getCurrentUser,
  getAdminAccess,
  createUser,
  loginUser,
};
