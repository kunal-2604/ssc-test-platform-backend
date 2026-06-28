import express from "express";

import {
  getAdminDashboard,
  getStudentDashboard
} from "../controllers/dashboard.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/admin",
  protect,
  authorizeRoles("ADMIN"),
  getAdminDashboard
);

router.get(
  "/student",
  protect,
  authorizeRoles("STUDENT"),
  getStudentDashboard
);

export default router;
