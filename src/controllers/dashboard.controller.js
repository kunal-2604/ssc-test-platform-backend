import prisma from "../config/db.js";

export const getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalStudents,
      activeStudents,
      totalModules,
      totalTests,
      publishedTests,
      totalAttempts,
      successfulPayments,
      recentPayments,
      recentAttempts
    ] = await Promise.all([
      prisma.user.count({
        where: {
          role: "STUDENT"
        }
      }),

      prisma.user.count({
        where: {
          role: "STUDENT",
          isActive: true
        }
      }),

      prisma.module.count({
        where: {
          isActive: true
        }
      }),

      prisma.test.count(),

      prisma.test.count({
        where: {
          status: "PUBLISHED"
        }
      }),

      prisma.testAttempt.count(),

      prisma.payment.findMany({
        where: {
          status: "SUCCESS"
        },
        select: {
          amount: true
        }
      }),

      prisma.payment.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc"
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          module: true,
          package: true
        }
      }),

      prisma.testAttempt.findMany({
        take: 5,
        orderBy: {
          updatedAt: "desc"
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          test: {
            include: {
              module: true
            }
          }
        }
      })
    ]);

    const totalRevenue = successfulPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const submittedAttempts = await prisma.testAttempt.count({
      where: {
        status: {
          in: ["AUTO_CHECKED", "EVALUATED", "SUBMITTED"]
        }
      }
    });

    const inProgressAttempts = await prisma.testAttempt.count({
      where: {
        status: "IN_PROGRESS"
      }
    });

    res.status(200).json({
      success: true,
      dashboard: {
        summary: {
          totalStudents,
          activeStudents,
          totalModules,
          totalTests,
          publishedTests,
          totalAttempts,
          submittedAttempts,
          inProgressAttempts,
          successfulPaymentCount: successfulPayments.length,
          totalRevenue
        },
        recentPayments: recentPayments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          purchaseType: payment.purchaseType,
          createdAt: payment.createdAt,
          student: payment.user,
          itemName:
            payment.module?.name ||
            payment.package?.name ||
            "-"
        })),
        recentAttempts: recentAttempts.map((attempt) => ({
          id: attempt.id,
          status: attempt.status,
          totalScore: attempt.totalScore,
          submittedAt: attempt.submittedAt,
          updatedAt: attempt.updatedAt,
          student: attempt.user,
          test: {
            id: attempt.test.id,
            title: attempt.test.title,
            subject: attempt.test.subject,
            totalMarks: attempt.test.totalMarks,
            module: attempt.test.module.name
          }
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const accesses = await prisma.studentAccess.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        module: true
      }
    });

    const moduleIds = accesses.map((access) => access.moduleId);

    const availableTests = moduleIds.length
      ? await prisma.test.count({
          where: {
            status: "PUBLISHED",
            moduleId: {
              in: moduleIds
            }
          }
        })
      : 0;

    const attempts = await prisma.testAttempt.findMany({
      where: {
        userId
      },
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
    });

    const completedAttempts = attempts.filter((attempt) =>
      ["AUTO_CHECKED", "EVALUATED", "SUBMITTED"].includes(attempt.status)
    );

    const inProgressAttempts = attempts.filter(
      (attempt) => attempt.status === "IN_PROGRESS"
    );

    const totalScore = completedAttempts.reduce(
      (sum, attempt) => sum + attempt.totalScore,
      0
    );

    const totalMarks = completedAttempts.reduce(
      (sum, attempt) => sum + attempt.test.totalMarks,
      0
    );

    const averagePercentage =
      totalMarks > 0 ? Number(((totalScore / totalMarks) * 100).toFixed(2)) : 0;

    const recentAttempts = attempts.slice(0, 5).map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      totalScore: attempt.totalScore,
      submittedAt: attempt.submittedAt,
      updatedAt: attempt.updatedAt,
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        subject: attempt.test.subject,
        totalMarks: attempt.test.totalMarks,
        module: attempt.test.module.name
      }
    }));

    res.status(200).json({
      success: true,
      dashboard: {
        summary: {
          activeModuleCount: accesses.length,
          availableTests,
          totalAttempts: attempts.length,
          completedTests: completedAttempts.length,
          inProgressTests: inProgressAttempts.length,
          averagePercentage
        },
        modules: accesses.map((access) => ({
          id: access.module.id,
          name: access.module.name,
          subjects: access.module.subjects,
          purchaseType: access.purchaseType,
          grantedAt: access.createdAt
        })),
        recentAttempts
      }
    });
  } catch (error) {
    next(error);
  }
};
