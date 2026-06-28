import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import prisma from "../config/db.js";

import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate
} from "../utils/token.js";

import { getClientIp, getUserAgent } from "../utils/session.js";

import {
  generateRawToken,
  hashRawToken,
  addMinutes
} from "../utils/secureToken.js";

import {
  sendVerificationEmail,
  sendPasswordResetEmail
} from "../utils/email.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const sendRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:
      Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 7) *
      24 *
      60 *
      60 *
      1000
  });
};

const createTokens = async (user, res) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: getRefreshTokenExpiryDate()
    }
  });

  sendRefreshTokenCookie(res, refreshToken);

  return {
    accessToken,
    refreshToken
  };
};

const handleStudentDeviceSession = async ({ user, deviceId, req }) => {
  if (user.role !== "STUDENT") {
    return;
  }

  if (!deviceId) {
    const error = new Error("Device ID is required for student login");
    error.statusCode = 400;
    throw error;
  }

  const activeSession = await prisma.studentSession.findFirst({
    where: {
      userId: user.id,
      isActive: true
    }
  });

  if (activeSession && activeSession.deviceId !== deviceId) {
    const error = new Error(
      "This account is already active on another device. Please logout from the previous device or contact admin."
    );
    error.statusCode = 403;
    throw error;
  }

  if (activeSession && activeSession.deviceId === deviceId) {
    await prisma.studentSession.update({
      where: {
        id: activeSession.id
      },
      data: {
        lastActiveAt: new Date(),
        userAgent: getUserAgent(req),
        ipAddress: getClientIp(req)
      }
    });

    return;
  }

  await prisma.studentSession.create({
    data: {
      userId: user.id,
      deviceId,
      userAgent: getUserAgent(req),
      ipAddress: getClientIp(req),
      isActive: true
    }
  });
};

const buildSafeUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    provider: user.provider,
    isEmailVerified: user.isEmailVerified
  };
};

/* ================= REGISTER ================= */

export const registerStudent = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {
            email: normalizedEmail
          },
          ...(phone
            ? [
                {
                  phone
                }
              ]
            : [])
        ]
      }
    });

    if (existingUser) {
      res.status(400);
      throw new Error("User already exists with this email or phone");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const rawVerifyToken = generateRawToken();
    const emailVerifyTokenHash = hashRawToken(rawVerifyToken);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        password: hashedPassword,
        role: "STUDENT",
        provider: "LOCAL",
        isEmailVerified: false,
        emailVerifyTokenHash,
        emailVerifyTokenExpiresAt: addMinutes(
          Number(process.env.EMAIL_VERIFY_EXPIRES_MINUTES || 30)
        )
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        provider: true,
        isEmailVerified: true
      }
    });

    const verifyUrl = `${
      process.env.FRONTEND_URL
    }/verify-email?token=${rawVerifyToken}&email=${encodeURIComponent(
      normalizedEmail
    )}`;

    let emailSent = true;

    try {
      await sendVerificationEmail({
        to: normalizedEmail,
        name,
        verifyUrl
      });
    } catch (emailError) {
      emailSent = false;

      console.error("Verification email failed:", emailError.message);
    }

    res.status(201).json({
      success: true,
      emailSent,
      message: emailSent
        ? "Registration successful. Please verify your email before login."
        : "Registration successful, but verification email could not be sent. Please ask admin or try resend verification.",
      user
    });
  } catch (error) {
    next(error);
  }
};

/* ================= LOGIN ================= */

export const login = async (req, res, next) => {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      res.status(403);
      throw new Error("Account is disabled");
    }

    if (user.provider === "GOOGLE" && !user.password) {
      res.status(400);
      throw new Error(
        "This account uses Google login. Please continue with Google."
      );
    }

    if (
      user.role === "STUDENT" &&
      user.provider === "LOCAL" &&
      !user.isEmailVerified
    ) {
      res.status(403);
      throw new Error("Please verify your email before login");
    }

    if (!user.password) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    await handleStudentDeviceSession({
      user,
      deviceId,
      req
    });

    const tokens = await createTokens(user, res);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: buildSafeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/* ================= VERIFY EMAIL ================= */

