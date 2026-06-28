import express from "express";

import {
  getMyAvailableTests,
  getStudentTestInstructions,
  startTestAttempt,
  getStudentAttemptQuestions,
  saveAnswer,
  getSavedAnswers,
  submitTestAttempt,
  getAttemptResult
} from "../controllers/studentTest.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("STUDENT"),
  getMyAvailableTests
);

router.get(
  "/:testId/instructions",
  protect,
  authorizeRoles("STUDENT"),
  getStudentTestInstructions
);

router.post(
  "/:testId/start",
  protect,
  authorizeRoles("STUDENT"),
  startTestAttempt
);

router.get(
  "/attempts/:attemptId/questions",
  protect,
  authorizeRoles("STUDENT"),
  getStudentAttemptQuestions
);

router.get(
  "/attempts/:attemptId/answers",
  protect,
  authorizeRoles("STUDENT"),
  getSavedAnswers
);

router.post(
  "/attempts/:attemptId/answers",
  protect,
  authorizeRoles("STUDENT"),
  saveAnswer
);

router.post(
  "/attempts/:attemptId/submit",
  protect,
  authorizeRoles("STUDENT"),
  submitTestAttempt
);

router.get(
  "/attempts/:attemptId/result",
  protect,
  authorizeRoles("STUDENT"),
  getAttemptResult
);

export default router;
