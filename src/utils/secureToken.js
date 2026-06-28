import crypto from "crypto";

export const generateRawToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const hashRawToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const addMinutes = (minutes) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};