export const verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      res.status(400);
      throw new Error("Token and email are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = hashRawToken(token);

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified"
      });
    }

    if (
      user.emailVerifyTokenHash !== tokenHash ||
      !user.emailVerifyTokenExpiresAt ||
      user.emailVerifyTokenExpiresAt < new Date()
    ) {
      res.status(400);
      throw new Error("Invalid or expired verification link");
    }

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        isEmailVerified: true,
        emailVerifyTokenHash: null,
        emailVerifyTokenExpiresAt: null
      }
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login."
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.provider === "GOOGLE") {
      res.status(400);
      throw new Error("Google account email is already verified");
    }

    if (user.isEmailVerified) {
      res.status(400);
      throw new Error("Email is already verified");
    }

    const rawVerifyToken = generateRawToken();
    const emailVerifyTokenHash = hashRawToken(rawVerifyToken);

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        emailVerifyTokenHash,
        emailVerifyTokenExpiresAt: addMinutes(
          Number(process.env.EMAIL_VERIFY_EXPIRES_MINUTES || 30)
        )
      }
    });

    const verifyUrl = `${
      process.env.FRONTEND_URL
    }/verify-email?token=${rawVerifyToken}&email=${encodeURIComponent(
      normalizedEmail
    )}`;

    await sendVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      verifyUrl
    });

    res.status(200).json({
      success: true,
      message: "Verification email sent again"
    });
  } catch (error) {
    next(error);
  }
};

/* ================= FORGOT / RESET PASSWORD ================= */

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, password reset email has been sent"
      });
    }

    if (user.provider === "GOOGLE" && !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google login. Password reset is not available."
      });
    }

    const rawResetToken = generateRawToken();
    const passwordResetTokenHash = hashRawToken(rawResetToken);

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        passwordResetTokenHash,
        passwordResetTokenExpiresAt: addMinutes(
          Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 15)
        )
      }
    });

    const resetUrl = `${
      process.env.FRONTEND_URL
    }/reset-password?token=${rawResetToken}&email=${encodeURIComponent(
      normalizedEmail
    )}`;

    await sendPasswordResetEmail({
      to: normalizedEmail,
      name: user.name,
      resetUrl
    });

    res.status(200).json({
      success: true,
      message: "If an account exists, password reset email has been sent"
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      res.status(400);
      throw new Error("Email, token and new password are required");
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = hashRawToken(token);

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      res.status(400);
      throw new Error("Invalid or expired reset link");
    }

    if (
      user.passwordResetTokenHash !== tokenHash ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      res.status(400);
      throw new Error("Invalid or expired reset link");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        password: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null
      }
    });

    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revoked: false
      },
      data: {
        revoked: true
      }
    });

    await prisma.studentSession.updateMany({
      where: {
        userId: user.id,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    res.status(200).json({
      success: true,
      message: "Password reset successful. Please login again."
    });
  } catch (error) {
    next(error);
  }
};

/* ================= GOOGLE LOGIN ================= */

export const googleLogin = async (req, res, next) => {
  try {
    const { credential, deviceId } = req.body;

    if (!credential) {
      res.status(400);
      throw new Error("Google credential is required");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      res.status(400);
      throw new Error("Google account email not found");
    }

    const normalizedEmail = payload.email.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: payload.name || "Google User",
          email: normalizedEmail,
          password: null,
          role: "STUDENT",
          provider: "GOOGLE",
          googleId: payload.sub,
          isEmailVerified: true
        }
      });
    } else {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            googleId: payload.sub,
            isEmailVerified: true
          }
        });
      }
    }

    if (!user.isActive) {
      res.status(403);
      throw new Error("Account is inactive");
    }

    await handleStudentDeviceSession({
      user,
      deviceId,
      req
    });

    const tokens = await createTokens(user, res);

    res.status(200).json({
      success: true,
      message: "Google login successful",
      user: buildSafeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/* ================= REFRESH TOKEN ================= */

export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401);
      throw new Error("Refresh token missing");
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: decoded.id,
        revoked: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!storedToken) {
      res.status(401);
      throw new Error("Invalid refresh token");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id
      }
    });

    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("User not found or disabled");
    }

    const accessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      message: "Access token refreshed",
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

/* ================= LOGOUT ================= */

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const deviceId = req.body.deviceId;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);

      await prisma.refreshToken.updateMany({
        where: {
          tokenHash
        },
        data: {
          revoked: true
        }
      });
    }

    if (deviceId) {
      await prisma.studentSession.updateMany({
        where: {
          deviceId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });
    }

    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    next(error);
  }
};

/* ================= ME ================= */

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

/* ================= ADMIN STUDENT SESSIONS ================= */

export const getStudentSessionsAdmin = async (req, res, next) => {
  try {
    const sessions = await prisma.studentSession.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    next(error);
  }
};

export const resetStudentDeviceAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;

    await prisma.studentSession.updateMany({
      where: {
        userId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false
      },
      data: {
        revoked: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Student device reset successfully"
    });
  } catch (error) {
    next(error);
  }
};
