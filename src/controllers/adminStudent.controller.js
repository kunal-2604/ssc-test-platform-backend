import prisma from "../config/db.js";

export const getAllStudentsAdmin = async (req, res, next) => {
  try {
    const { search } = req.query;

    const where = {
      role: "STUDENT"
    };

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          email: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          phone: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        accesses: {
          where: {
            isActive: true
          },
          include: {
            module: true
          }
        },
        attempts: {
          select: {
            id: true,
            status: true,
            totalScore: true
          }
        },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formattedStudents = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      isActive: student.isActive,
      createdAt: student.createdAt,
      activeAccessCount: student.accesses.length,
      attemptCount: student.attempts.length,
      successfulPaymentCount: student.payments.filter(
        (payment) => payment.status === "SUCCESS"
      ).length,
      totalPaidAmount: student.payments
        .filter((payment) => payment.status === "SUCCESS")
        .reduce((sum, payment) => sum + payment.amount, 0)
    }));

    res.status(200).json({
      success: true,
      count: formattedStudents.length,
      students: formattedStudents
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentDetailAdmin = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.user.findUnique({
      where: {
        id: studentId
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        accesses: {
          include: {
            module: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        payments: {
          include: {
            module: true,
            package: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        attempts: {
          include: {
            test: {
              include: {
                module: true
              }
            }
          },
          orderBy: {
            updatedAt: "desc"
          }
        },
        sessions: {
          orderBy: {
            updatedAt: "desc"
          }
        }
      }
    });

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    res.status(200).json({
      success: true,
      student
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStudentActiveStatusAdmin = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.user.findUnique({
      where: {
        id: studentId
      }
    });

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    if (student.role !== "STUDENT") {
      res.status(400);
      throw new Error("Selected user is not a student");
    }

    const updatedStudent = await prisma.user.update({
      where: {
        id: studentId
      },
      data: {
        isActive: !student.isActive
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true
      }
    });

    if (!updatedStudent.isActive) {
      await prisma.refreshToken.updateMany({
        where: {
          userId: studentId,
          revoked: false
        },
        data: {
          revoked: true
        }
      });

      await prisma.studentSession.updateMany({
        where: {
          userId: studentId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });
    }

    res.status(200).json({
      success: true,
      message: updatedStudent.isActive
        ? "Student activated successfully"
        : "Student deactivated successfully",
      student: updatedStudent
    });
  } catch (error) {
    next(error);
  }
};

export const resetStudentDeviceFromProfileAdmin = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.user.findUnique({
      where: {
        id: studentId
      }
    });

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    if (student.role !== "STUDENT") {
      res.status(400);
      throw new Error("Selected user is not a student");
    }

    await prisma.studentSession.updateMany({
      where: {
        userId: studentId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    await prisma.refreshToken.updateMany({
      where: {
        userId: studentId,
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

export const allowReattemptFromStudentProfileAdmin = async (req, res, next) => {
  try {
    const { studentId, testId } = req.params;

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        userId_testId: {
          userId: studentId,
          testId
        }
      }
    });

    if (!attempt) {
      res.status(404);
      throw new Error("No attempt found for this student and test");
    }

    await prisma.testAttempt.delete({
      where: {
        id: attempt.id
      }
    });

    res.status(200).json({
      success: true,
      message: "Student can now attempt this test again"
    });
  } catch (error) {
    next(error);
  }
};

export const grantModuleAccessAdmin = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { moduleId } = req.body;

    if (!moduleId) {
      res.status(400);
      throw new Error("moduleId is required");
    }

    const student = await prisma.user.findUnique({
      where: {
        id: studentId
      }
    });

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    if (student.role !== "STUDENT") {
      res.status(400);
      throw new Error("Selected user is not a student");
    }

    const module = await prisma.module.findUnique({
      where: {
        id: moduleId
      }
    });

    if (!module) {
      res.status(404);
      throw new Error("Module not found");
    }

    const access = await prisma.studentAccess.upsert({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId
        }
      },
      update: {
        isActive: true,
        purchaseType: "MANUAL",
        sourcePaymentId: null
      },
      create: {
        userId: studentId,
        moduleId,
        purchaseType: "MANUAL",
        isActive: true
      },
      include: {
        module: true
      }
    });

    res.status(200).json({
      success: true,
      message: `${module.name} access granted successfully`,
      access
    });
  } catch (error) {
    next(error);
  }
};

export const grantFullPackageAccessAdmin = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { packageId } = req.body;

    if (!packageId) {
      res.status(400);
      throw new Error("packageId is required");
    }

    const student = await prisma.user.findUnique({
      where: {
        id: studentId
      }
    });

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    if (student.role !== "STUDENT") {
      res.status(400);
      throw new Error("Selected user is not a student");
    }

    const packageData = await prisma.package.findUnique({
      where: {
        id: packageId
      },
      include: {
        packageModules: true
      }
    });

    if (!packageData) {
      res.status(404);
      throw new Error("Package not found");
    }

    if (packageData.packageModules.length === 0) {
      res.status(400);
      throw new Error("Package has no modules");
    }

    const grantedAccesses = [];

    for (const item of packageData.packageModules) {
      const access = await prisma.studentAccess.upsert({
        where: {
          userId_moduleId: {
            userId: studentId,
            moduleId: item.moduleId
          }
        },
        update: {
          isActive: true,
          purchaseType: "MANUAL",
          sourcePaymentId: null
        },
        create: {
          userId: studentId,
          moduleId: item.moduleId,
          purchaseType: "MANUAL",
          isActive: true
        }
      });

      grantedAccesses.push(access);
    }

    res.status(200).json({
      success: true,
      message: `${packageData.name} access granted successfully`,
      accesses: grantedAccesses
    });
  } catch (error) {
    next(error);
  }
};

export const revokeModuleAccessAdmin = async (req, res, next) => {
  try {
    const { studentId, moduleId } = req.params;

    const access = await prisma.studentAccess.findUnique({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId
        }
      },
      include: {
        module: true
      }
    });

    if (!access) {
      res.status(404);
      throw new Error("Access not found");
    }

    await prisma.studentAccess.update({
      where: {
        id: access.id
      },
      data: {
        isActive: false
      }
    });

    res.status(200).json({
      success: true,
      message: `${access.module.name} access revoked successfully`
    });
  } catch (error) {
    next(error);
  }
};

export const restoreModuleAccessAdmin = async (req, res, next) => {
  try {
    const { studentId, moduleId } = req.params;

    const access = await prisma.studentAccess.findUnique({
      where: {
        userId_moduleId: {
          userId: studentId,
          moduleId
        }
      },
      include: {
        module: true
      }
    });

    if (!access) {
      res.status(404);
      throw new Error("Access not found");
    }

    await prisma.studentAccess.update({
      where: {
        id: access.id
      },
      data: {
        isActive: true
      }
    });

    res.status(200).json({
      success: true,
      message: `${access.module.name} access restored successfully`
    });
  } catch (error) {
    next(error);
  }
};
