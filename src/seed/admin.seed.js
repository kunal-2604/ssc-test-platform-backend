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

    await prisma.user.upsert({
      where: {
        email: adminEmail
      },
      update: {
        name: "Main Admin",
        role: "ADMIN",
        isActive: true,
        isEmailVerified: true
      },
      create: {
        name: "Main Admin",
        email: adminEmail,
        phone: adminPhone,
        password: hashedPassword,
        role: "ADMIN",
        provider: "LOCAL",
        isEmailVerified: true,
        isActive: true
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
