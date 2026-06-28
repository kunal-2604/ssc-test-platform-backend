import express from "express";

import {
  getAdminResultsSummary,
  getAllAdminResults,
  getAdminResultDetail,
  exportAdminResultsCsv
} from "../controllers/report.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/summary",
  protect,
  authorizeRoles("ADMIN"),
  getAdminResultsSummary
);

router.get(
  "/results",
  protect,
  authorizeRoles("ADMIN"),
  getAllAdminResults
);

router.get(
  "/results/export",
  protect,
  authorizeRoles("ADMIN"),
  exportAdminResultsCsv
);

router.get(
  "/results/:attemptId",
  protect,
  authorizeRoles("ADMIN"),
  getAdminResultDetail
);

export default router;
