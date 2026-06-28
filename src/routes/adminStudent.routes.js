import express from "express";

import {
  getAllStudentsAdmin,
  getStudentDetailAdmin,
  toggleStudentActiveStatusAdmin,
  resetStudentDeviceFromProfileAdmin,
  allowReattemptFromStudentProfileAdmin,
  grantModuleAccessAdmin,
  grantFullPackageAccessAdmin,
  revokeModuleAccessAdmin,
  restoreModuleAccessAdmin
} from "../controllers/adminStudent.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  getAllStudentsAdmin
);

router.get(
  "/:studentId",
  protect,
  authorizeRoles("ADMIN"),
  getStudentDetailAdmin
);

router.patch(
  "/:studentId/toggle-status",
  protect,
  authorizeRoles("ADMIN"),
  toggleStudentActiveStatusAdmin
);

router.patch(
  "/:studentId/reset-device",
  protect,
  authorizeRoles("ADMIN"),
  resetStudentDeviceFromProfileAdmin
);

router.delete(
  "/:studentId/tests/:testId/allow-reattempt",
  protect,
  authorizeRoles("ADMIN"),
  allowReattemptFromStudentProfileAdmin
);

router.post(
  "/:studentId/grant-module-access",
  protect,
  authorizeRoles("ADMIN"),
  grantModuleAccessAdmin
);

router.post(
  "/:studentId/grant-package-access",
  protect,
  authorizeRoles("ADMIN"),
  grantFullPackageAccessAdmin
);

router.patch(
  "/:studentId/modules/:moduleId/revoke-access",
  protect,
  authorizeRoles("ADMIN"),
  revokeModuleAccessAdmin
);

router.patch(
  "/:studentId/modules/:moduleId/restore-access",
  protect,
  authorizeRoles("ADMIN"),
  restoreModuleAccessAdmin
);

export default router;
