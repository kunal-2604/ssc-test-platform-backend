import prisma from "../config/db.js";

export const healthCheck = async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "SSC Test Platform backend is running",
      database: "Connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};
