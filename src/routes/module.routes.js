import express from "express";

import {
  getAllModules,
  getAllPackages,
  getStoreItems,
  getAdminModulesSummary
} from "../controllers/module.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllModules);
router.get("/packages", getAllPackages);
router.get("/store", protect, authorizeRoles("STUDENT"), getStoreItems);

router.get(
  "/admin/summary",
  protect,
  authorizeRoles("ADMIN"),
  getAdminModulesSummary
);

export default router;
