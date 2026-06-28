import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import moduleRoutes from "./routes/module.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import testRoutes from "./routes/test.routes.js";
import studentTestRoutes from "./routes/studentTest.routes.js";
import reportRoutes from "./routes/report.routes.js";
import adminStudentRoutes from "./routes/adminStudent.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SSC Test Platform API is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to SSC Test Platform API"
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/tests", testRoutes);
app.use("/api/student/tests", studentTestRoutes);
app.use("/api/admin/reports", reportRoutes);
app.use("/api/admin/students", adminStudentRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
