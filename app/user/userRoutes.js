import express from "express";

import {
  handleGoogleLogin,
  getCurrentUser,
  getAdminAccess,
} from "./userServices.js";
import { authenticateUserMiddleware } from "./userMiddleware.js";

const router = express.Router();

router.post("/user/google-login", handleGoogleLogin);
router.post("/user/admin/access", getAdminAccess);
router.get("/user/me", authenticateUserMiddleware, getCurrentUser);

export default router;
