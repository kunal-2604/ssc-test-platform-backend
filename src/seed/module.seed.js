import "dotenv/config";
import prisma from "../config/db.js";

const seedModulesAndPackages = async () => {
  try {
    const modulesData = [
      {
        name: "Science 1 & Science 2",
        slug: "science",
        description: "Complete test series for SSC 10th Maharashtra Board Science 1 and Science 2.",
        subjects: ["Science 1", "Science 2"],
        totalTests: 20,
        price: 399
      },
      {
        name: "History/Civics & Geography",
        slug: "social-science",
        description: "Complete test series for History, Civics and Geography.",
        subjects: ["History/Civics", "Geography"],
        totalTests: 23,
        price: 459
      },
      {
        name: "Maths 1 & Maths 2",
        slug: "maths",
        description: "Complete test series for SSC 10th Maharashtra Board Maths 1 and Maths 2.",
        subjects: ["Maths 1", "Maths 2"],
        totalTests: 13,
        price: 259
      }
    ];

    const createdModules = [];

    for (const moduleData of modulesData) {
      const module = await prisma.module.upsert({
        where: {
          slug: moduleData.slug
        },
        update: {
          name: moduleData.name,
          description: moduleData.description,
          subjects: moduleData.subjects,
          totalTests: moduleData.totalTests,
          price: moduleData.price,
          isActive: true
        },
        create: moduleData
      });

      createdModules.push(module);
    }

    const fullPackage = await prisma.package.upsert({
      where: {
        slug: "full-package"
      },
      update: {
        name: "Full Package",
        description: "Access all Science, Social Science and Maths test series.",
        price: 999,
        totalTests: 56,
        isActive: true
      },
      create: {
        name: "Full Package",
        slug: "full-package",
        description: "Access all Science, Social Science and Maths test series.",
        price: 999,
        totalTests: 56
      }
    });

    for (const module of createdModules) {
      await prisma.packageModule.upsert({
        where: {
          packageId_moduleId: {
            packageId: fullPackage.id,
            moduleId: module.id
          }
        },
        update: {},
        create: {
          packageId: fullPackage.id,
          moduleId: module.id
        }
      });
    }

    console.log("Modules and packages seeded successfully");

    console.log("Created modules:");
    createdModules.forEach((module) => {
      console.log(`${module.name} - ₹${module.price} - ${module.totalTests} tests`);
    });

    console.log(`Package: ${fullPackage.name} - ₹${fullPackage.price}`);

    process.exit(0);
  } catch (error) {
    console.error("Module seed failed:", error);
    process.exit(1);
  }
};

seedModulesAndPackages();
