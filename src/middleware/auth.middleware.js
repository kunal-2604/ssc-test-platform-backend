import jwt from "jsonwebtoken";
import prisma from "../config/db.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, token missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    if (!user.isActive) {
      res.status(403);
      throw new Error("Account is disabled");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    next(new Error("Not authorized, invalid or expired token"));
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("User not authenticated"));
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error("You do not have permission to access this route"));
    }

    next();
  };
};
