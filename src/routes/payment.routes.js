import express from "express";

import {
  createOrder,
  verifyPayment,
  getMyPayments,
  getMyAccess,
  getAllPaymentsAdmin,
  markPaymentFailed
} from "../controllers/payment.controller.js";

import { protect, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/create-order",
  protect,
  authorizeRoles("STUDENT"),
  createOrder
);

router.post(
  "/verify",
  protect,
  authorizeRoles("STUDENT"),
  verifyPayment
);

router.post(
  "/mark-failed",
  protect,
  authorizeRoles("STUDENT"),
  markPaymentFailed
);

router.get(
  "/my-payments",
  protect,
  authorizeRoles("STUDENT"),
  getMyPayments
);

router.get(
  "/my-access",
  protect,
  authorizeRoles("STUDENT"),
  getMyAccess
);

router.get(
  "/admin/all",
  protect,
  authorizeRoles("ADMIN"),
  getAllPaymentsAdmin
);

export default router;
