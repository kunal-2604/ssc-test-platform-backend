import crypto from "crypto";

export const verifyRazorpaySignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
}) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpaySignature;
};
