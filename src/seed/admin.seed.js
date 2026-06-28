import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../config/db.js";

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: adminEmail
      }
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        name: "ADMIN",
        email: adminEmail,
        phone: "9552323406",
        isEmailVerified: true,
        provider: "LOCAL",
        password: hashedPassword,
        role: "ADMIN"
      }
    });

    console.log("Admin created successfully");
    console.log("Email:", adminEmail);
    console.log("Password:", adminPassword);

    process.exit(0);
  } catch (error) {
    console.error("Admin seed failed:", error);
    process.exit(1);
  }
};

seedAdmin();
