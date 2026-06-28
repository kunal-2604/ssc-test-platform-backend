import prisma from "../config/db.js";

export const getAdminResultsSummary = async (req, res, next) => {
  try {
    const [
      totalAttempts,
      submittedAttempts,
      inProgressAttempts,
      totalStudents,
      totalTests
    ] = await Promise.all([
      prisma.testAttempt.count(),
      prisma.testAttempt.count({
        where: {
          status: {
            in: ["AUTO_CHECKED", "EVALUATED", "SUBMITTED"]
          }
        }
      }),
      prisma.testAttempt.count({
        where: {
          status: "IN_PROGRESS"
        }
      }),
      prisma.user.count({
        where: {
          role: "STUDENT"
        }
      }),
      prisma.test.count()
    ]);

    const scoreAggregate = await prisma.testAttempt.aggregate({
      where: {
        status: {
          in: ["AUTO_CHECKED", "EVALUATED", "SUBMITTED"]
        }
      },
      _avg: {
        totalScore: true
      },
      _max: {
        totalScore: true
      },
      _min: {
        totalScore: true
      }
    });

    res.status(200).json({
      success: true,
      summary: {
        totalAttempts,
        submittedAttempts,
        inProgressAttempts,
        totalStudents,
        totalTests,
        averageScore: scoreAggregate._avg.totalScore || 0,
        highestScore: scoreAggregate._max.totalScore || 0,
        lowestScore: scoreAggregate._min.totalScore || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAdminResults = async (req, res, next) => {
  try {
    const { testId, studentId, status } = req.query;

    const where = {};

    if (testId) {
      where.testId = testId;
    }

    if (studentId) {
      where.userId = studentId;
    }

    if (status) {
      where.status = status;
    }

    const attempts = await prisma.testAttempt.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
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

    const results = attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      totalScore: attempt.totalScore,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      endsAt: attempt.endsAt,
      student: attempt.user,
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        subject: attempt.test.subject,
        totalMarks: attempt.test.totalMarks,
        durationMinutes: attempt.test.durationMinutes,
        module: {
          id: attempt.test.module.id,
          name: attempt.test.module.name
        }
      }
    }));

    res.status(200).json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminResultDetail = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        id: attemptId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        test: {
          include: {
            module: true,
            questions: {
              include: {
                options: true,
                matchPairs: true
              },
              orderBy: {
                orderNo: "asc"
              }
            }
          }
        },
        answers: true
      }
    });

    if (!attempt) {
      res.status(404);
      throw new Error("Attempt not found");
    }

    const answersMap = {};

    attempt.answers.forEach((answer) => {
      answersMap[answer.questionId] = answer;
    });

    const questions = attempt.test.questions.map((question) => {
      const studentAnswer = answersMap[question.id];

      let parsedAnswer = null;

      try {
        parsedAnswer = JSON.parse(studentAnswer?.answerJson || "null");
      } catch {
        parsedAnswer = null;
      }

      return {
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        marks: question.marks,
        orderNo: question.orderNo,
        correctAnswer: question.correctAnswer,
        options: question.options,
        matchPairs: question.matchPairs,
        studentAnswer: studentAnswer
          ? {
              answer: parsedAnswer,
              isCorrect: studentAnswer.isCorrect,
              marksAwarded: studentAnswer.marksAwarded
            }
          : {
              answer: null,
              isCorrect: false,
              marksAwarded: 0
            }
      };
    });

    res.status(200).json({
      success: true,
      result: {
        attemptId: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        endsAt: attempt.endsAt,
        totalScore: attempt.totalScore,
        totalMarks: attempt.test.totalMarks,
        student: attempt.user,
        test: {
          id: attempt.test.id,
          title: attempt.test.title,
          subject: attempt.test.subject,
          module: attempt.test.module.name
        },
        questions
      }
    });
  } catch (error) {
    next(error);
  }
};

export const exportAdminResultsCsv = async (req, res, next) => {
  try {
    const attempts = await prisma.testAttempt.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
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

    const headers = [
      "Student Name",
      "Email",
      "Phone",
      "Test Title",
      "Module",
      "Subject",
      "Score",
      "Total Marks",
      "Status",
      "Started At",
      "Submitted At"
    ];

    const rows = attempts.map((attempt) => [
      attempt.user.name,
      attempt.user.email,
      attempt.user.phone || "",
      attempt.test.title,
      attempt.test.module.name,
      attempt.test.subject,
      attempt.totalScore,
      attempt.test.totalMarks,
      attempt.status,
      attempt.startedAt ? attempt.startedAt.toISOString() : "",
      attempt.submittedAt ? attempt.submittedAt.toISOString() : ""
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=student-results.csv"
    );

    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
