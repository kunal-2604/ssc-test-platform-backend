import prisma from "../config/db.js";
import razorpay from "../config/razorpay.js";
import { verifyRazorpaySignature } from "../utils/payment.js";

const generateReceipt = () => {
  return `receipt_${Date.now()}`;
};

export const createOrder = async (req, res, next) => {
  try {
    const { purchaseType, moduleId, packageId } = req.body;

    if (!purchaseType || !["MODULE", "PACKAGE"].includes(purchaseType)) {
      res.status(400);
      throw new Error("Valid purchaseType is required");
    }

    if (purchaseType === "MODULE" && !moduleId) {
      res.status(400);
      throw new Error("moduleId is required for module purchase");
    }

    if (purchaseType === "PACKAGE" && !packageId) {
      res.status(400);
      throw new Error("packageId is required for package purchase");
    }

    let amount = 0;
    let itemName = "";

    if (purchaseType === "MODULE") {
      const module = await prisma.module.findFirst({
        where: {
          id: moduleId,
          isActive: true
        }
      });

      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }

      const existingAccess = await prisma.studentAccess.findUnique({
        where: {
          userId_moduleId: {
            userId: req.user.id,
            moduleId: module.id
          }
        }
      });

      if (existingAccess?.isActive) {
        res.status(400);
        throw new Error("You already have access to this module");
      }

      amount = module.price;
      itemName = module.name;
    }

    if (purchaseType === "PACKAGE") {
      const pkg = await prisma.package.findFirst({
        where: {
          id: packageId,
          isActive: true
        }
      });

      if (!pkg) {
        res.status(404);
        throw new Error("Package not found");
      }

      amount = pkg.price;
      itemName = pkg.name;
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: process.env.RAZORPAY_CURRENCY || "INR",
      receipt: generateReceipt(),
      notes: {
        userId: req.user.id,
        purchaseType,
        moduleId: moduleId || "",
        packageId: packageId || "",
        itemName
      }
    });

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        moduleId: purchaseType === "MODULE" ? moduleId : null,
        packageId: purchaseType === "PACKAGE" ? packageId : null,
        purchaseType,
        amount,
        currency: process.env.RAZORPAY_CURRENCY || "INR",
        status: "CREATED",
        razorpayOrderId: order.id
      }
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      keyId: process.env.RAZORPAY_KEY_ID,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        purchaseType: payment.purchaseType
      },
      user: {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400);
      throw new Error("Razorpay payment details are required");
    }

    const payment = await prisma.payment.findUnique({
      where: {
        razorpayOrderId: razorpay_order_id
      }
    });

    if (!payment) {
      res.status(404);
      throw new Error("Payment record not found");
    }

    if (payment.userId !== req.user.id) {
      res.status(403);
      throw new Error("This payment does not belong to you");
    }

    if (payment.status === "SUCCESS") {
      res.status(200).json({
        success: true,
        message: "Payment already verified"
      });
      return;
    }

    const isValidSignature = verifyRazorpaySignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    if (!isValidSignature) {
      await prisma.payment.update({
        where: {
          id: payment.id
        },
        data: {
          status: "FAILED",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        }
      });

      res.status(400);
      throw new Error("Invalid payment signature");
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: {
          id: payment.id
        },
        data: {
          status: "SUCCESS",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        }
      });

      if (payment.purchaseType === "MODULE") {
        await tx.studentAccess.upsert({
          where: {
            userId_moduleId: {
              userId: payment.userId,
              moduleId: payment.moduleId
            }
          },
          update: {
            isActive: true,
            sourcePaymentId: payment.id,
            purchaseType: "MODULE"
          },
          create: {
            userId: payment.userId,
            moduleId: payment.moduleId,
            sourcePaymentId: payment.id,
            purchaseType: "MODULE"
          }
        });
      }

      if (payment.purchaseType === "PACKAGE") {
        const packageModules = await tx.packageModule.findMany({
          where: {
            packageId: payment.packageId
          }
        });

        for (const item of packageModules) {
          await tx.studentAccess.upsert({
            where: {
              userId_moduleId: {
                userId: payment.userId,
                moduleId: item.moduleId
              }
            },
            update: {
              isActive: true,
              sourcePaymentId: payment.id,
              purchaseType: "PACKAGE"
            },
            create: {
              userId: payment.userId,
              moduleId: item.moduleId,
              sourcePaymentId: payment.id,
              purchaseType: "PACKAGE"
            }
          });
        }
      }
    });

    res.status(200).json({
      success: true,
      message: "Payment verified and access granted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPayments = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        module: true,
        package: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAccess = async (req, res, next) => {
  try {
    const accesses = await prisma.studentAccess.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      },
      include: {
        module: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.status(200).json({
      success: true,
      count: accesses.length,
      accesses
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPaymentsAdmin = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        module: true,
        package: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    next(error);
  }
};

export const markPaymentFailed = async (req, res, next) => {
  try {
    const { razorpay_order_id, error } = req.body;

    if (!razorpay_order_id) {
      res.status(400);
      throw new Error("razorpay_order_id is required");
    }

    const payment = await prisma.payment.findUnique({
      where: {
        razorpayOrderId: razorpay_order_id
      }
    });

    if (!payment) {
      res.status(404);
      throw new Error("Payment record not found");
    }

    if (payment.userId !== req.user.id) {
      res.status(403);
      throw new Error("This payment does not belong to you");
    }

    if (payment.status === "SUCCESS") {
      res.status(400);
      throw new Error("Successful payment cannot be marked as failed");
    }

    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id
      },
      data: {
        status: "FAILED"
      }
    });

    res.status(200).json({
      success: true,
      message: "Payment marked as failed",
      payment: updatedPayment,
      error: error || null
    });
  } catch (error) {
    next(error);
  }
};
