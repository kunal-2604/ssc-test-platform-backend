import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html
  });
};

export const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
  await sendEmail({
    to,
    subject: "Verify your SSC Test Platform email",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Email Verification</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering on SSC Test Platform.</p>
        <p>Please verify your email by clicking the button below:</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">
          Verify Email
        </a>
        <p>This link will expire soon.</p>
      </div>
    `
  });
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  await sendEmail({
    to,
    subject: "Reset your SSC Test Platform password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset</h2>
        <p>Hello ${name},</p>
        <p>You requested to reset your password.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">
          Reset Password
        </a>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `
  });
};
