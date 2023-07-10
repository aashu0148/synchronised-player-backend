const express = require("express");

const {
  handleGoogleLogin,
  getCurrentUser,
  getAdminAccess,
} = require("./userServices");
const { authenticateUserMiddleware } = require("./userMiddleware");

const router = express.Router();

router.post("/user/google-login", handleGoogleLogin);
router.post("/user/admin/access", getAdminAccess);
router.get("/user/me", authenticateUserMiddleware, getCurrentUser);

module.exports = router;
