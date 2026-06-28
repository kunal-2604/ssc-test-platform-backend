import express from "express";

import {
  registerStudent,
  login,
  refreshAccessToken,
  logout,
  getMe,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  googleLogin,
  getStudentSessionsAdmin,
  resetStudentDeviceAdmin
} from "../controllers/auth.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerStudent);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);

router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google", googleLogin);

router.get("/me", protect, getMe);

router.get("/student-only", protect, authorizeRoles("STUDENT"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Student route access successful"
  });
});

router.get("/admin-only", protect, authorizeRoles("ADMIN"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin route access successful"
  });
});

router.get(
  "/admin/student-sessions",
  protect,
  authorizeRoles("ADMIN"),
  getStudentSessionsAdmin
);

router.patch(
  "/admin/reset-device/:userId",
  protect,
  authorizeRoles("ADMIN"),
  resetStudentDeviceAdmin
);

export default router;
