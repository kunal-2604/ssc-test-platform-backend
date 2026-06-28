import express from "express";

import {
  createTest,
  getAdminTests,
  getAdminTestById,
  updateTest,
  deleteTest,
  publishTest,
  unpublishTest,
  addQuestion,
  deleteQuestion,
  allowStudentReattempt,
  getAdminTestAttempts
} from "../controllers/test.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("ADMIN"), createTest);

router.get("/", protect, authorizeRoles("ADMIN"), getAdminTests);

router.get("/:testId", protect, authorizeRoles("ADMIN"), getAdminTestById);

router.put("/:testId", protect, authorizeRoles("ADMIN"), updateTest);

router.delete("/:testId", protect, authorizeRoles("ADMIN"), deleteTest);

router.patch("/:testId/publish", protect, authorizeRoles("ADMIN"), publishTest);

router.patch(
  "/:testId/unpublish",
  protect,
  authorizeRoles("ADMIN"),
  unpublishTest
);

router.post(
  "/:testId/questions",
  protect,
  authorizeRoles("ADMIN"),
  addQuestion
);

router.delete(
  "/questions/:questionId",
  protect,
  authorizeRoles("ADMIN"),
  deleteQuestion
);

router.delete(
  "/:testId/attempts/:userId/allow-reattempt",
  protect,
  authorizeRoles("ADMIN"),
  allowStudentReattempt
);

router.get(
  "/:testId/attempts",
  protect,
  authorizeRoles("ADMIN"),
  getAdminTestAttempts
);

export default router;
