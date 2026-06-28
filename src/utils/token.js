import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
    }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: `${process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 7}d`
    }
  );
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const getRefreshTokenExpiryDate = () => {
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 7);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};
