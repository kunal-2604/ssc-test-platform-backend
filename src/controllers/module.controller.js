import prisma from "../config/db.js";

export const getAllModules = async (req, res, next) => {
  try {
    const modules = await prisma.module.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        price: "asc"
      }
    });

    res.status(200).json({
      success: true,
      count: modules.length,
      modules
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPackages = async (req, res, next) => {
  try {
    const packages = await prisma.package.findMany({
      where: {
        isActive: true
      },
      include: {
        packageModules: {
          include: {
            module: true
          }
        }
      },
      orderBy: {
        price: "asc"
      }
    });

    const formattedPackages = packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description,
      price: pkg.price,
      totalTests: pkg.totalTests,
      isActive: pkg.isActive,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      modules: pkg.packageModules.map((item) => item.module)
    }));

    res.status(200).json({
      success: true,
      count: formattedPackages.length,
      packages: formattedPackages
    });
  } catch (error) {
    next(error);
  }
};

export const getStoreItems = async (req, res, next) => {
  try {
    const modules = await prisma.module.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        price: "asc"
      }
    });

    const packages = await prisma.package.findMany({
      where: {
        isActive: true
      },
      include: {
        packageModules: {
          include: {
            module: true
          }
        }
      },
      orderBy: {
        price: "asc"
      }
    });

    const accesses = await prisma.studentAccess.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      },
      select: {
        moduleId: true,
        purchaseType: true
      }
    });

    const accessModuleIds = accesses.map((access) => access.moduleId);

    const formattedModules = modules.map((module) => ({
      ...module,
      hasAccess: accessModuleIds.includes(module.id)
    }));

    const formattedPackages = packages.map((pkg) => {
      const packageModuleIds = pkg.packageModules.map((item) => item.moduleId);
      const hasFullAccess = packageModuleIds.every((moduleId) =>
        accessModuleIds.includes(moduleId)
      );

      return {
        id: pkg.id,
        name: pkg.name,
        slug: pkg.slug,
        description: pkg.description,
        price: pkg.price,
        totalTests: pkg.totalTests,
        hasAccess: hasFullAccess,
        modules: pkg.packageModules.map((item) => item.module)
      };
    });

    res.status(200).json({
      success: true,
      modules: formattedModules,
      packages: formattedPackages,
      accesses
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminModulesSummary = async (req, res, next) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: {
        createdAt: "asc"
      }
    });

    const packages = await prisma.package.findMany({
      include: {
        packageModules: {
          include: {
            module: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const totalModuleRevenue = modules.reduce((sum, module) => sum + module.price, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalModules: modules.length,
        totalPackages: packages.length,
        individualModuleTotalPrice: totalModuleRevenue,
        fullPackagePrice: packages[0]?.price || 0
      },
      modules,
      packages
    });
  } catch (error) {
    next(error);
  }
};
