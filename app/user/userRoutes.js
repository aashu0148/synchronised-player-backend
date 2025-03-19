import express from "express";

import {
  handleGoogleLogin,
  getCurrentUser,
  getAdminAccess,
  createUser,
  loginUser,
} from "./userServices.js";
import { authenticateUserMiddleware } from "./userMiddleware.js";

const router = express.Router();

router.post("/user/google-login", handleGoogleLogin);
router.post("/user/admin/access", getAdminAccess);
router.get("/user/me", authenticateUserMiddleware, getCurrentUser);

// New routes for email/password authentication
router.post("/user/register", createUser);
router.post("/user/login", loginUser);

export default router;
